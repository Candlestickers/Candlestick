import React, { Component } from 'react'

import './_wickgradient.scss';
import  ActionButton  from 'Editor/Util/ActionButton/ActionButton';
import WickColorPicker from './WickSpectrum';
import { GradientSlider, ColorPickerInput } from 'Editor/Util/ColorPicker/ColorPickerComponents/ColorPickerComponents';
import tinycolor from 'tinycolor2';

class WickGradient extends Component {
    componentDidMount () {
        this.props.onMount();
    }
    componentWillUnmount () {
        this.props.onUnmount();
    }
    interpolateColor = (offset) => {
        const sortedStops = [...this.controlStops];
        sortedStops.sort((objectA, objectB) => objectA.offset - objectB.offset);
        if (offset <= sortedStops[0].offset) return sortedStops[0].color || '#000000';
        if (offset >= sortedStops[sortedStops.length - 1].offset) return sortedStops[sortedStops.length - 1].color || '#000000';
        let next = sortedStops.findIndex(stop => (stop.offset > offset));
        let firstStop = sortedStops[next - 1];
        let nextStop = sortedStops[next];
        let percent = (offset - firstStop.offset) / (nextStop.offset - firstStop.offset) * 100;
        return tinycolor.mix(firstStop.color || '#000000', nextStop.color || '#000000', percent).toRgbString();
    }

