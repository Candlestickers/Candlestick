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

Wick.Tools.FillBucket = class extends Wick.Tool {
    /**
     *
     */
    constructor() {
        super();

        this.name = 'fillbucket';

        // simple gesture handle -H.A.
        this._gestureSeqAtStart = 0;
        this._pendingFill = false;

    }

    get doubleClickEnabled() {
        return false;
    }

    /**
     *
     * @type {string}
     */
    get cursor() {
        return 'url(cursors/fillbucket.png) 32 32, auto';
    }

    get isDrawingTool() {
        return true;
    }

    onActivate(e) {

    }

    onDeactivate(e) {
        this._pendingFill = false;
        this.setCursor('default');
    }


    onMouseDown(e) {
        // Don’t start a fill while two-finger gesture is active
        if (window.Wick && Wick.gesture && Wick.gesture.active) {
            return;
        }

        // gesture stamp
        this._gestureSeqAtStart = (window.Wick && Wick.gesture && Wick.gesture.seq) ? Wick.gesture.seq : 0;
        this._pendingFill = true;

        setTimeout(() => {
            this.setCursor('wait');
        }, 0);

        setTimeout(() => {
            // If a gesture started after mousedown, cancel before doing any work
            const g = (window.Wick && Wick.gesture) || {};
            if (!this._pendingFill || g.active || ((g.seq || 0) !== (this._gestureSeqAtStart || 0))) {
                this._pendingFill = false;
                this.setCursor('default');
                return;
            }

            this.paper.hole({
                point: e.point,
                bgColor: new paper.Color(this.project.backgroundColor.hex),
                gapFillAmount: this.getSetting('gapFillAmount'),
                layers: this.project.activeFrames.filter(frame => {
                    return !frame.parentLayer.hidden;
                }).map(frame => {
                    return frame.view.objectsLayer;
                }),
                onFinish: (path) => {
                    // Final safety check at commit-time as well
                    const g2 = (window.Wick && Wick.gesture) || {};
                    if (!this._pendingFill || g2.active || ((g2.seq || 0) !== (this._gestureSeqAtStart || 0))) {
                        this._pendingFill = false;
                        this.setCursor('default');
                        if (path && typeof path.remove === 'function') { try { path.remove(); } catch (_) { } }
                        return;
                    }

                    this.setCursor('default');
                    this._pendingFill = false;

                    if (path) {
                        path.fillColor = this.getSetting('fillColor').rgba;
                        path.strokeWidth = 1;
                        path.strokeColor = this.getSetting('fillColor').rgba;
                        path.name = null;
                        console.log(path);

                        // Insert where you had it before
                        if (e.item) {
                            path.insertAbove(e.item);
                        } else {
                            this.paper.project.activeLayer.addChild(path);
                        }

                        // Now add to project/history & fire event
                        this.addPathToProject(path);
                        this.fireEvent({ eventName: 'canvasModified', actionName: 'fillbucket' });
                    }
                }, onError: (message) => {
                    this.setCursor('default');
                    this.project.errorOccured(message);
                }
            });
        }, 0);
    }


    onMouseDrag(e) {

    }

    onMouseUp(e) {

    }
}
