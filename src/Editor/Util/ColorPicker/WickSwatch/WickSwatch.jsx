import React, { Component } from 'react'
import { Swatch } from '../ColorPickerComponents/ColorPickerComponents';
import tinycolor from "tinycolor2";

class WickSwatch extends Component {
    constructor (props) {
        super(props);
        this.state = {
            hovered: false,
            focused: false,
        }
    }

    setHovered = (hoverState) => {
        this.setState({
            hovered: hoverState,
        });
    }

    render () {
        let colorInfo = tinycolor(this.props.color);
        let selectedColorInfo = tinycolor(this.props.selectedColor);
        let contrastColor = colorInfo.isLight() ? '#333333' : '#CCCCCC';

        let selected = colorInfo.toHex() === selectedColorInfo.toHex();
        let selectedStyle = {
            border: '3px solid' + contrastColor
        }

        let style = {};
        if (this.state.hovered || this.state.focused) {
            style.border = "2px solid " + contrastColor;
        }
        if (selected) {
            style = selectedStyle;
        }

        return (
            <div 
                onFocus={() => {
                    this.setState({focused: true});
                }}
                onBlur={() => {
                    this.setState({focused: false});
                }}
                onMouseEnter={() => this.setHovered(true)}
                onMouseLeave={() => this.setHovered(false)}
                className="column-swatch"
                style={style}>
                <Swatch
                    color={this.props.color}
                    onClick={() => {this.props.onChangeComplete(this.props.color)}} />
            </div>
        );
    }
}

export default WickSwatch