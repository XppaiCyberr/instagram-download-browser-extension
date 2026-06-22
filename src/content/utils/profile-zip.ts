import dayjs, { Dayjs } from 'dayjs';
import { MediaType } from '../../constants';
import { DownloadParams, getFilenameFromUrl, getMediaName } from './filename';
import { findAppId, getDataFromMediaId } from './fn';
import { storageCache } from './storage';
import { clearFloatingProfileZipStatus, updateFloatingProfileZipCount, updateFloatingProfileZipStatus } from '../button';

const SCROLL_DELAY_MS = 900;
const DOWNLOAD_DELAY_MS = 200;
const MAX_SCROLL_ROUNDS = 120;
const STABLE_SCROLL_ROUNDS = 4;

interface ProfileMediaAsset {
    url: string;
    filename: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getProfileUsername() {
    const pathnameUsername = window.location.pathname.split('/').filter((e) => e)[0];
    return pathnameUsername || document.querySelector('main header h2')?.textContent || 'profile';
}

export function collectProfilePermalinks() {
    const links = new Set<string>();
    document.querySelectorAll<HTMLAnchorElement>('main a[href]').forEach((link) => {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const pathnameList = url.pathname.split('/').filter((e) => e);
        const mediaPathIndex = pathnameList.findIndex((part) => ['p', 'reel', 'tv'].includes(part));
        if (mediaPathIndex === -1 || !pathnameList[mediaPathIndex + 1]) return;

        url.search = '';
        url.hash = '';
        links.add(url.href);
    });
    return [...links];
}

export function getLoadedProfileMediaCount() {
    return collectProfilePermalinks().length;
}

async function loadProfileGrid() {
    let stableRounds = 0;
    let lastHeight = 0;
    let lastCount = 0;
    let count = collectProfilePermalinks().length;

    updateFloatingProfileZipCount(count);
    updateFloatingProfileZipStatus({
        title: 'Loading profile media',
        detail: `${count} posts/reels currently loaded`,
    });

    for (let i = 0; i < MAX_SCROLL_ROUNDS && stableRounds < STABLE_SCROLL_ROUNDS; i++) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await delay(SCROLL_DELAY_MS);

        const height = document.documentElement.scrollHeight;
        count = collectProfilePermalinks().length;
        updateFloatingProfileZipCount(count);
        updateFloatingProfileZipStatus({
            title: 'Loading profile media',
            detail: `${count} posts/reels loaded`,
        });

        if (height === lastHeight && count === lastCount) {
            stableRounds++;
        } else {
            stableRounds = 0;
            lastHeight = height;
            lastCount = count;
        }
    }
}

function findMediaId(html: string) {
    const patterns = [
        /instagram:\/\/media\?id=(\d+)/,
        /instagram:\\\/\\\/media\\\?id=(\d+)/,
        /["' ]media_id["' ]:["' ](\d+)["' ]/,
        /\\"media_id\\":\\"(\d+)\\"/,
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1];
    }
    return null;
}

function getPermalinkLabel(permalink: string) {
    const url = new URL(permalink);
    const pathnameList = url.pathname.split('/').filter((e) => e);
    const mediaPathIndex = pathnameList.findIndex((part) => ['p', 'reel', 'tv'].includes(part));
    if (mediaPathIndex !== -1 && pathnameList[mediaPathIndex + 1]) {
        return `/${pathnameList[mediaPathIndex]}/${pathnameList[mediaPathIndex + 1]}`;
    }
    return url.pathname;
}

async function getMediaIdFromPermalink(permalink: string) {
    const resp = await fetch(permalink, {
        credentials: 'include',
        referrerPolicy: 'no-referrer',
    });
    if (!resp.ok) {
        throw new Error(`Failed to fetch ${permalink}: ${resp.status}`);
    }

    const mediaId = findMediaId(await resp.text());
    if (!mediaId) {
        throw new Error(`Cannot find media id for ${permalink}`);
    }
    return mediaId;
}

