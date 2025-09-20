// electron.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,     // keep nodeIntegration off for renderer
      contextIsolation: false,    // <- allow preload to set window.* directly (legacy)
      enableRemoteModule: true,   // some old code expects remote (if you don't need it, set false)
    },
  });

  // load dev URL if present, otherwise load built index.html
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(startUrl);

  // during debugging it's useful to open devtools
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

// Graceful mac behavior
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
