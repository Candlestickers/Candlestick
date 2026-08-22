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

// WAV encoder worker
// run in a parallel worker thread and trasnfer the results back
const _WAV_WORKER_SRC = `
self.onmessage = function (e) {
  var channels     = e.data.channels;
  var sampleRate   = e.data.sampleRate;
  var numSamples   = e.data.numSamples;
  var numChannels  = e.data.numChannels;

  var bytesPerSample    = 2;
  var blockAlign        = numChannels * bytesPerSample;
  var byteRate          = sampleRate * blockAlign;
  var wavDataByteLength = numSamples * blockAlign;
  var buffer            = new ArrayBuffer(44 + wavDataByteLength);
  var view              = new DataView(buffer);

  var offset = 0;
  function writeStr(s) { for (var i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); }
  function write16(v)  { view.setUint16(offset, v, true); offset += 2; }
  function write32(v)  { view.setUint32(offset, v, true); offset += 4; }

  // RIFF / WAVE header
  writeStr('RIFF'); write32(36 + wavDataByteLength); writeStr('WAVE');
  // fmt chunk
  writeStr('fmt '); write32(16); write16(1); write16(numChannels);
  write32(sampleRate); write32(byteRate); write16(blockAlign); write16(16);
  // data chunk
  writeStr('data'); write32(wavDataByteLength);

  // Interleave channels — the hot loop
  for (var i = 0; i < numSamples; i++) {
    for (var ch = 0; ch < numChannels; ch++) {
      var s = channels[ch][i];
      if (s >  1) s =  1;
      if (s < -1) s = -1;
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }

  // Transfer the finished ArrayBuffer back (zero-copy)
  self.postMessage({ buffer: buffer }, [buffer]);
};
`;

function _encodeWavInWorker({ channels, sampleRate, numSamples, numChannels }) {
  return new Promise((resolve, reject) => {
    const blob   = new Blob([_WAV_WORKER_SRC], { type: 'application/javascript' });
    const url    = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url); // worker holds its own internal reference; safe to revoke
    worker.onmessage = (e) => { resolve(e.data.buffer); worker.terminate(); };
    worker.onerror   = (e) => { reject(new Error('WAV worker: ' + e.message)); worker.terminate(); };
    // Transfer the Float32Arrays into the worker — zero-copy, no serialisation overhead
    worker.postMessage({ channels, sampleRate, numSamples, numChannels }, channels.map(ch => ch.buffer));
  });
}

async function extractAudioWavFromMp4(file) {
  const arrayBuf = await file.arrayBuffer()
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  let audioBuf
  try {
    audioBuf = await audioCtx.decodeAudioData(arrayBuf.slice(0)) // Safari needs a copy
  } catch (e) {
    // no audio track — bail out early
    audioCtx.close()
    return null
  }

  const numChannels = audioBuf.numberOfChannels
  const sampleRate  = audioBuf.sampleRate
  const numSamples  = audioBuf.length

  // Copy channel data into fresh transferable Float32Arrays before closing the context
  const channels = []
  for (let ch = 0; ch < numChannels; ch++) {
    const src  = audioBuf.getChannelData(ch)
    const copy = new Float32Array(src.length)
    copy.set(src)
    channels.push(copy)
  }
  audioCtx.close()

  // Hand off the heavy PCM interleave to the worker thread
  const wavBuffer = await _encodeWavInWorker({ channels, sampleRate, numSamples, numChannels })
  return new Blob([wavBuffer], { type: 'audio/wav' })
}

