import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.scss';

import { CONFIG_LIST, DEFAULT_DATETIME_FORMAT, DEFAULT_FILENAME_FORMAT } from '../constants';
import SettingItem from './SettingItem';

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

   const isMobile = navigator && navigator.userAgent && /Mobi|Android|iPhone/i.test(navigator.userAgent);
   const version = chrome.runtime.getManifest().version;

   useEffect(() => {
      chrome.storage.sync.get(CONFIG_LIST).then((res) => {
         setNewTab(!!res.setting_show_open_in_new_tab_icon);
         setThreads(!!res.setting_enable_threads);
         setEnableVideoControl(!!res.setting_enable_video_controls);
         setEnableExploreClickthrough(res.setting_enable_explore_video_clickthrough ?? true);
         setReplaceJpegWithJpg(!!res.setting_format_replace_jpeg_with_jpg);
         setUseIndexing(!!res.setting_format_use_indexing);
         setEnableDatetimeFormat(!!res.setting_enable_datetime_format);
         setEnableZipDownload(!!res.setting_show_zip_download_icon);

         setFileNameFormat(res.setting_format_filename || DEFAULT_FILENAME_FORMAT);
         setDateTimeFormat(res.setting_format_datetime || DEFAULT_DATETIME_FORMAT);
      });
   }, []);


   return (
      <>
         <main className={'container ' + (isMobile ? 'mobile' : '')}>
            <header className="popup-header">
               <div>
                  <p>Media Resources Enhancer</p>
                  <h1>Downloads</h1>
               </div>
               <span>v{version}</span>
            </header>

            <div className="settings">
               <h2>Controls</h2>
               <SettingItem
                  value={newTab}
                  setValue={setNewTab}
                  label="Open in new tab"
                  id="setting_show_open_in_new_tab_icon"
               />
               <SettingItem
                  value={enableZipDownload}
                  setValue={setEnableZipDownload}
                  label="ZIP download"
                  id="setting_show_zip_download_icon"
               />

               <h2>File names</h2>
               <SettingItem
                  value={replaceJpegWithJpg}
                  setValue={setReplaceJpegWithJpg}
                  label="Replace .jpeg with .jpg"
                  id="setting_format_replace_jpeg_with_jpg"
               />
               <SettingItem
                  value={useIndexing}
                  setValue={setUseIndexing}
                  label="Carousel index"
                  id="setting_format_use_indexing"
               />

               <div className="group">
                  <input
                     type="text"
                     value={fileNameFormat}
                     onChange={(e) => {
                        const value = (e.target as HTMLInputElement).value;
                        setFileNameFormat(value);
                        chrome.storage.sync.set({ setting_format_filename: value || DEFAULT_FILENAME_FORMAT });
                     }}
                  />
                  <span className="highlight"></span>
                  <span className="bar"></span>
                  <label>Filename format</label>
               </div>
               <p className="hint">Tags: {'{username}, {id}, {datetime}, {type}'}</p>

               <SettingItem
                  value={enableDatetimeFormat}
                  setValue={setEnableDatetimeFormat}
                  label="Datetime format"
                  id="setting_enable_datetime_format"
               />

               {enableDatetimeFormat && (
                  <div className="group">
                     <input
                        type="text"
                        value={dateTimeFormat}
                        onChange={(e) => {
                           const value = (e.target as HTMLInputElement).value;
                           setDateTimeFormat(value);
                           chrome.storage.sync.set({ setting_format_datetime: value || DEFAULT_DATETIME_FORMAT });
                        }}
                     />
                     <span className="highlight"></span>
                     <span className="bar"></span>
                     <label>Datetime format</label>
                  </div>
               )}

               <h2>Video</h2>
               <SettingItem
                  value={enableVideoControl}
                  setValue={setEnableVideoControl}
                  label="Browser controls"
                  id="setting_enable_video_controls"
               />
               <SettingItem
                  value={enableExploreClickthrough}
                  setValue={setEnableExploreClickthrough}
                  label="Explore clickthrough"
                  id="setting_enable_explore_video_clickthrough"
               />

               <h2>Threads</h2>
               <SettingItem value={threads} setValue={setThreads} label="Downloads" id="setting_enable_threads" />

               <div className="repo-links" aria-label="Repository links">
                  <span>GitHub</span>
                  <a
                     target="_blank"
                     rel="noopener noreferrer"
                     href="https://github.com/TheKonka/instagram-download-browser-extension"
                  >
                     Original
                  </a>
                  <a
                     target="_blank"
                     rel="noopener noreferrer"
                     href="https://github.com/XppaiCyberr/instagram-download-browser-extension"
                  >
                     XppaiCyberr fork
                  </a>
               </div>
            </div>
         </main>
      </>
   );
}

createRoot(document.getElementById('root')!).render(
   <React.StrictMode>
      <App />
   </React.StrictMode>
);
