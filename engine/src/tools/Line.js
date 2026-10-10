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

Wick.Tools.Line = class extends Wick.Tool {
	/**
	 *
	 */
	constructor() {
		super();
		this.name = 'line';
		this.path = new this.paper.Path({
			insert: false
		});
		this.startPoint;
		this.endPoint;
		this.hitResult = new this.paper.HitResult();
		this.hoverPreview = new this.paper.Item({
			insert: false
		});

		// HAND GESTURES - H.A.
		this._gestureInterrupted = false;
		this._suppressCommit = false;
		this._gestureSeqAtStart = 0;
		this._strokeStartedAt = 0;

	}

	get doubleClickEnabled() {
		return false;
	}
	/**
	 *
	 * @type {string}
	 */


	get cursor() {
		return 'crosshair';
	}

	get isDrawingTool() {
		return true;
	}

	onActivate(e) {
		this._cancelPath();
		// this.path.remove();
	}

	onDeactivate(e) {
		this._cancelPath();
		// this.path.remove();
	}

	onMouseMove(e) {
		// inherit mousemove class
		super.onMouseMove(e);

		// remove the hover preview
		this.hoverPreview.remove();

		// find what's under the cursor
		this.hitResult = this._updateHitResult(e);

		// alt/ option or command/ control to snap to nearby selection
		if ((this._shouldSnap(e)) && this.hitResult.type === 'segment') {
			let globalPoint = this.hitResult.item.parent.localToGlobal(this.hitResult.segment.point);
			this.hoverPreview = new this.paper.Path.Circle(globalPoint, 5 / this.paper.view.zoom);
			this.hoverPreview.strokeColor = 'rgba(100,100,100,0)';
			this.hoverPreview.strokeWidth = 1.5;
			this.hoverPreview.fillColor = 'rgba(150,0,0,0.5)';

			this.startPoint = globalPoint;
		} else {
			this.startPoint = false;
		}

		this.hoverPreview.data.wickType = 'gui';
	}

	onMouseDown(e) {

		// check for gesture
		if (window.Wick && Wick.gesture && Wick.gesture.active) {
			this._gestureInterrupted = true;
			this._suppressCommit = true;
			return;
		}
		// else reset gesture stamp
		this._gestureInterrupted = false;
		this._suppressCommit = false;
		this._gestureSeqAtStart = (window.Wick && Wick.gesture && Wick.gesture.seq) ? Wick.gesture.seq : 0;
		this._strokeStartedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());

		// check if there is a hoverpoint
		// else use e.point for startPoint
		if (!this.startPoint)
			this.startPoint = e.point;
	}

	onMouseDrag(e) {

		// abort mid-process if needed
		if (window.Wick && Wick.gesture && Wick.gesture.active) {
			this._gestureInterrupted = true;
			this._suppressCommit = true;
			this._cancelPath();
			return;
		}

		// this.path.remove();
		this._cancelPath();

		// remove the hover preview
		this.hoverPreview.remove();

		// find what's under the cursor
		this.hitResult = this._updateHitResult(e);

		// snap to point if option/ alt or command/ control
		if ((this._shouldSnap(e)) && this.hitResult.type === 'segment') {
			let globalPoint = this.hitResult.item.parent.localToGlobal(this.hitResult.segment.point);
			this.endPoint = {
				x: globalPoint.x,
				y: globalPoint.y
			};

			this.hoverPreview = new this.paper.Path.Circle(globalPoint, 5 / this.paper.view.zoom);
			this.hoverPreview.strokeColor = 'rgba(100,100,100,0)';
			this.hoverPreview.strokeWidth = 1.5;

			// display red when deleting line by dragging it to start point
			this.hoverPreview.fillColor =
				(this.endPoint.x === this.startPoint.x && this.endPoint.y === this.startPoint.y) ?
					'rgba(150,50,50,0.5)' : 'rgba(50,50,255,0.5)';

		} else { // default to cursor position
			this.endPoint = e.point;
		}

		// straight line
		if (e.modifiers.shift) {
			const dy = Math.abs(this.startPoint.y - e.point.y);
			const dx = Math.abs(this.startPoint.x - e.point.x);

			// diagnol (tan(22.5) = 0.41421356237309503)
			if (dy && dx && (dy / dx) > 0.41421356237309503 && (dx / dy) > 0.41421356237309503) {
				const diff = {
					x: this.endPoint.x - this.startPoint.x,
					y: this.endPoint.y - this.startPoint.y
				}
				const length = (Math.abs(diff.y) + Math.abs(diff.x)) / 2
				this.endPoint = {
					x: this.startPoint.x + length * diff.x / Math.abs(diff.x),
					y: this.startPoint.y + length * diff.y / Math.abs(diff.y)
				}
			} else if (dy > dx) // straight vertical
				this.endPoint.x = this.startPoint.x;
			else // straight horizontal
				this.endPoint.y = this.startPoint.y;

		}
		this.hoverPreview.data.wickType = 'gui';

		this.path = new paper.Path.Line(this.startPoint, this.endPoint);
		this.path.strokeCap = 'round';
		this.path.strokeColor = this.getSetting('strokeColor').rgba;
		this.path.strokeWidth = this.getSetting('strokeWidth');
	}

	onMouseUp(e) {
		// clean up preview safely
		if (this.hoverPreview && typeof this.hoverPreview.remove === 'function') {
			try { this.hoverPreview.remove(); } catch (_) { }
		}

		// Compute interruption FIRST
		const g = (window.Wick && Wick.gesture) || {};
		const gestureActiveNow = !!g.active;
		const gestureStartedDuringStroke =
			(g.lastStartAt && this._strokeStartedAt && g.lastStartAt >= this._strokeStartedAt) ||
			((g.seq || 0) !== (this._gestureSeqAtStart || 0));
		const interrupted =
			this._suppressCommit || this._gestureInterrupted || gestureActiveNow || gestureStartedDuringStroke;

		if (interrupted) {
			// abort; remove any preview path and reset points
			this._cancelPath();
			this._suppressCommit = false;
			this._gestureInterrupted = false;
			this.startPoint = null;
			this.endPoint = null;
			return;
		}

		// Not interrupted — finalize the line if it’s not a dot
		if (!this.startPoint || !this.endPoint) {
			// nothing meaningful to add
			this._cancelPath();
			return;
		}

		const samePoint = (this.endPoint.x === this.startPoint.x && this.endPoint.y === this.startPoint.y);
		if (samePoint) {
			this._cancelPath();
			this.startPoint = null;
			this.endPoint = null;
			return;
		}

		// Ensure we have a path to add (gesture aborts may have nulled it)
		if (!this.path) {
			this.path = new this.paper.Path.Line(this.startPoint, this.endPoint);
			this.path.strokeCap = 'round';
			this.path.strokeColor = this.getSetting('strokeColor').rgba;
			this.path.strokeWidth = this.getSetting('strokeWidth');
		}

		// House style elsewhere removes then adds; keep consistent
		try { this.path.remove(); } catch (_) { }
		// this._cancelPath();
		this.addPathToProject(this.path);
		this.path = null;

		this.fireEvent({ eventName: 'canvasModified', actionName: 'line' });

		// reset start/end for next stroke
		this.startPoint = null;
		this.endPoint = null;
	}


	// todo: clean this function -H.A.
	_updateHitResult(e) {
		var newHitResult = this.paper.project.hitTest(e.point, {
			fill: false,
			stroke: false,
			curves: false,
			segments: true,
			handles: false,
			tolerance: 20 / this.paper.view.zoom,
			match: result => {
				return result.item !== this.hoverPreview && !result.item.data.isBorder;
			}
		});

		if (!newHitResult) newHitResult = new this.paper.HitResult();

		if (newHitResult.item && !newHitResult.item.data.isSelectionBoxGUI) {
			// You can't select children of compound paths, you can only select the whole thing.
			if (newHitResult.item.parent.className === 'CompoundPath') {
				newHitResult.item = newHitResult.item.parent;
			}
		}

		return newHitResult;
	}

	_cancelPath() {
		if (this.path) { try { this.path.remove(); } catch (_) { } this.path = null; }
	}

	_shouldSnap(e) {
		// checks if either keys for line snapping are used or user is on touch device

		// If keyboard modifiers are held, always respect them
		if (e.modifiers.alt || e.modifiers.command || e.modifiers.control || e.modifiers.option) return true;

		// Mobile / touch-default snapping:
		const ev = e && e.event;
		if (ev && typeof ev.pointerType === 'string') {
			if (ev.pointerType === 'touch' || ev.pointerType === 'pen') return true;
		}

		// Fallbacks: coarse pointer or UA touch-capable
		if (typeof window !== 'undefined') {
			if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
			if ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0)) return true;
		}

		return false;
	}


};
