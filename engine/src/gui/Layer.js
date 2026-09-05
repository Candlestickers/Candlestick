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

Wick.GUIElement.Layer = class extends Wick.GUIElement {
    constructor (model) {
        super(model);

        this.cursor = 'pointer';

        this.canAutoScrollY = true;

        this.hideButton = new Wick.GUIElement.LayerButton(model, {
            toggledTooltip: 'Show Layer',
            untoggledTooltip: 'Hide Layer',
            toggledIcon: 'show_layer',
            untoggledIcon: 'hide_layer',
            isToggledFn: () => {
                return this.model.hidden;
            },
            clickFn: () => {
                this.model.hidden = !this.model.hidden;
                this.model.activate();
                this.projectWasModified();
            }
        });

        this.lockButton = new Wick.GUIElement.LayerButton(model, {
            toggledTooltip: 'Unlock Layer',
            untoggledTooltip: 'Lock Layer',
            toggledIcon: 'unlock_layer',
            untoggledIcon: 'lock_layer',
            isToggledFn: () => {
                return this.model.locked;
            },
            clickFn: () => {
                this.model.locked = !this.model.locked;
                this.model.activate();
                this.projectWasModified();
            }
        });
    }

    draw () {
        super.draw();

        var ctx = this.ctx;

        // Save where the mouse is if the user wants to drag the playhead around
        var mouseY = this.localMouse.y + this.model.index * this.gridCellHeight;
        this.mouseLayerIndex = Math.round(mouseY / this.gridCellHeight) + 1;
        this.mouseLayerIndex = Math.max(1, this.mouseLayerIndex);
        this.mouseLayerIndex = Math.min(this.model.parentTimeline.layers.length+1, this.mouseLayerIndex);
        this.mouseLayerIndex -= this.model.index;

        // Calculate absolute width of layer label
        var width = Wick.GUIElement.LAYERS_CONTAINER_WIDTH - Wick.GUIElement.LAYER_LABEL_MARGIN_SIDES*2;
        var height = this.gridCellHeight - Wick.GUIElement.LAYER_LABEL_MARGIN_TOP_BOTTOM*2;

        // Body
        if (this.model.hidden) {
            ctx.fillStyle = Wick.GUIElement.LAYER_LABEL_HIDDEN_FILL_COLOR;
        } else if (this.model.isActive) {
            ctx.fillStyle = this.model.layerColor;
        } else {
            let color = this.model.layerColor; //"#b7b7b7"
            let red, green, blue;
            if(color.includes("#")){
                // Parse original RGB values
                red = parseRGB(color)[0];
                green = parseRGB(color)[1];
                blue = parseRGB(color)[2]
            }
            else{
                color = color.replace(/[^\d.,]/g, '').split(',').map(Number);
                red = color[0]
                green = color[1]
                blue = color[2]
            }

            // Overlay factor (0–1)
            let customAlpha = 200 // edit this to tweak how light the inactive color is
            let overlayAlpha = customAlpha / 255;

            // Overlay color (183,183,183)
            let overlay = 183;

            // Blend each channel
            red = Math.round(overlay * overlayAlpha + red * (1 - overlayAlpha));
            green = Math.round(overlay * overlayAlpha + green * (1 - overlayAlpha));
            blue = Math.round(overlay * overlayAlpha + blue * (1 - overlayAlpha));

            ctx.fillStyle = "#" + toHex(red) + toHex(green) + toHex(blue);
        }

        // Convert back to hex string
        function toHex(n) {
            return n.toString(16).padStart(2, '0');
        }

        function parseRGB(color) {
            let red, green, blue, alpha;
            if (color.includes('#')){
                // condense color down to rgba values
                color = color.replace(/^#/, '');

                // Parse original RGB values
                red = parseInt(color.substring(0, 2), 16);
                green = parseInt(color.substring(2, 4), 16);
                blue = parseInt(color.substring(4, 6), 16);
                alpha = parseInt(color.substring(6, 8));
                return [red, green, blue, alpha]
            }
            else {
                color = color.match(/[\d.]+/g).map(Number);
                return color;
            }
        }

        if(this.model.isSelected) {
            ctx.strokeStyle = Wick.GUIElement.SELECTED_ITEM_BORDER_COLOR;
            ctx.lineWidth = 3;
        } else if(this.mouseState === 'over' || this.mouseState === 'down') {
            ctx.lineWidth = 3;
            ctx.strokeStyle = Wick.GUIElement.LAYER_LABEL_HOVER_COLOR;
        } else {
            ctx.strokeStyle = 'rgba(0,0,0,0)';
            ctx.lineWidth = 0;
        }

        ctx.save();
        ctx.translate(Wick.GUIElement.LAYER_LABEL_MARGIN_SIDES, Wick.GUIElement.LAYER_LABEL_MARGIN_TOP_BOTTOM);
            ctx.beginPath();
            ctx.roundRect(0, 0, width, height, Wick.GUIElement.LAYER_LABEL_BORDER_RADIUS);
            ctx.fill();
            ctx.stroke();
        ctx.restore();

        // Label text
        let color = this.model.layerColor;
        let warm = false;
        let rgb = parseRGB(color);
        if((rgb[0] - rgb[2]) > 0 && rgb[1] < 113) warm = true
        var maxWidth = Wick.GUIElement.LAYERS_CONTAINER_WIDTH - 10;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, maxWidth, this.gridCellHeight);
        ctx.clip();
        ctx.font = "16px " + Wick.GUIElement.LAYER_LABEL_FONT_FAMILY;
        if(this.model.isActive == true) {
            if(warm == false){
                ctx.fillStyle = Wick.GUIElement.LAYER_LABEL_ACTIVE_FONT_COLOR
            }
            else {
                ctx.fillStyle = "#ffffff"
            }
        }
        else{
            if(warm == false){
                ctx.fillStyle = Wick.GUIElement.LAYER_LABEL_INACTIVE_FONT_COLOR;
            }
            else{
                ctx.fillStyle = "#c5c5c5"
            }
        }
        ctx.fillText(this.model.name, 57, this.gridCellHeight / 2 + 6);
        ctx.restore();

        // Buttons
        ctx.save();
        ctx.translate(20, this.gridCellHeight / 2);
            this.hideButton.draw(this.model.hidden ? 'eye_closed' : 'eye_open', this.model.hidden);
        ctx.restore();

        ctx.save();
        ctx.translate(40, this.gridCellHeight / 2);
            this.lockButton.draw(this.model.locked ? 'lock_closed' : 'lock_open', this.model.locked);
        ctx.restore();

        // Reordering ghost
        if(this.mouseState === 'down') {
            ctx.fillStyle = 'red';
            ctx.save();
            ctx.translate(0, (this.mouseLayerIndex-1) * this.gridCellHeight);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Wick.GUIElement.LAYERS_CONTAINER_WIDTH, 0)
                ctx.stroke();
            ctx.restore();
        }
    }

    get bounds () {
        return {
            x: 0,
            y: 0,
            width: Wick.GUIElement.LAYERS_CONTAINER_WIDTH,
            height: this.gridCellHeight,
        }
    }

    onMouseDown (e) {
        this.model.activate();
        this.model.project.selection.clear();
        this.model.project.selection.select(this.model);
        this.projectWasModified();
    }

    onMouseDrag (e) {

    }

    onMouseUp (e) {
        var moveIndex = this.mouseLayerIndex - 1 + this.model.index;
        if(moveIndex === this.model.index) return;
        if(moveIndex > this.model.index) moveIndex --;
        this.model.move(moveIndex);
        this.model.activate();
        this.projectWasModified();
    }
}
