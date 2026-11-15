const DEFAULT_BRUSH_PROPS = {
    shape: 'circle',
    brushSize: 10,
    brushResolution: 1,
    brushSpacing: 0.2,
    brushScatterAmount: 0,
    brushRotationMode: 'fixed',
    brushRotationOffset: 0,
    brushStabilizerWeight: 20,
    fillColorRgba: '#000000',
};

// Mirrors the engine's rotateToDirection/randomAngle/angle logic (see Brush.js onMouseDown)
// for the preview path, which is a fixed sine wave rather than real mouse movement.
const _brushPreviewRotation = (rotationMode, rotationOffsetDeg, t, pathW, amplitude, rand) => {
    if (rotationMode === 'random') {
        return rand() * Math.PI * 2;
    }
    rand(); // consume the same random slot 'random' mode uses, so later draws stay stable
    const offsetRad = rotationOffsetDeg * Math.PI / 180;
    if (rotationMode === 'path') {
        // Tangent angle of x(t)=margin+t*pathW, y(t)=H/2+sin(t*pi*2.5)*amplitude
        const dxdt = pathW;
        const dydt = amplitude * Math.cos(t * Math.PI * 2.5) * (Math.PI * 2.5);
        return Math.atan2(dydt, dxdt) + offsetRad;
    }
    return offsetRad; // 'fixed'
}

const _drawBrushStamp = (ctx, x, y, size, shape, rotation, color, curveSegs = 24) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color || '#5a9fd4';
    window.Wick && window.Wick.Tools.BrushUtils.drawBrushShape(ctx, size, shape, fill => {
        fill();
    }, { fallback: 'polycircle', curveSegs });
    ctx.restore();
}

// Polygon-approximation fallback when potrace is unavailable
const _brushPreviewFallback = (ctx, W, H, bgColor, brushColor, shape, spacing,
scatterAmount, rotationMode, rotationOffset, smoothness, stampSize, stepDist,
margin, amplitude, pathW, numSteps) => {
    // This path draws straight to the visible canvas synchronously (no async
    // gap), so filling the background here right before the stamps is safe -H.A.
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);
    const curveSegs = Math.max(3, Math.round(smoothness * 24));
    const jitterAmt = (1 - smoothness) * 4;
    let _seed = 12345;
    const rand = () => { _seed = (_seed * 1664525 + 1013904223) & 0xffffffff; return (_seed >>> 0) / 0xffffffff; };
    for (let i = 0; i < numSteps; i++) {
        const t = numSteps > 1 ? i / (numSteps - 1) : 0;
        const sz = stampSize;
        let x = margin + t * pathW;
        let y = H / 2 + Math.sin(t * Math.PI * 2.5) * amplitude;
        if (jitterAmt > 0) { x += (rand() - 0.5) * jitterAmt; y += (rand() - 0.5) * jitterAmt; } else { rand(); rand(); }
        const rotation = _brushPreviewRotation(rotationMode, rotationOffset, t, pathW, amplitude, rand);
        const r4 = rand(), r5 = rand();
        const sc = sz * scatterAmount; x += (r4 - 0.5) * sc * 2; y += (r5 - 0.5) * sc * 2;
        _drawBrushStamp(ctx, x, y, sz, shape, rotation, brushColor, curveSegs);
    }
}

