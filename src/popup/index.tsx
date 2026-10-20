import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
import './index.scss';

import { CONFIG_LIST, DEFAULT_DATETIME_FORMAT, DEFAULT_FILENAME_FORMAT } from '../constants';
import SettingItem from './SettingItem';

const DATETIME_PRESETS = [
   { label: 'YYYYMMDD_HHmmss', value: 'YYYYMMDD_HHmmss' },
   { label: 'YYYY-MM-DD_HH-mm', value: 'YYYY-MM-DD_HH-mm' },
   { label: 'YYYY.MM.DD', value: 'YYYY.MM.DD' },
   { label: 'YYYYMMDD', value: 'YYYYMMDD' },
];

const AVAILABLE_TAGS = [
   { tag: '{username}', label: 'Username', desc: 'Author handle' },
   { tag: '{id}', label: 'Post ID', desc: 'Unique post identifier' },
   { tag: '{datetime}', label: 'Datetime', desc: 'Formatted publication time' },
   { tag: '{type}', label: 'Media Type', desc: 'POST, REEL, STOR, etc.' },
];

function App() {
   const [newTab, setNewTab] = useState<boolean>(true);
   const [threads, setThreads] = useState<boolean>(true);
   const [enableVideoControl, setEnableVideoControl] = useState<boolean>(true);
   const [enableExploreClickthrough, setEnableExploreClickthrough] = useState<boolean>(true);
   const [replaceJpegWithJpg, setReplaceJpegWithJpg] = useState<boolean>(true);
   const [useIndexing, setUseIndexing] = useState<boolean>(true);
   const [enableDatetimeFormat, setEnableDatetimeFormat] = useState<boolean>(true);
   const [enableZipDownload, setEnableZipDownload] = useState<boolean>(true);

   const [fileNameFormat, setFileNameFormat] = useState<string>(DEFAULT_FILENAME_FORMAT);
   const [dateTimeFormat, setDateTimeFormat] = useState<string>(DEFAULT_DATETIME_FORMAT);
   const [savedToast, setSavedToast] = useState<boolean>(false);
   const [activeTab, setActiveTab] = useState<'settings' | 'about'>('settings');

   const filenameInputRef = useRef<HTMLInputElement>(null);
   const toastTimeoutRef = useRef<number | undefined>(undefined);

   const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
   const version = typeof chrome !== 'undefined' && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : '2.4.9';

   const triggerSaved = () => {
      if (toastTimeoutRef.current) {
         window.clearTimeout(toastTimeoutRef.current);
      }
      setSavedToast(true);
      toastTimeoutRef.current = window.setTimeout(() => {
         setSavedToast(false);
      }, 1500);
   };

   useEffect(() => {
      chrome.storage.sync.get(CONFIG_LIST).then((res) => {
         if (res.setting_show_open_in_new_tab_icon !== undefined) setNewTab(!!res.setting_show_open_in_new_tab_icon);
         if (res.setting_enable_threads !== undefined) setThreads(!!res.setting_enable_threads);
         if (res.setting_enable_video_controls !== undefined) setEnableVideoControl(!!res.setting_enable_video_controls);
         if (res.setting_enable_explore_video_clickthrough !== undefined) setEnableExploreClickthrough(!!res.setting_enable_explore_video_clickthrough);
         if (res.setting_format_replace_jpeg_with_jpg !== undefined) setReplaceJpegWithJpg(!!res.setting_format_replace_jpeg_with_jpg);
         if (res.setting_format_use_indexing !== undefined) setUseIndexing(!!res.setting_format_use_indexing);
         if (res.setting_enable_datetime_format !== undefined) setEnableDatetimeFormat(!!res.setting_enable_datetime_format);
         if (res.setting_show_zip_download_icon !== undefined) setEnableZipDownload(!!res.setting_show_zip_download_icon);

         if (res.setting_format_filename) setFileNameFormat(res.setting_format_filename);
         if (res.setting_format_datetime) setDateTimeFormat(res.setting_format_datetime);
      });
   }, []);

   const handleResetDefaults = () => {
      const defaults = {
         setting_show_open_in_new_tab_icon: true,
         setting_show_zip_download_icon: true,
         setting_format_replace_jpeg_with_jpg: true,
         setting_format_use_indexing: true,
         setting_enable_datetime_format: true,
         setting_enable_video_controls: true,
         setting_enable_explore_video_clickthrough: true,
         setting_enable_threads: true,
         setting_format_filename: DEFAULT_FILENAME_FORMAT,
         setting_format_datetime: DEFAULT_DATETIME_FORMAT,
      };

      chrome.storage.sync.set(defaults).then(() => {
         setNewTab(true);
         setEnableZipDownload(true);
         setReplaceJpegWithJpg(true);
         setUseIndexing(true);
         setEnableDatetimeFormat(true);
         setEnableVideoControl(true);
         setEnableExploreClickthrough(true);
         setThreads(true);
         setFileNameFormat(DEFAULT_FILENAME_FORMAT);
         setDateTimeFormat(DEFAULT_DATETIME_FORMAT);
         triggerSaved();
      });
   };

   const insertTag = (tag: string) => {
      const input = filenameInputRef.current;
      let newFormat: string;
      if (input && input.selectionStart !== null && input.selectionEnd !== null) {
         const start = input.selectionStart;
         const end = input.selectionEnd;
         newFormat = fileNameFormat.substring(0, start) + tag + fileNameFormat.substring(end);
         setFileNameFormat(newFormat);
         setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + tag.length, start + tag.length);
         }, 0);
      } else {
         newFormat = fileNameFormat ? `${fileNameFormat}-${tag}` : tag;
         setFileNameFormat(newFormat);
      }
      chrome.storage.sync.set({ setting_format_filename: newFormat || DEFAULT_FILENAME_FORMAT });
      triggerSaved();
   };

   // Real-time simulated filename preview
   const sampleDate = dayjs();
   const formattedDate = enableDatetimeFormat
      ? sampleDate.format(dateTimeFormat || DEFAULT_DATETIME_FORMAT)
      : sampleDate.unix().toString();

   const simulatedId = useIndexing ? '17928374901_1' : '17928374901';
   const simulatedName = (fileNameFormat || DEFAULT_FILENAME_FORMAT)
      .replace(/{username}/g, 'instagram')
      .replace(/{datetime}/g, formattedDate)
      .replace(/{id}/g, simulatedId)
      .replace(/{type}/g, 'POST');

   const previewExtension = replaceJpegWithJpg ? 'jpg' : 'jpeg';
   const livePreviewFilename = `${simulatedName}.${previewExtension}`;

   return (
      <main className={`popup-container ${isMobile ? 'mobile' : ''}`}>
         {/* Top Instagram Accent Bar */}
         <div className="accent-bar" />

         {/* Header */}
         <header className="popup-header">
            <div className="header-brand">
               <div className="logo-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                     <polyline points="7 10 12 15 17 10" />
                     <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
               </div>
               <div className="brand-titles">
                  <h1>Media Resources</h1>
                  <p>Instagram & Threads Enhancer</p>
               </div>
            </div>

            <div className="header-actions">
               <span className="version-pill">v{version}</span>
               <button
                  type="button"
                  className="reset-btn"
                  onClick={handleResetDefaults}
                  title="Reset all settings to default"
               >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                     <polyline points="1 4 1 10 7 10" />
                     <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span>Reset</span>
               </button>
            </div>
         </header>

         {/* Live Save Status Banner */}
         <div className={`save-status-banner ${savedToast ? 'visible' : ''}`}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Settings saved</span>
         </div>

         {/* Navigation Tabs */}
         <nav className="popup-nav">
            <button
               type="button"
               className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
               onClick={() => setActiveTab('settings')}
            >
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
               </svg>
               <span>Configuration</span>
            </button>
            <button
               type="button"
               className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
               onClick={() => setActiveTab('about')}
            >
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
               </svg>
               <span>About & Help</span>
            </button>
         </nav>

         {activeTab === 'settings' ? (
            <div className="settings-body">
               {/* SECTION 1: DOWNLOAD CONTROLS */}
               <section className="settings-card">
                  <div className="card-header">
                     <span className="card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                           <path d="M12 12v9" />
                           <path d="m8 17 4 4 4-4" />
                        </svg>
                     </span>
                     <h2>Downloads & Actions</h2>
                  </div>

                  <div className="card-content">
                     <SettingItem
                        value={newTab}
                        setValue={setNewTab}
                        label="Open in new tab"
                        description="Adds a 1-click icon to view media in full resolution"
                        id="setting_show_open_in_new_tab_icon"
                        onChange={triggerSaved}
                     />
                     <SettingItem
                        value={enableZipDownload}
                        setValue={setEnableZipDownload}
                        label="ZIP downloads"
                        description="Enable ZIP icon for carousels and whole profile downloads"
                        badge="Popular"
                        id="setting_show_zip_download_icon"
                        onChange={triggerSaved}
                     />
                  </div>
               </section>

               {/* SECTION 2: FILE NAMING & FORMAT */}
               <section className="settings-card highlight-card">
                  <div className="card-header">
                     <span className="card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                           <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                     </span>
                     <h2>File Naming & Preview</h2>
                  </div>

                  <div className="card-content">
                     {/* Live Preview Box */}
                     <div className="preview-container">
                        <div className="preview-header">
                           <span className="preview-badge">Live Preview</span>
                           <span className="preview-note">Sample output file name</span>
                        </div>
                        <div className="preview-content">
                           <code>{livePreviewFilename}</code>
                        </div>
                     </div>

                     {/* Filename Format Input */}
                     <div className="input-group">
                        <label htmlFor="filename-format-input" className="input-label">
                           Filename Format Pattern
                        </label>
                        <div className="input-wrapper">
                           <input
                              id="filename-format-input"
                              ref={filenameInputRef}
                              type="text"
                              className="text-input"
                              value={fileNameFormat}
                              placeholder={DEFAULT_FILENAME_FORMAT}
                              onChange={(e) => {
                                 const val = (e.target as HTMLInputElement).value;
                                 setFileNameFormat(val);
                                 chrome.storage.sync.set({ setting_format_filename: val || DEFAULT_FILENAME_FORMAT });
                                 triggerSaved();
                              }}
                           />
                        </div>
                     </div>

                     {/* Tag Chips for 1-click insertion */}
                     <div className="tag-chips-section">
                        <p className="chips-title">Click to insert tags:</p>
                        <div className="tag-chips-list">
                           {AVAILABLE_TAGS.map((item) => (
                              <button
                                 type="button"
                                 key={item.tag}
                                 className="tag-chip"
                                 onClick={() => insertTag(item.tag)}
                                 title={item.desc}
                              >
                                 <span className="plus-sign">+</span>
                                 <span className="tag-name">{item.tag}</span>
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="divider" />

                     {/* Datetime Format Toggle */}
                     <SettingItem
                        value={enableDatetimeFormat}
                        setValue={setEnableDatetimeFormat}
                        label="Format publication datetime"
                        description="Converts raw Unix timestamp into readable date"
                        id="setting_enable_datetime_format"
                        onChange={triggerSaved}
                     />

                     {enableDatetimeFormat && (
                        <div className="sub-settings-block">
                           <div className="input-group">
                              <label htmlFor="datetime-format-input" className="input-label">
                                 Date Pattern String
                              </label>
                              <input
                                 id="datetime-format-input"
                                 type="text"
                                 className="text-input"
                                 value={dateTimeFormat}
                                 placeholder={DEFAULT_DATETIME_FORMAT}
                                 onChange={(e) => {
                                    const val = (e.target as HTMLInputElement).value;
                                    setDateTimeFormat(val);
                                    chrome.storage.sync.set({ setting_format_datetime: val || DEFAULT_DATETIME_FORMAT });
                                    triggerSaved();
                                 }}
                              />
                           </div>

                           {/* Datetime Preset Buttons */}
                           <div className="datetime-presets">
                              <span className="presets-label">Presets:</span>
                              <div className="preset-buttons">
                                 {DATETIME_PRESETS.map((preset) => (
                                    <button
                                       type="button"
                                       key={preset.value}
                                       className={`preset-btn ${dateTimeFormat === preset.value ? 'selected' : ''}`}
                                       onClick={() => {
                                          setDateTimeFormat(preset.value);
                                          chrome.storage.sync.set({ setting_format_datetime: preset.value });
                                          triggerSaved();
                                       }}
                                    >
                                       {preset.label}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </div>
                     )}

                     <div className="divider" />

                     <SettingItem
                        value={replaceJpegWithJpg}
                        setValue={setReplaceJpegWithJpg}
                        label="Replace .jpeg with .jpg"
                        description="Saves image files with standard three-letter extension"
                        id="setting_format_replace_jpeg_with_jpg"
                        onChange={triggerSaved}
                     />

                     <SettingItem
                        value={useIndexing}
                        setValue={setUseIndexing}
                        label="Carousel numbering"
                        description="Appends sequential index (_1, _2) to multi-item post files"
                        id="setting_format_use_indexing"
                        onChange={triggerSaved}
                     />
                  </div>
               </section>

               {/* SECTION 3: VIDEO CONTROLS */}
               <section className="settings-card">
                  <div className="card-header">
                     <span className="card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <polygon points="23 7 16 12 23 17 23 7" />
                           <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                     </span>
                     <h2>Video & Player Controls</h2>
                  </div>

                  <div className="card-content">
                     <SettingItem
                        value={enableVideoControl}
                        setValue={setEnableVideoControl}
                        label="Native video controls"
                        description="Show browser seekbar, volume, and fullscreen buttons"
                        id="setting_enable_video_controls"
                        onChange={triggerSaved}
                     />
                     <SettingItem
                        value={enableExploreClickthrough}
                        setValue={setEnableExploreClickthrough}
                        label="Explore page clickthrough"
                        description="Allows clicking video cards in Explore to open their posts"
                        id="setting_enable_explore_video_clickthrough"
                        onChange={triggerSaved}
                     />
                  </div>
               </section>

               {/* SECTION 4: PLATFORMS */}
               <section className="settings-card">
                  <div className="card-header">
                     <span className="card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A4.94 4.94 0 0 1 7.07 12 1 1 0 0 1 9.06 12a2.94 2.94 0 0 0 2.94 2.94 1 1 0 0 1 1 1zm-1-4.93a3 3 0 1 1 3-3 3 3 0 0 1-3 3z" />
                        </svg>
                     </span>
                     <h2>Integrations</h2>
                  </div>

                  <div className="card-content">
                     <SettingItem
                        value={threads}
                        setValue={setThreads}
                        label="Threads.net downloads"
                        description="Inject media download and new tab buttons on Threads"
                        id="setting_enable_threads"
                        onChange={triggerSaved}
                     />
                  </div>
               </section>
            </div>
         ) : (
            /* ABOUT & HELP TAB */
            <div className="about-body">
               <div className="about-hero">
                  <div className="hero-icon">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                     </svg>
                  </div>
                  <h3>Media Resources Enhancer</h3>
                  <p className="version-text">Version {version} • Open Source</p>
                  <p className="hero-desc">
                     Easily download photos, videos, carousels, stories, reels, highlights, and entire profile media in high quality.
                  </p>
               </div>

               <div className="about-tips">
                  <h4>Quick Tips</h4>
                  <ul>
                     <li>
                        <strong>Whole Profile ZIP:</strong> Visit any Instagram profile page to reveal the floating ZIP badge in the top right corner.
                     </li>
                     <li>
                        <strong>Carousels:</strong> Click the ZIP button on multi-item posts to download all photos and videos packed in a single archive.
                     </li>
                     <li>
                        <strong>Video Covers:</strong> Hover over reel covers in grids to download original thumbnail imagery.
                     </li>
                  </ul>
               </div>

               <div className="about-links">
                  <h4>Repositories & Links</h4>
                  <a
                     className="external-link-card"
                     target="_blank"
                     rel="noopener noreferrer"
                     href="https://github.com/XppaiCyberr/instagram-download-browser-extension"
                  >
                     <div className="link-info">
                        <span className="link-title">XppaiCyber Fork Repository</span>
                        <span className="link-sub">Latest updates, issues & pull requests</span>
                     </div>
                     <span className="arrow-icon">→</span>
                  </a>

                  <a
                     className="external-link-card"
                     target="_blank"
                     rel="noopener noreferrer"
                     href="https://github.com/TheKonka/instagram-download-browser-extension"
                  >
                     <div className="link-info">
                        <span className="link-title">Original Repository</span>
                        <span className="link-sub">Created by TheKonka</span>
                     </div>
                     <span className="arrow-icon">→</span>
                  </a>
               </div>
            </div>
         )}

         {/* Footer */}
         <footer className="popup-footer">
            <div className="footer-links">
               <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/XppaiCyberr/instagram-download-browser-extension"
               >
                  GitHub
               </a>
               <span className="dot">•</span>
               <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/XppaiCyberr/instagram-download-browser-extension/issues"
               >
                  Report Issue
               </a>
               <span className="dot">•</span>
               <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://qaq.dad/sponsor"
               >
                  Sponsor
               </a>
            </div>
            <p className="copyright">Made with ♥ for Instagram & Threads enthusiasts</p>
         </footer>
      </main>
   );
}

createRoot(document.getElementById('root')!).render(
   <React.StrictMode>
      <App />
   </React.StrictMode>
);
