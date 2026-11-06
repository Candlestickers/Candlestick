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
import paper from 'paper';
import './_inspectoreaseeditor.scss';

class InspectorEaseEditor extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.canvasRef = createRef();
        this.hitResult = null;
    }

    genEase(){}

    componentDidMount() {
        paper.setup(this.canvasRef.current);
        this.drawGraph();
        this.drawInitEase();

        this.tool = new paper.Tool();
        this.tool.onMouseDown = (e) => {
            this.hitResult = this.getHitResult(e.point);
        };
        this.tool.onMouseDrag = (e) => {
            if (!this.hitResult) return;

            if (this.hitResult.type === 'curve' || this.hitResult.type === 'stroke') {
                this.dragCurve(e.delta);
            } else if (this.hitResult.type === 'handle-in' || this.hitResult.type === 'handle-out') {
                this.dragHandle(this.hitResult, e.delta, e.modifiers.shift);
            }
        };
        this.tool.onMouseUp = () => {
            this.hitResult = null;
            this.props.tween.easeCurve = this.path;
        };
        this.tool.activate();
    }

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

    dragCurve(delta) {
        const [start, end] = this.path.segments;
        const vector = end.point.subtract(start.point);

        if (start.handleOut.isZero()) {
            start.handleOut = vector.divide(4);
        }
        if (end.handleIn.isZero()) {
            end.handleIn = vector.negate().divide(4);
        }

        start.handleOut = start.handleOut.add(delta);
        end.handleIn = end.handleIn.add(delta);
    }

    dragHandle(hitResult, delta, shiftHeld) {
        const segment = hitResult.segment;
        const isHandleIn = hitResult.type === 'handle-in';
        const handle = isHandleIn ? segment.handleIn : segment.handleOut;
        const oppositeHandle = isHandleIn ? segment.handleOut : segment.handleIn;

        if (isHandleIn) {
            segment.handleIn = handle.add(delta);
        } else {
            segment.handleOut = handle.add(delta);
        }

        if (!shiftHeld) {
            if (isHandleIn) {
                segment.handleOut = oppositeHandle.subtract(delta);
            } else {
                segment.handleIn = oppositeHandle.subtract(delta);
            }
        }
    }

    drawGraph() {
        this.YAxis = new paper.Path.Line({
            from: [10, (this.props.height || 200) - 10],
            to: [10, 10],
            strokeColor: 'black',
            strokeWidth: 1
        });

        this.XAxis = new paper.Path.Line({
            from: [(this.props.width || 200) - 10, (this.props.height || 200) - 10],
            to: [10, (this.props.height || 200) - 10],
            strokeColor: 'black',
            strokeWidth: 1
        });
    }

    drawInitEase() {
        if (this.props.tween.easeCurve !== null) {this.path = this.props.tween.easeCurve; return;}

        const width = this.props.width || 200;
        const height = this.props.height || 200;
        const start = new paper.Point(10, height - 10);
        const end = new paper.Point(width - 10, 10);
        const controlSpan = end.subtract(start).divide(3);

        this.path = new paper.Path.Line({
            from: start,
            to: end,
            strokeColor: 'black',
            strokeWidth: 2,
            fullySelected: true
        });
        this.path.segments[0].handleOut = controlSpan;
        this.path.segments[1].handleIn = controlSpan.negate();
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