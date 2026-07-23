const DEFAULT_FPS = 12

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
}

async function extractAudioWavFromMp4(file) {
  const arrayBuf = await file.arrayBuffer()
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  let audioBuf
  try {
    audioBuf = await audioCtx.decodeAudioData(arrayBuf.slice(0)) // Safari needs a copy
  } catch (e) {
    // no audio, save us all precious time
    audioCtx.close()
    return null
  }

  const numChannels = audioBuf.numberOfChannels;
  const sampleRate = audioBuf.sampleRate;
  const numSamples = audioBuf.length;

  // Interleave PCM (16-bit)
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const wavDataByteLength = numSamples * blockAlign;
  const totalLen = 44 + wavDataByteLength;
  const buffer = new ArrayBuffer(totalLen);
  const view = new DataView(buffer);

  // RIFF header
  let offset = 0;
  const writeStr = (s) => { for (let i=0; i<s.length; i++) view.setUint8(offset++, s.charCodeAt(i)) }
  const write16 = (v) => { view.setUint16(offset, v, true); offset += 2 }
  const write32 = (v) => { view.setUint32(offset, v, true); offset += 4 }

  writeStr('RIFF');
  write32(36 + wavDataByteLength);
  writeStr('WAVE');

  // fmt chunk
  writeStr('fmt ')
  write32(16)
  write16(1)
  write16(numChannels)
  write32(sampleRate)
  write32(byteRate)
  write16(blockAlign)
  write16(16)

  // data chunk
  writeStr('data')
  write32(wavDataByteLength)

  // Interleave channels
  const channels = []
  for (let ch = 0; ch < numChannels; ch++) channels.push(audioBuf.getChannelData(ch))

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      offset += 2
    }
  }

  audioCtx.close()
  return new Blob([buffer], { type: 'audio/wav' });
}

async function extractFramesFromMp4(file, { fps = DEFAULT_FPS, maxFrames = Infinity, onProgress = () => {} } = {}) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = url
  // NOTE: do NOT set crossOrigin on blob URLs — blob URLs are same-origin by definition
  // else WebKitGTK (Linux/Tauri) treats the blob as a CORS fetch, which breaks seeking
  video.muted = true
  video.playsInline = true

  // Load da metadata stuff
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('Video metadata load timed out — the file may use an unsupported codec')), 15000)
    video.addEventListener('loadedmetadata', () => { clearTimeout(timer); res() }, { once: true })
    video.addEventListener('error', () => { clearTimeout(timer); rej(new Error('Video metadata load failed')) }, { once: true })
  })

  const duration = video.duration
  const w = video.videoWidth
  const h = video.videoHeight

  // create hidden canvas to record frames from it
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const step = 1 / fps // <-- skip video to recorded frames
  const frames = []
  let t = 0
  let frameIndex = 0
  while (t <= duration && frameIndex < maxFrames) {
    video.currentTime = t
    // Wait for seek — timeout guards against WebKitGTK/GStreamer silently dropping seeked events -H.A.
    await new Promise((res, rej) => {
      const timer = setTimeout(() => { cleanup(); rej(new Error('Seek timed out — the video may use an unsupported codec on this platform')) }, 10000)
      const onSeeked = () => { clearTimeout(timer); res(); cleanup() }
      const onError = () => { clearTimeout(timer); rej(new Error('Seek failed')); cleanup() }
      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked)
        video.removeEventListener('error', onError)
      }
      video.addEventListener('seeked', onSeeked, { once: true })
      video.addEventListener('error', onError, { once: true })
    })

    // Some browsers need a render tick
    await sleep(0)

    ctx.drawImage(video, 0, 0, w, h)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9))
    frames.push(blob)
    frameIndex++
    t += step
    onProgress(`Extracting frames…`, Math.min(80, Math.round((t / duration) * 80)))
  }

  URL.revokeObjectURL(url)
  if (!frames.length) throw new Error('No frames could be extracted — the video may use an unsupported codec on this platform')
  return { frames, width: w, height: h, duration, fps }
}

async function mp4ToWickFileBlob({ mp4File, fps = DEFAULT_FPS, projectName = 'Imported Video', onProgress = () => {} }) {
    onProgress('Decoding audio…', 5)
    const audioBlob = await extractAudioWavFromMp4(mp4File).catch(() => null)

    onProgress('Extracting frames…', 10)
    const { frames, width, height } = await extractFramesFromMp4(mp4File, { fps, onProgress })

    if (!frames.length) throw new Error('No frames extracted')

    

    
    onProgress('One more magic spell... ', 99)
    // return a GIFAsset (animated) and optionally a SoundAsset
    const imageDataURLs = await Promise.all(frames.map(blobToDataURL))
    const imageAssets = imageDataURLs.map((src, i) => new window.Wick.ImageAsset({
    filename: `${mp4File.name}_frame_${String(i).padStart(5,'0')}.jpg`,
    src
    }))

    // NOTE: the caller will add these to the *existing* project and create an instance
    return { type: 'gif-sequence', imageAssets, audioBlob, fps, projectName, width, height }




}

const MP4ImportPure = {
  importMP4AsSequence: mp4ToWickFileBlob
}

export default MP4ImportPure