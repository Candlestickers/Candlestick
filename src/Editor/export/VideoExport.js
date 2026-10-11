import AudioExport from './AudioExport'

var ENABLE_LOGGING = false
var EXPORT_IMAGE_START = 10
var EXPORT_AUDIO_START = 40
var EXPORT_VIDEO_START = 70

const isAndroid = () => /Android/i.test(navigator.userAgent)

export const getFFmpegBaseURL = (publicURL, documentURL) =>
  new URL(`${(publicURL || '.').replace(/\/+$/, '')}/corelibs/ffmpeg/`, documentURL).href

// On Android, system ffmpeg is not available so we skip the native path and use
// the web ffmpeg (WASM) path instead, which runs fine inside the Tauri WebView.
const isTauri = () =>
  !!(window.__TAURI__ && !isAndroid() && (window.__TAURI__.invoke || (window.__TAURI__.tauri && window.__TAURI__.tauri.invoke)))


class VideoExport {

  static renderVideo = async (args) => {
    if (isTauri()) {
      const images = await VideoExport._generateProjectImages(args)
      args.soundInfo = [...args.project.soundsPlayed]
      const audio = await VideoExport._generateAudioFile(args)
      await VideoExport._exportNativeMP4({ images, audio, args })
    } else {
      // Render directly into the encoder instead of retaining all frames here.
      await VideoExport._generateVideo({ args })
    }
  }

  static _generateAudioFile = async (args) => {
    let { onProgress } = args
    onProgress && onProgress('Generating Audio Track...', EXPORT_AUDIO_START)
    return AudioExport.generateAudioFile(args)
  }

  static _generateProjectImages = async (args) => {

    let { project, onProgress } = args
    let dimensions = VideoExport._ensureValidDimensions(
      args.width || project.width,
      args.height || project.height
    )

    onProgress && onProgress('Rendering Images', EXPORT_IMAGE_START)

    return new Promise((resolve, reject) => {
      const imageData = []
      let frameNumber = 0
      project.generateImageSequence({
        imageType: 'image/jpeg',
        width: dimensions.width,
        height: dimensions.height,
        onProgress: (currentFrame, numTotalFrames) => {
          const progress = EXPORT_IMAGE_START + (currentFrame / numTotalFrames) * 20
          onProgress && onProgress('Rendering Frame ' + currentFrame + '/' + numTotalFrames, progress)
        },
        onFrame: async blob => {
          const name = 'frame' + String(frameNumber++).padStart(12, '0') + '.jpg'
          const frame = { name, data: new Uint8Array(await blob.arrayBuffer()) }
          if (args.onFrame) await args.onFrame(frame)
          else imageData.push(frame)
        },
        onError: reject,
        onFinish: () => resolve(imageData),
      })
    })
  }

  // ----------------------------
  // 🖥️ Native Tauri exporter
  // ----------------------------

  static _exportNativeMP4 = async ({ images, audio, args }) => {
    let { project, onProgress, onFinish } = args

    onProgress('Encoding MP4 (native ffmpeg)...', EXPORT_VIDEO_START)

    let invoke =
      (window.__TAURI__ && window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) ||
      (window.__TAURI__ && window.__TAURI__.invoke)

    if (!invoke) {
      throw new Error('Tauri invoke not available (window.__TAURI__.invoke missing)')
    }


    await invoke('render_video_ffmpeg', {
      frames: images,
      audio: audio ? Array.from(new Uint8Array(audio)) : null,
      fps: project.framerate,
      width: project.width,
      height: project.height,
      name: project.name
    })

    onProgress('Rendering Complete! Downloading...', 100)
    onFinish()
  }

  // ----------------------------
  // 🌐 Original web ffmpeg worker
  // ----------------------------

