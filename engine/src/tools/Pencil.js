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

Wick.Tools.Pencil = class extends Wick.Tool {
    static get MIN_ADD_POINT_MOVEMENT () {
        return 2;
    }

    /**
     * Creates a pencil tool.
     */
    constructor () {
        super();

        this.name = 'pencil'

        this.path = null;

        this._movement = new paper.Point();

        // gesture interrupts - H.A.
        this._gestureInterrupted = false;
        this._suppressCommit = false;
        this._gestureSeqAtStart = 0;
        this._strokeStartedAt = 0;

    }

    get doubleClickEnabled () {
        return false;
    }

    /**
     * The pencil cursor.
     * @type {string}
     */
    get cursor () {
        return 'url(cursors/pencil.png) 32 32, auto';
    }

    get isDrawingTool () {
        return true;
    }

    onActivate (e) {

    }

    onDeactivate (e) {

    }

    onMouseDown (e) {

        // handling mobile finger gestures — H.A.
        if (window.Wick && Wick.gesture && Wick.gesture.active) {
            this._gestureInterrupted = true;
            this._suppressCommit = true;
            return;
        }

        // New stroke: clear latches and stamp gesture/stroke start
        this._gestureInterrupted = false;
        this._suppressCommit = false;
        this._gestureSeqAtStart = (window.Wick && Wick.gesture && Wick.gesture.seq) ? Wick.gesture.seq : 0;
        this._strokeStartedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());


        this._movement = new paper.Point();

        if (!this.path) {
            this.path = new this.paper.Path({
                fillColor: this.getSetting('fillColor').transparent.rgba,
                strokeColor: this.getSetting('strokeColor').rgba,
                strokeWidth: this.getSetting('strokeWidth'),
                strokeCap: 'round',
            });
        }

        this.path.add(e.point);
    }

    onMouseDrag (e) {
        if(!this.path) return;

        // If a two-finger gesture begins mid-stroke, abort
        if (window.Wick && Wick.gesture && Wick.gesture.active) {
            this._gestureInterrupted = true;
            this._suppressCommit = true;
            this._cancelPath(); // removes in-progress path
            return;
        }


        this._movement = this._movement.add(e.delta);

        if(this._movement.length > Wick.Tools.Pencil.MIN_ADD_POINT_MOVEMENT / this.paper.view.zoom) {
            this._movement = new paper.Point();
            this.path.add(e.point);
            this.path.smooth();
        }
    }

    onMouseUp (e) {
        if(!this.path) return;

        // check for gesture interrupts before finalizing
        const g = (window.Wick && Wick.gesture) || {};
        const gestureActiveNow = !!g.active;
        const gestureStartedDuringStroke =
        (g.lastStartAt && this._strokeStartedAt && g.lastStartAt >= this._strokeStartedAt) ||
        ((g.seq || 0) !== (this._gestureSeqAtStart || 0));

        const interrupted = this._suppressCommit || this._gestureInterrupted || gestureActiveNow || gestureStartedDuringStroke;

        if (interrupted) {
            this._cancelPath(); // ensure nothing committed
            this._suppressCommit = false;
            this._gestureInterrupted = false;
            return;
        }


        this.path.add(e.point);
        this.path.simplify();
        this.path.remove();
        this.addPathToProject(this.path);
        this.path = null;
        this.fireEvent({eventName: 'canvasModified', actionName: 'pencil'});
    }

    _cancelPath () {
        if (this.path) {
            try { this.path.remove(); } catch (_) {}
            this.path = null;
        }
    }

}