async function extractFramesFromMp4(file, { fps = DEFAULT_FPS, maxFrames = Infinity, onProgress = () => {} } = {}) {
  const WORKER_COUNT = 4
  const url = URL.createObjectURL(file)

  // --- load metadata from a throwaway video element ---
  // NOTE: do NOT set crossOrigin on blob URLs — blob URLs are same-origin by definition
  // else WebKitGTK (Linux/Tauri) treats the blob as a CORS fetch, which breaks seeking
  const metaVideo = document.createElement('video')
  metaVideo.src = url
  metaVideo.muted = true
  metaVideo.playsInline = true
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('Video metadata load timed out — the file may use an unsupported codec')), 15000)
    metaVideo.addEventListener('loadedmetadata', () => { clearTimeout(timer); res() }, { once: true })
    metaVideo.addEventListener('error',           () => { clearTimeout(timer); rej(new Error('Video metadata load failed')) }, { once: true })
  })
  const duration = metaVideo.duration
  const w = metaVideo.videoWidth
  const h = metaVideo.videoHeight
  metaVideo.src = '' // release the metadata decoder slot

  // --- build the full list of frame timestamps upfront ---
  const step = 1 / fps
  const allTimestamps = []
  for (let t = 0; t <= duration && allTimestamps.length < maxFrames; t += step) {
    allTimestamps.push(t)
  }
  if (!allTimestamps.length) {
    URL.revokeObjectURL(url)
    throw new Error('No frames could be extracted — the video may use an unsupported codec on this platform')
  }

  // --- split timestamps into WORKER_COUNT contiguous chunks ---
  // Contiguous chunks = each worker seeks forward through its section,
  // which is faster than random-access seeking across the whole timeline.
  const numWorkers = Math.min(WORKER_COUNT, allTimestamps.length)
  const chunkSize  = Math.ceil(allTimestamps.length / numWorkers)
  const chunks     = []
  for (let i = 0; i < allTimestamps.length; i += chunkSize) {
    chunks.push(
      allTimestamps.slice(i, i + chunkSize).map((ts, j) => ({ ts, globalIndex: i + j }))
    )
  }

  // results[globalIndex] = blob — keeps frames in the correct order regardless of
  // which worker finishes first.
  const results = new Array(allTimestamps.length).fill(null)
  let framesCompleted = 0

  // Each chunk runs on its own video + canvas pair, seeking forward through its timestamps.
  const extractChunk = async (chunk) => {
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    // Wait for this worker's video to be ready before seeking
    await new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error('Video metadata load timed out — the file may use an unsupported codec')), 15000)
      video.addEventListener('loadedmetadata', () => { clearTimeout(timer); res() }, { once: true })
      video.addEventListener('error',           () => { clearTimeout(timer); rej(new Error('Video load failed')) }, { once: true })
    })

    for (const { ts, globalIndex } of chunk) {
      video.currentTime = ts
      // Wait for seek — timeout guards against WebKitGTK/GStreamer silently dropping seeked events -H.A.
      await new Promise((res, rej) => {
        const timer = setTimeout(() => { cleanup(); rej(new Error('Seek timed out — the video may use an unsupported codec on this platform')) }, 10000)
        const onSeeked = () => { clearTimeout(timer); res(); cleanup() }
        const onError  = () => { clearTimeout(timer); rej(new Error('Seek failed')); cleanup() }
        const cleanup  = () => {
          video.removeEventListener('seeked', onSeeked)
          video.removeEventListener('error',  onError)
        }
        video.addEventListener('seeked', onSeeked, { once: true })
        video.addEventListener('error',  onError,  { once: true })
      })

      // Some browsers need a render tick before drawImage reflects the new frame
      await sleep(0)

      ctx.drawImage(video, 0, 0, w, h)
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9))
      results[globalIndex] = blob
      framesCompleted++
      onProgress('Extracting frames…', Math.min(80, Math.round((framesCompleted / allTimestamps.length) * 80)))
    }

    video.src = '' // release this worker's decoder slot
  }

  // Run all chunks concurrently — 4 seeks in flight at once
  await Promise.all(chunks.map(extractChunk))
  URL.revokeObjectURL(url)

  const frames = results.filter(Boolean)
  if (!frames.length) throw new Error('No frames could be extracted — the video may use an unsupported codec on this platform')
  return { frames, width: w, height: h, duration, fps }
}

async function mp4ToWickFileBlob({ mp4File, fps = DEFAULT_FPS, projectName = 'Imported Video', onProgress = () => {} }) {
    onProgress('Extracting…', 5)

    // Run audio decoding and frame extraction in parallel.
    // decodeAudioData is async (browser audio subsystem) and won't block the seek loop.
    // The WAV encoding itself runs in a dedicated worker thread (see _encodeWavInWorker).
    const audioPromise  = extractAudioWavFromMp4(mp4File).catch(() => null)
    const framesPromise = extractFramesFromMp4(mp4File, { fps, onProgress })

    const [audioBlob, { frames, width, height }] = await Promise.all([audioPromise, framesPromise])

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