import { BaseDirectory, exists, writeFile } from '@tauri-apps/plugin-fs';

export const isIOSApp = () =>
  !!window.__TAURI_INTERNALS__ && process.env.REACT_APP_TAURI_PLATFORM === 'ios';

const safeFilenamePart = value => Array.from(value, character =>
  character.charCodeAt(0) < 32 || '/\\:'.includes(character) ? '_' : character
).join('');

export function initIOSPlatform() {
  if (!isIOSApp()) return;

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !viewport.content.includes('viewport-fit')) {
    viewport.content += ', viewport-fit=cover';
  }
  document.documentElement.classList.add('ios-app');

  // File picking stays browser-based; saving uses the app's sandboxed Documents.
  window.getSavedWickFiles = callback => callback([]);
  let saveQueue = Promise.resolve();
  window.saveFileFromWick = (file, name, extension, successCallback, failureCallback) => {
    const save = async () => {
      try {
        const base = safeFilenamePart(name || 'Untitled');
        const suffix = safeFilenamePart(extension || '');
        const options = { baseDir: BaseDirectory.Document };
        let filename = base + suffix;
        let number = 2;
        while (await exists(filename, options)) filename = `${base} (${number++})${suffix}`;
        await writeFile(filename, new Uint8Array(await file.arrayBuffer()), options);
        if (window.editor) window.editor.toast(`Saved ${filename} in Files → On My iPad/iPhone → Candlestick.`, 'success');
        if (successCallback) successCallback();
      } catch (error) {
        console.error('iOS save failed:', error);
        if (window.editor) window.editor.toast('Could not save the file. Check available device storage.', 'error');
        if (failureCallback) failureCallback(error);
      }
    };
    saveQueue = saveQueue.then(save, save);
    return saveQueue;
  };
}
