import AudioExport from './AudioExport'

var b64toBuff = require('base64-arraybuffer')

var ENABLE_LOGGING = false
var EXPORT_IMAGE_START = 10
var EXPORT_AUDIO_START = 40
var EXPORT_VIDEO_START = 70

const isTauri = () =>
  !!(window.__TAURI__ && (window.__TAURI__.invoke || (window.__TAURI__.tauri && window.__TAURI__.tauri.invoke)))


class VideoExport {

  static renderVideo = async (args) => {
    let images = await VideoExport._generateProjectImages(args)
    let soundInfo = [...args.project.soundsPlayed]
    args.soundInfo = soundInfo
    let audio = await VideoExport._generateAudioFile(args)

    if (isTauri()) {
      await VideoExport._exportNativeMP4({ images, audio, args })
    } else {
      await VideoExport._generateVideo({ images: images, audio: audio, args })
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

    return new Promise(resolve => {
      let imageData = []
      let frameNumber = 0

      project.generateImageSequence({
        imageType: 'image/jpeg',
        width: dimensions.width,
        height: dimensions.height,

        onProgress: (currentFrame, numTotalFrames) => {
          let progress = EXPORT_IMAGE_START + (currentFrame / numTotalFrames) * 20
          onProgress('Rendering Frame ' + currentFrame + '/' + numTotalFrames, progress)
        },

        onFinish: (images) => {
          onProgress('Converting Frames', EXPORT_AUDIO_START)

          images.forEach(image => {
            let paddedNum = (frameNumber + '').padStart(12, '0')
            let name = 'frame' + paddedNum + '.jpg'

            let cleanBase64 = image.src.split(',')[1]
            let buffer = b64toBuff.decode(cleanBase64)

            imageData.push({ name: name, data: new Uint8Array(buffer) })
            frameNumber += 1
          })

          resolve(imageData)
        },
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

    // Respects PUBLIC_URL so the /test deploy loads from /test/corelibs/ffmpeg/
    const baseURL = window.location.origin + (process.env.PUBLIC_URL || '').replace(/\/?$/, '')

    // Load the UMD bundle via script tag instead of letting webpack bundle the ESM version.
    // The ESM build creates a { type: 'module' } worker which disables importScripts(),
    // causing webpack to intercept the dynamic import(coreURL) and fail at runtime.
    // The UMD build creates a classic worker that uses importScripts() correctly.
    if (!window.FFmpegWASM) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = baseURL + '/corelibs/ffmpeg/ffmpeg.umd.js'
        script.onload = resolve
        script.onerror = () => reject(new Error('Failed to load ffmpeg.umd.js'))
        document.head.appendChild(script)
      })
    }
    const { FFmpeg } = window.FFmpegWASM
    const ffmpeg = new FFmpeg()

    if(ENABLE_LOGGING) ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message))

    ffmpeg.on('progress', ({ progress }) => {
      let pct = EXPORT_VIDEO_START + Math.round(progress * 25)
      onProgress && onProgress('Encoding: ' + Math.round(progress * 100) + '%', Math.min(pct, 95))
    })

    onProgress && onProgress('Loading video encoder...', EXPORT_VIDEO_START)

    await ffmpeg.load({
      coreURL: baseURL + '/corelibs/ffmpeg/ffmpeg-core.js',
      wasmURL: baseURL + '/corelibs/ffmpeg/ffmpeg-core.wasm',
    })

    onProgress && onProgress('Writing frames...', EXPORT_VIDEO_START + 3)

    for (const frame of images) // add frames to video
      await ffmpeg.writeFile(frame.name, frame.data)
    if(audio) // attach audio
      await ffmpeg.writeFile('audio.wav', new Uint8Array(audio))

    let inputs = ['-i', 'frame%12d.jpg']
    if (audio) inputs = inputs.concat(['-i', 'audio.wav'])

    // Only apply setps filter if framerate is below ffmpeg's minimum
    let filterArgs = []
    if (project.framerate < 6)
      filterArgs = ['-filter:v', 'setpts=' + (6 / project.framerate) + '*PTS']

    let dimensions = VideoExport._ensureValidDimensions(
      args.width || project.width,
      args.height || project.height
    )

    let command = [
      '-r', '' + Math.max(6, project.framerate),
      '-s', dimensions.width + 'x' + dimensions.height,
      ...inputs,
      '-pix_fmt', 'yuv420p',
      '-q:v', '10',
      '-strict', '-2',
      ...filterArgs, // break the filter params here
      'out.mp4',
    ]

    onProgress && onProgress('Encoding video...', EXPORT_VIDEO_START + 5)
    await ffmpeg.exec(command)

    const data = await ffmpeg.readFile('out.mp4')
    let blob = new Blob([data.buffer], { type: 'video/mp4' })
    window.saveFileFromWick(blob, project.name, '.mp4')
    onProgress && onProgress('Rendering Complete! Downloading...', 100)
    onFinish && onFinish()
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
