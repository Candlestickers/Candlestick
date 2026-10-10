import React, { Component } from 'react'

import ActionButton from 'Editor/Util/ActionButton/ActionButton';

import './_wickcolorpicker.scss';
import WickGradient from 'Editor/Util/ColorPicker/ColorPickerComponents/WickGradient';
import WickSpectrum from 'Editor/Util/ColorPicker/ColorPickerComponents/WickSpectrum';

class WickGradientColorPicker extends Component {
    constructor (props) {
        super(props);

        this.state = {
            colorOnDrag: null
        };
        this.editLastColors = false;
        // Used to preserve color when switching solid/gradient
        this.lastReceivedColor = null;
        this.outOfSync = false;
    }
    componentWillUnmount () {
        this.outOfSync = false;
        this.props.onDesyncedChange(this.props.color);
    }

    onChangeIntermediate = (color) => {
        this.props.onChangeIntermediate && this.props.onChangeIntermediate(color);
        this.setState({ colorOnDrag: color });
    }
    onColorChange = (color) => {
        this.props.onChangeComplete(color);
        if (this.props.updateLastColors) {
            this.props.updateLastColors(color, this.editLastColors);
            this.editLastColors = true;
        }
        this.setState({ colorOnDrag: null });
    }
    onGradientChange = (color, args) => {
        // Set null gradient stops to black
        for(let stop of color.stops) {
            if(!stop.color) stop.color = '#000000';
        }

        // Sort color stops, keep the selected stop
        let index;
        if (args && typeof args.stopIndex === 'number') {
            index = args.stopIndex;
        }
        else {
            index = this.props.getSelectedStopIndex();
        }
        let selectedStop = color.stops[index];
        color.stops.sort((stop1, stop2) => stop1.offset - stop2.offset);
        let newIndex = color.stops.indexOf(selectedStop);
        if (newIndex < 0) newIndex = 0;

        this.props.setSelectedStopIndex(newIndex);
        this.props.onChangeComplete(color);

        if (args && args.stopColor) {
            this.props.updateLastColors(args.stopColor, this.editLastColors);
            this.editLastColors = true;
        }
        this.setState({
            colorOnDrag: null
        });
    }
    switchSolid = (color) => {
        // Exit if color isn't a gradient
        if (!color.stops) return;
        this.props.onDesyncedChange(color.stops[0].color);
        this.outOfSync = true;
    }
    switchGradient = (color) => {
        // Exit if color is a gradient
        if (color.stops) return;
        if (this.props.color.stops || (this.props.color.gradient && this.props.color.gradient.stops)) {
            // If props.color is already a gradient, use that color
            this.outOfSync = false;
            this.props.onDesyncedChange(this.props.color);
            return;
        }

        let x = 0, topY = 0, bottomY = 500;
        if (this.props.selectedObjectsBounds) {
            x = this.props.selectedObjectsBounds.centerX;
            topY = this.props.selectedObjectsBounds.top;
            bottomY = this.props.selectedObjectsBounds.bottom;
        }

        this.props.onDesyncedChange({
            origin: {x, y: topY},
            destination: {x, y: bottomY},
            stops: [{color, offset: 0}, {color, offset: 1}],
            radial: false
        });
        this.outOfSync = true;
    }

    // Convert paper objects to plain objects that hold the same data
    reducePaperColor (color) {
        if (!(color instanceof window.paper.Color)) return color;

        if (!color.gradient) return color.toCSS();

        let stops = color.gradient.stops.map((stop, index, stops) => {
            let color = stop.color.toCSS();
            let offset = stop.offset;
            if (typeof offset !== 'number') {
                offset = index / (stops.length - 1);
            }
            return { color, offset };
        });
        let { origin, destination } = color;
        origin = { x: origin.x, y: origin.y };
        destination = { x: destination.x, y: destination.y };
        return { stops, origin, destination, radial: color.gradient.radial };
    }
    reducePaperBounds (bounds) {
        if (!(bounds instanceof window.paper.Rectangle)) return bounds;

        let { width, height, left, right, top, bottom } = bounds;
        return { width, height, left, right, top, bottom };
    }

    renderGradientHeader (color) {
        return (
            <>
                <div>
                    <ActionButton
                        color="tool"
                        id="color-picker-solid-button"
                        action={() => this.switchSolid(color)}
                        isActive={ () => !color.stops }
                        text="Solid" />
                </div>
                <div>
                    <ActionButton
                        color="tool"
                        id="color-picker-gradient-button"
                        action={() => this.switchGradient(color)}
                        isActive={ () => !!color.stops }
                        text="Gradient" />
                </div>
            </>
        );
    }
    renderColorHeader () {
        return (
            <>
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
            </>
        );
    }
    renderHeader (color) {
        return (
            <div className="wick-color-picker-header">
                {this.props.enableGradient ? this.renderGradientHeader(color) : this.renderColorHeader()}
                <div className="color-picker-control-div">
                    <div id="btn-color-picker-close">
                        <ActionButton color="tool" icon="closemodal" action={this.props.toggle} />
                    </div>
                </div>
            </div>
        );
    }

    render () {
        if (this.props.color !== this.lastReceivedColor) {
            this.lastReceivedColor = this.props.color;
            this.outOfSync = false;
        }
        let color = this.outOfSync ? this.props.desyncedColor : this.props.color;
        let index = 0;
        if (this.state.colorOnDrag !== null) {
            color = this.state.colorOnDrag;
        }
        else {
            color = this.reducePaperColor(color);
        }
        if (color.stops) {
            index = this.props.getSelectedStopIndex();
            index = Math.min(index, color.stops.length - 1);
        }
        let bounds = this.reducePaperBounds(this.props.selectedObjectsBounds);

        // Fixes bug where canvas gradient tool disappears on undo
        if (color.stops) {
            this.props.setGradientActive(index);
        }
        return (
            <div className="wick-color-picker">
                {this.renderHeader(color)}
                {color.stops ?
                <WickGradient {...this.props}
                    colorHeader={
                        <div className="wick-color-picker-header">
                            {this.renderColorHeader()}
                        </div>
                    }
                    selectedControlStopIndex={index}
                    onMount={this.props.setGradientActive}
                    onUnmount={this.props.setGradientInactive}
                    onChangeIntermediate={this.onChangeIntermediate}
                    onChangeComplete={this.onGradientChange}
                    color={color}
                    bounds={bounds} /> :
                <>
                    {this.props.enableGradient &&
                    <div className="wick-color-picker-header">
                        {this.renderColorHeader()}
                    </div>
                    }
                    <WickSpectrum {...this.props}
                        onChangeIntermediate={this.onChangeIntermediate}
                        onChangeComplete={this.onColorChange}
                        color={color} />
                </>
                }
            </div>
        );
    }
}

export default WickGradientColorPicker;