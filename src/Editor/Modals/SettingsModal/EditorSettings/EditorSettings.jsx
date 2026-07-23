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

import './_editorsettings.scss';
import WickInput from 'Editor/Util/WickInput/WickInput';

import iconBackwards from 'resources/timeline-icons/backwards.svg';
import iconForwards from 'resources/timeline-icons/forwards.svg';
import iconFramesSmall from 'resources/timeline-icons/framesSmall.png';
import iconFramesNormal from 'resources/timeline-icons/framesNormal.png';
import iconFramesLarge from 'resources/timeline-icons/framesLarge.png';
import iconGapFillMenuBlankFrames from 'resources/timeline-icons/gapFillMenuBlankFrames.png';
import iconGapFillMenuExtendFrames from 'resources/timeline-icons/gapFillMenuExtendFrames.png';

class EditorSettings extends Component {
  constructor () {
    super();

    this.state = {
      clipboardMode: localStorage.getItem('CandleClipboardMode') || 'wick',
      frameSizeMode: localStorage.getItem('wickEditorFrameSizeMode') || 'normal',
      fillGapsMethod: localStorage.getItem('wickEditorFillGapsMethod') || 'auto_extend',
    }
  }

  render () {
    let optionsLabels = [];
    let options = this.props.getToolSettingRestrictions('onionSkinStyle').options;
    for (let i = 0; i < options.length; i++) {
      optionsLabels.push({label: options[i], value: options[i]});
    }

    const clipboardOptions = [
      { label: 'Wick Clipboard Only',     value: 'wick'   },
      { label: 'Device & Wick Clipboard', value: 'device' },
    ];

    return (
      <div className="editor-settings-modal-body">
        <div className="editor-settings-group">
          <label htmlFor="clipboard-mode" className="editor-settings-group-title">Clipboard</label>
            Mode:
            <WickInput
              type="select"
              id="clipboard-mode"
              value={this.state.clipboardMode}
              options={clipboardOptions}
              onChange={(val) => {
                this.setState({ clipboardMode: val.value });
                localStorage.setItem('CandleClipboardMode', val.value);
              }}
            />
        </div>

        <div className="editor-settings-group">
          <label htmlFor="onion-skin-style" className="editor-settings-group-title">Onion Skinning</label>
            Style:
            <WickInput
              type="select"
              id="onion-skin-style"
              value={this.props.getToolSetting('onionSkinStyle')}
              options={optionsLabels}
              onChange={(val) => {this.props.setToolSetting('onionSkinStyle', val.value)}}
            />
          {
            this.props.getToolSetting('onionSkinStyle') !== 'standard' &&
            <div className="editor-settings-row">
              Outline Colors:
              <div className="editor-settings-color-containers-row">
                <div className="editor-settings-color-container">
                  <img className="forward-backward-icon" alt="B:" src={iconBackwards}/>

                  <WickInput
                  type="color"
                  id="editor-settings-backward-color-picker"
                  disableAlpha={true}
                  placement={'bottom'}
                  color={this.props.getToolSetting('backwardOnionSkinTint').rgba}
                  onChange={(color) => {this.props.setToolSetting('backwardOnionSkinTint', new window.Wick.Color(color))}}
                  colorPickerType={this.props.colorPickerType}
                  changeColorPickerType={this.props.changeColorPickerType}
                  updateLastColors={this.props.updateLastColors}
                  lastColorsUsed={this.props.lastColorsUsed} />
                </div>

                <div className="editor-settings-color-container">
                  <img className="forward-backward-icon" alt="F:" src={iconForwards}/>

                  <WickInput
                  type="color"
                  id="editor-settings-forward-color-picker"
                  disableAlpha={true}
                  placement={'bottom'}
                  color={this.props.getToolSetting('forwardOnionSkinTint').rgba}
                  onChange={(color) => {this.props.setToolSetting('forwardOnionSkinTint', new window.Wick.Color(color))}}
                  colorPickerType={this.props.colorPickerType}
                  changeColorPickerType={this.props.changeColorPickerType}
                  updateLastColors={this.props.updateLastColors}
                  lastColorsUsed={this.props.lastColorsUsed} />
                </div>
              </div>
            </div>
          }

        </div>

        <div className="editor-settings-group">
          <label className="editor-settings-group-title">Timeline</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img alt="" src={
              this.state.frameSizeMode === 'small' ? iconFramesSmall :
              this.state.frameSizeMode === 'large' ? iconFramesLarge :
              iconFramesNormal
            } style={{ height: '18px' }}/>
            Frame Size:
          </div>
          <WickInput
            type="select"
            value={this.state.frameSizeMode}
            options={[
              { label: 'Small',  value: 'small'  },
              { label: 'Normal', value: 'normal' },
              { label: 'Large',  value: 'large'  },
            ]}
            onChange={(val) => {
              const mode = val.value;
              this.setState({ frameSizeMode: mode });
              localStorage.setItem('wickEditorFrameSizeMode', mode);
              if (window.Wick && window.Wick.GUIElement) {
                if (mode === 'small') {
                  window.Wick.GUIElement.GRID_DEFAULT_CELL_WIDTH  = window.Wick.GUIElement.GRID_SMALL_CELL_WIDTH;
                  window.Wick.GUIElement.GRID_DEFAULT_CELL_HEIGHT = window.Wick.GUIElement.GRID_SMALL_CELL_HEIGHT;
                } else if (mode === 'large') {
                  window.Wick.GUIElement.GRID_DEFAULT_CELL_WIDTH  = window.Wick.GUIElement.GRID_LARGE_CELL_WIDTH;
                  window.Wick.GUIElement.GRID_DEFAULT_CELL_HEIGHT = window.Wick.GUIElement.GRID_LARGE_CELL_HEIGHT;
                } else {
                  window.Wick.GUIElement.GRID_DEFAULT_CELL_WIDTH  = window.Wick.GUIElement.GRID_NORMAL_CELL_WIDTH;
                  window.Wick.GUIElement.GRID_DEFAULT_CELL_HEIGHT = window.Wick.GUIElement.GRID_NORMAL_CELL_HEIGHT;
                }
              }
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <img alt="" src={
              this.state.fillGapsMethod === 'blank_frames'
                ? iconGapFillMenuBlankFrames
                : iconGapFillMenuExtendFrames
            } style={{ height: '18px' }}/>
            Gap Fill:
          </div>
          <WickInput
            type="select"
            value={this.state.fillGapsMethod}
            options={[
              { label: 'Extend Frames', value: 'auto_extend'  },
              { label: 'Blank Frames',  value: 'blank_frames' },
            ]}
            onChange={(val) => {
              const method = val.value;
              this.setState({ fillGapsMethod: method });
              localStorage.setItem('wickEditorFillGapsMethod', method);
              if (this.props.project && this.props.project.activeTimeline) {
                this.props.project.activeTimeline.fillGapsMethod = method;
              }
            }}
          />
        </div>
      </div>
    )
  }
}

export default EditorSettings
