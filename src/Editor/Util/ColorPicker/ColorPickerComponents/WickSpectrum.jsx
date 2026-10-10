import React, { Component } from 'react'

import tinycolor from 'tinycolor2';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';

import './_wickspectrum.scss';
import WickSwatch from 'Editor/Util/ColorPicker/WickSwatch/WickSwatch';
import { Saturation, Hue, Alpha, Fields, Checkerboard, Swatch } from 'Editor/Util/ColorPicker/ColorPickerComponents/ColorPickerComponents';

class WickColorPicker extends Component {
    constructor () {
        super();

        this.values = {
            h: 0,
            s: 0,
            v: 0,
            a: 1
        }
        this.color = tinycolor(this.values);
    }
    onChangeIntermediate = (values) => {
        this.values = values;
        this.color = tinycolor(values);
        this.props.onChangeIntermediate(this.color.toRgbString());
    }
    onChangeComplete = (values) => {
        this.values = values;
        this.color = tinycolor(values);
        this.props.onChangeComplete(this.color.toRgbString());
    }
    onChangeFields = (input) => {
        let newInput;
        if (input.hex) {
            newInput = input.hex;
        }
        else {
            // Input is of the form { r, g, b, a }
            newInput = Object.assign(this.color.toRgb(), input);
        }
        this.color = tinycolor(newInput);
        this.values = this.color.toHsv();
        this.props.onChangeComplete(this.color.toRgbString());
    }
    
    renderSwatchColumn = (colorList, i) => {
        return (
            <div key={"swatch-color-column-" + i} className="wick-swatch-picker-column">
                {colorList.map((color,i) => {
                    return (
                        <WickSwatch
                            color={color}
                            onChangeComplete={this.props.onChangeComplete}
                            selectedColor={this.props.color}
                            key={"swatch-color-"+color+"-"+i} />
                    );
                })}
            </div>
        );
    }

    renderSwatchbook = (colors) => {
        return (
            <div className="wick-swatch-picker-book">
                {colors.map((colorList, i) => {
                    return (this.renderSwatchColumn(colorList, i));
                })}
            </div>
        );
    }

    renderSwatches = () => {
        let colors = [
            ["#ff0000","#ffcccc","#ff9999","#ff4d4d","#cc0000","#800000"],
            ["#ff8000","#ffe6cc","#ffcc99","#ffa64d","#cc6600","#804000"],
            ["#ffff00","#ffffcc","#ffff99","#ffff4d","#cccc00","#808000"],
            ["#00ff00","#ccffcc","#99ff99","#4dff4d","#00cc00","#008000"],
            ["#00ff80","#ccffe6","#99ffcc","#4dffa6","#00cc66","#008040"],
            ["#00ffff","#ccffff","#99ffff","#4dffff","#00cccc","#008080"],
            ["#0080ff","#cce6ff","#99ccff","#4da6ff","#0066cc","#004080"],
            ["#0000ff","#ccccff","#9999ff","#4d4dff","#0000cc","#000080"],
            ["#8000ff","#e6ccff","#cc99ff","#a64dff","#6600cc","#400080"],
            ["#ff00ff","#ffccff","#ff99ff","#ff4dff","#cc00cc","#800080"],
            ["#ff0080","#ffcce6","#ff99cc","#ff4da6","#cc0066","#800040"],
            ["#000000","#ffffff","#cccccc","#999999","#666666","#333333"]
        ]

        return (
            <div className="wick-swatch-color-picker-body">
                {this.renderSwatchbook(colors)}
            </div>
        );
    }



    renderHeader () {
        return (
            <div className="wick-color-picker-header">
                <div className="wick-color-picker-action-button">
                    <ActionButton
                        color="tool"
                        id="color-picker-swatches-button"
                        tooltip="Swatches"
                        action={() => {this.props.changeColorPickerType("swatches")}}
                        isActive={ () => this.props.colorPickerType === "swatches" }
                        icon="swatches" />
                </div>
                <div className="wick-color-picker-action-button spacer">
                    <ActionButton
                        color="tool"
                        id="color-picker-spectrum-button"
                        tooltip="Spectrum"
                        action={() => {this.props.changeColorPickerType("spectrum")}}
                        isActive={ () => this.props.colorPickerType === "spectrum" }
                        icon="spectrum" />
                </div>
                <div className="color-picker-control-div">
                    <div id="btn-color-picker-close">
                        <ActionButton color="tool" icon="closemodal" action={this.props.toggle}/>
                    </div>
                </div>
            </div>
        );
    }


    renderSwatchContainer = (colors) => {
        return (
            <div className="wick-color-picker-swatches-container">
                {colors.map((color, i) => {
                    return (
                        <div
                            key={"color-swatch-" + color + "-" + i}
                            className="wick-color-picker-small-swatch">
                            <Swatch
                                color={color}
                                style={{default: {}, ":focus": {outline: "2px solid white"}}}
                                onClick={() => {this.props.onChangeComplete(color)}} />
                        </div>
                    );
                })}
            </div>
        );
    }

    renderSpectrum = () => {
        // let colors = ['#D0021B', '#F8E71C', '#7ED321', '#4A90E2', '#000000', '#4A4A4A', '#FFFFFF', '#FFFFFF00']
        let lastUsedColorsDefaults = ["#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000"]
        let lastColors = this.props.lastColorsUsed || lastUsedColorsDefaults;
        return (
            <div className="wick-color-picker-spectrum">
                <Saturation {...this.values}
                    onChangeIntermediate={this.onChangeIntermediate}
                    onChangeComplete={this.onChangeComplete}
                    colorObject={this.color} />
                <div className="wick-color-picker-control-body">
                    <div id="btn-color-picker-dropper">
                        <ActionButton
                            icon="eyedropper"
                            id="color-picker-eyedropper"
                            tooltip="Eyedropper"
                            color="tool"
                            action={this.openEyedropper} />
                    </div>
                    <div id="wick-color-picker-bar-container">
                        <Hue {...this.values}
                            onChangeIntermediate={this.onChangeIntermediate}
                            onChangeComplete={this.onChangeComplete}
                            colorObject={this.color} />
                        <Alpha {...this.values}
                            onChangeIntermediate={this.onChangeIntermediate}
                            onChangeComplete={this.onChangeComplete}
                            colorObject={this.color} />
                    </div>
                    <Checkerboard className="wick-color-picker-color-block-container"
                        color={this.color.toRgbString()} />
                </div>
                <Fields
                    onChange={this.onChangeFields}
                    colorObject={this.color}
                    disableAlpha={this.props.disableAlpha}
                    aria-label="color options" />
                {/*this.renderSwatchContainer(colors)*/}
                {this.renderSwatchContainer(lastColors)}
            </div>
        );
    }

    render () {
        let inputColor = tinycolor(this.props.color);
        if (!tinycolor.equals(inputColor, this.color)) {
            this.values = inputColor.toHsv();
            this.color = inputColor;
        }
        return (this.props.colorPickerType === "spectrum") ? this.renderSpectrum() : this.renderSwatches();
    }

    openEyedropper = () => {
        window.editor.setActiveTool('eyedropper');
        window.editor._onEyedropperPickedColor = this.props.onChangeComplete;
    }
}

export default WickColorPicker;