// BRUSH PREVIEW— we're literally drawing a brush stroke here -H.A.
export const drawBrushPreview = (canvas, { getToolSetting, snapshotCurrentSettings, getThisRenderSeq, thisRenderStale }) => {
  if (!canvas) return;
  // Size the canvas buffer to physical pixels so it's sharp on Retina/HiDPI displays.
  // Only touch canvas.width/height when they actually change — assigning to either,
  // even to the same value, implicitly clears the canvas, which would blank the
  // preview on every single slider tick before the new stroke is ready to draw.
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth  || 220;
  const cssH = canvas.clientHeight || 80;
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Background — use project background color
  let bgColor = '#1c1c1c';
  try {
    const bg = window.project && window.project.backgroundColor;
    if (bg) bgColor = bg.rgba;
  } catch(e) {}
  // Don't blank the canvas here — the new stroke is built off-canvas below and
  // painted in one shot once ready, so the last good preview stays on screen
  // (no flicker) instead of flashing blank while potrace/the SVG image loads.

  // Brush color — use current fill color
  let brushColor = '#5a9fd4';
  try {
    const fc = getToolSetting('fillColor');
    if (fc) brushColor = fc.rgba;
  } catch(e) {}
  
  const shape = getToolSetting('brushShape') || DEFAULT_BRUSH_PROPS.shape;
  const spacing = Math.max(0.05, getToolSetting('brushSpacing') || DEFAULT_BRUSH_PROPS.brushSpacing);
  const scatterAmount = getToolSetting('brushScatterAmount') ?? DEFAULT_BRUSH_PROPS.brushScatterAmount;
  const rotationMode = getToolSetting('brushRotationMode') || DEFAULT_BRUSH_PROPS.brushRotationMode;
  const rotationOffset = getToolSetting('brushRotationOffset') ?? DEFAULT_BRUSH_PROPS.brushRotationOffset;
  const resT = getToolSetting('brushResolution') ?? DEFAULT_BRUSH_PROPS.brushResolution;

  // Snapshot current settings so componentDidUpdate can detect future changes
  snapshotCurrentSettings({ brushResolution: resT, brushSpacing: spacing,
    brushScatterAmount: scatterAmount,
    brushRotationMode: rotationMode, brushRotationOffset: rotationOffset, brushShape: shape,
    fillColorRgba: brushColor });

  // Tag this render so that if an older, slower-to-resolve render finishes
  // after a newer one, it's dropped instead of painting stale content back
  // over the current preview.
  const seq = getThisRenderSeq();

  // Resolution: same smoothnessFactor formula as the engine
  // TODO: Expose smoothnessFactor formula through Wick.BrushUtils
  const smoothness = 0.05 + (Math.pow(resT, 5) + 0.1 * resT * (1 - resT)) * 0.95;

  const stampSize = 35;
  const stepDist  = Math.max(2, stampSize * spacing - 1);

  let _seed = 12345;
  const rand = () => { _seed = (_seed * 1664525 + 1013904223) & 0xffffffff; return (_seed >>> 0) / 0xffffffff; };

  const margin= stampSize + 4;
  const amplitude = (H - stampSize * 2) / 2.8;
  const pathW = W - margin * 2;
  const numSteps = Math.ceil(pathW / stepDist) + 1;

  // Rasterize stamps onto a TRANSPARENT offscreen canvas.
  // potrace.createFromImage classifies pixels by alpha (alpha > 155 = foreground).
  // So we must NOT fill a white background — transparent = background, opaque stamp = foreground.
  // If you don't get it uhhhh… just trust me bro
  const stampCanvas = document.createElement('canvas');
  stampCanvas.width = W;
  stampCanvas.height = H;
  const sCtx = stampCanvas.getContext('2d');

  for (let i = 0; i < numSteps; i++) {
    const t = numSteps > 1 ? i / (numSteps - 1) : 0;

    const sz = stampSize;

    let x = margin + t * pathW;
    let y = H / 2 + Math.sin(t * Math.PI * 2.5) * amplitude;

    rand(); rand(); // consume position-jitter slots (not applied; potrace handles jaggedness via scale)
    const rotation = _brushPreviewRotation(rotationMode, rotationOffset, t, pathW, amplitude, rand);
    const r4 = rand(), r5 = rand();
    const sc = sz * scatterAmount;
    x += (r4 - 0.5) * sc * 2;
    y += (r5 - 0.5) * sc * 2;

    // Always draw at 24 segs — jaggedness comes from potrace on a smaller canvas below
    _drawBrushStamp(sCtx, x, y, sz, shape, rotation, '#000000', 24);
  }

  // Scale down to simulate low resolution: fewer pixels → potrace produces angular shapes.
  // imageScaleFactor range mirrors the engine: ~0.25 at Reso=0, 1.0 at Reso=1.
  const imageScaleFactor = 0.25 + smoothness * 0.75;
  const smallW = Math.max(30, Math.round(W * imageScaleFactor));
  const smallH = Math.max(15, Math.round(H * imageScaleFactor));
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = smallW;
  smallCanvas.height = smallH;
  const smallCtx = smallCanvas.getContext('2d');
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.drawImage(stampCanvas, 0, 0, smallW, smallH);

  // Run potrace — same step as the engine does after the croquis rasterization
  const pt = window.potrace;
  if (pt) {
    try {
      let svgStr = pt.fromImage(smallCanvas).toSVG(1);
      // Replace the traced fill color with the actual brush color
      svgStr = svgStr.replace(/fill="[^"]*"/g, `fill="${brushColor}"`);
      // Render via Image so the browser handles SVG fill-rule correctly
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        // A newer preview render has since started — drop this now-stale result
        // instead of painting it over whatever that one has already drawn.
        if (thisRenderStale(seq)) return;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, W, H);
        // Scale SVG back up to full preview size — low-res SVG drawn large = jagged edges visible
        ctx.drawImage(img, 0, 0, W, H);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        if (thisRenderStale(seq)) return;
        _brushPreviewFallback(ctx, W, H, bgColor, brushColor, shape, spacing,
          scatterAmount, rotationMode, rotationOffset, smoothness, stampSize, stepDist,
          margin, amplitude, pathW, numSteps);
      };
      img.src = url;
    } catch(e) {
      _brushPreviewFallback(ctx, W, H, bgColor, brushColor, shape, spacing,
        scatterAmount, rotationMode, rotationOffset, smoothness, stampSize, stepDist,
        margin, amplitude, pathW, numSteps);
    }
  } else {
    _brushPreviewFallback(ctx, W, H, bgColor, brushColor, shape, spacing,
      scatterAmount, rotationMode, rotationOffset, smoothness, stampSize, stepDist,
      margin, amplitude, pathW, numSteps);
  }
}