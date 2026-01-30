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

/** Class representing a transformation. */
Wick.Transformation = class {
    /**
     * Creates a Transformation.
     * @param {number} x - The translation on the x-axis
     * @param {number} y - The translation on the y-axis
     * @param {number} scaleX - The amount of scaling on the x-axis
     * @param {number} scaleY - The amount of scaling on the y-axis
     * @param {number} rotation - Rotation, in degrees
     * @param {number} skew - Skew, in degrees
     * @param {number} opacity - Opacity, ranging from 0.0 - 1.0
     */
    constructor (args) {
        if(!args) args = {};

        this.x = args.x === undefined ? 0 : args.x;
        this.y = args.y === undefined ? 0 : args.y;
        this.scaleX = args.scaleX === undefined ? 1 : args.scaleX;
        this.scaleY = args.scaleY === undefined ? 1 : args.scaleY;
        this.rotation = args.rotation === undefined ? 0 : args.rotation;
        this.skew = args.skew === undefined ? 0 : args.skew;
        this.opacity = args.opacity === undefined ? 1 : args.opacity;
    }

    /**
     * An object containing the values of this transformation.
     */
    get values () {
        return {
            x: this.x,
            y: this.y,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            rotation: this.rotation,
            skew: this.skew,
            opacity: this.opacity,
        }
    }

    /**
     * Creates a copy of this transformation.
     * @returns {Wick.Transformation} the copied transformation.
     */
    copy () {
        return new Wick.Transformation(this.values);
    }

    /**
     * Creates a transformation using a 2D matrix.
     * @param {Array} values A list of matrix values as passed to a paper.js Matrix object.
     * @returns {Wick.Transformation}
     */
    fromMatrix (values) {
        const [a, b, c, d, tx, ty] = values;
        const rotationX = Math.atan2(b, a) * 180 / Math.PI,
              rotationY = Math.atan2(-c, d) * 180 / Math.PI,
              scaleX    = Math.sqrt(a * a + b * b),
              scaleY    = Math.sqrt(c * c + d * d);
        return new Wick.Transformation({
            x: tx,
            y: ty,
            scaleX,
            scaleY,
            rotation: rotationX,
            skew: rotationY - rotationX,
            opacity: 1
        });
    }

    /**
     * Creates a 2D matrix using this transformation.
     * @returns {Array} A list of matrix values as passed to a paper.js Matrix object.
     */
    toMatrix () {
        const {x, y, scaleX, scaleY, rotation, skew} = this;
        const rotationX = rotation * Math.PI / 180,
              rotationY = (skew + rotation) * Math.PI / 180;

        let a, b, c, d;
        if (Math.abs(rotationX) === Math.PI / 2) {
            a = 0;
            b = Math.sign(rotationX) * scaleX;
        }
        else {
            a = scaleX * Math.cos(rotationX);
            b = scaleX * Math.sin(rotationX);
        }
        if (Math.abs(rotationY) === Math.PI / 2) {
            d = 0;
            c = -Math.sign(rotationX) * scaleY;
        }
        else {
            d = scaleY * Math.cos(rotationY);
            c = -scaleY * Math.sin(rotationY);
        }
        return [a, b, c, d, x, y];
    }
}
