import React, { Component } from "react";

import './_colorpickercomponents.scss';
import WickCustomSlider from './WickCustomSlider';
import WickInput from "../../WickInput/WickInput";

export const CHECKERBOARD_URL = `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAPUlEQVR4AeySywkAMAhDH52h+0/YIRoH8IMnD0JyCgSe5gA3sWJfVuCnhWQLYMYNnr4VOdzJDAQR9LUI8AEAAP//ViLpiAAAAAZJREFUAwBk7gjBheCOvgAAAABJRU5ErkJggg==")`;

function GradientControlStop (props) {
    let active = (props.selectedStop === props.stopIndex) ? ' wick-color-picker-gradient-active' : '';
    let colorOpaque = props.color;
    if (props.color.includes('rgba')) {
        // rgba(R, G, B, A) -> rgb(R, G, B)
        colorOpaque.replace('rgba', 'rgb');
        colorOpaque = colorOpaque.substring(0, colorOpaque.lastIndexOf(',')) + ')';
    }
    return (
        <div className={`wick-color-picker-gradient-stop${active} ${props.className}`}
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
            style={props.style}
            data-wick-pointer-index={props.stopIndex}>
                <div className={`wick-color-picker-gradient-arrow${active}`} />
                <div className={`wick-color-picker-gradient-color${active}`}>
                    <Checkerboard className="wick-color-picker-gradient-checker"
                        style={{ borderColor: colorOpaque }}
                        color={props.color}>
                        <div style={{ backgroundColor: colorOpaque }} />
                    </Checkerboard>
                </div>
        </div>
    );
}
export function GradientSlider (props) {
    return (
        <WickCustomSlider className="wick-color-picker-gradient-slider"
            getHoverColor={props.getHoverColor}
            onMouseDownContainer={props.containerDown}
            onMouseDownPointer={props.controlStopDown}
            onMouseMove={props.onMouseMove}
            onMouseUp={props.onMouseUp}
            pointerComponent={GradientControlStop}
            pointerProps={props.pointerProps}
            pointers={props.stops}
            pointersDirection={'x'}
            style={{
                container: { backgroundImage: `${props.background}, ${CHECKERBOARD_URL}` }
            }} />
    );
}

function WickControlPointer (props) {
    return (
        <div className="wick-color-picker-pointer"
            onMouseDown={props.onMouseDown}
            style={{
                backgroundColor: props.color,
                ...props.style
            }} />
    );
}
function ColorSlider (props) {
    let onMouseMove = offset => props.onChangeIntermediate(props.calculateColor(offset));
    let onMouseUp = offset => props.onChangeComplete(props.calculateColor(offset));
    return (
        <WickCustomSlider className={`wick-color-picker-slider ${props.className}`}
            onMouseDownContainer={onMouseMove}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            pointerComponent={WickControlPointer}
            pointers={props.pointers}
            pointersDirection={props.pointersDirection}
            style={props.style} />
    );
}
export function ColorPickerInput (props) {
    let { label, labelBefore, ...otherProps } = props;
    return (
        <label className={`wick-color-picker-input-label ${props.className}`}>
            {labelBefore}
            <WickInput {...otherProps}
                className={`wick-color-picker-input-field`}
                name="wick-color-picker-input-field" />
            {label}
        </label>
    );
}

export class Saturation extends Component {
    calculateColor = offset => {
        let saturation = offset.x;
        let lightness = 1 - offset.y;
        return { h: this.props.h, s: saturation, v: lightness, a: this.props.a }
    }
    renderStyle = () => {
        return {
            container: {
                backgroundColor: `hsl(${this.props.h}, 100%, 50%)`,
                backgroundImage: 'linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, rgba(255, 255, 255, 0))'
            }
        }
    }
    render () {
        let color = this.props.colorObject.toRgb();
        color = `rgb(${color.r}, ${color.g}, ${color.b})`;
        return (
            <ColorSlider className="wick-color-picker-saturation"
                calculateColor={this.calculateColor}
                pointers={[{ color, x: this.props.s, y: 1 - this.props.v }]}
                style={this.renderStyle()}
                {...this.props} />
        );
    }
}
export class Hue extends Component {
    calculateColor = offset => {
        let hue = offset.x * 360;
        return { h: hue, s: this.props.s, v: this.props.v, a: this.props.a }
    }
    render () {
        let color = `hsl(${this.props.h}, 100%, 50%)`;
        return (
            <ColorSlider className="wick-color-picker-bar wick-color-picker-hue"
                calculateColor={this.calculateColor}
                pointers={[{ color, offset: this.props.h / 360 }]}
                pointersDirection='x'
                {...this.props} />
        );
    }
}
export class Alpha extends Component {
    calculateColor = offset => {
        let alpha = offset.x;
        return { h: this.props.h, s: this.props.s, v: this.props.v, a: alpha }
    }

