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

class SelectionWidget {
    /**
     * Creates a SelectionWidget
     */
    constructor (args) {
        if(!args) args = {};
        if(!args.layer) args.layer = paper.project.activeLayer;

        this._layer = args.layer;
        this._item = new paper.Group({ insert:false });
    }

    /**
     * The item containing the widget GUI
     */
    get item () {
        return this._item;
    }

    /**
     * The layer to add the widget GUI item to.
     */
    get layer () {
        return this._layer;
    }

    set layer (layer) {
        this._layer = layer;
    }

    /**
     * The rotation of the selection box GUI.
     */
    get boxRotation () {
        return this._boxRotation;
    }

    set boxRotation (boxRotation) {
        this._boxRotation = boxRotation;
    }

    /**
     * The items currently inside the selection widget
     */
    get itemsInSelection () {
        return this._itemsInSelection;
    }

    /**
     * The point to rotate/scale the widget around.
     */
    get pivot () {
        return this._pivot;
    }

    set pivot (pivot) {
        this._pivot = pivot;
    }

    /**
     * The position of the top left corner of the selection box.
     */
    get position () {
        return this._boundingBox.topLeft.rotate(this.rotation, this.pivot);
    }

    set position (position) {
        var d = position.subtract(this.position);
        this.translateSelection(d);
    }

    /**
     * The width of the selection.
     */
    get width () {
        return this._boundingBox.width;
    }

    set width (width) {
        var d = width / this.width;
        if(d === 0) d = 0.001;
        this.scaleSelection(new paper.Point(d, 1.0));
    }

    /**
     * The height of the selection.
     */
    get height () {
        return this._boundingBox.height;
    }

    set height (height) {
        var d = height / this.height;
        this.scaleSelection(new paper.Point(1.0, d));
    }

    /**
     * The rotation of the selection.
     */
    get rotation () {
        return this._boxRotation;
    }

    set rotation (rotation) {
        var d = rotation - this.rotation;
        this.rotateSelection(d);
    }

    /**
     * Flip the selected items horizontally.
     */
    flipHorizontally () {
        this.scaleSelection(new paper.Point(-1.0, 1.0));
    }

    /**
     * Flip the selected items vertically.
     */
    flipVertically () {
        this.scaleSelection(new paper.Point(1.0, -1.0));
    }

    /**
     * The bounding box of the widget.
     */
    get boundingBox () {
        return this._boundingBox
    }

    /**
     * The current transformation being done to the selection widget.
     * @type {string}
     */
    get currentTransformation () {
        return this._currentTransformation;
    }

    set currentTransformation (currentTransformation) {
        if(['translate', 'scale', 'rotate'].indexOf(currentTransformation) === -1) {
            console.error('Paper.SelectionWidget: Invalid transformation type: ' + currentTransformation);
            currentTransformation = null;
        } else {
            this._currentTransformation = currentTransformation;
        }
    }

    /**
     * Build a new SelectionWidget GUI around some items.
     * @param {number} boxRotation - the rotation of the selection GUI. Optional, defaults to 0
     * @param {paper.Item[]} items - the items to build the GUI around
     * @param {paper.Point} pivot - the pivot point that the selection rotates around. Defaults to (0,0)
     */
    build (args) {
        if(!args) args = {};
        if(!args.boxRotation) args.boxRotation = 0;
        if(!args.items) args.items = [];
        if(!args.pivot) args.pivot = new paper.Point();

        this._itemsInSelection = args.items;
        this._boxRotation = args.boxRotation;
        this._pivot = args.pivot;

        this._boundingBox = this._calculateBoundingBox();

        this.item.remove();
        this.item.removeChildren();

        if(this._ghost) {
            this._ghost.remove();
        }
        if(this._pivotPointHandle) {
            this._pivotPointHandle.remove();
        }

        if(this._itemsInSelection.length > 0) {
            this._center = this._calculateBoundingBoxOfItems(this._itemsInSelection).center;
            this._buildGUI();
            this.layer.addChild(this.item);
        }
    }

    /**
     *
     */
    startTransformation (item) {
        this._ghost = this._buildGhost();
        this._layer.addChild(this._ghost);

        if(item.data.handleType === 'rotation') {
            this.currentTransformation = 'rotate';
        } else if (item.data.handleType === 'scale') {
            this.currentTransformation = 'scale';
        } else {
            this.currentTransformation = 'translate';
        }

        this._ghost.data.initialPosition = this._ghost.position;
        this._ghost.data.scale = new paper.Point(1,1);
    }

