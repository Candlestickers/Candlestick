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
    constructor(args) {
        if (!args) args = {};
        if (!args.layer) args.layer = paper.project.activeLayer;

        this._layer = args.layer;
        this._item = new paper.Group({ insert:false });

        let startPath = new paper.Path.Circle({
            radius: SelectionWidget.ENDPOINT_RADIUS,
            fillColor: SelectionWidget.BOX_STROKE_COLOR,
            insert: false,
            applyMatrix: false,
            data: {
                handleType: 'gradient-point',
                handleEdge: 'start'
            }
        });
        let endPath = new paper.Path.Circle({
            radius: SelectionWidget.ENDPOINT_RADIUS,
            fillColor: SelectionWidget.BOX_STROKE_COLOR,
            insert: false,
            applyMatrix: false,
            data: {
                handleType: 'gradient-point',
                handleEdge: 'end'
            }
        });
        let linePath = new paper.Path.Line({
            from: [0, 0],
            to: [0, 0],
            insert: false,
            strokeColor: SelectionWidget.BOX_STROKE_COLOR,
            strokeWidth: SelectionWidget.BOX_STROKE_WIDTH,
            strokeScaling: false,
            applyMatrix: false
        });
        let hoverStop = this._buildGradientStop(true);

        this._gradientGUI = {
            container: new paper.Group({
                applyMatrix: false,
                data: { isSelectionBoxGUI: true }
            }),
            startPath, endPath, linePath,
            stops: [],
            selectedStop: null,
            hoverStop,
            createdStopOnDown: false,

            stroke: false,
            radial: false,

            startpoint: new paper.Point(0,0),
            endpoint: new paper.Point(0,0),
            lineVector: new paper.Point(0,0)
        };
    }

    /**
     * The item containing the widget GUI
     */
    get item() {
        return this._item;
    }

    /**
     * The layer to add the widget GUI item to.
     */
    get layer() {
        return this._layer;
    }

    set layer(layer) {
        this._layer = layer;
    }

    /**
     * The rotation of the selection box GUI.
     */
    get boxRotation() {
        return this._boxRotation;
    }

    set boxRotation(boxRotation) {
        this._boxRotation = boxRotation;
    }

    /**
     * The items currently inside the selection widget
     */
    get itemsInSelection() {
        return this._itemsInSelection;
    }

    /**
     * The point to rotate/scale the widget around.
     */
    get pivot() {
        return this._pivot;
    }

    set pivot(pivot) {
        this._pivot = pivot;
    }

    /**
     * The position of the top left corner of the selection box.
     */
    get position() {
        return this._boundingBox.topLeft.rotate(this.rotation, this.pivot);
    }

    set position(position) {
        var d = position.subtract(this.position);
        this.translateSelection(d);
    }

    /**
     * The width of the selection.
     */
    get width() {
        return this._boundingBox.width;
    }

    set width(width) {
        var d = width / this.width;
        if (d === 0) d = 0.001;
        this.scaleSelection(new paper.Point(d, 1.0));
    }

    /**
     * The height of the selection.
     */
    get height() {
        return this._boundingBox.height;
    }

    set height(height) {
        var d = height / this.height;
        this.scaleSelection(new paper.Point(1.0, d));
    }

    /**
     * The rotation of the selection.
     */
    get rotation() {
        return this._boxRotation;
    }

    set rotation(rotation) {
        var d = rotation - this.rotation;
        this.rotateSelection(d);
    }

    /**
     * Flip the selected items horizontally.
     */
    flipHorizontally() {
        this.scaleSelection(new paper.Point(-1.0, 1.0));
    }

    /**
     * Flip the selected items vertically.
     */
    flipVertically() {
        this.scaleSelection(new paper.Point(1.0, -1.0));
    }

    /**
     * The bounding box of the widget.
     */
    get boundingBox() {
        return this._boundingBox
    }

    /**
     * The current transformation being done to the selection widget.
     * @type {string}
     */
    get currentTransformation() {
        return this._currentTransformation;
    }

    set currentTransformation(currentTransformation) {
        if(['translate', 'scale', 'rotate', 'gradient-stop', 'gradient-point', 'gradient-none'].indexOf(currentTransformation) === -1) {
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
     * @param {string|boolean} useGradientGUI - whether to use a gradient editing GUI. Defaults to false
     */
    build(args) {
        if (!args) args = {};
        if (!args.boxRotation) args.boxRotation = 0;
        if (!args.items) args.items = [];
        if (!args.pivot) args.pivot = new paper.Point();

        this._itemsInSelection = args.items;
        this._boxRotation = args.boxRotation;
        this._pivot = args.pivot;
        this._useGradientGUI = args.useGradientGUI;

        this._boundingBox = this._calculateBoundingBox();

        this.item.remove();
        this.item.removeChildren();

        if (this._ghost) {
            this._ghost.remove();
        }
        if (this._pivotPointHandle) {
            this._pivotPointHandle.remove();
        }

        if (this._itemsInSelection.length > 0) {
            this._center = this._calculateBoundingBoxOfItems(this._itemsInSelection).center;
            if(args.useGradientGUI) {
                this._buildGradientGUI(args.selectedStopIndex);
            } else {
                this._buildGUI();
            }
            this.layer.addChild(this.item);
        }
    }

    /**
     *
     */
    startTransformation (item, e) {
        if(this._useGradientGUI) {
            return this.startGradientTransformation(item, e);
        }

        this._ghost = this._buildGhost();
        this._layer.addChild(this._ghost);

        if (item.data.handleType === 'rotation') {
            this.currentTransformation = 'rotate';
        } else if (item.data.handleType === 'scale') {
            this.currentTransformation = 'scale';
        } else {
            this.currentTransformation = 'translate';
        }

        this._ghost.data.initialPosition = this._ghost.position;
        this._ghost.data.scale = new paper.Point(1, 1);
    }

    /**
     *
     */
    updateTransformation (item, e) {
        if(this.currentTransformation.substring(0,8) === 'gradient') {
            return this.updateGradientTransformation(item, e);
        }

        if (!this.mod || !this.mod.initiated) {
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
                this.mod.initialBoxRotation = this.boxRotation || 0;
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
    finishTransformation(item) {
        if (!this._currentTransformation) return;
        if(this.currentTransformation.substring(0,8) === 'gradient') {
            return this.finishGradientTransformation();
        }

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
    translateSelection(delta) {
        this._itemsInSelection.forEach(item => {
            item.position = item.position.add(delta);
        });
        this.pivot = this.pivot.add(delta);
    }

    /**
     *
     */
    rotateSelection(angle) {
        this._itemsInSelection.forEach(item => {
            item.rotate(angle, this.pivot);
        });
    }

    /**
     *
     */
    scaleSelection(scale, pivot = this.pivot) {
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
    transformSelection(matrix, pivot = this.pivot) {
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

    _buildGUI() {
        this.item.addChild(this._buildBorder());

        if (this._itemsInSelection.length > 1) {
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

    _buildBorder() {
        var border = new paper.Path.Rectangle({
            name: 'border',
            from: this.boundingBox.topLeft,
            to: this.boundingBox.bottomRight,
            strokeWidth: SelectionWidget.BOX_STROKE_WIDTH / paper.view.zoom,
            strokeColor: SelectionWidget.BOX_STROKE_COLOR,
            insert: false,
        });
        border.data.isBorder = true;
        return border;
    }

    _buildItemOutlines() {
        return this._itemsInSelection.map(item => {
            var clone = item.clone({ insert: false });
            clone.rotate(-this.boxRotation, this._center);
            var bounds = clone.bounds;
            var border = new paper.Path.Rectangle({
                from: bounds.topLeft,
                to: bounds.bottomRight,
                strokeWidth: SelectionWidget.BOX_STROKE_WIDTH / paper.view.zoom,
                strokeColor: SelectionWidget.BOX_STROKE_COLOR,
            });
            //border.rotate(-this.boxRotation, this._center);
            border.remove();
            return border;
        });
    }

    _buildScalingHandle(edge) {
        var handle = this._buildHandle({
            name: edge,
            type: 'scale',
            center: this.boundingBox[edge],
            fillColor: SelectionWidget.HANDLE_FILL_COLOR,
            strokeColor: SelectionWidget.HANDLE_STROKE_COLOR,
        });
        return handle;
    }

    _buildPivotPointHandle() {
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

    _buildHandle(args) {
        if (!args) console.error('_createHandle: args is required');
        if (!args.name) console.error('_createHandle: args.name is required');
        if (!args.type) console.error('_createHandle: args.type is required');
        if (!args.center) console.error('_createHandle: args.center is required');
        if (!args.fillColor) console.error('_createHandle: args.fillColor is required');
        if (!args.strokeColor) console.error('_createHandle: args.strokeColor is required');

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

    _buildRotationHotspot(cornerName) {
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
            new paper.Point(0, 0),
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

    _buildGhost() {
        var ghost = new paper.Group({
            insert: false,
            applyMatrix: false,
        });

        this._itemsInSelection.forEach(item => {
            var outline = item.clone();
            outline.remove();
            outline.fillColor = 'rgba(0,0,0,0)';
            outline.strokeColor = SelectionWidget.GHOST_STROKE_COLOR;
            outline.strokeWidth = SelectionWidget.GHOST_STROKE_WIDTH * 2 / paper.view.zoom;
            ghost.addChild(outline);

            var outline2 = outline.clone();
            outline2.remove();
            outline2.fillColor = 'rgba(0,0,0,0)';
            outline2.strokeColor = '#ffffff';
            outline2.strokeWidth = SelectionWidget.GHOST_STROKE_WIDTH / paper.view.zoom;
            ghost.addChild(outline2);
        });

        var boundsOutline = new paper.Path.Rectangle({
            from: this.boundingBox.topLeft,
            to: this.boundingBox.bottomRight,
            fillColor: 'rgba(0,0,0,0)',
            strokeColor: SelectionWidget.GHOST_STROKE_COLOR,
            strokeWidth: SelectionWidget.GHOST_STROKE_WIDTH / paper.view.zoom,
            applyMatrix: false,
        });
        boundsOutline.rotate(this.boxRotation, this._center);
        ghost.addChild(boundsOutline);

        ghost.opacity = 0.5;

        return ghost;
    }

    _calculateBoundingBox() {
        if (this._itemsInSelection.length === 0) {
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

    _calculateBoundingBoxOfItems(items) {
        var bounds = null;
        items.forEach(item => {
            bounds = bounds ? bounds.unite(item.bounds) : item.bounds;
        });
        return bounds || new paper.Rectangle();
    }

    _buildGradientGUI (selectedStopIndex) {
        // this better not be a group
        let item = this._itemsInSelection[0];
        let color, stops, startpoint, endpoint;
        if(this._useGradientGUI === 'stroke') {
            color = item.strokeColor;
            this._gradientGUI.stroke = true;
        } else {
            color = item.fillColor;
            this._gradientGUI.stroke = false;
        }

        if(!color) color = new paper.Color(0, 0, 0);

        if(color.gradient) {
            this._gradientGUI.radial = color.gradient.radial;
            stops = color.gradient.stops;
            startpoint = color.origin;
            endpoint = color.destination;
        } else {
            // This is a solid color.
            this._gradientGUI.radial = false;
            stops = [{ color: color.clone(), offset: 0 }, { color: color.clone(), offset: 1 }];
            let bounds = this._calculateBoundingBoxOfItems(this._itemsInSelection);
            startpoint = bounds.topCenter;
            endpoint = bounds.bottomCenter;
        }
        this._gradientGUI.startpoint = startpoint;
        this._gradientGUI.endpoint = endpoint;
        this._gradientGUI.lineVector = endpoint.subtract(startpoint);

        let container = this._gradientGUI.container;
        container.removeChildren();
        this._transformContainer();

        container.addChildren(this._buildGradientLine());
        container.addChildren(this._buildGradientStops(stops));
        container.addChild(this._buildHoverStop());
        this._selectStop(this._gradientGUI.stops[selectedStopIndex]);

        this.item.addChild(container);
        container.children.forEach(child => {
            child.data.isSelectionBoxGUI = true;
        });
    }

    /**
     * Update the gradient line GUI.
     * @param {paper.Color} color The paper.js gradient color object.
     * @returns {paper.Path[]} The start point, end point, and connecting line paths.
     */
    _buildGradientLine () {
        let length = this._gradientGUI.lineVector.length;
        this._gradientGUI.endPath.position.x = length;
        this._gradientGUI.linePath.segments[1].point.x = length;

        // Scale the GUI to appear the same size
        const scaling = 1 / paper.view.zoom;
        this._gradientGUI.startPath.scaling = scaling;
        this._gradientGUI.endPath.scaling = scaling;

        return [this._gradientGUI.linePath, this._gradientGUI.startPath, this._gradientGUI.endPath];
    }

    /**
     * Update the gradient stops GUI.
     * @param {paper.Color} color The paper.js gradient color object.
     * @returns {paper.Path[]} The list of color stop paths.
     */
    _buildGradientStops (paperStops) {
        let stopList = this._gradientGUI.stops;

        paperStops.forEach((paperStop, idx) => {
            if(idx >= stopList.length) {
                stopList.push(this._buildGradientStop());
            }
            let stop = stopList[idx];
            stop.data.setColor(paperStop.color);
            stop.data.setOffset(paperStop.offset);
            stop.data.setScaling();
        });
        stopList.length = paperStops.length;
        return stopList;
    }

    _buildGradientStop (isHover) {
        const ARROW_HEIGHT = SelectionWidget.COLOR_STOP_RECT_RADIUS / 5;
        const COLOR_BOX_CENTER = [0, -(SelectionWidget.COLOR_STOP_RECT_RADIUS + ARROW_HEIGHT)]
        const COLOR_BOX_INNER_SIZE = 2 * (SelectionWidget.COLOR_STOP_RECT_RADIUS - SelectionWidget.COLOR_STOP_RECT_PADDING);
        const COLOR_BOX_OUTER_SIZE = 2 * SelectionWidget.COLOR_STOP_RECT_RADIUS;
        const CHECKER_SIZE = 8;

        let stopObj = new paper.Group({
            pivot: [0,0],
            position: [0, -SelectionWidget.ENDPOINT_RADIUS],
            applyMatrix: false,
            insert: false,
            data: {
                handleType: 'gradient-stop',
                color: 'black',
                offset: 0,
                selected: false
            }
        });
        let colorBox = new paper.Path.Rectangle({
            center: COLOR_BOX_CENTER,
            size: [COLOR_BOX_INNER_SIZE, COLOR_BOX_INNER_SIZE],
            fillColor: 'red',
            strokeWidth: 0,
            data: {
                isSelectionBoxGUI: true,
                parentItem: stopObj
            }
        });
        let opaqueColorBox = new paper.Path.Rectangle({
            center: [-COLOR_BOX_INNER_SIZE/4, COLOR_BOX_CENTER[1]],
            size: [COLOR_BOX_INNER_SIZE/2, COLOR_BOX_INNER_SIZE],
            fillColor: 'red',
            strokeWidth: 0,
            data: {
                isSelectionBoxGUI: true,
                parentItem: stopObj,
                isBorder: true
            }
        });
        let outerBox = new paper.Path.Rectangle({
            center: COLOR_BOX_CENTER,
            size: [COLOR_BOX_OUTER_SIZE, COLOR_BOX_OUTER_SIZE],
            fillColor: '#ffffff',
            strokeWidth: SelectionWidget.COLOR_STOP_OUTLINE_WIDTH,
            data: {
                isSelectionBoxGUI: true,
                parentItem: stopObj
            }
        });
        let checker = new paper.Group({
            children: [
                new paper.Path.Rectangle({ position: [0,0], size: CHECKER_SIZE*3, fillColor: '#e6e6e6',
                    data: { isSelectionBoxGUI: true, parentItem: stopObj, isBorder: true }
                }),
                new paper.Path.Rectangle({ position: [0,-CHECKER_SIZE], size: CHECKER_SIZE, fillColor: '#d4d4d4',
                    data: { isSelectionBoxGUI: true, parentItem: stopObj, isBorder: true }
                }),
                new paper.Path.Rectangle({ position: [-CHECKER_SIZE,0], size: CHECKER_SIZE, fillColor: '#d4d4d4',
                    data: { isSelectionBoxGUI: true, parentItem: stopObj, isBorder: true }
                }),
                new paper.Path.Rectangle({ position: [0,CHECKER_SIZE],  size: CHECKER_SIZE, fillColor: '#d4d4d4',
                    data: { isSelectionBoxGUI: true, parentItem: stopObj, isBorder: true }
                }),
                new paper.Path.Rectangle({ position: [CHECKER_SIZE,0],  size: CHECKER_SIZE, fillColor: '#d4d4d4',
                    data: { isSelectionBoxGUI: true, parentItem: stopObj, isBorder: true }
                })
            ],
            strokeWidth: 0
        });
        outerBox.addTo(stopObj);
        checker.position = COLOR_BOX_CENTER;
        checker.scaling = COLOR_BOX_INNER_SIZE / (CHECKER_SIZE*3);
        checker.addTo(stopObj);
        colorBox.addTo(stopObj);
        opaqueColorBox.addTo(stopObj);
        let arrow;
        if(!isHover) {
            arrow = new paper.Path({
                segments: [
                    [-ARROW_HEIGHT, -ARROW_HEIGHT], [0,0], [ARROW_HEIGHT, -ARROW_HEIGHT]
                ],
                closed: true,
                fillColor: SelectionWidget.DESELECTED_COLOR,
                strokeWidth: SelectionWidget.COLOR_STOP_OUTLINE_WIDTH,
                data: {
                    isSelectionBoxGUI: true,
                    parentItem: stopObj
                }
            });
            arrow.addTo(stopObj);
        }
        stopObj.strokeColor = SelectionWidget.DESELECTED_COLOR;

        if(isHover) {
            // Don't include the hover stop in cursor hit tests
            stopObj.data.isBorder = true;
            outerBox.data.isBorder = true;
            colorBox.data.isBorder = true;
        }

        stopObj.data.setColor = (color) => {
            // if color is null, display black as placeholder
            colorBox.fillColor = color || 'black';
            opaqueColorBox.fillColor = color || 'black';
            opaqueColorBox.fillColor.alpha = 1;

            stopObj.data.color = color;
        }
        stopObj.data.setOffset = (offset) => {
            stopObj.position.x = this._gradientGUI.lineVector.length * offset;
            stopObj.data.offset = offset;
        }
        stopObj.data.setSelected = (selected) => {
            stopObj.strokeColor = selected ? SelectionWidget.SELECTED_COLOR : SelectionWidget.DESELECTED_COLOR;
            if(arrow) arrow.fillColor = selected ? SelectionWidget.SELECTED_COLOR : SelectionWidget.DESELECTED_COLOR;
            stopObj.data.selected = selected;
        }
        stopObj.data.setScaling = () => {
            const scaling = 1 / paper.view.zoom;
            stopObj.scaling = scaling;
            stopObj.position.y = -SelectionWidget.ENDPOINT_RADIUS * scaling;
        }
        stopObj.data.setScaling();
        return stopObj;
    }

    _buildHoverStop (point) {
        this._gradientGUI.hoverStop.visible = false;
        if(point) {
            let offset = this._calculateValidOffset(point);
            if(offset !== null) {
                this._interpolateStop(this._gradientGUI.hoverStop, offset);
                this._gradientGUI.hoverStop.visible = true;
                this._gradientGUI.hoverStop.data.setScaling();
            }
        }
        return this._gradientGUI.hoverStop;
    }

    startGradientTransformation (item, e) {
        if(item && item.data.parentItem) item = item.data.parentItem;

        this._gradientGUI.hoverStop.remove();
        if(item && item.data.handleType === 'gradient-stop') {
            this.currentTransformation = 'gradient-stop';
        } else if(item && item.data.handleType === 'gradient-point') {
            this.currentTransformation = 'gradient-point';
            this._gradientGUI.initialStartpoint = this._gradientGUI.startpoint;
            this._gradientGUI.initialEndpoint = this._gradientGUI.endpoint;
            this._gradientGUI.initialLineVector = this._gradientGUI.lineVector;
        } else if(this._gradientGUI.createdStopOnDown) {
            // Move the new color stop
            this.currentTransformation = 'gradient-stop';
            this._gradientGUI.createdStopOnDown = false;
        } else {
            // We have to set a currentTransformation for Cursor.js
            this.currentTransformation = 'gradient-none';
        }
    }

    updateGradientTransformation (item, e) {
        if(item && item.data.parentItem) item = item.data.parentItem;

        if(this.currentTransformation === 'gradient-stop') {
            let offset = this._calculateOffset(e.point);
            if(offset < 0) offset = 0;
            if(offset > 1) offset = 1;
            this._gradientGUI.selectedStop.data.setOffset(offset);
        } else if(this.currentTransformation === 'gradient-point') {
            if(item.data.handleEdge === 'start') {
                this._gradientGUI.startpoint = e.point;
            } else {
                this._gradientGUI.endpoint = e.point;
            }
            if(e.modifiers.shift) {
                this._gradientGUI.lineVector = this._gradientGUI.initialLineVector;
                if(item.data.handleEdge === 'start') {
                    this._gradientGUI.endpoint = e.point.add(this._gradientGUI.lineVector);
                } else {
                    this._gradientGUI.startpoint = e.point.subtract(this._gradientGUI.lineVector);
                }
            } else {
                if(item.data.handleEdge === 'start') {
                    this._gradientGUI.endpoint = this._gradientGUI.initialEndpoint;
                } else {
                    this._gradientGUI.startpoint = this._gradientGUI.initialStartpoint;
                }
                this._gradientGUI.lineVector = this._gradientGUI.endpoint.subtract(this._gradientGUI.startpoint);
            }
            this._transformContainer();
            this._buildGradientLine();
            this._gradientGUI.stops.forEach((stopObj) => {
                stopObj.data.setOffset(stopObj.data.offset);
                stopObj.data.setScaling();
            });
        }

        if(this.currentTransformation !== 'gradient-none') this._updateItems();
    }

    finishGradientTransformation (item, e) {
        if(!this._currentTransformation) return;

        if(this.currentTransformation !== 'gradient-none') this._updateItems();

        this._currentTransformation = null;
    }

    _updateItems () {
        let colorObj = {
            origin: this._gradientGUI.startpoint,
            destination: this._gradientGUI.endpoint,
            stops: this._gradientGUI.stops.map((stopPath) => {
                return { color: stopPath.data.color, offset: stopPath.data.offset }
            }),
            radial: this._gradientGUI.radial
        };

        // there better not be any groups
        if(this._gradientGUI.stroke) {
            this._itemsInSelection.forEach((item) => {
                item.strokeColor = colorObj;
            });
        } else {
            this._itemsInSelection.forEach((item) => {
                item.fillColor = colorObj;
            });
        }
    }

    _selectStop (stopObj) {
        if(this._gradientGUI.selectedStop) {
            this._gradientGUI.selectedStop.data.setSelected(false);
        }
        this._gradientGUI.selectedStop = stopObj;
        stopObj.data.setSelected(true);
    }

    _createStopFromPoint (point) {
        let offset = this._calculateValidOffset(point);
        if(offset !== null) {
            // Create and select a new color stop
            let newStop = this._buildGradientStop();
            this._interpolateStop(newStop, offset);

            this._gradientGUI.stops.push(newStop);
            this._gradientGUI.container.addChild(newStop);
            this._selectStop(newStop);
            this._updateItems();

            return this._gradientGUI.stops.length - 1;
        }
        return null;
    }

    _interpolateStop (stop, offset) {
        // Assuming unsorted stops list, find the stops right before and after given offset
        let stops = this._gradientGUI.stops;
        let stop1, stop2;
        let index1 = 0; let index2 = 1;
        stops.forEach(stop => {
            let stopOffset = stop.data.offset;
            if (index1 <= stopOffset && stopOffset <= offset) {
                stop1 = stop;
                index1 = stopOffset;
            }
            else if (offset <= stopOffset && stopOffset <= index2) {
                stop2 = stop;
                index2 = stopOffset;
            }
        });

        let color;
        if(!stop1) {
            // Offset is the leftmost stop, use the color of nextStop
            color = stop2.data.color ? stop2.data.color.clone() : new paper.Color('black');
        } else if(!stop2) {
            // Offset is the rightmost stop, use the color of prevStop
            color = stop1.data.color ? stop1.data.color.clone() : new paper.Color('black');
        } else {
            // Both stops exist, interpolate the color
            let offsetRelative = (offset - index1) / (index2 - index1);
            let color1 = stop1.data.color || new paper.Color('black');
            let color2 = stop2.data.color || new paper.Color('black');
            color = color1.add(color2.subtract(color1).multiply(offsetRelative));
            color.alpha = color1.alpha + (color2.alpha - color1.alpha) * offsetRelative;
        }

        stop.data.setColor(color);
        stop.data.setOffset(offset);
    }

    _transformContainer () {
        let container = this._gradientGUI.container;
        container.matrix.reset();
        container.translate(this._gradientGUI.startpoint);
        container.rotate(this._gradientGUI.lineVector.angle, this._gradientGUI.startpoint);
    }

    _calculateDistanceFromLine (point) {
        let pointVector = point.subtract(this._gradientGUI.startpoint);
        let lineVector = this._gradientGUI.lineVector.normalize();
        return lineVector.cross(pointVector);
    }

    _calculateOffset (point) {
        let pointVector = point.subtract(this._gradientGUI.startpoint);
        let lineVector = this._gradientGUI.lineVector;
        return lineVector.dot(pointVector) / (lineVector.length * lineVector.length);
    }
    _calculateValidOffset (point) {
        let distance = -this._calculateDistanceFromLine(point);
        if (distance < 0 || distance > (SelectionWidget.COLOR_STOP_CREATION_DISTANCE / paper.view.zoom)) {
            return null;
        }
        let offset = this._calculateOffset(point);
        return (0 <= offset && offset <= 1) ? offset : null;
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
SelectionWidget.ENDPOINT_RADIUS = 8;
SelectionWidget.COLOR_STOP_RECT_RADIUS = 12;
SelectionWidget.COLOR_STOP_RECT_PADDING = 2;
SelectionWidget.COLOR_STOP_OUTLINE_WIDTH = 2;
SelectionWidget.COLOR_STOP_CREATION_DISTANCE = SelectionWidget.ENDPOINT_RADIUS + 2.2 * SelectionWidget.COLOR_STOP_RECT_RADIUS;
SelectionWidget.SELECTED_COLOR = '#0c8ce9';
SelectionWidget.DESELECTED_COLOR = '#cccccc';

paper.PaperScope.inject({
    SelectionWidget: SelectionWidget,
});
