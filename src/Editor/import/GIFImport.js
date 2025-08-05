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

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const imageData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
        imageData.data.set(frame.patch); // RGBA patch

        // Draw onto canvas at correct position
        tempCtx.putImageData(imageData, frame.dims.left, frame.dims.top);

        // Save dataURL
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
