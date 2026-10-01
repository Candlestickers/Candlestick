import { exists, writeFile } from '@tauri-apps/plugin-fs';
import { initIOSPlatform } from './tauri-ios';

jest.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { Document: 6 },
  exists: jest.fn(),
  writeFile: jest.fn(),
}));

const file = { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
const previousPlatform = process.env.REACT_APP_TAURI_PLATFORM;

beforeEach(() => {
  jest.clearAllMocks();
  window.__TAURI_INTERNALS__ = {};
  process.env.REACT_APP_TAURI_PLATFORM = 'ios';
  window.editor = { toast: jest.fn() };
  exists.mockResolvedValue(false);
  writeFile.mockResolvedValue(undefined);
});

afterEach(() => {
  delete window.__TAURI_INTERNALS__;
  delete window.editor;
  delete window.saveFileFromWick;
  delete window.getSavedWickFiles;
  document.documentElement.classList.remove('ios-app');
  if (previousPlatform === undefined) delete process.env.REACT_APP_TAURI_PLATFORM;
  else process.env.REACT_APP_TAURI_PLATFORM = previousPlatform;
  jest.restoreAllMocks();
});

test('leaves browser file handling unchanged', () => {
  delete window.__TAURI_INTERNALS__;
  const browserSave = jest.fn();
  window.saveFileFromWick = browserSave;
  initIOSPlatform();
  expect(window.saveFileFromWick).toBe(browserSave);
});

test('saves bytes into Documents without overwriting an existing project', async () => {
  exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  initIOSPlatform();
  const success = jest.fn();
  await window.saveFileFromWick(file, 'Sketch', '.wick', success);
  expect(writeFile).toHaveBeenCalledWith('Sketch (2).wick', new Uint8Array([1, 2, 3]), { baseDir: 6 });
  expect(success).toHaveBeenCalledTimes(1);
});

test('serializes simultaneous saves so the second sees the first file', async () => {
  const saved = new Set();
  exists.mockImplementation(async name => saved.has(name));
  writeFile.mockImplementation(async name => { saved.add(name); });
  initIOSPlatform();
  await Promise.all([
    window.saveFileFromWick(file, 'Sketch', '.wick'),
    window.saveFileFromWick(file, 'Sketch', '.wick'),
  ]);
  expect([...saved]).toEqual(['Sketch.wick', 'Sketch (2).wick']);
});

test('keeps path separators and control characters out of exported filenames', async () => {
  initIOSPlatform();
  await window.saveFileFromWick(file, '../folder\\sketch\n', '.wick');
  expect(writeFile.mock.calls[0][0]).toBe('.._folder_sketch_.wick');
});

test('reports a failed write and allows the next save to succeed', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const failure = new Error('disk full');
  writeFile.mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined);
  initIOSPlatform();
  const onFailure = jest.fn();
  const onSuccess = jest.fn();
  await window.saveFileFromWick(file, 'Sketch', '.wick', onSuccess, onFailure);
  expect(onFailure).toHaveBeenCalledWith(failure);
  expect(onSuccess).not.toHaveBeenCalled();
  await window.saveFileFromWick(file, 'Sketch', '.wick', onSuccess);
  expect(onSuccess).toHaveBeenCalledTimes(1);
});