  static _generateVideo = async ({ images, audio, args }) => {
    let { project, onProgress, onFinish } = args

    // Resolve relative PUBLIC_URL values (including CRA's ".") as paths, not hostnames.
    const baseURL = getFFmpegBaseURL(process.env.PUBLIC_URL, document.baseURI)

    // Load the UMD bundle via script tag instead of letting webpack bundle the ESM version.
    // The ESM build creates a { type: 'module' } worker which disables importScripts(),
    // causing webpack to intercept the dynamic import(coreURL) and fail at runtime.
    // The UMD build creates a classic worker that uses importScripts() correctly.
    if (!window.FFmpegWASM) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = baseURL + 'ffmpeg.umd.js'
        script.onload = resolve
        script.onerror = () => reject(new Error('Failed to load ffmpeg.umd.js'))
        document.head.appendChild(script)
      })
    }
    const { FFmpeg } = window.FFmpegWASM
    const ffmpeg = new FFmpeg()

    try {
      if(ENABLE_LOGGING) ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message))

      ffmpeg.on('progress', ({ progress }) => {
        let pct = EXPORT_VIDEO_START + Math.round(progress * 25)
        onProgress && onProgress('Encoding: ' + Math.round(progress * 100) + '%', Math.min(pct, 95))
      })

      onProgress && onProgress('Loading video encoder...', images ? EXPORT_VIDEO_START : 0)

      await ffmpeg.load({
        coreURL: baseURL + 'ffmpeg-core.js',
        wasmURL: baseURL + 'ffmpeg-core.wasm',
      })

      if (images) {
        for (const frame of images) await ffmpeg.writeFile(frame.name, frame.data)
      } else {
        await VideoExport._generateProjectImages({
          ...args,
          onFrame: frame => ffmpeg.writeFile(frame.name, frame.data),
        })
        args.soundInfo = [...project.soundsPlayed]
        audio = await VideoExport._generateAudioFile(args)
      }
      if (audio) await ffmpeg.writeFile('audio.wav', audio)

      let inputs = ['-i', 'frame%12d.jpg']
      if (audio) inputs = inputs.concat(['-i', 'audio.wav'])

      let dimensions = VideoExport._ensureValidDimensions(
        args.width || project.width,
        args.height || project.height
      )

      let command = [
        '-r', '' + project.framerate,
        '-s', dimensions.width + 'x' + dimensions.height,
        ...inputs,
        '-pix_fmt', 'yuv420p',
        '-q:v', '10',
        '-strict', '-2',
        'out.mp4',
      ]

      onProgress && onProgress('Encoding video...', EXPORT_VIDEO_START + 5)
      const exitCode = await ffmpeg.exec(command)
      if (exitCode !== 0) throw new Error(`ffmpeg exited with code ${exitCode} — video encoding failed`)

      const data = await ffmpeg.readFile('out.mp4')
      if (!data || data.byteLength === 0) throw new Error('ffmpeg produced an empty output file')
      let blob = new Blob([data], { type: 'video/mp4' })

      if (isAndroid() && window.__TAURI__) {
        // On Android, save via the native SavePlugin so the video lands in the
        // device gallery (MediaStore.Video) rather than the invisible Downloads folder.
        const invoke = (window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) || window.__TAURI__.invoke
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        await invoke('plugin:save|saveToDownloads', {
          filename: project.name + '.mp4',
          mimeType: 'video/mp4',
          data: base64,
        })
      } else {
        window.saveFileFromWick(blob, project.name, '.mp4')
      }

      onProgress && onProgress('Rendering Complete! Downloading...', 100)
      onFinish && onFinish()
    } finally {
      // Release the worker and its in-memory files after success or failure.
      ffmpeg.terminate()
    }
  }

  static _ensureValidDimensions(width, height) {
    var newWidth = width
    var newHeight = height

    if (newWidth % 2 === 1) newWidth -= 1
    if (newHeight % 2 === 1) newHeight -= 1

    return { width: newWidth, height: newHeight }
  }

  // // may be unnecessary -H.A.
  // static _parseProgressMessage(message, args) {
  //   if (!message || typeof message !== 'string') return
  //   if (!message.includes('pts_time:')) return
  //   let time = message.split('pts_time')[1]
  //   if (!time) return
  //   time = time.split('pos')[0]
  //   if (!time) return
  //   time = time.replace(':', '')
  //   let timeNumber = Number(time)
  //   if (isNaN(timeNumber)) return
  //   args.onProgress('Rendered: ' + timeNumber.toFixed(2) + ' seconds', 85)
  // }
}

export default VideoExport
