/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

Wick.Tools.Brush = class extends Wick.Tool {
    static get CROQUIS_WAIT_AMT_MS () {
        return 30;
    }

    get doubleClickEnabled () {
        return false;
    }

    /**
     * Creates the brush tool.
     */
    constructor () {
        super();

        this.name = 'brush';

        this.BRUSH_POINT_SPACING = 0.2;
        this.BRUSH_STABILIZER_LEVEL = 3;
        this.POTRACE_RESOLUTION = 1.0;

        this.MIN_PRESSURE = 0.14;

        this.croquis = null;
        this.croquisDOMElement = null;
        this.croquisBrush = null;

        this.cachedCursor = null;

        this.lastPressure = null;

        this.errorOccured = false;

        this._isInProgress = false;

        // keep track of when mouse event is interrupted by gestures - H.A. 
        this._gestureInterrupted = false;
        this._suppressCommit = false;
        this._gestureSeqAtStart = 0;
        this._strokeStartedAt = 0;


        this._croquisStartTimeout = null;

        // These are used to crop the final path image.
        this.strokeBounds = new paper.Rectangle();
        this._lastMousePoint = new paper.Point(0,0);
        this._lastMousePressure = 1;

        // The frame that the brush started the current stroke on.
        this._currentDrawingFrame = null;
    }

    get cursor () {
        // the brush cursor is done in a custom way using _regenCursor().
    }

    get isDrawingTool () {
        return true;
    }

    cancel () {
        if (!this._isInProgress) return;
        
        this._suppressCommit = true;
        this._gestureInterrupted = true;
        
        // Clear any pending work (potrace timeout)
        if (this._croquisStartTimeout) {
            clearTimeout(this._croquisStartTimeout);
            this._croquisStartTimeout = null;
        }

        this.discard(); // close stroke and nuke the rooster! rooster? rastor— same thing
        this._isInProgress = false;
        
    }

    onActivate (e) {
        if(this._isInProgress)
            this.finishStrokeEarly();

        if(!this.croquis) {
            this.croquis = new Croquis();
            this.croquis.setCanvasSize(500, 500);
            this.croquis.addLayer();
            this.croquis.fillLayer('rgba(0,0,0,0)');
            this.croquis.addLayer();
            this.croquis.selectLayer(1);
            this.croquis.lockHistory();

            this.croquisBrush = new Croquis.Brush();
            this.croquis.setTool(this.croquisBrush);

            this.croquisDOMElement = this.croquis.getDOMElement();
            this.croquisDOMElement.style.position = 'absolute';
            this.croquisDOMElement.style.left = '0px';
            this.croquisDOMElement.style.top = '0px';
            this.croquisDOMElement.style.width = '100%';
            this.croquisDOMElement.style.height = '100%';
            this.croquisDOMElement.style.display = 'block';
            this.croquisDOMElement.style.pointerEvents = 'none';
        }

        this._isInProgress = false;

        this._lastMousePoint = new paper.Point(0,0);
        this._lastMousePressure = 1;
    }

    onDeactivate (e) {
        // This prevents croquis from leaving stuck brush strokes on the screen.
        this.finishStrokeEarly();
        if (this.croquis) this.croquis.clearLayer();
    }

    onMouseMove (e) {
        if (window.Wick && Wick.gesture && Wick.gesture.active) return;
        
        super.onMouseMove(e);

        this._updateCanvasAttributes();
        this._regenCursor();
    }

    onMouseDown (e) {

        // add in check for wick gestures - H.A.
        // gesture active? don't even begin
        if (window.Wick && Wick.gesture && Wick.gesture.active) {
            this._gestureInterrupted = true;
            this._suppressCommit = true;
            return;
        }


        // not interrupted by hand gestures
        this._gestureInterrupted = false;
        this._suppressCommit = false;
        this._gestureSeqAtStart = (window.Wick && Wick.gesture && Wick.gesture.seq) ? Wick.gesture.seq : 0;
        this._strokeStartedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        // clean up any pending work from a prior aborted stroke (belt & suspenders)
        if (this._croquisStartTimeout) {
            clearTimeout(this._croquisStartTimeout);
            this._croquisStartTimeout = null;
        }
        if (this.croquis) {
            this.croquis.clearLayer();
        }
        this._resetStrokeBounds(new paper.Point(0, 0)); // or e.point if you prefer


        if(this._isInProgress)
            this.discard();

        this._currentDrawingFrame = this.project.activeFrame;

        clearTimeout(this._croquisStartTimeout);
        this._isInProgress = true;

        this._updateCanvasAttributes();

        // Update croquis params
        this.croquisBrush.setSize(this._getRealBrushSize());
        this.croquisBrush.setColor(this.getSetting('fillColor').hex);
        this.croquisBrush.setSpacing(this.BRUSH_POINT_SPACING);
        this.croquis.setToolStabilizeLevel(this.BRUSH_STABILIZER_LEVEL);
        this.croquis.setToolStabilizeWeight((this.getSetting('brushStabilizerWeight') / 100.0) + 0.3);
        this.croquis.setToolStabilizeInterval(1);

        // Forward mouse event to croquis canvas
        var point = this._croquisToPaperPoint(e.point);
        this._updateStrokeBounds(point);
        try {
            this._updateLastMouseState(point, this.pressure);
            this.croquis.down(point.x, point.y, this.pressure);
        } catch (e) {
            this.handleBrushError(e);
            return;
        }
    }

    onMouseDrag (e) {
        if(!this._isInProgress) return;

        // GESTURE CHECK - H.A.
        if (window.Wick && Wick.gesture && Wick.gesture.active) {
            if (this._isInProgress) {
                this._gestureInterrupted = true;
                this._suppressCommit = true;

                // cancel pending potrace -_-
                if(this._croquisStartTimeout) {
                    clearTimeout(this._croquisStartTimeout);
                    this._croquisStartTimeout = null;
                }

                this.discard(); // abort croquis safely
            }
        return;
        }


        // Forward mouse event to croquis canvas
        var point = this._croquisToPaperPoint(e.point);
        this._updateStrokeBounds(point);
        try {
            this._updateLastMouseState(point, this.pressure);
            this.croquis.move(point.x, point.y, this.pressure);
        } catch (e) {
            this.handleBrushError(e);
            return;
        }

        this.lastPressure = this.pressure;
    }

    onMouseUp (e) {
        // Was this stroke interrupted by a gesture ? that's the question... - H.A.
        const g = (window.Wick && Wick.gesture) || {};
        const gestureActiveNow = !!g.active;
        const gestureStartedDuringStroke =
            (g.lastStartAt && this._strokeStartedAt && g.lastStartAt >= this._strokeStartedAt) ||
            ((g.seq || 0) !== (this._gestureSeqAtStart || 0));

        const interrupted = this._suppressCommit || this._gestureInterrupted || gestureActiveNow || gestureStartedDuringStroke;

        if (interrupted) {
            if (this._isInProgress) this.discard();
            this._suppressCommit = false;
            this._gestureInterrupted = false;
            return;
        }

        if (!this._isInProgress) return;
        this._isInProgress = false;

        const point = this._croquisToPaperPoint(e.point);
        this._calculateStrokeBounds(point);

        try {
            this.croquis.up(point.x, point.y, this.lastPressure);
        } catch (err) {
            this.handleBrushError(err);
            return;
        }

        this._potraceCroquisCanvas(point);
    }


    /**
     * The current amount of pressure applied to the paper js canvas this tool belongs to.
     */
    get pressure () {
        if(this.getSetting('pressureEnabled')) {
            var pressure = this.paper.view.pressure;
            return convertRange(pressure, [0, 1], [this.MIN_PRESSURE, 1]);
        } else {
            return 1;
        }
    }

    /**
     * Croquis throws a lot of errrors. This is a helpful function to handle those errors gracefully.
     */
    handleBrushError (e) {
        this._isInProgress = false;
        this.croquis.clearLayer();

        if(!this.errorOccured) {
            console.error("Brush error");
            console.error(e);
        }
        this.errorOccured = true;
    }

    /**
     * Is the brush currently making a stroke?
     * @type {boolean}
     */
    isInProgress () {
        return this._isInProgress;
    }

    /**
     * Discard the current brush stroke.
     */
    discard () {
        if (!this._isInProgress) return;
        this._isInProgress = false;

        // prevent any scheduled potrace from the previous stroke
        if (this._croquisStartTimeout) {
            clearTimeout(this._croquisStartTimeout);
            this._croquisStartTimeout = null;
        }

        // make sure we never commit anything from this aborted stroke
        this._suppressCommit = true;

        // close the stroke in croquis so it releases internal state
        try {
            this.croquis.up(this._lastMousePoint.x, this._lastMousePoint.y, this._lastMousePressure);
        } catch (_) {}

        // nuke any raster the abort might have left behind — do it now, not later
        this.croquis.clearLayer();

        // ensure stale crop bounds don't leak into the next potrace
        this._resetStrokeBounds(this._lastMousePoint);
    }

    /**
     * Force the current stroke to be finished, and add the stroke to the project.
     */
    finishStrokeEarly () {
        if(!this._isInProgress) return;
        this._isInProgress = false;

        // Hide the croquis canvas so that the current stroke is never seen on the new frame.
        this.croquisDOMElement.style.opacity = 0;

        // "Give up" on the current stroke by forcing a mouseup
        this.croquis.up(this._lastMousePoint.x, this._lastMousePoint.y, this._lastMousePressure);

        // Add path to project
        this._calculateStrokeBounds(this._lastMousePoint);
        this._potraceCroquisCanvas(this._lastMousePoint);
    }

    /* Generate a new circle cursor based on the brush size. */
    _regenCursor () {
        var size = (this._getRealBrushSize());
        var color = this.getSetting('fillColor').hex;
        this.cachedCursor = this.createDynamicCursor(color, size, this.getSetting('pressureEnabled'));
        this.setCursor(this.cachedCursor);
    }

    /* Get the actual pixel size of the brush to send to Croquis. */
    _getRealBrushSize () {
        var size = this.getSetting('brushSize') + 1;
        if(!this.getSetting('relativeBrushSize')) {
            size *= this.paper.view.zoom;
        }
        return size;
    }

    /* Update Croquis and the div containing croquis to reflect all current options. */
    _updateCanvasAttributes () {
        if(!this.paper.view._element.parentElement) {
            return;
        }

        // Update croquis element and pressure options
        if(!this.paper.view._element.parentElement.contains(this.croquisDOMElement)) {
            this.paper.view.enablePressure();
            this.paper.view._element.parentElement.appendChild(this.croquisDOMElement);
        }

        // use the CSS pixels size (viewSize) rather than trying to predict with device pixels (element.width) — they change when browser zoom ≠ 100% -H.A.
        var targetW = Math.round(this.paper.view.viewSize.width);
        var targetH = Math.round(this.paper.view.viewSize.height);
        if(this.croquis.getCanvasWidth() !== targetW || this.croquis.getCanvasHeight() !== targetH) {
            this.croquis.setCanvasSize(targetW, targetH);
        }

        // Fake brush opacity in croquis by changing the opacity of the croquis canvas
        this.croquisDOMElement.style.opacity = this.getSetting('fillColor').a;
    }

    /* Convert a point in Croquis' canvas space to paper.js's canvas space. */
    _croquisToPaperPoint (croquisPoint) {
        var paperPoint = this.paper.view.projectToView(croquisPoint.x, croquisPoint.y);
        return paperPoint;
    }

    /* Used for calculating the crop amount for potrace. */
    _resetStrokeBounds (point) {
        this.strokeBounds = new paper.Rectangle(point.x, point.y, 1, 1);
    }

    /* Used for calculating the crop amount for potrace. */
    _updateStrokeBounds (point) {
        this.strokeBounds = this.strokeBounds.include(point);
    }

    /* Used for saving information on the mouse (croquis does not save this.) */
    _updateLastMouseState (point, pressure) {
        this._lastMousePoint = new paper.Point(point.x, point.y);
        this._lastMousePressure = this.pressure;
    }

    _calculateStrokeBounds (point) {
        // Forward mouse event to croquis canvas
        this._updateStrokeBounds(point);
        // This prevents cropping out edges of the brush stroke
        this.strokeBounds = this.strokeBounds.expand(this._getRealBrushSize());
    }

    /* Create a paper.js path by potracing the croquis canvas, and add the resulting path to the project. */
    _potraceCroquisCanvas (point) {

        if (this._suppressCommit || this._gestureInterrupted || (window.Wick && Wick.gesture && Wick.gesture.active)) {
            this._suppressCommit = false;
            this._gestureInterrupted = false;
            return;
        }
        
        this.errorOccured = false;
        var strokeBounds = this.strokeBounds.clone();

        // Attempting to draw with a transparent fill color. Throw an error.
        if (this.getSetting('fillColor').a === 0) {
            this.handleBrushError('transparentColor');
            this.project.errorOccured("Fill Color is Transparent!");
            return;
        }

        // Give croquis just a little bit to get the canvas ready...
        this._croquisStartTimeout = setTimeout(() => {

            // check for gesture interruptions
            if (this._suppressCommit || this._gestureInterrupted || (window.Wick && Wick.gesture && Wick.gesture.active)) {
                this._suppressCommit = false;
                this._gestureInterrupted = false;
                return;
            }

            // Retrieve Croquis canvas
            var canvas = this.paper.view._element.parentElement.getElementsByClassName('croquis-layer-canvas')[1];
            if(!canvas) {
                console.warn("Croquis canvas was not found in the canvas container. Something very bad has happened.")
                this.handleBrushError('misingCroquisCanvas');
                return;
            }

            // Rip image data out of Croquis.js canvas
            // (and crop out empty space using strokeBounds - this massively speeds up potrace)
            var croppedCanvas = document.createElement("canvas");
            var croppedCanvasCtx = croppedCanvas.getContext("2d");
            croppedCanvas.width = strokeBounds.width;
            croppedCanvas.height = strokeBounds.height;
            if(strokeBounds.x < 0) strokeBounds.x = 0;
            if(strokeBounds.y < 0) strokeBounds.y = 0;
            croppedCanvasCtx.drawImage(
              canvas,
              strokeBounds.x, strokeBounds.y,
              strokeBounds.width, strokeBounds.height,
              0, 0, croppedCanvas.width, croppedCanvas.height);

            // Run potrace and add the resulting path to the project
            var svg = potrace.fromImage(croppedCanvas).toSVG(1/this.POTRACE_RESOLUTION/this.paper.view.zoom);
            var potracePath = this.paper.project.importSVG(svg);

            potracePath.fillColor = this.getSetting('fillColor').rgba;
            potracePath.position.x += this.paper.view.bounds.x;
            potracePath.position.y += this.paper.view.bounds.y;
            potracePath.position.x += strokeBounds.x / this.paper.view.zoom;
            potracePath.position.y += strokeBounds.y / this.paper.view.zoom;
            potracePath.remove();
            potracePath.closed = true;
            potracePath.children[0].closed = true;
            potracePath.children[0].applyMatrix = true;
            var result = potracePath.children[0];

            // Do special brush mode action
            var brushMode = this.getSetting('brushMode');
            if(this._currentDrawingFrame && this._currentDrawingFrame.view) {
                // Don't apply brush mode if there is no frame to draw on
                // (the frame is added during addPathToProject)
                result = this._applyBrushMode(brushMode, result, this._currentDrawingFrame.view.objectsLayer);
            }

            // Done! Add the path to the project
            this.addPathToProject(result, this._currentDrawingFrame);

            // We're done potracing using the current croquis canvas, reset the stroke bounds
            this._resetStrokeBounds(point);

            // Clear croquis canvas
            this.croquis.clearLayer();
            this.fireEvent({eventName: 'canvasModified', actionName: 'brush'});
        }, Wick.Tools.Brush.CROQUIS_WAIT_AMT_MS);
    }

    _applyBrushMode (mode, path, layer) {
        if(!mode) {
            console.warn('_applyBrushMode: Invalid brush mode: ' + mode);
            console.warn('Valid brush modes are "inside" and "outside".')
            return;
        }

        if(mode === 'none') {
            return path;
        }

        var booleanOpName = {
            'inside': 'intersect',
            'outside': 'subtract',
        }[mode];

        var mask = null;
        layer.children.forEach(otherPath => {
            if(otherPath === mask) return;
            if(!(otherPath instanceof this.paper.Path || otherPath instanceof this.paper.CompoundPath)) return;
            if(mask) {
                var newMask = mask.unite(otherPath);

                if((newMask.children && newMask.children.length === 0) ||
                   (newMask.segments && newMask.segments.length === 0)) {
                    // Ignore boolean ops that result in empty paths
                } else {
                    mask = newMask;
                }

                newMask.remove();
            } else {
                mask = otherPath;
            }
        });
        if(!mask) {
            // Nothing to mask with
            return path;
        }

        var result = path.clone({insert:false});
        result = result[booleanOpName](mask);
        result.remove();
        return result;
    }
}
