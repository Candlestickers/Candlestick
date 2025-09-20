// preload.js
const path = require('path');

// compute resource path for dev vs packaged app
const isDev = !!process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development';

try {
  // When running dev `ELECTRON_START_URL` is set in your scripts (electron-dev-...).
  // When packaged, process.resourcesPath points to the app resources folder.
  const resourcePath = isDev
    ? path.join(__dirname, 'public', 'static')            // adjust if your dev static path differs
    : path.join(process.resourcesPath, 'static');         // typical electron-builder packing

  // Make sure we do not throw if window is not available for some reason
  if (typeof window !== 'undefined') {
    // Inject the legacy global the app expects
    window.resourcepath = resourcePath;
    // Also add a tiny helper if you want
    window.__appResourcePath = resourcePath;
  }
} catch (err) {
  // preloads run early; just log if anything unexpected happens
  try { console.error('preload error', err); } catch(e) {}
}
