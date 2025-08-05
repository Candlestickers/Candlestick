import { parseGIF, decompressFrames } from 'gifuct-js';

class GIFImport {
  static importGIFIntoProject({ gifFile, project, onFinish }) {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;

      const gif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true); // true = build full frame

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      tempCanvas.width = gif.lsd.width;
      tempCanvas.height = gif.lsd.height;

      const dataURLs = [];
      let previousImageData = null;

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const { dims, patch, disposalType } = frame;

        // disposal type 3, save previous canvas state
        if (disposalType === 3) 
          previousImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        // Past disposal type 2, restore to background
        if (i > 0 && frames[i - 1].disposalType === 2) {
          const prevDims = frames[i - 1].dims;
          tempCtx.clearRect(prevDims.left, prevDims.top, prevDims.width, prevDims.height);
        }

        // Past disposal type 3, restore to previous
        if (i > 0 && frames[i - 1].disposalType === 3 && previousImageData)
          tempCtx.putImageData(previousImageData, 0, 0);

        // draw this frame's patch at its position
        const imageData = tempCtx.createImageData(dims.width, dims.height);
        imageData.data.set(patch);
        tempCtx.putImageData(imageData, dims.left, dims.top);

        // save result
        dataURLs.push(tempCanvas.toDataURL());
      }


      const imageAssets = dataURLs.map((url, index) => {
        const asset = new window.Wick.ImageAsset({
          filename: gifFile.name + "_" + index + ".png",
          src: url,
        });
        project.addAsset(asset);
        return asset;
      });

      project.loadAssets(() => {
        window.Wick.GIFAsset.fromImages(imageAssets, project, (gifAsset) => {
          gifAsset.name = gifFile.name;
          gifAsset.filename = gifFile.name;
          onFinish(gifAsset);
        });
      });
    };

    reader.readAsArrayBuffer(gifFile);
  }
}

export default GIFImport;
