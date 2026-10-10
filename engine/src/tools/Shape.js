/* Adapted from Wick - (c) 2017 Zach Rispoli, Luca Damasco, and Josh Rispoli */

/*
 * Copyright 2026 Candlestickers
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

/*
 * Adapted from the legacy Wick Editor Tools.Pen (src/editor/tools/Tools.Pen.js). 
 * Each click adds a node to the path being drawn; dragging on a click bends the curve
 * at that node by pulling out its handles.
 */
Wick.Tools.Shape = class extends Wick.Tool {
  constructor() {
    super();

    this.name = "shape";

    this.SELECTION_TOLERANCE = 6;
    this.CLOSE_NODE_RADIUS = 5;
    this.CLOSE_NODE_STROKE_COLOR = "rgba(100,150,255,1.0)";
    this.CLOSE_NODE_FILL_COLOR = "#ffffff";

    this.path = null;
    this.currentSegment = null;
    this._targetFrame = null;
    this.hitResult = new this.paper.HitResult();

    // Reused and mutated in place across onMouseMove calls (which fire on
    // every pixel of movement) instead of rebuilt each time.
    this.previewStroke = new this.paper.Path({ insert: false });
    this.previewStroke.data.wickType = "gui";
    this.previewStroke.visible = false;

    this.closeNodeIndicator = new this.paper.Item({ insert: false });
    this._isInProgress = false;
  }

  get doubleClickEnabled() {
    return true;
  }

  get cursor() {
    return "crosshair";
  }

  get isDrawingTool() {
    return true;
  }

  onActivate() {}

  onDeactivate() {
    if (this.path) {
      var self = this;
      setTimeout(function () {
        self._finishPath();
      }, 0);
    }
  }

  onMouseMove(e) {
    super.onMouseMove(e);

    if (this.path && !this.path.layer) {
      this.paper.project.activeLayer.addChild(this.path);
    }

    this.hitResult = this._updateHitResult(e);

    this.previewStroke.visible = false;
    this.closeNodeIndicator.remove();

    if (this.path && this.currentSegment) {
      var closing = this._hitIsOtherEndpoint();

      if (!this._hitIsCurrentSegmentHandle()) {
        if (!this.previewStroke.layer) {
          this.paper.project.activeLayer.addChild(this.previewStroke);
        }
        this.previewStroke.strokeColor = this.getSetting("strokeColor").rgba;
        this.previewStroke.strokeWidth = 1 / this.paper.view.zoom;
        this.previewStroke.dashArray = [4 / this.paper.view.zoom, 4 / this.paper.view.zoom];

        var startSegment = this.currentSegment.clone();

        this.previewStroke.removeSegments();
        this.previewStroke.add(startSegment);
        this.previewStroke.add(closing ? this.hitResult.segment.point : e.point);
        this.previewStroke.visible = true;
      }

      if (closing) {
        this.closeNodeIndicator = new this.paper.Path.Circle(
          this.hitResult.segment.point,
          this.CLOSE_NODE_RADIUS / this.paper.view.zoom
        );
        this.closeNodeIndicator.strokeColor = this.CLOSE_NODE_STROKE_COLOR;
        this.closeNodeIndicator.strokeWidth = 2 / this.paper.view.zoom;
        this.closeNodeIndicator.fillColor = this.CLOSE_NODE_FILL_COLOR;
        this.closeNodeIndicator.data.wickType = "gui";
        this.paper.project.activeLayer.addChild(this.closeNodeIndicator);
      }
    }
  }

  onMouseDown(e) {
    this.previewStroke.visible = false;
    this.closeNodeIndicator.remove();

    this.hitResult = this._updateHitResult(e);

    if (this.path && this.currentSegment && this._hitIsOtherEndpoint()) {
      this.path.closePath();
      this.path.fillColor = this.getSetting("fillColor").rgba;
      this._finishPath();
      return;
    }

    if (!this.path) {
      this.path = new this.paper.Path({
        strokeColor: this.getSetting("strokeColor").rgba,
        strokeWidth: this.getSetting("strokeWidth"),
        strokeCap: "round",
        strokeJoin: "round",
      });
      this.paper.project.activeLayer.addChild(this.path);
      this.currentSegment = this.path.add(e.point);
      this._isInProgress = true;
      this._targetFrame = this.project.activeFrame;
    } else if (this._hitIsCurrentSegmentHandle()) {
      // Let onMouseDrag bend this node's handle instead of adding a new one.
    } else {
      this.currentSegment = this.path.add(e.point);
    }
  }

  onMouseDrag(e) {
    if (!this.currentSegment) return;

    this.currentSegment.handleOut.x += e.delta.x;
    this.currentSegment.handleOut.y += e.delta.y;
    this.currentSegment.handleIn.x -= e.delta.x;
    this.currentSegment.handleIn.y -= e.delta.y;
  }

  onMouseUp() {}

  onDoubleClick(e) {
    this.hitResult = this._updateHitResult(e);

    if (this.path && this.currentSegment && this._hitIsCurrentSegmentOrItsHandle()) {
      // Unbend this node instead of finishing the path.
      this.currentSegment.handleIn.x = 0;
      this.currentSegment.handleIn.y = 0;
      this.currentSegment.handleOut.x = 0;
      this.currentSegment.handleOut.y = 0;
      return;
    }

    this._finishPath();
  }

  onKeyDown(e) {
    if (e.key === "escape") {
      this.discard();
    } else if (e.key === "enter") {
      this._finishPath();
    }
  }

  /**
   * Is a path currently being drawn by clicks that haven't been committed yet?
   * Used by the undo to discard in-progress shapes instead of
   * corrupting them when the paper item backing them isn't part of the
   * Wick object/history model yet.
   * @type {boolean}
   */
  isInProgress() {
    return this._isInProgress;
  }

  /**
   * Discards the path currently being drawn without committing it.
   */
  discard() {
    this._cancelPath();
  }

  _hitIsCurrentSegmentHandle() {
    return (
      this.hitResult &&
      this.hitResult.item === this.path &&
      this.hitResult.segment === this.currentSegment &&
      this.hitResult.type &&
      this.hitResult.type.startsWith("handle")
    );
  }

  _hitIsCurrentSegmentOrItsHandle() {
    return (
      this.hitResult &&
      this.hitResult.item === this.path &&
      this.hitResult.segment === this.currentSegment
    );
  }

  _hitIsOtherEndpoint() {
    if (!this.hitResult || this.hitResult.item !== this.path || this.hitResult.type !== "segment") {
      return false;
    }
    var segment = this.hitResult.segment;
    return (
      segment !== this.currentSegment &&
      (segment === this.path.firstSegment || segment === this.path.lastSegment)
    );
  }

  _updateHitResult(e) {
    if (!this.path) {
      return new this.paper.HitResult();
    }

    var newHitResult = this.path.hitTest(e.point, {
      segments: true,
      handles: true,
      stroke: false,
      fill: false,
      curves: false,
      tolerance: this.SELECTION_TOLERANCE / this.paper.view.zoom,
    });

    return newHitResult || new this.paper.HitResult();
  }

  _finishPath() {
    this.previewStroke.visible = false;
    this.closeNodeIndicator.remove();

    if (this.path) {
      if (this.path.segments.length > 1) {
        this.path.remove();

        // Insert into the target frame's own paper.Layer directly
        var targetFrame = this._targetFrame || this.project.activeFrame;
        if (targetFrame) {
          targetFrame.view.objectsLayer.addChild(this.path);
          this.fireEvent({ eventName: "canvasModified", actionName: "shape" });
        }
      } else {
        this.path.remove();
      }
    }

    this.path = null;
    this.currentSegment = null;
    this._targetFrame = null;
    this._isInProgress = false;
  }

  _cancelPath() {
    this.previewStroke.visible = false;
    this.closeNodeIndicator.remove();
    if (this.path) {
      this.path.remove();
    }
    this.path = null;
    this.currentSegment = null;
    this._targetFrame = null;
    this._isInProgress = false;
  }
};