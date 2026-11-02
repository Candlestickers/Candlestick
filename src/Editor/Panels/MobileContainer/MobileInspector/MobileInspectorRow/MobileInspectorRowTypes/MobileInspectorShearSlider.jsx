/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react';
import MobileInspectorInput from '../MobileInspectorInput/MobileInspectorInput';
import '../_mobileinspectorrow.scss';

const HALF_RANGE = 5;


class MobileInspectorShearSlider extends Component {
  constructor(props) {
    super(props);
    const val = props.shearVal || 0;
    this.state = {
      sliderMin: val-HALF_RANGE,
      sliderMax: val+HALF_RANGE,
    };
  }

  recenter = (val) => {
    this.setState({
      sliderMin: val - HALF_RANGE,
      sliderMax: val + HALF_RANGE,
    });
  }

  render() {
    const {
      icon1, iconAlt1, tooltip1, numericVal, onNumericChange,
      icon2, iconAlt2, tooltip2, shearVal, onShearChange,
    } = this.props;
    const { sliderMin, sliderMax } = this.state;

    const idLabel1 = (tooltip1 || 'rotation').replace(/\s+/g, '-').toLowerCase();
    const idLabel2 = (tooltip2 || 'shear').replace(/\s+/g, '-').toLowerCase();

    const renderId1 = icon1
      ? <img src={icon1} alt={iconAlt1} className="mobile-inspector-row-icon" />
      : <label htmlFor={idLabel1 + '-input-mobile'} className="mobile-inspector-row-identifier">{tooltip1}</label>;

    const renderId2 = icon2
      ? <img src={icon2} alt={iconAlt2} className="mobile-inspector-row-icon" />
      : <label className="mobile-inspector-row-identifier">{tooltip2}</label>;

    return (
      <div className="mobile-inspector-row">
        {/* Left icon */}
        {renderId1}
        <div className="mobile-inspector-small-input-container">
          <MobileInspectorInput
            inputProps={{ id: idLabel1 + '-input-mobile' }}
            input={{ type: 'numeric', value: numericVal, onChange: onNumericChange }}
          />
        </div>

        {/* Right: icon + re-centering slider */}
        {renderId2}
        <div className="mobile-inspector-small-input-container">
          <MobileInspectorInput
            inputProps={{
              id: idLabel2 + '-slider-mobile',
              min: sliderMin,
              max: sliderMax,
              step: 0.1,
              onMouseUp: (e) => {
                const newVal = parseFloat(e.target.value);
                this.recenter(newVal);
              },
              onTouchEnd: () => {
                this.recenter(shearVal);
              },
            }}
            input={{ type: 'slider', value: shearVal, onChange: onShearChange }}
          />
        </div>
      </div>
    );
  }
}

export default MobileInspectorShearSlider;
