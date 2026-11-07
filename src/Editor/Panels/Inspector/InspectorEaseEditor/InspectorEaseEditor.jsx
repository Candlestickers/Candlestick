/*
 * Copyright 2026 Candlestickers
 *
 * This file is part of Candlestick.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Candlestick is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Candlestick.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Component, createRef } from 'react';
import { PaperScope } from 'paper';
const paper = new PaperScope();
import './_inspectoreaseeditor.scss';

// How far above 1 and below 0 (in graph units, where 0 to 1 is the whole movement) points and handles can go
const MAX_OVERSHOOT = 1;

// A straight line, with the handles a third of the way along.
const DEFAULT_CURVE = {
    points: [
        { x: 0, y: 0, outX: 1 / 3, outY: 1 / 3 },
        { x: 1, y: 1, inX: -1 / 3, inY: -1 / 3 }
    ]
};

// Helper to clamp a value between two limits, whichever order they are given in
const clamp = (value, a, b) => Math.min(Math.max(value, Math.min(a, b)), Math.max(a, b));

class InspectorEaseEditor extends Component {
    static defaultProps = { width: 200, height: 200 };

    canvasRef = createRef();
    hitResult = null;

    componentDidMount() {
        paper.setup(this.canvasRef.current);
        this.paperProj = paper.project;
        this.redraw(this.getEaseCurve());

        this.tool = new paper.Tool();
        this.tool.onMouseDown = (e) => {
            this.hitResult = this.getHitResult(e.point);
            this.dragged = false;
            if (!this.hitResult) return;

            const { type, segment } = this.hitResult;
            if (type === 'segment' && e.event.detail >= 2 && segment.previous && segment.next) {
                // Double-clicking one of the points between the ends removes it
                segment.remove();
                this.hitResult = null;
                this.dragged = true;
            } else if (type === 'curve' || type === 'stroke') {
                // Clicking the curve adds a point there (the curve keeps its shape), which can be dragged straight away
                const added = this.path.divideAt(this.hitResult.location);
                this.hitResult = added ? { type: 'segment', segment: added } : null;
                this.path.fullySelected = true;
                this.dragged = !!added;
            }
        };
        this.tool.onMouseDrag = (e) => {
            const { type, segment } = this.hitResult || {};
            if (type === 'segment' && segment.previous && segment.next) {
                // The two end points stay put
                this.moveAnchor(segment, e.delta);
            } else if (type === 'handle-in' || type === 'handle-out') {
                this.dragHandle(segment, type === 'handle-in' ? 'handleIn' : 'handleOut', e.delta, !e.modifiers.shift);
            } else {
                return;
            }
            this.dragged = true;
        };
        this.tool.onMouseUp = () => {
            this.hitResult = null;
            // Only save when something was actually dragged, so a plain click doesn't add an undo step
            if (!this.dragged) return;
            this.dragged = false;
            // Redrawing resizes the canvas to fit the curve, and has to come before saving, which can re-render this component
            const curve = this.getCurve();
            this.redraw(curve);
            this.props.setSelectionAttribute('easeCurve', curve);
        };
        this.tool.activate();
    }

    componentDidUpdate() {
        const curve = this.getEaseCurve();
        // The tween's curve is replaced, never changed in place, so the same object means nothing to compare
        if (curve === this.seenCurve) return;

        this.seenCurve = curve;
        if (JSON.stringify(curve) !== this.lastCurve) this.redraw(curve);
    }

    componentWillUnmount() {
        this.tool.remove();
        this.paperProj.remove();
    }

    /**
     * Finds the object under the mouse.
     * @param {paper.Point} point - the point that was clicked
     * @returns {paper.HitResult}
     */
    getHitResult(point) {
        return paper.project.hitTest(point, {
            curves: true,
            handles: true,
            segments: true,
            stroke: true,
            tolerance: 8,
            match: (result) => result.item === this.path
        });
    }

    /**
     * Keeps a handle's end between its own point and the neighbouring point horizontally, and inside the most the
     * graph can show vertically. The horizontal part is what makes the curve a valid easing, and it matches how
     * the engine plays it back.
     * @param {paper.Segment} segment - The segment to clamp the handle of.
     * @param {string} side - Which handle to clamp, 'handleIn' or 'handleOut'.
     */
    clampHandle(segment, side) {
        const neighbour = side === 'handleIn' ? segment.previous : segment.next;
        if (!neighbour) return;

        const point = segment.point;
        const handle = segment[side];
        segment[side] = new paper.Point(
            clamp(point.x + handle.x, point.x, neighbour.point.x) - point.x,
            this.clampY(point.y + handle.y) - point.y
        );
    }

    /**
     * Moves a point between the two ends, keeping a small gap to its neighbours so x always increases.
     * @param {paper.Segment} segment - The segment to move.
     * @param {paper.Point} delta - The amount to move the segment by.
     */
    moveAnchor(segment, delta) {
        const gap = this.plot.width * 0.01;
        segment.point = new paper.Point(
            clamp(segment.point.x + delta.x, segment.previous.point.x + gap, segment.next.point.x - gap),
            this.clampY(segment.point.y + delta.y)
        );

        // The handles around the point may now reach past their neighbours
        this.clampHandle(segment, 'handleIn');
        this.clampHandle(segment, 'handleOut');
        this.clampHandle(segment.previous, 'handleOut');
        this.clampHandle(segment.next, 'handleIn');
    }

    /**
     * Drags one of the curve's handles by the given delta. If linked, the point's other handle turns to stay in line.
     * @param {paper.Segment} segment - The segment the handle belongs to.
     * @param {string} side - Which handle to drag, 'handleIn' or 'handleOut'.
     * @param {paper.Point} delta - The amount to move the handle by.
     * @param {boolean} linked - Whether the point's other handle follows.
     */
    dragHandle(segment, side, delta, linked) {
        segment[side] = segment[side].add(delta);
        this.clampHandle(segment, side);

        // Points between the ends are smooth: the other handle points the opposite way but keeps its own length
        const other = side === 'handleIn' ? 'handleOut' : 'handleIn';
        if (linked && segment.previous && segment.next && !segment[side].isZero() && !segment[other].isZero()) {
            segment[other] = segment[side].normalize(segment[other].length).negate();
            this.clampHandle(segment, other);
        }
    }

    /**
     * The plot is the area inside the margins. Going from 0 to 1 always takes the same number of pixels.
     * @param {object} curve - The curve the plot has to fit.
     * @returns {object}
     */
    getPlot(curve) {
        const { width, height } = this.props;
        const { min, max } = this.getYRange(curve);
        const margin = { left: 20, right: 10, top: 10, bottom: 20 };
        const unit = height - margin.top - margin.bottom;
        const floor = margin.top + unit * (max - min);

        return {
            left: margin.left, // canvas x of plot
            width: width - margin.left - margin.right, // canvas width of plot
            height: unit, // pixels per graph unit
            min, // lowest graph y shown
            max, // highest graph y shown
            top: margin.top, // canvas y of top edge of plot
            bottom: margin.top + unit * max, // canvas y of graph y 0
            floor, // canvas y of bottom edge of plot
            canvasHeight: floor + margin.bottom // canvas height needed
        };
    }

    /**
     * Keeps a canvas y inside the most the graph is allowed to show: MAX_OVERSHOOT above 1 and below 0.
     * @param {number} y - The canvas y to clamp.
     * @returns {number}
     */
    clampY(y) {
        const { bottom, height } = this.plot;
        return clamp(y, bottom - (1 + MAX_OVERSHOOT) * height, bottom + MAX_OVERSHOOT * height);
    }

    /**
     * The range of graph y the canvas has to show: 0 to 1, widened to fit any point or handle end outside it.
     * @param {object} curve - A curve, see getEaseCurve.
     * @returns {object} The `min` and `max` graph y.
     */
    getYRange(curve) {
        const ys = curve.points.flatMap(point => [point.y, point.y + (point.inY || 0), point.y + (point.outY || 0)]);
        const round = value => Math.round(value * 100) / 100;
        return {
            min: clamp(round(Math.min(0, ...ys)), -MAX_OVERSHOOT, 0),
            max: clamp(round(Math.max(1, ...ys)), 1, 1 + MAX_OVERSHOOT)
        };
    }

    /**
     * Draws the given curve, with the canvas sized to fit it
     * @param {object} curve - The curve to draw, see getEaseCurve.
     */
    redraw(curve) {
        const plot = this.getPlot(curve);
        const rangeChanged = !this.plot || plot.min !== this.plot.min || plot.max !== this.plot.max;

        this.hitResult = null;
        this.seenCurve = curve;
        this.lastCurve = JSON.stringify(curve);
        this.plot = plot;

        if (rangeChanged) {
            this.paperProj.view.viewSize = new paper.Size(this.props.width, plot.canvasHeight);
            this.paperProj.activeLayer.removeChildren();
            this.drawGraph();
        } else {
            this.path.remove();
        }
        this.drawCurve(curve);
    }

    /**
     * Reads the path back out as {points: [{x, y, inX, inY, outX, outY}, ...]}, in graph space (0-1) with handles as offsets.
     * @returns {object}
     */
    getCurve() {
        const { left, bottom, width, height } = this.plot;
        const last = this.path.segments.length - 1;
        return {
            points: this.path.segments.map((segment, i) => ({
                x: (segment.point.x - left) / width,
                y: (bottom - segment.point.y) / height,
                // The first point has no in handle and the last no out handle
                ...(i > 0 && { inX: segment.handleIn.x / width, inY: -segment.handleIn.y / height }),
                ...(i < last && { outX: segment.handleOut.x / width, outY: -segment.handleOut.y / height })
            }))
        };
    }

    /**
     * Draws the grid, axes and labels for the graph.
     */
    drawGraph() {
        const { left, width, height, min, max, top, bottom, floor } = this.plot;

        // The colours are custom properties in the stylesheet
        const style = getComputedStyle(this.canvasRef.current);
        const color = name => style.getPropertyValue(name).trim();

        // The grid is drawn first so everything else sits on top of it
        const gridStyle = { strokeColor: color('--ease-grid-color'), strokeWidth: 1 };
        const divisions = 8;
        for (let i = 0; i <= divisions; i++) {
            const x = left + width * i / divisions;
            new paper.Path.Line({ ...gridStyle, from: [x, top], to: [x, floor] });
        }
        for (let i = Math.ceil(min * divisions); i <= Math.floor(max * divisions); i++) {
            const y = bottom - height * i / divisions;
            new paper.Path.Line({ ...gridStyle, from: [left, y], to: [left + width, y] });
        }

        const axisStyle = { strokeColor: color('--ease-axis-color'), strokeWidth: 1 };
        new paper.Path.Line({ ...axisStyle, from: [left, floor], to: [left, top] });
        new paper.Path.Line({ ...axisStyle, from: [left + width, bottom], to: [left, bottom] });

        const labelStyle = { fillColor: color('--ease-label-color'), underline: true, fontSize: 12, letterTracking: 100, justification: 'center' };
        new paper.PointText({ ...labelStyle, content: 'Time', point: [left + width / 2, floor + 13] });

        const yLabelPoint = new paper.Point(left - 6, (top + floor) / 2);
        new paper.PointText({ ...labelStyle, letterTracking: 10, content: 'Progress', point: yLabelPoint }).rotate(-90, yLabelPoint);
    }

    /**
     * The curve to show: the tween's saved one, or DEFAULT_CURVE if it has none.
     */
    getEaseCurve() {
        return this.props.tween.easeCurve || DEFAULT_CURVE;
    }

    /**
     * Draws the given curve as a path with a point and two handles per segment.
     * @param {object} curve - The curve to draw.
     */
    drawCurve(curve) {
        const { left, bottom, width, height } = this.plot;

        // Paper handles are offsets from their own point, and graph y points up while canvas y points down
        this.path = new paper.Path({
            segments: curve.points.map(point => new paper.Segment(
                new paper.Point(left + point.x * width, bottom - point.y * height),
                new paper.Point((point.inX || 0) * width, -(point.inY || 0) * height),
                new paper.Point((point.outX || 0) * width, -(point.outY || 0) * height)
            )),
            strokeColor: 'black',
            strokeWidth: 2,
            fullySelected: true
        });
    }

    render() {
        return (
            <div className="inspector-ease-editor-container">
                <canvas ref={this.canvasRef} id="inspector-ease-editor" width={this.props.width} height={this.props.height}>
                    Tween easing editor goes here!
                </canvas>
            </div>
        )
    }
}

export default InspectorEaseEditor