    /**
     *
     */
    updateTransformation (item, e) {
        if (!this.mod?.initiated) {
            this.mod = {
                initiated: true
            }
    
            this.mod.onePoint = new paper.Point(1, 1);
            this.mod.initialPoint = e.point;
    
            this.mod.truePivot = this.pivot;
    
            if (this.currentTransformation === 'translate') {
                this.mod.action = 'translate';
                this.mod.initialPosition = this._ghost.position;
            }
            else if (this.currentTransformation === 'rotate') {
                this.mod.action = 'rotate';
                this.mod.rotateDelta = 0;
                this.mod.initialAngle = this.mod.initialPoint.subtract(this.pivot).angle;
                this.mod.initialBoxRotation = this.boxRotation ?? 0;
            } else if (item.data.handleEdge.includes('Center')) {
                this.mod.action = 'move-edge';
                this.mod.topLeft = item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'leftCenter';
                this.mod.vertical = item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'bottomCenter';
    
                this.mod.transformMatrix = new paper.Matrix();
            } else {
                this.mod.action = 'move-corner';
                this.mod.scaleFactor = this.mod.onePoint;
            }
        }
    
        this.mod.modifiers = {
            skew: e.modifiers.command, // Skew when Ctrl/Cmd pressed
            center: !e.modifiers.alt, // Always scale from center unless Alt pressed
            freescale: !e.modifiers.shift // Never retain proportions unless Shift pressed
        }
    
        if (this.mod.action === 'translate') {
            var initialDelta = e.point.subtract(this.mod.initialPoint);
            if (!this.mod.modifiers.freescale) {
                var angle = initialDelta.angle;
                angle = Math.round(Math.round(angle / 45) * 45) * Math.PI / 180;
                var angleVector = new paper.Point(Math.cos(angle), Math.sin(angle));
                initialDelta = initialDelta.project(angleVector);
            }
            this.mod.offset = initialDelta;
            this._ghost.position = this.mod.initialPosition.add(initialDelta);
        }
        else if (this.mod.action === 'rotate') {
            this._ghost.rotate(-this.mod.rotateDelta, this.pivot);
    
            var rotateDelta = e.point.subtract(this.pivot).angle - this.mod.initialAngle;
            if (!this.mod.modifiers.freescale) {
                rotateDelta = Math.round(Math.round(rotateDelta / 45) * 45);
            }
            this.mod.rotateDelta = rotateDelta;
            this.boxRotation = this.mod.initialBoxRotation + rotateDelta;
    
            this._ghost.rotate(this.mod.rotateDelta, this.pivot);
        } else if (this.mod.action === 'move-corner') {
            this._ghost.rotate(-this.boxRotation, this.pivot);
            this._ghost.scale(this.mod.onePoint.divide(this.mod.scaleFactor), this.mod.truePivot);
    
            if (this.mod.modifiers.center) {
                this.mod.truePivot = this.pivot;
            } else {
                let bounds = this._ghost.bounds;
                switch (item.data.handleEdge) {
                    case 'topRight':
                        this.mod.truePivot = bounds.bottomLeft;
                        break;
                    case 'topLeft':
                        this.mod.truePivot = bounds.bottomRight;
                        break;
                    case 'bottomRight':
                        this.mod.truePivot = bounds.topLeft;
                        break;
                    case 'bottomLeft':
                        this.mod.truePivot = bounds.topRight;
                        break;
                }
            }
    
            var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
            var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
            var scaleFactor = currentPointRelative.divide(initialPointRelative);
            if (!this.mod.modifiers.freescale) {
                if (Math.abs(scaleFactor.x) < Math.abs(scaleFactor.y)) {
                    scaleFactor.x = Math.sign(scaleFactor.x) * Math.abs(scaleFactor.y);
                } else {
                    scaleFactor.y = Math.sign(scaleFactor.y) * Math.abs(scaleFactor.x);
                }
            }
            this.mod.scaleFactor = scaleFactor;
    
            this._ghost.scale(this.mod.scaleFactor, this.mod.truePivot);
            this._ghost.rotate(this.boxRotation, this.pivot);
        } else {
            this._ghost.rotate(-this.boxRotation, this.pivot);
            this._ghost.translate(this.mod.truePivot.multiply(-1)).transform(this.mod.transformMatrix.inverted()).translate(this.mod.truePivot);
    
            if (this.mod.modifiers.center) {
                this.mod.truePivot = this.pivot;
            } else {
                if (this.mod.topLeft) {
                    this.mod.truePivot = this._ghost.bounds.bottomRight;
                } else {
                    this.mod.truePivot = this._ghost.bounds.topLeft;
                }
            }
    
            this.mod.transformMatrix.reset();
    
            var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot);
            var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot);
    
