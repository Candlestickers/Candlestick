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

Wick.Tools.Eraser = class extends Wick.Tool {
    /**
     *
     */
    constructor () {
        super();

        this.name = 'eraser';

        this.path = null;

        this.cursorSize = null;
        this.cachedCursor = null;

        // gesture controls - H.A.
        this._gestureInterrupted = false;
        this._suppressCommit = false;
        this._gestureSeqAtStart = 0;
        this._strokeStartedAt = 0;

    }

    get doubleClickEnabled () {
        return false;
    }

    /**
     *
     * @type {string}
     */
    get cursor () {
        return this.cachedCursor || 'crosshair';
    }

    get isDrawingTool () {
        return true;
    }

    onActivate (e) {
        this.cursorSize = null;
    }

    onDeactivate (e) {
        if(this.path) {
            this.path.remove();
            this.path = null;
        }
    }

    onMouseMove (e) {
        // Don't render cursor after every mouse move, cache and only render when size changes
        var cursorNeedsRegen = this.getSetting('eraserSize') !== this.cursorSize;

        if(cursorNeedsRegen) {
            this.cachedCursor = this.createDynamicCursor('#ffffff', this.getSetting('eraserSize') + 1);
            this.cursorSize = this.getSetting('eraserSize');
            this.setCursor(this.cachedCursor);
        }
    }

    onMouseDown (e) {

        // If a gesture is active now, don’t begin -_- 
        if (window.Wick && Wick.gesture && Wick.gesture.active) {
            this._gestureInterrupted = true;
            this._suppressCommit = true;
            return;
        }

        // track stroke and clear gesture interrupt
        this._gestureInterrupted = false;
        this._suppressCommit = false;
        this._gestureSeqAtStart = (window.Wick && Wick.gesture && Wick.gesture.seq) ? Wick.gesture.seq : 0;
        this._strokeStartedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        if (!this.path) {
            this.path = new this.paper.Path({
                strokeColor: 'white',
                strokeCap: 'round',
                strokeWidth: (this.getSetting('eraserSize') + 1) / this.paper.view.zoom,
            });
        }

        // Add two points so we always at least have a dot.
        this.path.add(e.point);
        this.path.add(e.point);
    }

    onMouseDrag (e) {

        // If a two-finger gesture begins mid-stroke, abort! 
        if (window.Wick && Wick.gesture && Wick.gesture.active) {
            this._gestureInterrupted = true;
            this._suppressCommit = true;
            this._cancelPath(); // remove in-progress eraser path 
            return;
        }

        if (e.point) {
            this.path.add(e.point);
            this.path.smooth();
        }
    }

    onMouseUp (e) {

        // Compute interruption (before touching this.path) - H.A.
        const g = (window.Wick && Wick.gesture) || {};
        const gestureActiveNow = !!g.active;
        const gestureStartedDuringStroke =
        (g.lastStartAt && this._strokeStartedAt && g.lastStartAt >= this._strokeStartedAt) ||
        ((g.seq || 0) !== (this._gestureSeqAtStart || 0));

        const interrupted = this._suppressCommit || this._gestureInterrupted || gestureActiveNow || gestureStartedDuringStroke;

        if (interrupted) {
            this._cancelPath(); // safety net right here
            this._suppressCommit = false;
            this._gestureInterrupted = false;
            return;
        }

        if(!this.path) return;

        var potraceResolution = 0.7;

        this.path.potrace({
            done: (tracedPath) => {
                this.path.remove();
                this.paper.project.activeLayer.erase(tracedPath,{});
                this.path = null;
                this.fireEvent({eventName: 'canvasModified', actionName:'eraser'});
            },
            resolution: potraceResolution * this.paper.view.zoom,
        });
    }

    _cancelPath () {
        if (this.path) {
            try { this.path.remove(); } catch (_) {}
            this.path = null;
        }
    }

}
