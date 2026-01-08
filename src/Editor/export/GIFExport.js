class GIFExport {
  static createAnimatedGIFFromProject(args) {
    let { project, onProgress, onFinish } = args || {};

    if (!project) throw new Error("GIFExport.createAnimatedGIFFromProject: missing project");
    if (!window || !window.GIF) throw new Error("GIFExport: window.GIF (gif.js) is not available");

    onProgress = typeof onProgress === "function" ? onProgress : () => {};
    onFinish = typeof onFinish === "function" ? onFinish : () => {};

    const combiningProgress = 40;
    const renderingProgress = 70;
    const finishedProgress = 99;

    onProgress("Creating Gif", 10);

    let width = args.width || project.width;
    let height = args.height || project.height;

    const bgFromProject = getProjectBackground(project);
    const useTransparency = shouldUseTransparency(project, bgFromProject);

    const transparentKeyCss = "#ff00ff";
    const transparentKeyInt = hexToInt(transparentKeyCss);

    const gifOptions = {
      workers: 2,
      quality: 10,
      width: width,
      height: height,
      workerScript: (typeof process !== "undefined" && process.env && process.env.PUBLIC_URL)
        ? process.env.PUBLIC_URL + "/corelibs/gif/gif.worker.js"
        : "/corelibs/gif/gif.worker.js",
    };

    if (useTransparency) {
      gifOptions.background = transparentKeyCss;
      gifOptions.transparent = transparentKeyInt;
    } else {
      gifOptions.background = bgFromProject || "#ffffff";
    }

    const gif = new window.GIF(gifOptions);

    let lastPct = -1;

    gif.on("progress", (p) => {
      const pct = clamp(Math.round(renderingProgress + p * (finishedProgress - renderingProgress)), renderingProgress, finishedProgress);
      if (pct !== lastPct) {
        lastPct = pct;
        onProgress("Rendering Gif", pct);
      }
    });

    gif.on("finished", (blob) => {
      onProgress("Finished", 100);
      onFinish(blob);
    });

    const makeFrameCanvas = (source) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = useTransparency ? transparentKeyCss : (bgFromProject || "#ffffff");
      ctx.fillRect(0, 0, width, height);

      if (source) {
        try {
          ctx.drawImage(source, 0, 0, width, height);
        } catch (e) {
          try {
            if (source instanceof ImageData) ctx.putImageData(source, 0, 0);
          } catch (_) {}
        }
      }

      if (useTransparency) {
        try {
          const img = ctx.getImageData(0, 0, width, height);
          const d = img.data;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] === 0) {
              d[i] = 255;
              d[i + 1] = 0;
              d[i + 2] = 255;
              d[i + 3] = 255;
            }
          }
          ctx.putImageData(img, 0, 0);
        } catch (_) {}
      }

      return canvas;
    };

    const combineImageSequence = async (images) => {
      if (!images || images.length === 0) {
        onProgress("Finished", 100);
        onFinish(new Blob([], { type: "image/gif" }));
        return;
      }

      onProgress("Combining Frames", combiningProgress);

      const fr = Number(project.framerate) || 30;
      const delay = Math.max(1, Math.round(1000 / fr));

      for (let i = 0; i < images.length; i++) {
        const frameCanvas = makeFrameCanvas(images[i]);
        gif.addFrame(frameCanvas, { copy: true, delay: delay });

        const pct = clamp(
          Math.round(combiningProgress + ((i + 1) / images.length) * (renderingProgress - combiningProgress - 1)),
          combiningProgress,
          renderingProgress - 1
        );

        onProgress(`Combining Frames (${i + 1}/${images.length})`, pct);

        if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      onProgress("Rendering Gif", renderingProgress);
      gif.render();
    };

    const updateProgress = (completed, maxFrames) => {
      const c = Number.isFinite(completed) ? completed : 0;
      const m = Number.isFinite(maxFrames) && maxFrames > 0 ? maxFrames : 1;
      const pct = clamp(Math.round((c / m) * (combiningProgress - 10) + 10), 10, combiningProgress);
      onProgress("Creating Gif", pct);
    };

    project.generateImageSequence({
      width: width,
      height: height,
      onFinish: combineImageSequence,
      onProgress: updateProgress,
    });

    function clamp(v, a, b) {
      return Math.min(b, Math.max(a, v));
    }

    function hexToInt(css) {
      if (typeof css !== "string") return 0xff00ff;
      let s = css.trim();
      if (s[0] === "#") s = s.slice(1);
      if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
      if (s.length !== 6) return 0xff00ff;
      const n = parseInt(s, 16);
      return Number.isFinite(n) ? n : 0xff00ff;
    }

    function normalizeCssColor(str) {
      if (typeof str !== "string") return "";
      return str.trim().toLowerCase();
    }

    function getProjectBackground(p) {
      const candidates = [
        p && p.backgroundColor,
        p && p.background,
        p && p.background_colour,
        p && p.bgColor,
        p && p.bg,
      ];
      for (let i = 0; i < candidates.length; i++) {
        const v = candidates[i];
        if (typeof v === "string" && v.trim() !== "") return v.trim();
      }
      return "";
    }

    function shouldUseTransparency(p, bg) {
      if (p && (p.transparent === true || p.isTransparent === true || p.transparentBackground === true)) return true;

      const b = normalizeCssColor(bg);
      if (!b) return false;

      if (b === "transparent") return true;
      if (b === "none") return true;

      if (b.startsWith("rgba(") && b.endsWith(")")) {
        const parts = b.slice(5, -1).split(",").map((x) => x.trim());
        const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
        if (Number.isFinite(a) && a === 0) return true;
      }

      if (p && Number.isFinite(p.backgroundAlpha) && Number(p.backgroundAlpha) === 0) return true;

      return false;
    }
  }
}

export default GIFExport;
