import VideoExport, { getFFmpegBaseURL } from './VideoExport'

describe('FFmpeg asset URLs', () => {
  test.each([
    ['.', 'https://candlestickers.app/', 'https://candlestickers.app/corelibs/ffmpeg/'],
    ['./', 'https://candlestickers.app/', 'https://candlestickers.app/corelibs/ffmpeg/'],
    ['', 'http://localhost:3000/', 'http://localhost:3000/corelibs/ffmpeg/'],
    ['/', 'https://candlestickers.app/test/', 'https://candlestickers.app/corelibs/ffmpeg/'],
    ['/test', 'https://candlestickers.app/test/', 'https://candlestickers.app/test/corelibs/ffmpeg/'],
    ['/test/', 'https://candlestickers.app/test/', 'https://candlestickers.app/test/corelibs/ffmpeg/'],
    ['.', 'https://candlestickers.app/test/?example=demo', 'https://candlestickers.app/test/corelibs/ffmpeg/'],
    ['https://candlestickers.app/test/', 'https://candlestickers.app/', 'https://candlestickers.app/test/corelibs/ffmpeg/'],
    ['.', 'tauri://localhost/', 'tauri://localhost/corelibs/ffmpeg/'],
  ])('resolves %s against %s', (publicURL, documentURL, expected) => {
    const result = getFFmpegBaseURL(publicURL, documentURL)
    expect(result).toBe(expected)
    expect(new URL(result).origin).toBe(new URL(documentURL).origin)
  })

  test('loads the UMD script and encoder assets from the resolved directory', async () => {
    const previousPublicURL = process.env.PUBLIC_URL
    const previousFFmpeg = window.FFmpegWASM
    const previousSave = window.saveFileFromWick
    process.env.PUBLIC_URL = '.'
    delete window.FFmpegWASM
    const encoder = {
      on: jest.fn(),
      load: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      exec: jest.fn().mockResolvedValue(0),
      readFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
    window.saveFileFromWick = jest.fn()
    let scriptURL
    const append = jest.spyOn(document.head, 'appendChild').mockImplementation(script => {
      scriptURL = script.src
      window.FFmpegWASM = { FFmpeg: jest.fn(() => encoder) }
      script.onload()
      return script
    })
    try {
      await VideoExport._generateVideo({
        images: [{ name: 'frame000000000000.jpg', data: new Uint8Array([1]) }],
        audio: null,
        args: { project: { name: 'Test', width: 100, height: 100, framerate: 12 } },
      })
      const base = new URL('./corelibs/ffmpeg/', document.baseURI).href
      expect(scriptURL).toBe(base + 'ffmpeg.umd.js')
      expect(encoder.load).toHaveBeenCalledWith({
        coreURL: base + 'ffmpeg-core.js',
        wasmURL: base + 'ffmpeg-core.wasm',
      })
      expect(window.saveFileFromWick).toHaveBeenCalledWith(expect.any(Blob), 'Test', '.mp4')
    } finally {
      append.mockRestore()
      if (previousPublicURL === undefined) delete process.env.PUBLIC_URL
      else process.env.PUBLIC_URL = previousPublicURL
      if (previousFFmpeg === undefined) delete window.FFmpegWASM
      else window.FFmpegWASM = previousFFmpeg
      if (previousSave === undefined) delete window.saveFileFromWick
      else window.saveFileFromWick = previousSave
    }
  })
})
