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
const lerp = require('lerp');
const TWEEN = require('@tweenjs/tween.js');
/**
 * Class representing a tween.
 */
Wick.Tween = class extends Wick.Base {
    static get VALID_EASING_TYPES () {
        return ['none', 'in', 'out', 'in-out',
            'in-cubic', 'out-cubic', 'in-out-cubic',
            'in-quartic', 'out-quartic', 'in-out-quartic',
            'in-quintic', 'out-quintic', 'in-out-quintic',
            'in-sine', 'out-sine', 'in-out-sine',
            'in-exp', 'out-exp', 'in-out-exp',
            'in-circle', 'out-circle', 'in-out-circle',
            'in-back', 'out-back', 'in-out-back',
            'in-bounce', 'out-bounce', 'in-out-bounce', 'custom'];
    }

    /**
     * Build an easing function from a bezier path.
     * @param {object} curve - {points: [{x, y, inX, inY, outX, outY}, ...]}, from (0,0) to (1,1) with x always increasing.
     * Handles are offsets from their point (the first point has no in handle and the last no out handle).
     * Falls back to linear if missing or invalid.
     * @returns {function} A function that takes the time (0-1) and returns the progress (0-1).
     */
    static _bezierEase (curve) {
        var points = curve && curve.points;
        var valid = Array.isArray(points) && points.length >= 2 && points.every((point, i) => {
            return point && Number.isFinite(point.x) && Number.isFinite(point.y) && (i === 0 || point.x > points[i - 1].x);
        });
        if(!valid) return TWEEN.Easing.Linear.None;

        var clamp = (value, min, max) => Math.min(max, Math.max(min, value));

        var bezier = (p0, p1, p2, p3, u) => {
            var v = 1 - u;
            return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
        };

        return function (t) {
            if(t <= 0) return 0;
            if(t >= 1) return 1;

            // A segment is the stretch of curve between two neighbouring points
            var i = 0;
            while(i < points.length - 2 && t > points[i + 1].x) i++;
            var p = points[i], q = points[i + 1];

            // Keeping the handles' x between the two points means x only ever goes up along the segment
            var x1 = clamp(p.x + (p.outX || 0), p.x, q.x), y1 = p.y + (p.outY || 0);
            var x2 = clamp(q.x + (q.inX || 0), p.x, q.x), y2 = q.y + (q.inY || 0);

            var low = 0, high = 1, u = t;
            for(var n = 0; n < 30; n++) {
                u = (low + high) / 2;
                if(bezier(p.x, x1, x2, q.x, u) < t) low = u;
                else high = u;
            }

            return bezier(p.y, y1, y2, q.y, u);
        };
    }

    /**
     * Copy an ease curve so no two tweens share an object. Anything without a list of points becomes null.
     */
    static _copyEaseCurve (curve) {
        if(!curve || !Array.isArray(curve.points)) return null;
        return JSON.parse(JSON.stringify(curve));
    }

    static _calculateTimeValue (tweenA, tweenB, playheadPosition) {
        var tweenAPlayhead = tweenA.playheadPosition;
        var tweenBPlayhead = tweenB.playheadPosition;
        var dist = tweenBPlayhead - tweenAPlayhead;
        var t = (playheadPosition - tweenAPlayhead) / dist;
        return t;
    }

    /**
     * Create a tween
     * @param {number} playheadPosition - the playhead position relative to the frame that the tween belongs to
     * @param {Wick.Transform} transformation - the transformation this tween will apply to child objects
     * @param {number} fullRotations - the number of rotations to add to the tween's transformation
     */
    constructor (args) {
        if(!args) args = {};
        super(args);

        this._playheadPosition = args.playheadPosition || 1;
        this._transformation = args.transformation || new Wick.Transformation();
        this.fullRotations = args.fullRotations === undefined ? 0 : args.fullRotations;
        this.easingType = args.easingType || 'none';
        this.easeCurve = args.easeCurve || null;

        this._originalLayerIndex = -1;
    }

    /**
     * Create a tween by interpolating two existing tweens.
     * @param {Wick.Tween} tweenA - The first tween
     * @param {Wick.Tween} tweenB - The second tween
     * @param {Number} playheadPosition - The point between the two tweens to use to interpolate
     * @param {Wick.Tween} target - (Optional) An existing tween to write the result into, instead of creating a new one
     */
    static interpolate (tweenA, tweenB, playheadPosition, target) {
        var interpTween = target || new Wick.Tween();

        // Calculate value (0.0-1.0) to pass to tweening function
        var t = Wick.Tween._calculateTimeValue(tweenA, tweenB, playheadPosition);

        // The easing is the same for every attribute, so only work it out once
        var tt = tweenA._getTweenFunction()(t);

        // Interpolate every transformation attribute using the eased t value
        ["x", "y", "scaleX", "scaleY", "rotation", "shear", "opacity"].forEach(propName => {
            var valA = tweenA.transformation[propName];
            var valB = tweenB.transformation[propName];
            if(propName === 'rotation') {
                // Constrain rotation values to range of -180 to 180
                // (Disabled for now - a bug in paper.js clamps these for us)
                /*while(valA < -180) valA += 360;
                while(valB < -180) valB += 360;
                while(valA > 180) valA -= 360;
                while(valB > 180) valB -= 360;*/
                // Convert full rotations to 360 degree amounts
                valB += tweenA.fullRotations * 360;
            }
            interpTween.transformation[propName] = lerp(valA, valB, tt);
        });

        interpTween.playheadPosition = playheadPosition;
        return interpTween;
    }

    get classname () {
        return 'Tween';
    }

    _serialize (args) {
        var data = super._serialize(args);

        data.playheadPosition = this.playheadPosition;
        data.transformation = this._transformation.values;
        data.fullRotations = this.fullRotations;
        data.easingType = this.easingType;
        data.easeCurve = Wick.Tween._copyEaseCurve(this.easeCurve);

        data.originalLayerIndex = this.layerIndex !== -1 ? this.layerIndex : this._originalLayerIndex;

        return data;
    }

    _deserialize (data) {
        super._deserialize(data);

        this.playheadPosition = data.playheadPosition;
        this._transformation = new Wick.Transformation(data.transformation);
        this.fullRotations = data.fullRotations;
        this.easingType = data.easingType;
        this.easeCurve = Wick.Tween._copyEaseCurve(data.easeCurve);

        this._originalLayerIndex = data.originalLayerIndex;
    }

    /**
     * The playhead position of the tween.
     * @type {number}
     */
    get playheadPosition () {
        return this._playheadPosition;
    }

    set playheadPosition (playheadPosition) {
        this._playheadPosition = playheadPosition;
    }

    /**
     * The transformation representing the position, rotation and other elements of the tween.
     * @type {object} 
     */
    get transformation () {
        return this._transformation;
    }

    set transformation (transformation) {
        this._transformation = transformation;
    }

    /**
     * The type of interpolation to use for easing.
     * @type {string}
     */
    get easingType () {
        return this._easingType;
    }

    set easingType (easingType) {
        if(Wick.Tween.VALID_EASING_TYPES.indexOf(easingType) === -1) {
            console.warn('Invalid easingType. Valid easingTypes: ')
            console.warn(Wick.Tween.VALID_EASING_TYPES);
            return;
        }
        this._easingType = easingType;
    }

    /**
     * Remove this tween from its parent frame.
     */
    remove () {
        this.parent.removeTween(this);
    }

    /**
     * Set the transformation of a clip to this tween's transformation.
     * @param {Wick.Clip} clip - the clip to apply the tween transforms to.
     */
    applyTransformsToClip (clip) {
        clip.transformation = this.transformation.copy();
    }

    /**
     * The tween that comes after this tween in the parent frame.
     * @returns {Wick.Tween}
     */
    getNextTween () {
        if(!this.parentFrame) return null;

        var frontTween = this.parentFrame.seekTweenInFront(this.playheadPosition+1);
        return frontTween;
    }

    /**
     * Prevents tweens from existing outside of the frame's length. Call this after changing the length of the parent frame.
     */
    restrictToFrameSize () {
        var playheadPosition = this.playheadPosition;

        // Remove tween if playheadPosition is out of bounds
        if(playheadPosition < 1 || playheadPosition > this.parentFrame.length) {
            this.remove();
        }
    }

    /**
     * The index of the parent layer of this tween.
     * @type {number}
     */
    get layerIndex () {
        return this.parentLayer ? this.parentLayer.index : -1;
    }

    /**
     * The index of the layer that this tween last belonged to. Used when copying and pasting tweens.
     * @type {number}
     */
    get originalLayerIndex () {
        return this._originalLayerIndex;
    }

    /**
     * Retrieve Tween.js easing functions by name.
     * @returns {Function}
     */
    _getTweenFunction () {
        if(this.easingType === 'custom') return Wick.Tween._bezierEase(this.easeCurve);

        return {
            'none': TWEEN.Easing.Linear.None,
            'in': TWEEN.Easing.Quadratic.In,
            'out': TWEEN.Easing.Quadratic.Out,
            'in-out': TWEEN.Easing.Quadratic.InOut,
            'in-cubic': TWEEN.Easing.Cubic.In,
            'out-cubic': TWEEN.Easing.Cubic.Out,
            'in-out-cubic': TWEEN.Easing.Cubic.InOut,
            'in-quartic': TWEEN.Easing.Quartic.In,
            'out-quartic': TWEEN.Easing.Quartic.Out,
            'in-out-quartic': TWEEN.Easing.Quartic.InOut,
            'in-quintic': TWEEN.Easing.Quintic.In,
            'out-quintic': TWEEN.Easing.Quintic.Out,
            'in-out-quintic': TWEEN.Easing.Quintic.InOut,
            'in-sine': TWEEN.Easing.Sinusoidal.In,
            'out-sine': TWEEN.Easing.Sinusoidal.Out,
            'in-out-sine': TWEEN.Easing.Sinusoidal.InOut,
            'in-exp': TWEEN.Easing.Exponential.In,
            'out-exp': TWEEN.Easing.Exponential.Out,
            'in-out-exp': TWEEN.Easing.Exponential.InOut,
            'in-circle': TWEEN.Easing.Circular.In,
            'out-circle': TWEEN.Easing.Circular.Out,
            'in-out-circle': TWEEN.Easing.Circular.InOut,
            'in-back': TWEEN.Easing.Back.In,
            'out-back': TWEEN.Easing.Back.Out,
            'in-out-back': TWEEN.Easing.Back.InOut,
            'in-bounce': TWEEN.Easing.Bounce.In,
            'out-bounce': TWEEN.Easing.Bounce.Out,
            'in-out-bounce': TWEEN.Easing.Bounce.InOut,
        }[this.easingType];
    }
}