function getMediaOwner(resource: any, parent: any, fallbackUsername: string) {
    return resource.owner?.username || resource.user?.username || parent.owner?.username || parent.user?.username || fallbackUsername;
}

function getMediaTime(resource: any, parent: any): Dayjs | undefined {
    const takenAt = resource.taken_at || parent.taken_at;
    return takenAt ? dayjs.unix(takenAt) : undefined;
}

function getProfileMediaType(media: any) {
    return media.product_type === 'clips' ? MediaType.Reel : MediaType.Post;
}

function getMediaUrl(resource: any) {
    return resource.video_versions?.[0]?.url || resource.image_versions2?.candidates?.[0]?.url || null;
}

function sanitizeFilename(filename: string) {
    return filename.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'media';
}

function uniqueFilename(filename: string, usedFilenames: Set<string>) {
    let current = filename;
    let index = 2;
    while (usedFilenames.has(current)) {
        current = `${filename}-${index}`;
        index++;
    }
    usedFilenames.add(current);
    return current;
}

async function getMediaAssets(media: any, fallbackUsername: string, usedFilenames: Set<string>): Promise<ProfileMediaAsset[]> {
    const resources = Array.isArray(media.carousel_media) && media.carousel_media.length > 0 ? media.carousel_media : [media];

    const assets = await Promise.all(
        resources.map(async (resource: any, index: number) => {
            const url = getMediaUrl(resource);
            if (!url) return null;

            const params: DownloadParams = {
                url,
                username: getMediaOwner(resource, media, fallbackUsername),
                datetime: getMediaTime(resource, media),
                id: media.code || resource.pk || resource.id || media.pk || media.id || getMediaName(url),
                index: resources.length > 1 ? index + 1 : undefined,
                type: getProfileMediaType(media),
            };

            const filename = sanitizeFilename(await getFilenameFromUrl(params));
            return {
                url,
                filename: uniqueFilename(filename, usedFilenames),
            };
        })
    );

    return assets.filter((asset): asset is ProfileMediaAsset => !!asset);
}

function getBlobExtension(blob: Blob, url: string) {
    const pathnameExtension = new URL(url).pathname.split('.').pop();
    let extension = blob.type.split('/').pop() || pathnameExtension || 'jpg';

    if (storageCache.settings.setting_format_replace_jpeg_with_jpg) {
        extension = extension.replace('jpeg', 'jpg');
    }

    return extension.replace(/[^a-z0-9]/gi, '') || 'jpg';
}

function downloadZip(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(blobUrl);
    }, 100);
}

