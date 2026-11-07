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

Wick.View.Project = class extends Wick.View {
    static get DEFAULT_CANVAS_BG_COLOR() {
        return 'rgb(187, 187, 187)';
    }

    static get VALID_FIT_MODES() {
        return ['center', 'fill'];
    }

    static get VALID_RENDER_MODES() {
        return ['svg', 'webgl'];
    }

    static get ORIGIN_CROSSHAIR_COLOR() {
        return '#CCCCCC';
    }

    static get ORIGIN_CROSSHAIR_SIZE() {
        return 100;
    }

    static get ORIGIN_CROSSHAIR_THICKNESS() {
        return 1;
    }

    static get ZOOM_MIN() {
        return 0.1;
    }

    static get ZOOM_MAX() {
        return 10.0;
    }

    static get PAN_LIMIT() {
        return 10000;
    }

    get gestureActive() {
        return !!this._gesture;
    }

    // minimum distance for gesture detection
    static get GESTURE_MIN_DIST_SQ() {
        return 1e-6;
    }

    static get ONE_FINGER_DRAW_DELAY() {
        return 80;
    }

    static get TWO_FINGER_TAP_GRACE() {
        return 120;
    }


    /*
     * Create a new Project View.
     */
    constructor(model) {
        super(model);

        this._fitMode = null;
        this.fitMode = 'center';

        this._canvasContainer = null;
        this._canvasBGColor = null;

        this._svgCanvas = null;
        this._svgBackgroundLayer = null;
        this._svgBordersLayer = null;
        this._svgGUILayer = null;

        this._pan = { x: 0, y: 0 };
        this._zoom = 1;

        // track whether or not we started drawing with one finger
        this._oneFingerDrawStarted = false;

    }

    /*
     * Determines the way the project will scale itself based on its container.
     * 'center' will keep the project at its original resolution, and center it inside its container.
     * 'fill' will stretch the project to fit the container (while maintaining its original aspect ratio).
     *
     * Note: For these changes to be reflected after setting fitMode, you must call Project.View.resize().
     */
    set fitMode(fitMode) {
        if (Wick.View.Project.VALID_FIT_MODES.indexOf(fitMode) === -1) {
            console.error("Invalid fitMode: " + fitMode);
            console.error("Supported fitModes: " + Wick.View.Project.VALID_FIT_MODES.join(','));
        } else {
            this._fitMode = fitMode;
        }
    }

    get fitMode() {
        return this._fitMode;
    }

    /**
     * The current canvas being rendered to.
     */
    get canvas() {
        return this._svgCanvas;
    }

    /**
     * Get the current width/height of the canvas.
     */
    get canvasDimensions () {
        return {
            width: this._svgCanvas.offsetWidth,
            height: this._svgCanvas.offsetHeight,
        };
    }

    /**
     * The zoom amount. 1 = 100% zoom
     */
    get zoom() {
        return this._zoom;
    }

    set zoom(zoom) {
        this._zoom = zoom;
    }

    /**
     * The amount to pan the view. (0,0) is the center.
     */
    get pan() {
        var pan = {
            x: -this.paper.view.center.x,
            y: -this.paper.view.center.y,
        };
        if (this.model.focus.isRoot) {
            pan.x += this.model.width / 2;
            pan.y += this.model.height / 2;
        }
        return pan;
    }

    set pan(pan) {
        this._pan = {
            x: pan.x,
            y: pan.y,
        };
        if (this.model.focus.isRoot) {
            this._pan.x -= this.model.width / 2;
            this._pan.y -= this.model.height / 2;
        }
    }

    /*
     * The element to insert the project's canvas into.
     */
    set canvasContainer(canvasContainer) {
        this._canvasContainer = canvasContainer;
    }

    get canvasContainer() {
        return this._canvasContainer;
    }

    /**
     * The background color of the canvas.
     */
    set canvasBGColor(canvasBGColor) {
        this._canvasBGColor = canvasBGColor;
    }

    get canvasBGColor() {
        return this._canvasBGColor;
    }

    /**
     * Render the view.
     */
    render() {
        this.zoom = this.model.zoom;
        this.pan = this.model.pan;

        this._buildSVGCanvas();
        this._displayCanvasInContainer(this._svgCanvas);
        this.resize();
        this._renderSVGCanvas();
        this._updateCanvasContainerBGColor();
    }

    /**
     * Render all frames in the project to make sure everything is loaded correctly.
     */
    prerender() {
        this.render();
        this.model.getAllFrames().forEach(frame => {
            frame.view.render();
        });
    }

    /*
     * Resize the canvas to fit it's container div.
     * Resize is called automatically before each render, but you must call it if you manually change the size of the container div.
     */
    resize() {
        if (!this.canvasContainer) return;

        var containerWidth = this.canvasContainer.offsetWidth;
        var containerHeight = this.canvasContainer.offsetHeight;

        this.paper.view.viewSize.width = containerWidth;
        this.paper.view.viewSize.height = containerHeight;
    }

    /**
     * Write the SVG data in the view to the project.
     */
    applyChanges() {
        this.model.selection.view.applyChanges();

        this.model.focus.timeline.activeFrames.forEach(frame => {
            frame.view.applyChanges();
        });
    }

    /**
     * Returns how much the zoom level must be to optimally fit the canvas inside a div.
     * @type {Number}
     */
    calculateFitZoom () {
        var w = 0;
        var h = 0;

        w = this.paper.view.viewSize.width;
        h = this.paper.view.viewSize.height;

        var wr = w / this.model.width;
        var hr = h / this.model.height;

        return Math.min(wr, hr);
    }


    /**
     *  This is a hacky way to create scroll-to-zoom functionality
     *  (Using https://github.com/jquery/jquery-mousewheel for cross-browser mousewheel event)
     * @param {*} event - jquery mousewheel event.
     */
    scrollToZoom (event) {
        if (!this.model.isPublished) {
            var d = event.deltaY * event.deltaFactor * 0.001;
            this.paper.view.zoom = Math.max(0.1, this.paper.view.zoom + d);
            this._applyZoomAndPanChangesFromPaper();
        }
    }

    _setupTools () {
        // Attach scroll to zoom event.
        $(this._svgCanvas).on('mousewheel', e => {
            e.preventDefault();
            this.scrollToZoom(e);
        });

    // --- Mobile multi-touch gestures code starts HERE ---
    this._svgCanvas.style.touchAction = 'none';

    // Track active pointers
    this._activePointers = new Map();
    this._gesture = null; // state during a two-finger gesture
    this._twoFingerTapEndTimer = null; // tiny grace window between ups


    // get two fingers + 
    const getPoint = (ev) => ({ x: ev.clientX, y: ev.clientY });
    const dist = (a, b) => Math.hypot(a.x-b.x,a.y-b.y);
    const mid  = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });


    const _dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);



    const onPointerDown = (ev) => {
        // capture to keep receiving events
        try{ev.target.setPointerCapture(ev.pointerId);} catch (err){}

        const p = getPoint(ev);
        this._activePointers.set(ev.pointerId, { ...p, downX: p.x, downY: p.y, downTime: ev.timeStamp, travel: 0 });

        if (this._activePointers.size === 1) { // ONE FINGER CHECK
            // Assume we're drawing, lets set timeout
            this._oneFingerStartTimer = setTimeout(() => {
                // If only ONE finger is still down after the delay, lock in one-finger mode.
                if (this._activePointers.size === 1) {
                    this._oneFingerDrawStarted = true;
                }
            }, Wick.View.Project.ONE_FINGER_DRAW_DELAY);
        }else if (this._activePointers.size === 2) { // TWO FINGER CHECK

            if (this._oneFingerDrawStarted) {
                // We started drawing first. Ignore the second finger until all fingers lift.
                return;
            }

            // stops any active single-finger drawing, removing the "artifact" stuff
            if (this.model.activeTool && this.model.activeTool.cancel) {
                this.model.activeTool.cancel();
            }
            
            // Clear "one finger" & "draw start" timers
            if (this._oneFingerStartTimer) {
                clearTimeout(this._oneFingerStartTimer);
                this._oneFingerStartTimer = null;
            }
            this._oneFingerDrawStarted = false; // Force exit from 1-finger mode


            const pts = Array.from(this._activePointers.values());
            const p0 = pts[0], p1 = pts[1];

            const startDist = _dist(p0, p1);
            const startMid  = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

            this._gesture = {
                startDist,
                startMid,
                prevMid: startMid,
                prevDist: startDist,
                startZoom: this.paper.view.zoom,
                startCenter: this.paper.view.center.clone()
            };

            // --- TAP CANDIDATE (unchanged) ---
            this._twoFingerTapCandidate = { startAt: ev.timeStamp, valid: true };

            // --- Global gesture flags (unchanged) ---
            Wick.gesture = Wick.gesture || {};
            Wick.gesture.active = true;
            Wick.gesture.type = 'pinch_pan';
            Wick.gesture.seq = (Wick.gesture.seq || 0) + 1;
            Wick.gesture.lastStartAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        }


    };

  const onPointerMove = (ev) => {
    if(!this._activePointers.has(ev.pointerId))return;
    const prev = this._activePointers.get(ev.pointerId);
    const p = getPoint(ev);
    const total = Math.hypot(p.x - prev.downX, p.y - prev.downY);
    this._activePointers.set(ev.pointerId, { ...prev, ...p, travel: Math.max(prev.travel, total) });


    // If we are in one-finger mode then IGNORE the 2-finger logic
    if (this._oneFingerDrawStarted) {
        return; 
    }

    

    if (this._activePointers.size === 2 && this._gesture) {
        const pts = Array.from(this._activePointers.values());
        const p0 = pts[0], p1 = pts[1];
        const curDist = _dist(p0, p1);
        const curMid  = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        if (this._gesture.startDist <= Wick.View.Project.GESTURE_MIN_DIST_SQ) return;

        // pinch scale & target zoom
        const scaleFromStart = curDist / this._gesture.startDist;
        const unclampedZoom  = this._gesture.startZoom * scaleFromStart;
        const targetZoom = Math.max(
            Wick.View.Project.ZOOM_MIN,
            Math.min(Wick.View.Project.ZOOM_MAX, unclampedZoom)
        );

        // Per-frame pinch delta (are we pinching this frame?)
        const prevDist = this._gesture.prevDist || curDist;
        const dScale = prevDist > 1e-6 ? (curDist / prevDist) : 1.0;
        const pinchingThisFrame = Math.abs(dScale - 1) > 0.0015; // ~0.15% change

        // Capture old zoom then apply new zoom
        const prevZoom = this.paper.view.zoom;
        this.paper.view.zoom = targetZoom;

        const zoomChanged = Math.abs(this.paper.view.zoom - prevZoom) > Wick.View.Project.GESTURE_MIN_DIST_SQ;

        // NOT pinching? always pan. pinching? only pan if zoom actually changed (avoid drift at clamp)
        const shouldPanThisFrame = (!pinchingThisFrame) || (pinchingThisFrame && zoomChanged);
        if (shouldPanThisFrame && this._gesture.prevMid) { // normal 2 finger pan
            const dMidPx = new paper.Point(
            curMid.x - this._gesture.prevMid.x,
            curMid.y - this._gesture.prevMid.y
            );
            // screen px -> project units
            this.paper.view.center = this.paper.view.center.subtract(
            dMidPx.divide(this.paper.view.zoom)
            );
        }

        // focal point correction, combining pan while zooming -H.A.
        if (zoomChanged) {
            const anchorScreen = new paper.Point(curMid.x, curMid.y);
            const anchorProjBefore = this.paper.view.viewToProject(anchorScreen);

            const anchorScreenAfter = this.paper.view.projectToView(anchorProjBefore);
            const deltaPx = anchorScreen.subtract(anchorScreenAfter);

            this.paper.view.center = this.paper.view.center.subtract(
            deltaPx.divide(this.paper.view.zoom)
            );
        }

        // update for next state
        this._gesture.prevMid  = curMid;
        this._gesture.prevDist = curDist;

        // Sync model zoom/pan & render
        const now = ev.timeStamp;
        const dur = now - this._twoFingerTapCandidate.startAt;
        if(dur > 150)
        this._applyZoomAndPanChangesFromPaper();
    }

  };

    const onPointerUpOrCancel = (ev) => {

        // Clear the one-finger timer
        if (this._oneFingerStartTimer) {
            clearTimeout(this._oneFingerStartTimer);
            this._oneFingerStartTimer = null;
        }

        // Remove the pointer that just lifted
        this._activePointers.delete(ev.pointerId);

        const remaining = this._activePointers.size;

        // Helper to finalize: decide if it's a two-finger tap and reset state
        const finalizeTwoFingerTap = (ts) => {
            const cand = this._twoFingerTapCandidate;
            if (cand && !cand.canceled) {
                const now = ts || ev.timeStamp;
                const dur = now - cand.startAt;
                // For testing, accept anything under 10s
                if (dur <= 150) {
                    // Visible confirmation on device (no console needed)
                    try { navigator.vibrate && navigator.vibrate(10); } catch {}
                    // alert('Two-finger UNDO'); // remove once verified

                    try {

                        this.model.undo();
                        this.render();
                        // this.fireEvent('canvasModified', { undo: false }, 'Undo');

                    } catch (err) {
                        alert('Undo call failed');
                        alert(err);
                    }
                }
            }

            // Always reset gesture/tap state when evaluation is done
            this._gesture = null;
            this._twoFingerTapCandidate = null;
            if (this._twoFingerTapEndTimer) {
                clearTimeout(this._twoFingerTapEndTimer);
                this._twoFingerTapEndTimer = null;
            }
            Wick.gesture.active = false;
            Wick.gesture.type = null;
            Wick.gesture.lastEndAt = (performance.now() || Date.now());
        };

        // Case A: BOTH fingers are up now → evaluate immediately
        if (remaining === 0) {
            this._oneFingerDrawStarted = false; 
            finalizeTwoFingerTap();
            return;
        }

        // Case B: we just went 2 → 1 fingers → arm a tiny grace window
        // (Do NOT clear the candidate here!)
        if (remaining === 1) {
            if (this._twoFingerTapEndTimer) clearTimeout(this._twoFingerTapEndTimer);
            this._twoFingerTapEndTimer = setTimeout(() => {
            // If the second up arrived during the window, remaining will be 0 now.
            if (this._activePointers.size === 0) {
                finalizeTwoFingerTap();
            } else {
                // Not a clean two-finger tap; just clear gesture flags so tools resume.
                this._gesture = null;
                // DO NOT clear _twoFingerTapCandidate here; let a future full lift re-evaluate.
                Wick.gesture.active = false;
                Wick.gesture.type = null;
            }
            this._twoFingerTapEndTimer = null;
            }, 120); // 80-150ms works well; 120ms is a good default
            return;
        }
    };




  // Use non-passive so we can preventDefault if ever needed (we currently rely on touch-action: none)
  this._svgCanvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  this._svgCanvas.addEventListener('pointermove', onPointerMove, { passive: false });
  this._svgCanvas.addEventListener('pointerup', onPointerUpOrCancel, { passive: false });
  this._svgCanvas.addEventListener('pointercancel', onPointerUpOrCancel, { passive: false });
  // --- end gestures ---

        // Connect all Wick Tools into the paper.js project
        for (var toolName in this.model.tools) {
            var tool = this.model.tools[toolName];
            tool.project = this.model;
            tool.on('canvasModified', (e, actionName) => {
                this.applyChanges();
                this.fireEvent('canvasModified', e, actionName);
            });
            tool.on('canvasViewTransformed', (e) => {
                this._applyZoomAndPanChangesFromPaper();
                this.fireEvent('canvasModified', e, `viewTransform-${toolName}`);
            });
            tool.on('eyedropperPickedColor', (e) => {
                this.fireEvent('eyedropperPickedColor', e);
            });
        }

        this.model.tools.none.activate();
    }

    _displayCanvasInContainer(canvas) {
        if (!this.canvasContainer) return;

        if (canvas !== this.canvasContainer.children[0]) {
            if (this.canvasContainer.children.length === 0) {
                this.canvasContainer.appendChild(canvas);
            } else {
                this.canvasContainer.innerHTML = '';
                this.canvasContainer.appendChild(canvas);
            }
            this.resize();
        }
    }

    _updateCanvasContainerBGColor() {
        if (this.model.focus === this.model.root) {
            // We're in the root timeline, use the color given to us from the user (or use a default)
            this.canvas.style.backgroundColor = this.canvasBGColor || Wick.View.Project.DEFAULT_CANVAS_BG_COLOR;
        } else {
            // We're inside a clip, so use the project background color as the container background color
            this.canvas.style.backgroundColor = this.model.backgroundColor.hex;
        }
    }

    _buildSVGCanvas() {
        if (this._svgCanvas) return;

        this._svgCanvas = document.createElement('canvas');
        this._svgCanvas.style.width = '100%';
        this._svgCanvas.style.height = '100%';
        this._svgCanvas.tabIndex = 0;
        this._svgCanvas.onclick = () => { this._svgCanvas.focus(); };
        this.paper.setup(this._svgCanvas);

        this._svgBackgroundLayer = new paper.Layer();
        this._svgBackgroundLayer.name = 'wick_project_bg';
        this._svgBackgroundLayer.remove();

        this._svgBordersLayer = new paper.Layer();
        this._svgBordersLayer.name = 'wick_project_borders';
        this._svgBordersLayer.remove();

        this._svgGUILayer = new paper.Layer();
        this._svgGUILayer.locked = true;
        this._svgGUILayer.name = 'wick_project_gui';
        this._svgGUILayer.remove();

        this.paper.project.clear();
    }

    _renderSVGCanvas() {
        this.paper.project.clear();

        // Lazily setup tools
        if (!this._toolsSetup) {
            this._toolsSetup = true;
            this._setupTools();
        }

        if (this.model.project.playing) {
            // Enable interact tool if the project is running
            this.model.tools.interact.activate();
        } else if (!this.model.canDraw && this.model.activeTool.isDrawingTool) {
            // Disable drawing tools if there's no frame to edit
            this.model.tools.none.activate();
        } else {
            this.model.activeTool.activate();
        }

        // Update zoom and pan
        if (this._fitMode === 'center') {
            this.paper.view.zoom = this.model.zoom;
        } else if (this._fitMode === 'fill') {
            // Fill mode: Try to fit the wick project's canvas inside the container canvas by
            // scaling it as much as possible without changing the project's original aspect ratio
            this.paper.view.zoom = this.model.zoom * this.calculateFitZoom();
        }

        var pan = this._pan;
        this.paper.view.center = new paper.Point(-pan.x, -pan.y);
        this.paper.view.rotation = this.model.rotation;

        // Generate background layer
        this._svgBackgroundLayer.removeChildren();
        this._svgBackgroundLayer.locked = true;
        this.paper.project.addLayer(this._svgBackgroundLayer);

        if (this.model.focus.isRoot) {
            // We're in the root timeline, render the canvas normally
            var stage = this._generateSVGCanvasStage();
            this._svgBackgroundLayer.addChild(stage);
        } else {
            // We're inside a clip, don't render the canvas BG, instead render a crosshair at (0,0)
            var originCrosshair = this._generateSVGOriginCrosshair();
            this._svgBackgroundLayer.addChild(originCrosshair);
        }

        // Generate frame layers
        this.model.focus.timeline.view.render();
        this.model.focus.timeline.view.frameLayers.forEach(layer => {
            this.paper.project.addLayer(layer);
            if (this.model.project &&
                this.model.project.activeFrame &&
                !layer.locked &&
                (layer.data.wickType === 'paths' || layer.data.wickType === 'clipsandpaths') &&
                layer.data.wickUUID === this.model.project.activeFrame.uuid) {
                layer.activate();
            }
        });

        // Render selection
        this.model.selection.view.render();
        this.paper.project.addLayer(this.model.selection.view.layer);

        // Render GUI Layer
        this._svgGUILayer.removeChildren();
        this._svgGUILayer.locked = true;
        if(this.model.showClipBorders && !this.model.playing && !this.model.isPublished) {
            this._svgGUILayer.addChildren(this._generateClipBorders());
            this.paper.project.addLayer(this._svgGUILayer);
        }

        // Render black bars (for published projects)
        if(this.model.isPublished && this.model.renderBlackBars) {
            // this._model._children[1]._children[0]._children[0].activate();
            this._svgBordersLayer.removeChildren();
            this._svgBordersLayer.addChildren(this._generateSVGBorders());
            this.paper.project.addLayer(this._svgBordersLayer);
            this._svgBordersLayer.bringToFront();
        }
    }

    _generateSVGCanvasStage() {
        var isPub = this.model.publishedMode;
        var borderLength = this.model.width * this.model.height * 20;
        var stage = new paper.Path.Rectangle(
            new this.paper.Point(isPub? borderLength/-2 : 0, isPub? borderLength/-2 : 0),
            new this.paper.Point(isPub ? borderLength : this.model.width, isPub ? borderLength : this.model.height),
        );
        stage.remove();
        stage.fillColor = this.model.backgroundColor.rgba;

        return stage;
    }

    _generateSVGOriginCrosshair() {
        var originCrosshair = new this.paper.Group({ insert: false });

        var vertical = new paper.Path.Line(
            new this.paper.Point(0, -Wick.View.Project.ORIGIN_CROSSHAIR_SIZE),
            new this.paper.Point(0, Wick.View.Project.ORIGIN_CROSSHAIR_SIZE)
        );
        vertical.strokeColor = Wick.View.Project.ORIGIN_CROSSHAIR_COLOR;
        vertical.strokeWidth = Wick.View.Project.ORIGIN_CROSSHAIR_THICKNESS / this.paper.view.zoom;

        var horizontal = new paper.Path.Line(
            new this.paper.Point(-Wick.View.Project.ORIGIN_CROSSHAIR_SIZE, 0),
            new this.paper.Point(Wick.View.Project.ORIGIN_CROSSHAIR_SIZE, 0)
        );
        horizontal.strokeColor = Wick.View.Project.ORIGIN_CROSSHAIR_COLOR;
        horizontal.strokeWidth = Wick.View.Project.ORIGIN_CROSSHAIR_THICKNESS / this.paper.view.zoom;

        originCrosshair.addChild(vertical);
        originCrosshair.addChild(horizontal);

        originCrosshair.position.x = 0;
        originCrosshair.position.y = 0;

        return originCrosshair;
    }

    /* Renders the off-screen borders that hide content out of the project bounds. */
    _generateSVGBorders() {
        /**
         * +----------------------------+
         * |             top            +
         * +----------------------------+
         * +-----+ +------------+ +-----+
         * |left | |   canvas   | |right|
         * +-----+ +------------+ +-----+
         * +----------------------------+
         * |           bottom           +
         * +----------------------------+
         */

        var borderMin = -10000,
            borderMax = 10000;
        var strokeOffset = 0.5; // prevents gaps between border rects

        var bottom = this.model.height;
        var right = this.model.width;

        if (this.model.publishedMode === "imageSequence") {
            bottom *= window.devicePixelRatio;
            right *= window.devicePixelRatio;
        }

        var borderPieces = [
            // top
            new paper.Path.Rectangle({
                from: new paper.Point(borderMin, borderMin),
                to: new paper.Point(borderMax, strokeOffset),
                fillColor: 'black',
                strokeWidth: 0,
                strokeColor: 'black',
                insert: false
            }),
            // bottom
            new paper.Path.Rectangle({
                from: new paper.Point(borderMin, (bottom)-strokeOffset),
                to: new paper.Point(borderMax, borderMax),
                fillColor: 'black',
                strokeWidth: 0,
                strokeColor: 'black',
                insert: false
            }),
            // left
            new paper.Path.Rectangle({
                from: new paper.Point(borderMin, -strokeOffset),
                to: new paper.Point(-strokeOffset, (bottom)+strokeOffset),
                fillColor: 'black',
                strokeWidth: 1,
                strokeColor: 'black',
                insert: false
            }),
            // right
            new paper.Path.Rectangle({
                from: new paper.Point((right)+strokeOffset, -strokeOffset),
                to: new paper.Point(borderMax, borderMax),
                fillColor: 'black',
                strokeWidth: 1,
                strokeColor: 'black',
                insert: false
            }),
        ];

        var border = new paper.Group({ insert:false });
        border.applyMatrix = false;
        border.addChildren(borderPieces);

        // Adjust borders based on zoom/pan (this fixes borders hiding things while using a vcam)
        border.scaling = new paper.Point(this.model.zoom, this.model.zoom);
        border.position = new paper.Point(-this.model.pan.x, -this.model.pan.y);

        return border.children;
    }

    _generateClipBorders() {
        var clipBorders = [];

        this.model.activeFrames.filter(frame => {
            return !frame.parentLayer.hidden;
        }).forEach(frame => {
            var clips = frame.clips.filter(clip => {
                return !clip.isSelected;
            });
            clips.forEach(clip => {
                var clipBorder = clip.view.generateBorder();
                clipBorders.push(clipBorder);
            });
        });

        return clipBorders;
    }

    _applyZoomAndPanChangesFromPaper() {
        // limit zoom to min and max
        this.paper.view.zoom = Math.min(Wick.View.Project.ZOOM_MAX, this.paper.view.zoom);
        this.paper.view.zoom = Math.max(Wick.View.Project.ZOOM_MIN, this.paper.view.zoom);

        // limit pan
        this.pan.x = Math.min(Wick.View.Project.PAN_LIMIT, this.pan.x);
        this.pan.x = Math.max(-Wick.View.Project.PAN_LIMIT, this.pan.x);
        this.pan.y = Math.min(Wick.View.Project.PAN_LIMIT, this.pan.y);
        this.pan.y = Math.max(-Wick.View.Project.PAN_LIMIT, this.pan.y);

        this.model.pan = {
            x: this.pan.x,
            y: this.pan.y,
        };

        this.zoom = this.paper.view.zoom;
        this.model.zoom = this.zoom;

        this.render();
    }
}