            if (!this.mod.modifiers.skew || (this.mod.modifiers.skew && e.modifiers.shift)) {
                var scaleFactor = currentPointRelative.subtract(this.mod.truePivot).divide(initialPointRelative.subtract(this.mod.truePivot));
                if (this.mod.vertical) {
                    scaleFactor.x = 1;
                } else {
                    scaleFactor.y = 1;
                }
    
                this.mod.transformMatrix.scale(scaleFactor)
            }
            if (this.mod.modifiers.skew) {
                var shearFactor = currentPointRelative.subtract(initialPointRelative).divide(this._ghost.bounds.height, this._ghost.bounds.width);
                if (this.mod.vertical) {
                    shearFactor.y = 0;
                } else {
                    shearFactor.x = 0;
                }
                if (this.mod.modifiers.center) {
                    shearFactor = shearFactor.multiply(2);
                }
                if (this.mod.topLeft) {
                    shearFactor = shearFactor.multiply(-1);
                };
    
                this.mod.transformMatrix.shear(shearFactor.transform(this.mod.transformMatrix.inverted()));
            }
    
            this._ghost.translate(this.mod.truePivot.multiply(-1)).transform(this.mod.transformMatrix).translate(this.mod.truePivot);
            this._ghost.rotate(this.boxRotation, this.pivot);
        }
    }

    /**
     *
     */
    finishTransformation (item) {
        if (!this._currentTransformation) return;
    
        this._ghost.remove();
    
        if (this.mod.action === 'translate') {
            this.translateSelection(this.mod.offset);
        } else if (this.mod.action === 'rotate') {
            this.rotateSelection(this._ghost.rotation);
        } else if (this.mod.action === 'move-corner') {
            this.scaleSelection(this.mod.scaleFactor, this.mod.truePivot);
        } else {
            this.transformSelection(this.mod.transformMatrix, this.mod.truePivot);
        }
    
        this._currentTransformation = null;
        this.mod.initiated = false;
    }

    /**
     *
     */
    translateSelection (delta) {
        this._itemsInSelection.forEach(item => {
            item.position = item.position.add(delta);
        });
        this.pivot = this.pivot.add(delta);
    }

    /**
     *
     */
    rotateSelection (angle) {
        this._itemsInSelection.forEach(item => {
            item.rotate(angle, this.pivot);
        });
    }

    /**
     *
     */
    scaleSelection (scale, pivot) {
        this._itemsInSelection.forEach(item => {
            item.rotate(-this.boxRotation, this.pivot);
            item.scale(scale, pivot);
            item.rotate(this.boxRotation, this.pivot);
        });
    
        var newPivot = pivot.add(this.pivot.subtract(pivot).multiply(scale));
        this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
    }

    /**
     *
     */
    transformSelection (matrix, pivot) {
        this._itemsInSelection.forEach(item => {
            item.rotate(-this.boxRotation, this.pivot);
            item.translate(pivot.multiply(-1)).transform(matrix).translate(pivot);
            item.rotate(this.boxRotation, this.pivot);
        });
    
        // Note that the GUI won't show this pivot as the center because it doesn't account for skew.
        // The pivot point after the skew will look a bit off.
        var newPivot = pivot.add(this.pivot.subtract(pivot).transform(matrix));
        this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
    }

    _buildGUI () {
        this.item.addChild(this._buildBorder());

        if(this._itemsInSelection.length > 1) {
            this.item.addChildren(this._buildItemOutlines());
        }

        let guiElements = [];

        guiElements.push(this._buildRotationHotspot('topLeft'));
        guiElements.push(this._buildRotationHotspot('topRight'));
        guiElements.push(this._buildRotationHotspot('bottomLeft'));
        guiElements.push(this._buildRotationHotspot('bottomRight'));

        guiElements.push(this._buildScalingHandle('topLeft'));
        guiElements.push(this._buildScalingHandle('topRight'));
        guiElements.push(this._buildScalingHandle('bottomLeft'));
        guiElements.push(this._buildScalingHandle('bottomRight'));
        guiElements.push(this._buildScalingHandle('topCenter'));
        guiElements.push(this._buildScalingHandle('bottomCenter'));
        guiElements.push(this._buildScalingHandle('leftCenter'));
        guiElements.push(this._buildScalingHandle('rightCenter'));

        this.item.addChildren(guiElements);

        this._pivotPointHandle = this._buildPivotPointHandle();
        this.layer.addChild(this._pivotPointHandle);

        this.item.rotate(this.boxRotation, this._center);

        this.item.children.forEach(child => {
            child.data.isSelectionBoxGUI = true;
        });
    }

    _buildBorder () {
        var border = new paper.Path.Rectangle({
            name: 'border',
            from: this.boundingBox.topLeft,
            to: this.boundingBox.bottomRight,
            strokeWidth: SelectionWidget.BOX_STROKE_WIDTH,
            strokeColor: SelectionWidget.BOX_STROKE_COLOR,
            insert: false,
        });
        border.data.isBorder = true;
        return border;
    }

    _buildItemOutlines () {
        return this._itemsInSelection.map(item => {
            var clone = item.clone({insert:false});
            clone.rotate(-this.boxRotation, this._center);
            var bounds = clone.bounds;
            var border = new paper.Path.Rectangle({
                from: bounds.topLeft,
                to: bounds.bottomRight,
                strokeWidth: SelectionWidget.BOX_STROKE_WIDTH,
                strokeColor: SelectionWidget.BOX_STROKE_COLOR,
            });
            //border.rotate(-this.boxRotation, this._center);
            border.remove();
            return border;
        });
    }

    _buildScalingHandle (edge) {
        var handle = this._buildHandle({
            name: edge,
            type: 'scale',
            center: this.boundingBox[edge],
            fillColor: SelectionWidget.HANDLE_FILL_COLOR,
            strokeColor: SelectionWidget.HANDLE_STROKE_COLOR,
        });
        return handle;
    }

    _buildPivotPointHandle () {
        var handle = this._buildHandle({
            name: 'pivot',
            type: 'pivot',
            center: this.pivot,
            fillColor: SelectionWidget.PIVOT_FILL_COLOR,
            strokeColor: SelectionWidget.PIVOT_STROKE_COLOR,
        });
        handle.locked = true;
        return handle;
    }

    _buildHandle (args) {
        if(!args) console.error('_createHandle: args is required');
        if(!args.name) console.error('_createHandle: args.name is required');
        if(!args.type) console.error('_createHandle: args.type is required');
        if(!args.center) console.error('_createHandle: args.center is required');
        if(!args.fillColor) console.error('_createHandle: args.fillColor is required');
        if(!args.strokeColor) console.error('_createHandle: args.strokeColor is required');

        var circle = new paper.Path.Circle({
            center: args.center,
            radius: SelectionWidget.HANDLE_RADIUS / paper.view.zoom,
            strokeWidth: SelectionWidget.HANDLE_STROKE_WIDTH / paper.view.zoom,
            strokeColor: args.strokeColor,
            fillColor: args.fillColor,
            insert: false,
        });
        circle.applyMatrix = false;
        circle.data.isSelectionBoxGUI = true;
        circle.data.handleType = args.type;
        circle.data.handleEdge = args.name;
        return circle;
    }

    _buildRotationHotspot (cornerName) {
        // Build the not-yet-rotated hotspot, which starts out like this:

        //       |
        //       +---+
        //       |   |
        // ---+--+   |---
        //    |      |
        //    +------+
        //       |

        var r = SelectionWidget.ROTATION_HOTSPOT_RADIUS / paper.view.zoom;
        var hotspot = new paper.Path([
            new paper.Point(0,0),
            new paper.Point(0, r),
            new paper.Point(r, r),
            new paper.Point(r, -r),
            new paper.Point(-r, -r),
            new paper.Point(-r, 0),
        ]);
        hotspot.fillColor = SelectionWidget.ROTATION_HOTSPOT_FILLCOLOR;
        hotspot.position.x = this.boundingBox[cornerName].x;
        hotspot.position.y = this.boundingBox[cornerName].y;

        // Orient the rotation handles in the correct direction, even if the selection is flipped
        hotspot.rotate({
            'topRight': 0,
            'bottomRight': 90,
            'bottomLeft': 180,
            'topLeft': 270,
        }[cornerName]);

        // Some metadata.
        hotspot.data.handleType = 'rotation';
        hotspot.data.handleEdge = cornerName;

        return hotspot;
    }

    _buildGhost () {
        var ghost = new paper.Group({
            insert: false,
            applyMatrix: false,
        });

        this._itemsInSelection.forEach(item => {
            var outline = item.clone();
            outline.remove();
            outline.fillColor = 'rgba(0,0,0,0)';
            outline.strokeColor = SelectionWidget.GHOST_STROKE_COLOR;
            outline.strokeWidth = SelectionWidget.GHOST_STROKE_WIDTH * 2;
            ghost.addChild(outline);

            var outline2 = outline.clone();
            outline2.remove();
            outline2.fillColor = 'rgba(0,0,0,0)';
            outline2.strokeColor = '#ffffff';
            outline2.strokeWidth = SelectionWidget.GHOST_STROKE_WIDTH;
            ghost.addChild(outline2);
        });

        var boundsOutline = new paper.Path.Rectangle({
            from: this.boundingBox.topLeft,
            to: this.boundingBox.bottomRight,
            fillColor: 'rgba(0,0,0,0)',
            strokeColor: SelectionWidget.GHOST_STROKE_COLOR,
            strokeWidth: SelectionWidget.GHOST_STROKE_WIDTH,
            applyMatrix: false,
        });
        boundsOutline.rotate(this.boxRotation, this._center);
        ghost.addChild(boundsOutline);

        ghost.opacity = 0.5;

        return ghost;
    }

    _calculateBoundingBox () {
        if(this._itemsInSelection.length === 0) {
            return new paper.Rectangle();
        }

        var center = this._calculateBoundingBoxOfItems(this._itemsInSelection).center;

        var itemsForBoundsCalc = this._itemsInSelection.map(item => {
            var clone = item.clone();
            clone.rotate(-this.boxRotation, center);
            clone.remove();
            return clone;
        });

        return this._calculateBoundingBoxOfItems(itemsForBoundsCalc);
    }

    _calculateBoundingBoxOfItems (items) {
        var bounds = null;
        items.forEach(item => {
            bounds = bounds ? bounds.unite(item.bounds) : item.bounds;
        });
        return bounds || new paper.Rectangle();
    }
};

