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
    this.path.remove();
  }

  onDeactivate(e) {
    this.path.remove();
  }

  onMouseMove(e) {
	// inherit mousemove class
	super.onMouseMove(e); 

	// remove the hover preview
	this.hoverPreview.remove();

	// find what's under the cursor
	this.hitResult = this._updateHitResult(e);

	// alt/ option or command/ control to snap to nearby selection
	if( (e.modifiers.alt || e.modifiers.command || e.modifiers.control || e.modifiers.option ) && this.hitResult.type === 'segment') {
		this.hoverPreview = new this.paper.Path.Circle(this.hitResult.segment.point, 5/this.paper.view.zoom);
		this.hoverPreview.strokeColor = 'rgba(100,100,100,0)';
		this.hoverPreview.strokeWidth = 1.5;
		this.hoverPreview.fillColor = 'rgba(150,0,0,0.5)';

		this.startPoint = this.hitResult.segment.point;
	}else{
		this.startPoint = false;
	}

	this.hoverPreview.data.wickType = 'gui';
  }

  onMouseDown(e) {
	
	// check if there is a hoverpoint
	// else use e.point for startPoint
	if(!this.startPoint)
	this.startPoint = e.point;
  }

  onMouseDrag(e) {
    this.path.remove();

	// remove the hover preview
	this.hoverPreview.remove();

	// find what's under the cursor
	this.hitResult = this._updateHitResult(e);

	// snap to point if option/ alt or command/ control
	if( (e.modifiers.alt || e.modifiers.command || e.modifiers.control || e.modifiers.option ) && this.hitResult.type === 'segment') {
		this.endPoint = {
			x: this.hitResult.segment.point.x,
			y: this.hitResult.segment.point.y
		};

		this.hoverPreview = new this.paper.Path.Circle(this.hitResult.segment.point, 5/this.paper.view.zoom);
		this.hoverPreview.strokeColor = 'rgba(100,100,100,0)';
		this.hoverPreview.strokeWidth = 1.5;
		
		// display red when deleting line by dragging it to start point
		this.hoverPreview.fillColor = 
		(this.endPoint.x===this.startPoint.x && this.endPoint.y===this.startPoint.y)?
		'rgba(150,50,50,0.5)':'rgba(50,50,255,0.5)';

	}else{ // default to cursor position
		this.endPoint = e.point;
	}

	// straight line
	if(e.modifiers.shift){
		const dy = Math.abs(this.startPoint.y - e.point.y);
		const dx = Math.abs(this.startPoint.x - e.point.x);

		// diagnol
		if(dy && dx && (dy/dx)>0.5 && (dx/dy)>0.5){
			const diff = {
				x: this.endPoint.x-this.startPoint.x,
				y: this.endPoint.y-this.startPoint.y
			}
			this.endPoint = {
				x: this.startPoint.x + (dy+dx)/2 * diff.x/Math.abs(diff.x),
				y: this.startPoint.y + (dy+dx)/2 * diff.y/Math.abs(diff.y)
			}
		}else if(dy>dx) // straight vertical
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
	this.hoverPreview.remove();
    this.path.remove();
	if(this.endPoint.x!==this.startPoint.x || this.endPoint.y!==this.startPoint.y){
		this.addPathToProject(this.path);
		this.fireEvent({
		eventName: 'canvasModified',
		actionName: 'line'
		});
	}
  }

  // todo: clean this function -H.A.
  _updateHitResult(e) {
    var newHitResult = this.paper.project.hitTest(e.point, {
      fill: false,
      stroke: false,
      curves: false,
      segments: true,
      handles: false,
      tolerance: 10,
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

};