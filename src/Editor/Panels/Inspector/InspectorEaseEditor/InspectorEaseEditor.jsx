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

class InspectorEaseEditor extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.canvasRef = createRef();
        this.hitResult = null;
    }

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
            if (!this.hitResult) return;

            const { type, segment } = this.hitResult;
            if (type === 'segment') {
                // The two end points stay put
                if (!segment.previous || !segment.next) return;
                this.moveAnchor(segment, e.delta);
            } else if (type === 'handle-in' || type === 'handle-out') {
                this.dragHandle(this.hitResult, e.delta, !e.modifiers.shift);
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
            // Remember what was saved first, as saving can re-render this component straight away
            const curve = this.getCurve();
            this.lastCurve = JSON.stringify(curve);
            // The canvas grows or shrinks to fit the curve once it's let go
            const range = this.getYRange(curve);
            if (range.min !== this.yRange.min || range.max !== this.yRange.max) this.redraw(curve);
            this.props.setSelectionAttribute('easeCurve', curve);
        };
        this.tool.activate();
    }

    componentDidUpdate() {
        // Undo and redo change the tween's saved curve without going through this editor, so redraw it when it changes
        if (JSON.stringify(this.getEaseCurve()) === this.lastCurve) return;

        this.redraw(this.getEaseCurve());
    }

    componentWillUnmount() {
        // paper.setup() makes a brand new project and tool each time this mounts, so remove ours
        this.tool.remove();
        this.paperProj.remove();
    }

    /**
     * Finds the object under the mouse.
     * @param {paper.Point} point - the point that was clicked
     * @returns 
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
     * @param {boolean} isHandleIn - Whether to clamp the in handle (true) or out handle (false).
     */
    clampHandle(segment, isHandleIn) {
        const neighbour = isHandleIn ? segment.previous : segment.next;
        if (!neighbour) return;

        const handle = isHandleIn ? segment.handleIn : segment.handleOut;
        const min = Math.min(segment.point.x, neighbour.point.x);
        const max = Math.max(segment.point.x, neighbour.point.x);
        const clamped = new paper.Point(
            Math.min(Math.max(segment.point.x + handle.x, min), max) - segment.point.x,
            this.clampY(segment.point.y + handle.y) - segment.point.y
        );

        if (isHandleIn) {
            segment.handleIn = clamped;
        } else {
            segment.handleOut = clamped;
        }
    }

    /**
     * Moves one handle by delta, keeping its end between its point and the neighbouring point horizontally.
     * @param {paper.Segment} segment - The segment to move the handle of.
     * @param {boolean} isHandleIn - Whether to move the in handle (true) or out handle (false).
     * @param {paper.Point} delta - The amount to move the handle by.
     */
    moveHandle(segment, isHandleIn, delta) {
        const handle = (isHandleIn ? segment.handleIn : segment.handleOut).add(delta);

        if (isHandleIn) {
            segment.handleIn = handle;
        } else {
            segment.handleOut = handle;
        }
        this.clampHandle(segment, isHandleIn);
    }

    /**
     * Moves a point between the two ends, keeping a small gap to its neighbours so x always increases.
     * @param {paper.Segment} segment - The segment to move.
     * @param {paper.Point} delta - The amount to move the segment by.
     */
    moveAnchor(segment, delta) {
        const gap = this.getPlot().width * 0.01;
        const x = Math.min(Math.max(segment.point.x + delta.x, segment.previous.point.x + gap), segment.next.point.x - gap);
        segment.point = new paper.Point(x, this.clampY(segment.point.y + delta.y));

        // The handles around the point may now reach past their neighbours
        this.clampHandle(segment, true);
        this.clampHandle(segment, false);
        this.clampHandle(segment.previous, false);
        this.clampHandle(segment.next, true);
    }

    /**
     * Drags one of the curve's handles by the given delta. If linked, the point's other handle turns to stay in line.
     */
    dragHandle(hitResult, delta, linked) {
        const segment = hitResult.segment;
        const isHandleIn = hitResult.type === 'handle-in';
        this.moveHandle(segment, isHandleIn, delta);

        // Points between the ends are smooth: the other handle points the opposite way but keeps its own length
        if (linked && segment.previous && segment.next) {
            const handle = isHandleIn ? segment.handleIn : segment.handleOut;
            const other = isHandleIn ? segment.handleOut : segment.handleIn;
            if (handle.isZero() || other.isZero()) return;

            const opposite = handle.normalize(other.length).negate();
            if (isHandleIn) {
                segment.handleOut = opposite;
            } else {
                segment.handleIn = opposite;
            }
            this.clampHandle(segment, !isHandleIn);
        }
    }

    /**
     * The plot is the area inside the margins. Going from 0 to 1 always takes the same number of pixels, and the
     * canvas grows taller to fit anything above 1 or below 0 (see yRange).
     * @returns {object} `left` and `width` are the canvas x and width of the plot, and `height` is the number of
     * pixels in one graph unit. Graph y 0 is at canvas y `bottom`. `top` and `floor` are the canvas y of the top and
     * bottom edges of the whole plot, and `canvasHeight` is the height the canvas needs.
     */
    getPlot() {
        const width = this.props.width || 200;
        const height = this.props.height || 200;
        const margin = { left: 20, right: 10, top: 10, bottom: 20 };
        const unit = height - margin.top - margin.bottom;
        const range = this.yRange || { min: 0, max: 1 };
        return {
            left: margin.left,
            width: width - margin.left - margin.right,
            height: unit,
            top: margin.top,
            bottom: margin.top + unit * range.max,
            floor: margin.top + unit * (range.max - range.min),
            canvasHeight: margin.top + unit * (range.max - range.min) + margin.bottom
        };
    }

    /**
     * Keeps a canvas y inside the most the graph is allowed to show: MAX_OVERSHOOT above 1 and below 0.
     * @param {number} y - The canvas y to clamp.
     * @returns {number}
     */
    clampY(y) {
        const plot = this.getPlot();
        return Math.min(Math.max(y, plot.bottom - (1 + MAX_OVERSHOOT) * plot.height), plot.bottom + MAX_OVERSHOOT * plot.height);
    }

    /**
     * The range of graph y the canvas has to show: 0 to 1, widened to fit any point or handle end outside it.
     * Rounded to 0.01 so tiny floating point errors don't resize the canvas.
     * @param {object} curve - A curve, see getEaseCurve.
     * @returns {object} The `min` and `max` graph y.
     */
    getYRange(curve) {
        let min = 0;
        let max = 1;
        curve.points.forEach(point => {
            [point.y, point.y + (point.inY || 0), point.y + (point.outY || 0)].forEach(y => {
                min = Math.min(min, y);
                max = Math.max(max, y);
            });
        });

        const round = value => Math.round(value * 100) / 100;
        return { min: Math.max(round(min), -MAX_OVERSHOOT), max: Math.min(round(max), 1 + MAX_OVERSHOOT) };
    }

    /**
     * Draws the graph and the given curve from scratch, with the canvas sized to fit the curve.
     * @param {object} curve - The curve to draw, see getEaseCurve.
     */
    redraw(curve) {
        this.hitResult = null;
        this.yRange = this.getYRange(curve);
        this.paperProj.view.viewSize = new paper.Size(this.props.width || 200, this.getPlot().canvasHeight);
        this.paperProj.activeLayer.removeChildren();
        this.drawGraph();
        this.drawInitEase(curve);
    }

    /**
     * Reads the path back out as {points: [{x, y, inX, inY, outX, outY}, ...]}, in graph space (0-1) with handles as offsets.
     * @returns {object}
     */
    getCurve() {
        const plot = this.getPlot();
        const last = this.path.segments.length - 1;
        return {
            points: this.path.segments.map((segment, i) => {
                const point = {
                    x: (segment.point.x - plot.left) / plot.width,
                    y: (plot.bottom - segment.point.y) / plot.height
                };
                // The first point has no in handle and the last no out handle
                if (i > 0) {
                    point.inX = segment.handleIn.x / plot.width;
                    point.inY = -segment.handleIn.y / plot.height;
                }
                if (i < last) {
                    point.outX = segment.handleOut.x / plot.width;
                    point.outY = -segment.handleOut.y / plot.height;
                }
                return point;
            })
        };
    }

    /**
     * Draws the axes and labels for the graph.
     */
    drawGraph() {
        const plot = this.getPlot();

        this.YAxis = new paper.Path.Line({
            from: [plot.left, plot.floor],
            to: [plot.left, plot.top],
            strokeColor: 'black',
            strokeWidth: 1
        });

        this.XAxis = new paper.Path.Line({
            from: [plot.left + plot.width, plot.bottom],
            to: [plot.left, plot.bottom],
            strokeColor: 'black',
            strokeWidth: 1
        });

        const labelStyle = { fillColor: 'white', underline: true, fontSize: 12, letterTracking: 100, justification: 'center' };

        this.XLabel = new paper.PointText({
            ...labelStyle,
            content: 'Time',
            point: [plot.left + plot.width / 2, plot.floor + 13]
        });

        const YLabelPoint = new paper.Point(plot.left - 6, (plot.top + plot.floor) / 2);

        this.YLabel = new paper.PointText({
            ...labelStyle,
            letterTracking: 10,
            content: 'Progress',
            point: YLabelPoint
        });
        this.YLabel.rotate(-90, YLabelPoint);
    }

    /**
     * The curve to show: the tween's saved one, or a straight line (handles a third of the way along) if it has none.
     * A curve is {points: [{x, y, inX, inY, outX, outY}, ...]} in graph space (0-1) with handles as offsets.
     */
    getEaseCurve() {
        const saved = this.props.tween.easeCurve;
        return (saved && Array.isArray(saved.points)) ? saved : {
            points: [
                { x: 0, y: 0, outX: 1 / 3, outY: 1 / 3 },
                { x: 1, y: 1, inX: -1 / 3, inY: -1 / 3 }
            ]
        };
    }

    /**
     * Draws the given curve (the tween's by default) as a path with a point and two handles per segment.
     * @param {object} curve - The curve to draw, see getEaseCurve.
     */
    drawInitEase(curve = this.getEaseCurve()) {
        const plot = this.getPlot();
        this.lastCurve = JSON.stringify(curve);

        this.path = new paper.Path({
            strokeColor: 'black',
            strokeWidth: 2
        });
        // Paper handles are offsets from their own point, and graph y points up while canvas y points down
        curve.points.forEach(point => {
            this.path.add(new paper.Segment(
                new paper.Point(plot.left + point.x * plot.width, plot.bottom - point.y * plot.height),
                new paper.Point((point.inX || 0) * plot.width, -(point.inY || 0) * plot.height),
                new paper.Point((point.outX || 0) * plot.width, -(point.outY || 0) * plot.height)
            ));
        });
        this.path.fullySelected = true;
    }

    render() {
        return (
            <div className="inspector-ease-editor-container">
                <canvas ref={this.canvasRef} id="inspector-ease-editor" width={this.props.width || "200"} height={this.props.height || "200"}>
                    Tween easing editor goes here!
                </canvas>
            </div>
        )
    }
}

export default InspectorEaseEditor