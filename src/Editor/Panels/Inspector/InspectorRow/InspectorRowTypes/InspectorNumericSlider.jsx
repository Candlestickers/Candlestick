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

import InspectorInput from 'Editor/Panels/Inspector/InspectorRow/InspectorInput/InspectorInput';
import ToolIcon from 'Editor/Util/ToolIcon/ToolIcon';

import '../_inspectorrow.scss';

class InspectorNumericSlider extends Component {
  render() {
    let idLabel = this.props.tooltip.replace(/\s+/g, '-').toLowerCase();
    const hasLabel = !!this.props.label;
    const hasReset = !!this.props.onReset;

    return(
      <div className="inspector-row">
        {/* Identifier — icon left-aligned, optional short label beside it */}
        <label
          htmlFor={idLabel + "-input"}
          className="inspector-row-identifier"
          style={this.props.icon
            ? (hasLabel
                ? { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingRight: '2px' }
                : { justifyContent: 'center', alignItems: 'flex-end' })
            : undefined}>
          {this.props.icon
            ? <div style={{ height: '18px', width: '18px', flexShrink: 0 }}><ToolIcon name={this.props.icon} /></div>
            : null}
          {hasLabel && (
            <span style={{ fontSize: '11px', marginLeft: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {this.props.label}
            </span>
          )}
          {!this.props.icon && !hasLabel && this.props.tooltip}
        </label>

        {/* Numeric input */}
        <div className="inspector-small-input-container">
          <InspectorInput
            inputProps={{id: idLabel + "-input"}}
            input={
              {type: "numeric",
              value: this.props.val,
              onChange: this.props.onChange}
            } />
        </div>

        {/* Slider + optional reset button */}
        <div className="inspector-medium-input-container" style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, height: '100%' }}>
            <InspectorInput
              inputProps={{...this.props.inputProps, id: idLabel + "-input"}}
              input={
                {type: "slider",
                 value: this.props.val,
                 onChange: this.props.onChange}
              } />
          </div>
          {hasReset && (
            <button
              onClick={this.props.onReset}
              title="Reset to default"
              style={{
                background: 'none',
                border: 'none',
                padding: '0 2px 0 4px',
                cursor: 'pointer',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                opacity: 0.55,
                flexShrink: 0,
              }}>
              <div style={{ height: '16px', width: '16px' }}><ToolIcon name="undo" /></div>
            </button>
          )}
        </div>
      </div>
    );
  }
}

export default InspectorNumericSlider