export async function handleProfileZipDownload(target: HTMLAnchorElement) {
    if (target.dataset.downloading === 'true') return;

    const username = getProfileUsername();
    if (
        !window.confirm(
            `Download profile media for @${username}? The page will scroll to load posts, then create a ZIP in this tab.`
        )
    ) {
        return;
    }

    const originalTitle = target.title;
    const originalScrollY = window.scrollY;
    target.dataset.downloading = 'true';
    target.title = 'Preparing profile ZIP...';
    updateFloatingProfileZipStatus({
        title: 'Starting profile ZIP',
        detail: `Preparing @${username}`,
    });

    try {
        await loadProfileGrid();
        const permalinks = collectProfilePermalinks();
        updateFloatingProfileZipStatus({
            title: 'Profile media loaded',
            detail: `${permalinks.length} posts/reels found`,
        });
        if (permalinks.length === 0) {
            updateFloatingProfileZipStatus({
                title: 'No profile media found',
                detail: 'No post or reel links were loaded.',
                tone: 'error',
            });
            window.alert('No profile media links were found.');
            return;
        }

        const appId = findAppId();
        if (!appId) {
            updateFloatingProfileZipStatus({
                title: 'Cannot start ZIP',
                detail: 'Instagram app id was not found on this page.',
                tone: 'error',
            });
            window.alert('Cannot find Instagram app id on this page.');
            return;
        }

        updateFloatingProfileZipStatus({
            title: 'Preparing ZIP engine',
            detail: `${permalinks.length} posts/reels queued`,
        });
        const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js');
        const zipFileWriter = new BlobWriter();
        const zipWriter = new ZipWriter(zipFileWriter);
        const usedFilenames = new Set<string>();
        const failures: string[] = [];
        let downloadedCount = 0;

        for (let i = 0; i < permalinks.length; i++) {
            const permalink = permalinks[i];
            const permalinkLabel = getPermalinkLabel(permalink);
            target.title = `Adding ${i + 1}/${permalinks.length} to profile ZIP...`;
            updateFloatingProfileZipStatus({
                title: 'Loading media details',
                detail: permalinkLabel,
                current: i + 1,
                total: permalinks.length,
            });

            try {
                const mediaId = await getMediaIdFromPermalink(permalink);
                const media = await getDataFromMediaId(mediaId, appId);
                if (!media) throw new Error(`Cannot load media info for ${permalink}`);

                const assets = await getMediaAssets(media, username, usedFilenames);
                for (const asset of assets) {
                    updateFloatingProfileZipStatus({
                        title: `Downloading media (${downloadedCount} files added)`,
                        detail: asset.filename,
                        current: i + 1,
                        total: permalinks.length,
                    });
                    const response = await fetch(asset.url, {
                        headers: new Headers({
                            Origin: location.origin,
                        }),
                        mode: 'cors',
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to fetch media: ${response.status}`);
                    }

                    const content = await response.blob();
                    const extension = getBlobExtension(content, asset.url);
                    const filename = `${asset.filename}.${extension}`;
                    updateFloatingProfileZipStatus({
                        title: 'Zipping media',
                        detail: filename,
                        current: i + 1,
                        total: permalinks.length,
                    });
                    await zipWriter.add(filename, new BlobReader(content), {
                        useWebWorkers: false,
                    });
                    downloadedCount++;
                }
            } catch (error) {
                console.error(error);
                failures.push(permalink);
            }

            await delay(DOWNLOAD_DELAY_MS);
        }

        if (downloadedCount === 0) {
            await zipWriter.close();
            updateFloatingProfileZipStatus({
                title: 'Profile ZIP failed',
                detail: 'No media files could be downloaded.',
                tone: 'error',
            });
            window.alert('Profile ZIP failed: no media files could be downloaded.');
            return;
        }

        updateFloatingProfileZipStatus({
            title: 'Finalizing ZIP',
            detail: `${downloadedCount} files zipped${failures.length ? `, ${failures.length} posts failed` : ''}`,
            current: permalinks.length,
            total: permalinks.length,
        });
        const zipContent = await zipWriter.close();
        const zipFilename = `${sanitizeFilename(username)}-profile-media.zip`;
        updateFloatingProfileZipStatus({
            title: 'Starting browser download',
            detail: zipFilename,
            tone: 'success',
            current: permalinks.length,
            total: permalinks.length,
        });
        downloadZip(zipContent, zipFilename);

        if (failures.length > 0) {
            window.alert(`Profile ZIP saved with ${downloadedCount} media files. Failed posts: ${failures.length}.`);
        }
        updateFloatingProfileZipStatus({
            title: 'Download started',
            detail: `${zipFilename} (${downloadedCount} files)`,
            tone: 'success',
            current: permalinks.length,
            total: permalinks.length,
        });
        clearFloatingProfileZipStatus(12000);
    } catch (error) {
        console.error(error);
        updateFloatingProfileZipStatus({
            title: 'Profile ZIP failed',
            detail: error instanceof Error ? error.message : 'Unexpected error while building ZIP.',
            tone: 'error',
        });
        window.alert('Profile ZIP failed. Check the page console for details.');
    } finally {
        delete target.dataset.downloading;
        target.title = originalTitle;
        window.scrollTo(0, originalScrollY);
    }
}
