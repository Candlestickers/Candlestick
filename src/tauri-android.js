import { invoke } from '@tauri-apps/api/core';

const isAndroid = () =>
  !!window.__TAURI_INTERNALS__ && /Android/i.test(navigator.userAgent);

// Convert a Blob to a base64 string (without the data-URL prefix).
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function initAndroidPlatform() {
  if (!isAndroid()) return;

  // Enable CSS env(safe-area-inset-*) variables in the WebView
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.content = viewport.content + ', viewport-fit=cover';
  }

  // Marker class so CSS can scope Android-only rules without affecting web/desktop
  document.documentElement.classList.add('android-app');

  // Save via the native SavePlugin which writes to the public Downloads folder
  // using Android's MediaStore API (API 29+) or Environment.DIRECTORY_DOWNLOADS
  // (API < 29). tauri-plugin-fs's BaseDirectory.Download maps to app-scoped
  // external storage on Android, which is NOT visible in the Files app — hence
  // the custom Kotlin plugin.
  window.saveFileFromWick = async (file, name, extension, successCallback, failureCallback) => {
    try {
      const filename = name + extension;
      const mimeType = file.type || 'application/octet-stream';
      const data = await blobToBase64(file);
      await invoke('plugin:save|saveToDownloads', { filename, mimeType, data });
      successCallback && successCallback();
    } catch (e) {
      console.error('Android save failed:', e);
      failureCallback && failureCallback(e);
    }
  };

  window.wickEditorFileSystemType = 'local';
}