    controlStopMouseDown = (index) => {
        // Use onChangeComplete to sync the stops' ordering.
        this.onChangeComplete({ stopIndex: parseInt(index) });
    }
    containerMouseDown = (offset) => {
        let color = this.interpolateColor(offset.x);
        // if color is null, use black as default
        this.controlStops.push({ color: color || '#000000', offset: offset.x });
        this.onChangeComplete({ stopIndex: this.controlStops.length - 1 });
    }
    colorSelectedStop = (color) => {
        let offset = this.controlStops[this.props.selectedControlStopIndex].offset;
        this.controlStops[this.props.selectedControlStopIndex] = { color, offset };
    }
    offsetSelectedStop = (offset) => {
        let color = this.controlStops[this.props.selectedControlStopIndex].color || '#000000';
        this.controlStops[this.props.selectedControlStopIndex] = { color, offset };
    }
    deleteSelectedStop = () => {
        let stopIndex = this.props.selectedControlStopIndex;
        if (this.controlStops.length <= 2) {
            this.colorSelectedStop(this.controlStops[1 - stopIndex].color);
            stopIndex = 1 - stopIndex;
        }
        else {
            this.controlStops.splice(stopIndex, 1);
            if (stopIndex >= this.controlStops.length) {
                stopIndex = this.controlStops.length - 1;
            }
        }
        this.onChangeComplete({ stopIndex });
    }
    gradientObject = () => ({
        stops: this.controlStops,
        origin: this.origin,
        destination: this.destination,
        radial: this.radial
    })
    onChangeIntermediate = () => this.props.onChangeIntermediate(this.gradientObject());
    onChangeComplete = (args) => this.props.onChangeComplete(this.gradientObject(), args);
    onChangeEndpoint = (endpoint, override) => {
        if (typeof override.x === 'number') {
            endpoint.x = override.x * this.props.bounds.width + this.props.bounds.left;
        }
        if (typeof override.y === 'number') {
            endpoint.y = override.y * this.props.bounds.height + this.props.bounds.top;
        }
        this.onChangeComplete();
    }
    onChangeRadial = (radial) => {
        this.radial = radial;
        this.onChangeComplete();
    }
    renderHeader = () => {
        return (
            <div className="wick-color-picker-header">
                <div className="wick-color-picker-action-button">
                    <ActionButton
                        color="tool"
                        id="color-picker-gradient-linear-button"
                        tooltip="Linear"
                        action={ () => this.onChangeRadial(false) }
                        isActive={ () => !this.radial }
                        icon="linear" />
                </div>
                <div className="wick-color-picker-action-button spacer">
                    <ActionButton
                        color="tool"
                        id="color-picker-gradient-radial-button"
                        tooltip="Radial"
                        action={ () => this.onChangeRadial(true) }
                        isActive={ () => this.radial }
                        icon="radial" />
                </div>
            </div>
        );
    }
    renderGradientBackground () {
        let linearGradient = 'linear-gradient(to right';
        const sortedControlStops = [...this.controlStops];
        sortedControlStops.sort((objectA, objectB) => objectA.offset - objectB.offset);
        sortedControlStops.forEach(controlStopObject => {
            linearGradient += `, ${controlStopObject.color || '#000000'} ${controlStopObject.offset * 100}%`
        });
        linearGradient += ')';
        return linearGradient;
    }
    renderGradientInfo () {
        // Normalize the gradient endpoints to the selection bounds
        let originX = (this.origin.x - this.props.bounds.left) / this.props.bounds.width,
            originY = (this.origin.y - this.props.bounds.top) / this.props.bounds.height,
            destinationX = (this.destination.x - this.props.bounds.left) / this.props.bounds.width,
            destinationY = (this.destination.y - this.props.bounds.top) / this.props.bounds.height;
        let selectedStop = this.controlStops[this.props.selectedControlStopIndex],
            offset = selectedStop ? selectedStop.offset : 0;
        return (
            <div className="wick-color-picker-gradient-fields">
                <div className="wick-color-picker-gradient-fields-row">
                    <ColorPickerInput className="wick-color-picker-gradient-field wick-color-picker-field-start-x"
                        labelBefore="Start X"
                        type="numeric"
                        value={originX}
                        onChange={x => this.onChangeEndpoint(this.origin, { x })} />
                    <ColorPickerInput className="wick-color-picker-gradient-field wick-color-picker-field-start-y"
                        labelBefore="Start Y"
                        type="numeric"
                        value={originY}
                        onChange={y => this.onChangeEndpoint(this.origin, { y })} />
                </div>
                <div className="wick-color-picker-gradient-fields-row">
                    <ColorPickerInput className="wick-color-picker-gradient-field wick-color-picker-field-end-x"
                        labelBefore="End X"
                        type="numeric"
                        value={destinationX}
                        onChange={x => this.onChangeEndpoint(this.destination, { x })} />
                    <ColorPickerInput className="wick-color-picker-gradient-field wick-color-picker-field-end-y"
                        labelBefore="End Y"
                        type="numeric"
                        value={destinationY}
                        onChange={y => this.onChangeEndpoint(this.destination, { y })} />
                </div>
                <div className="wick-color-picker-gradient-fields-row">
                    <ColorPickerInput className="wick-color-picker-gradient-field wick-color-picker-field-stop-offset"
                        labelBefore="Offset"
                        type="numeric"
                        value={offset}
                        min={0}
                        max={1}
                        onChange={offset => {
                            this.offsetSelectedStop(offset);
                            this.onChangeComplete();
                        }} />
                    <ActionButton
                        color="red"
                        id="color-picker-gradient-delete-stop"
                        action={this.deleteSelectedStop}
                        text="Delete Stop"
                        icon="delete" />
                </div>
            </div>
        )
    }

    render () {
        this.controlStops = [...this.props.color.stops];
        this.origin = {...this.props.color.origin};
        this.destination = {...this.props.color.destination};
        this.radial = this.props.color.radial;

        return (
            <>
                {this.renderHeader()}
                <GradientSlider
                    getHoverColor={offset => this.interpolateColor(offset)}
                    containerDown={this.containerMouseDown}
                    controlStopDown={this.controlStopMouseDown}
                    onMouseMove={offset => { this.offsetSelectedStop(offset.x); this.onChangeIntermediate(); }}
                    onMouseUp={() => this.onChangeComplete()}
                    stops={this.controlStops}
                    pointerProps={{ selectedStop: this.props.selectedControlStopIndex }}
                    background={this.renderGradientBackground()} />
                {this.renderGradientInfo()}
                {this.props.colorHeader}
                <WickColorPicker {...this.props}
                    onChangeIntermediate={color => { this.colorSelectedStop(color); this.onChangeIntermediate(); }}
                    onChangeComplete={color => { this.colorSelectedStop(color); this.onChangeComplete({ stopColor: color }); }}
                    color={this.controlStops[this.props.selectedControlStopIndex].color || new window.Wick.Color('#000000')} />
            </>
        );
    }
}

export default WickGradient;