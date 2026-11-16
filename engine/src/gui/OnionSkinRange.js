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

// Thanks to FlyOrBoom (https://github.com/FlyOrBoom) for the styling of these sliders!

Wick.GUIElement.OnionSkinRange = class extends Wick.GUIElement {
    constructor (model, direction) {
        super(model);

        this.cursor = 'ew-resize';
        this.canAutoScrollX = true;

        this.direction = direction;
    }

    draw () {
        super.draw();

        var ctx = this.ctx;

        // Save where the mouse is if the user wants to drag the sliders around
        this.mousePlayheadPosition = Math.round(this.localMouse.x / this.gridCellWidth);

        // Calculate positions of the handle
        var seek = this.direction === 'right' ? this.model.project.onionSkinSeekForwards : this.model.project.onionSkinSeekBackwards;
        var width = Math.max((seek-0.15) * this.gridCellWidth, this.gridCellWidth/2);
        var margin = Wick.GUIElement.PLAYHEAD_MARGIN * 2;
        if (this.gridCellWidth < Wick.GUIElement.FRAME_NORMAL_W)
            margin *= (this.gridCellWidth - Wick.GUIElement.FRAME_XSMALL_W) / (Wick.GUIElement.FRAME_NORMAL_W - Wick.GUIElement.FRAME_XSMALL_W);
        var edgeWidth = this.gridCellWidth - margin;
        var height = Wick.GUIElement.NUMBER_LINE_HEIGHT * 0.9;

        // Draw handle
        var grd = ctx.createLinearGradient(0, 0, width + edgeWidth, 0);
        let fillColor = seek > 0 ? Wick.GUIElement.ONION_SKIN_FILL_COLOR : Wick.GUIElement.ONION_SKIN_ZERO_FILL_COLOR;
        grd.addColorStop(0, fillColor + Wick.GUIElement.ONION_SKIN_MIN_ALPHA);
        grd.addColorStop(1, fillColor);
        ctx.fillStyle = grd;
        ctx.lineWidth = 1,

        ctx.save();
        ctx.globalAlpha = this.mouseState === 'over' ? 0.5 : 1.0;
        if(this.direction == 'left') ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(width, 0);
            ctx.lineTo(width + edgeWidth/2, 0);
            ctx.lineTo(width + edgeWidth/2, height * 2/3);
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.lineTo(0, 0);
            ctx.fill();
        ctx.restore();
    }

    onMouseDrag (e) {
        if(this.direction === 'right') {
            this.model.project.onionSkinSeekForwards = Math.max(0, this.mousePlayheadPosition);
        } else if(this.direction === 'left') {
            this.model.project.onionSkinSeekBackwards = Math.max(0, -this.mousePlayheadPosition);
        }
        this.projectWasSoftModified();
    }

    get bounds () {
        let s = this.direction === 'right' ? this.model.project.onionSkinSeekForwards : this.model.project.onionSkinSeekBackwards;
        let w = this.gridCellWidth/4 + Math.max(s * this.gridCellWidth, this.gridCellWidth);
        w = Math.max(w, Wick.GUIElement.ONION_SKIN_GRAB_MIN_SIZE);
        if(this.direction === 'right') {
            return {
                x: this.gridCellWidth/4,
                y: 0,
                width: w,
                height: Wick.GUIElement.NUMBER_LINE_HEIGHT,
            };
        } else if (this.direction === 'left') {
            return {
                x: -w - this.gridCellWidth/4,
                y: 0,
                width: w,
                height: Wick.GUIElement.NUMBER_LINE_HEIGHT,
            };
        }
    }
}