SelectionWidget.BOX_STROKE_WIDTH = 1;
SelectionWidget.BOX_STROKE_COLOR = 'rgba(100,150,255,1.0)';
SelectionWidget.HANDLE_RADIUS = 5;
SelectionWidget.HANDLE_STROKE_WIDTH = SelectionWidget.BOX_STROKE_WIDTH
SelectionWidget.HANDLE_STROKE_COLOR = SelectionWidget.BOX_STROKE_COLOR
SelectionWidget.HANDLE_FILL_COLOR = 'rgba(255,255,255,0.3)';
SelectionWidget.PIVOT_STROKE_WIDTH = SelectionWidget.BOX_STROKE_WIDTH;
SelectionWidget.PIVOT_FILL_COLOR = 'rgba(255,255,255,0.5)';
SelectionWidget.PIVOT_STROKE_COLOR = 'rgba(0,0,0,1)';
SelectionWidget.PIVOT_RADIUS = SelectionWidget.HANDLE_RADIUS
SelectionWidget.ROTATION_HOTSPOT_RADIUS = 20;
SelectionWidget.ROTATION_HOTSPOT_FILLCOLOR = 'rgba(100,150,255,0.5)';
SelectionWidget.GHOST_STROKE_COLOR = 'rgba(0, 0, 0, 1.0)';
SelectionWidget.GHOST_STROKE_WIDTH = 1;

paper.PaperScope.inject({
    SelectionWidget: SelectionWidget,
});
