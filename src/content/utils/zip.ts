import dayjs from "dayjs";
import { MESSAGE_ZIP_DOWNLOAD } from "../../constants";
import { getDataFromAPI, getImgOrVideoUrl } from "./fn";
import { getFilenameFromUrl } from "./filename";
import { MediaType } from "../../constants";
import { storageCache } from "./storage";

function isVideoResource(resource: any): boolean {
    return Array.isArray(resource?.video_versions) && resource.video_versions.length > 0;
}

async function handleZipFirefox(articleNode: HTMLElement) {
    const data = await getDataFromAPI(articleNode);
    if (!data) return;

    const { setting_download_media_filter = 'all' } = storageCache.settings;
    const blobList = [];

    if (data.caption) {
        blobList.push({
            filename: "caption.txt",
            content: data.caption.text,
        });
    }

    if ('carousel_media' in data) {
        const list = await Promise.all(
            data.carousel_media.map(async (resource: any, index: number) => {
                const isVideo = isVideoResource(resource);
                if (setting_download_media_filter === 'image' && isVideo) return null;
                if (setting_download_media_filter === 'video' && !isVideo) return null;

                const url = getImgOrVideoUrl(resource);
                const filename = await getFilenameFromUrl({
                    url: url,
                    username: resource.owner?.username || data.owner.username,
                    datetime: dayjs.unix(resource.taken_at),
                    id: resource.pk,
                    index: index + 1,
                    type: MediaType.Post,
                });
                const response = await fetch(url, {
                    headers: new Headers({
                        Origin: location.origin,
                    }),
                    mode: 'cors',
                });
                if (!response.ok) {
                    console.error(`Failed to fetch ${url}`);
                    return null;
                }
                const content = await response.blob();
                return { filename: `${(index + 1).toString().padStart(2, '0')}-${filename}`, content };
            })
        );
        const filteredList = list.filter((e) => e);
        if (filteredList.length === 0) {
            alert(`No media matched your filter ("${setting_download_media_filter === 'image' ? 'Images Only' : 'Videos Only'}").`);
            return;
        }
        blobList.push(...filteredList);
    } else {
        const isVideo = isVideoResource(data);
        if (setting_download_media_filter === 'image' && isVideo) {
            alert('Skipped ZIP download: Post is a video (Filter: Images Only).');
            return;
        }
        if (setting_download_media_filter === 'video' && !isVideo) {
            alert('Skipped ZIP download: Post is an image (Filter: Videos Only).');
            return;
        }

        const url = getImgOrVideoUrl(data);
        const response = await fetch(url, {
            headers: new Headers({
                Origin: location.origin,
            }),
            mode: 'cors',
        });
        if (!response.ok) {
            console.error(`Failed to fetch ${url}`);
            return;
        }
        const filename = await getFilenameFromUrl({
            url: url,
            username: data.owner.username,
            datetime: dayjs.unix(data.taken_at),
            id: data.code || data.id,
        });
        const content = await response.blob();
        blobList.push({ filename, content });
    }

    chrome.runtime.sendMessage({
        type: MESSAGE_ZIP_DOWNLOAD,
        data: {
            blobList,
            zipFileName: await getFilenameFromUrl({
                url: '',
                username: data.owner.username,
                datetime: dayjs.unix(data.taken_at),
                id: data.code || data.id,
                type: MediaType.Post,
            }),
        },
    });
}

async function handleZipChrome(articleNode: HTMLElement) {
    const { BlobReader, BlobWriter, TextReader, ZipWriter } = await import("@zip.js/zip.js");
    const data = await getDataFromAPI(articleNode);
    if (!data) return;

    const { setting_download_media_filter = 'all', setting_format_replace_jpeg_with_jpg } = storageCache.settings;
    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter);
    let addedCount = 0;

    if (data.caption) {
        await zipWriter.add("caption.txt", new TextReader(data.caption.text), { useWebWorkers: false });
    }

    if ('carousel_media' in data) {
        for (let i = 0; i < data.carousel_media.length; i++) {
            const resource = data.carousel_media[i];
            const isVideo = isVideoResource(resource);
            if (setting_download_media_filter === 'image' && isVideo) continue;
            if (setting_download_media_filter === 'video' && !isVideo) continue;

            const url = getImgOrVideoUrl(resource);
            const response = await fetch(url, {
                headers: new Headers({
                    Origin: location.origin,
                }),
                mode: 'cors',
            });
            if (!response.ok) {
                console.error(`Failed to fetch ${url}`);
                continue;
            }
            const content = await response.blob();
            const filename = await getFilenameFromUrl({
                url: url,
                username: resource.owner?.username || data.owner.username,
                datetime: dayjs.unix(resource.taken_at),
                id: resource.pk,
                index: i + 1,
            });
            let extension = content.type.split('/').pop() || 'jpg';
            if (setting_format_replace_jpeg_with_jpg) {
                extension = extension.replace('jpeg', 'jpg');
            }
            await zipWriter.add(
                `${(i + 1).toString().padStart(2, '0')}-${filename}.${extension}`,
                new BlobReader(content), { useWebWorkers: false }
            );
            addedCount++;
        }

        if (addedCount === 0) {
            await zipWriter.close();
            alert(`No media matched your filter ("${setting_download_media_filter === 'image' ? 'Images Only' : 'Videos Only'}").`);
            return;
        }
    } else {
        const isVideo = isVideoResource(data);
        if (setting_download_media_filter === 'image' && isVideo) {
            alert('Skipped ZIP download: Post is a video (Filter: Images Only).');
            return;
        }
        if (setting_download_media_filter === 'video' && !isVideo) {
            alert('Skipped ZIP download: Post is an image (Filter: Videos Only).');
            return;
        }

        const url = getImgOrVideoUrl(data);
        const response = await fetch(url, {
            headers: new Headers({
                Origin: location.origin,
            }),
            mode: 'cors',
        });
        if (!response.ok) {
            console.error(`Failed to fetch ${url}`);
            return;
        }
        const filename = await getFilenameFromUrl({
            url: url,
            username: data.owner.username,
            datetime: dayjs.unix(data.taken_at),
            id: data.code || data.id,
        });
        const content = await response.blob();
        let extension = content.type.split('/').pop() || 'jpg';
        if (setting_format_replace_jpeg_with_jpg) {
            extension = extension.replace('jpeg', 'jpg');
        }
        await zipWriter.add(filename + '.' + extension, new BlobReader(content), {
            useWebWorkers: false,
        });
    }

    const zipContent = await zipWriter.close();
    const blobUrl = URL.createObjectURL(zipContent);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = await getFilenameFromUrl({
        url: '',
        username: data.owner.username,
        datetime: dayjs.unix(data.taken_at),
        id: data.code || data.id,
        type: MediaType.Post,
    }) + '.zip';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(blobUrl);
    }, 100);
}

export function handleZipDownload(articleNode: HTMLElement) {
    const isFirefox = /Firefox/.test(window.navigator.userAgent);
    return isFirefox ? handleZipFirefox(articleNode) : handleZipChrome(articleNode);
}
