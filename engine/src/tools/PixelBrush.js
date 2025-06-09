/*
 * Pixel Brush Tool for drawing pixel art aligned to grid.
 */

Wick.Tools.PixelBrush = class extends Wick.Tool {
    constructor() {
        super();
        this.name = 'pixelbrush';
        this._lastCell = null;
    }

    get doubleClickEnabled() {
        return false;
    }

    get cursor() {
        return 'crosshair';
    }

    get isDrawingTool() {
        return true;
    }

    onActivate(e) {
        this._lastCell = null;
    }

    onDeactivate(e) {
        this._lastCell = null;
    }

    _addPixel(point) {
        var grid = this.getSetting('pixelGridSize');
        var size = this.getSetting('pixelSize');
        var x = Math.floor(point.x / grid) * grid;
        var y = Math.floor(point.y / grid) * grid;
        var rect = new this.paper.Path.Rectangle(new this.paper.Point(x, y), new this.paper.Size(size, size));
        rect.fillColor = this.getSetting('fillColor').rgba;
        rect.strokeColor = this.getSetting('strokeColor').rgba;
        rect.strokeWidth = this.getSetting('strokeWidth');
        this.addPathToProject(rect);
    }

    onMouseDown(e) {
        this._addPixel(e.point);
        this._lastCell = {
            x: Math.floor(e.point.x / this.getSetting('pixelGridSize')),
            y: Math.floor(e.point.y / this.getSetting('pixelGridSize'))
        };
    }

    onMouseDrag(e) {
        var cell = {
            x: Math.floor(e.point.x / this.getSetting('pixelGridSize')),
            y: Math.floor(e.point.y / this.getSetting('pixelGridSize'))
        };
        if (!this._lastCell || cell.x !== this._lastCell.x || cell.y !== this._lastCell.y) {
            this._addPixel(e.point);
            this._lastCell = cell;
        }
    }

    onMouseUp(e) {
        this.fireEvent({eventName: 'canvasModified', actionName: 'pixelbrush'});
        this._lastCell = null;
    }
};
