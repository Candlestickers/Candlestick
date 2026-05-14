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

Wick.GUIElement.FrameGhost = class extends Wick.GUIElement.Ghost {
    constructor (model) {
        super(model);

        this._mainFrame = model;
        this._frames = model.project.selection.getSelectedObjects('Frame');

        this.rejectIfOut = false;
        this.addLayersBelow = true;
    }

    draw () {
        super.draw();

        var ctx = this.ctx;

        this._frames.forEach(frame => {
            // Calculate position values...
            var start = frame.start - this._mainFrame.start;
            var length = frame.length;
            var row = frame.parentLayer.index - this._mainFrame.parentLayer.index;

            var x = start * this.gridCellWidth;
            var y = row * this.gridCellHeight;
            var width = length * this.gridCellWidth;
            var height = this.gridCellHeight;

            // New position of frames based on mouse x,y
            // (this makes things feel more responsive)
            ctx.save();
            ctx.translate(this._mouseDiff.x, this._mouseDiff.y);
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = Wick.GUIElement.FRAME_GHOST_COLOR;
                ctx.beginPath();
                ctx.roundRect(x, y, width, height, Wick.GUIElement.FRAME_BORDER_RADIUS);
                ctx.fill();
            ctx.restore();

            // New position of frames based on grid cells moved
            // (this makes it easy to tell where frames will land)
            ctx.save();
            ctx.translate(this.moveCols*this.gridCellWidth, this.moveRows*this.gridCellHeight);

            let destinationLayer = frame.parentLayer.index + this.moveRows;
            // if rejecting out-of-bounds moves, start of frame cannot go out of bounds
            // if not, warn when the entire frame moves out of bounds
            let frameCol = (this.rejectIfOut ? frame.start : frame.end) + this.moveCols;

            if((destinationLayer > frame.parentTimeline.layers.length - 1 && !this.addLayersBelow) || destinationLayer < 0 || frameCol < 1) {
                ctx.fillStyle = Wick.GUIElement.FRAME_GHOST_NOT_ALLOWED_COLOR
                ctx.strokeStyle = '#ff0000';
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0)';
                ctx.strokeStyle = '#00ff00';
            }
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(x, y, width, height, Wick.GUIElement.FRAME_BORDER_RADIUS);
                ctx.globalAlpha = 0.8;
                ctx.fill();
                ctx.stroke();
            ctx.restore();
        });
    }

    finish () {
        var timeline = this.model.parentTimeline;
        var selection = this.model.project.selection; // this.model might be removed from project if moved to a nonexistent layer, so save the selection now
        timeline.deferFrameGapResolve();

        // if any frame goes out-of-bounds, movement may be rejected
        let reject = false;
        if(this.rejectIfOut) {
            this._frames.forEach(frame => {
                let destinationLayer = frame.parentLayer.index + this.moveRows;
                // reject if frame goes out of bounds (except if adding layers below is allowed and the frame goes below)
                if((destinationLayer >= timeline.layers.length && !this.addLayersBelow) || destinationLayer < 0 || frame.start + this.moveCols < 1)
                    reject = true;
            });
        }

        if(!reject) {
            // Remove all frames
            this._frames.forEach(frame => {
                frame._originalLayerIndex = frame.parentLayer.index;
                frame.remove();
                frame.start += this.moveCols;
                frame.end += this.moveCols;
            });

            // Add frames to new destinations
            let relocated = false;
            this._frames.forEach(frame => {
                // frame is fully to the left of the timeline: ignore
                if(frame.end <= 0) {
                    selection.deselect(frame);
                } else {
                    // add layers if necessary/allowed
                    if(this.addLayersBelow && frame._originalLayerIndex + this.moveRows > 0) {
                        while(timeline.layers.length < frame._originalLayerIndex + this.moveRows + 1) {
                            timeline.addLayer(new Wick.Layer());
                        }
                    }

                    var layer = timeline.layers[frame._originalLayerIndex + this.moveRows];
                    delete frame._originalLayerIndex;

                    // add frame if layer is there
                    if(layer) {
                        layer.addFrame(frame);
                        relocated = true;
                    } else {
                        selection.deselect(frame);
                    }
                }
            });

            // only move playhead if at least one frame actually moved (and wasn't deleted out of bounds)
            if(relocated) {
                timeline.playheadPosition += this.moveCols;
            }
            timeline.resolveFrameGaps(this._frames);
        }
    }
}
