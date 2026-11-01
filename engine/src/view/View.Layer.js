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

Wick.View.Layer = class extends Wick.View {
    static get BASE_ONION_OPACITY() {
        return 0.35;
    }

    constructor(wickLayer) {
        super();

        this.activeFrameLayers = [];
        this.onionSkinnedFramesLayers = [];

        this.activeFrameContainers = [];
    }

    render() {
        // Add active frame layers
        this.activeFrameLayers = [];
        var frame = this.model.activeFrame;
        if (frame) {
            frame.view.render();

            this.activeFrameLayers.push(frame.view.objectsLayer);

            frame.view.objectsLayer.locked = false;
            frame.view.objectsLayer.opacity = this.model._opacity;
        }

        // Disable mouse events on layers if they are locked.
        // (However, this is ignored while the project is playing so the interact tool always works.)
        // (This is also ignored for layers which are inside clips and not the current focus.)
        this.activeFrameLayers.forEach(layer => {
            if (this.model.project.playing || !this.model.parentClip.isFocus) {
                layer.locked = false;
            } else {
                layer.locked = this.model.locked;
            }

            if (this.mask != null) {
                this._updateMask(this.mask, false);
            }
        });

        // Add onion skinning, if necessary.
        this.onionSkinnedFramesLayers = [];

        if (this.model.project &&
            this.model.project.onionSkinEnabled &&
            !this.model.project.playing &&
            this.model.parentClip.isFocus) {
            this.addOnionSkin();
        }

    }

    addOnionSkin() {
        this.model.frames.filter(frame => {
            return frame.onionSkinned;
        }).forEach(frame => {
            this.onionSkinFrame(frame);
        });
    }

    onionSkinFrame(frame) {
        var onionSkinSeekBackwards = this.model.project.onionSkinSeekBackwards;
        var onionSkinSeekForwards = this.model.project.onionSkinSeekForwards;
        var playheadPosition = this.model.project.focus.timeline.playheadPosition;

        frame.view.render();

        this.onionSkinnedFramesLayers.push(frame.view.objectsLayer);

        var seek = 1;
        if (frame.midpoint < playheadPosition) {
            seek = onionSkinSeekBackwards;
        } else if (frame.midpoint > playheadPosition) {
            seek = onionSkinSeekForwards;
        }

        var dist = frame.distanceFrom(playheadPosition);
        var onionMult = ((seek - dist) + 1) / seek;
        onionMult = Math.min(1, Math.max(0, onionMult));
        var opacity = onionMult * Wick.View.Layer.BASE_ONION_OPACITY;

        frame.view.objectsLayer.locked = true;
        frame.view.objectsLayer.opacity = opacity * this.model._opacity;
    }

    /**
     * Makes a path or clip the masking object on all frames.
     * @param {Wick.Path|Wick.Clip} mask
     */
    addMask(mask) {
        if (!mask) {
            this.clearMask();
            return;
        }
        this._maskUUID = mask.uuid;
        this._updateMask(mask, true);
    }

    /**
     * Removes the mask from this layer.
     */
    clearMask() {
        this._maskUUID = null;
        this.model.frames.forEach(frame => {
            if (frame.view._mask) {
                frame.view._mask.remove();
                frame.view._mask = null;
            }
            frame.view.objectsLayer.clipped = false;
        });
    }

    /**
     * Updates the mask in all frames in the layer.
     * @param {Wick.Path|Wick.Clip} mask - The masking object.
     * @param {boolean} full - If true, reclone every frame's mask item.
     * Else, sync the transforms of each frame's existing mask, and
     * clone new ones for frames that don't have one yet
     */
    _updateMask(mask, full) {
        const maskItem = mask.view.item || mask.view.group;
        const bool = this.model.project.playing;
        const isPath = maskItem.className === 'Path' || maskItem.className === 'CompoundPath';
        const homeFrame = mask.parentFrame;

        if (!homeFrame || this.model.frames.indexOf(homeFrame) === -1) {
            this.clearMask();
            return;
        }

        this.model.frames.forEach(frame => {
            let item;

            if (frame === homeFrame) {
                item = maskItem;
                frame.view._mask = null;
            } else {
                item = frame.view._mask;

                if (full || !item) {
                    item = maskItem.clone();
                    // Excluded from Frame.view's model reconciliation, so this clone never gets captured as a brand-new path.
                    item.data.wickType = 'gui';
                    frame.view._mask = item;
                } else {
                    if (isPath) item.pathData = maskItem.pathData;
                    item.matrix.set(maskItem.matrix);
                }
            }

            if (!bool) {
                if (isPath) item.fillColor = new paper.Color('#bbffe5');
                item.opacity = 0.4;
            }
            this._setClipMask(item, bool);

            var objectsLayer = frame.view.objectsLayer;
            if (objectsLayer.children[0] !== item) objectsLayer.insertChild(0, item);
            if (objectsLayer.clipped !== bool) objectsLayer.clipped = bool;
        });
    }

    /**
     * Sets an item's clipMask flag without triggering paper.js's nulling fillColor/strokeColor on enable.
     * @param {paper.Item} item
     * @param {boolean} value
     */
    _setClipMask(item, value) {
        if (item.className === 'Group') {
            if (item._clipMask !== value) {
                item._clipMask = value;
                item._changed(257);
                if (item._parent) item._parent._changed(2048);
            }
        } else {
            item.clipMask = value;
        }
    }

    /**
     * The mask on this layer.
     * @type {Wick.Path|Wick.Clip}
     */
    get mask() {
        return this._maskUUID ? Wick.ObjectCache.getObjectByUUID(this._maskUUID) : null;
    }

    set mask(mask) {
        this.addMask(mask);
    }
}