    renderStyle = () => {
        // 8px is pointer radius
        let { r, g, b } = this.props.colorObject.toRgb();
        return {
            container: {
                backgroundColor: '#fff',
                backgroundImage: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0) 8px, rgb(${r}, ${g}, ${b}) calc(100% - 8px)),
                    ${CHECKERBOARD_URL}`
            }
        }
    }
    render () {
        // Mimic transparent against a white background
        let color = this.props.colorObject.toHsl();
        let newLight = 1 + color.a * (color.l - 1);
        color = `hsl(${color.h}, ${color.s * 100}%, ${newLight * 100}%)`;
        return (
            <ColorSlider className="wick-color-picker-bar wick-color-picker-alpha"
                calculateColor={this.calculateColor}
                pointers={[{ color, offset: this.props.a }]}
                pointersDirection='x'
                style={this.renderStyle()}
                {...this.props} />
        );
    }
}
export class Fields extends Component {
    cleanUpHex = hex => {
        let newHex = hex;
        if (hex[0] === '#') {
            // Accept format #RRGGBB
            newHex = hex.substring(1);
        }
        if (newHex.length > 6) {
            // Remove alpha value RRGGBBAA
            newHex = newHex.substring(0,6);
        }
        return newHex;
    }
    isValidRGB = value => {
        if (!/^\d+$/.test(value)) return false;
        let newValue = parseInt(value, 10);
        return 0 <= newValue && newValue < 256;
    }
    render () {
        const rgba = this.props.colorObject.toRgb();
        return (
            <div className="wick-color-picker-fields">
                <ColorPickerInput className="wick-color-picker-field-hex"
                    label="Hex"
                    type="text"
                    value={this.props.colorObject.toHex()}
                    isValidRegex={/#?[\dA-F]{6}/i}
                    cleanUp={this.cleanUpHex}
                    onChange={hex => this.props.onChange({ hex })} />
                <ColorPickerInput className="wick-color-picker-field-r"
                    label="R"
                    type="text"
                    value={rgba.r.toString()}
                    isValid={this.isValidRGB}
                    onChange={r => this.props.onChange({ r })} />
                <ColorPickerInput className="wick-color-picker-field-g"
                    label="G"
                    type="text"
                    value={rgba.g.toString()}
                    isValid={this.isValidRGB}
                    onChange={g => this.props.onChange({ g })} />
                <ColorPickerInput className="wick-color-picker-field-b"
                    label="B"
                    type="text"
                    value={rgba.b.toString()}
                    isValid={this.isValidRGB}
                    onChange={b => this.props.onChange({ b })} />
                {!this.props.disableAlpha && <ColorPickerInput className="wick-color-picker-field-a"
                    label="A"
                    type="numeric"
                    value={rgba.a * 100}
                    min={0}
                    max={100}
                    onChange={a => this.props.onChange({ a: a / 100 })} />}
            </div>
        );
    }
}

export function Checkerboard (props) {
    let { className, style, color, ...otherProps } = props;
    return (
        <div {...otherProps}
            className={`wick-color-picker-checkerboard ${className}`}
            style={{ backgroundImage: CHECKERBOARD_URL, ...style }}>
            <div style={{ backgroundColor: color }} />
            {props.children}
        </div>
    );
}
export function Swatch (props) {
    return (
        <Checkerboard className="wick-color-picker-swatch-checker"
            title={props.color}
            tabIndex="0"
            onClick={props.onClick}
            onKeyDown={e => (e.key === "Enter" && props.onClick())}
            color={props.color} />
    );
}