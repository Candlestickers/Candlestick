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
import './_inspector.scss';
import './_inspectorselector.scss';
import 'bootstrap/dist/css/bootstrap.min.css';

import InspectorTitle from './InspectorTitle/InspectorTitle';

import InspectorNumericSlider from './InspectorRow/InspectorRowTypes/InspectorNumericSlider';
import InspectorTextInput from './InspectorRow/InspectorRowTypes/InspectorTextInput';
import InspectorNumericInput from './InspectorRow/InspectorRowTypes/InspectorNumericInput';
import InspectorDualNumericInput from './InspectorRow/InspectorRowTypes/InspectorDualNumericInput';
import InspectorSelector from './InspectorRow/InspectorRowTypes/InspectorSelector';
import InspectorColorNumericInput from './InspectorRow/InspectorRowTypes/InspectorColorNumericInput';
import InspectorActionButton from './InspectorActionButton/InspectorActionButton';
import InspectorImagePreview from './InspectorPreview/InspectorPreviewTypes/InspectorImagePreview';
import InspectorSoundPreview from './InspectorPreview/InspectorPreviewTypes/InspectorSoundPreview';
import InspectorScriptWindow from './InspectorScriptWindow/InspectorScriptWindow';
import InspectorCheckbox from './InspectorRow/InspectorRowTypes/InspectorCheckbox';

import localForage from 'localforage';
import { toast } from 'react-toastify';

import { Console, Hook, Unhook } from 'console-feed';
import InspectorBrush, { BRUSH_SHAPES, DEFAULT_BRUSHES } from './InspectorBrush/InspectorBrush';
import { drawBrushPreview } from './InspectorBrush/InspectorBrushPreview';
// import { useEffect, useState } from 'react';

window.EditorGradientColorSwapState = false;

class Inspector extends Component {
  constructor (props) {
    super(props);

    this.state = {
      logs: [],
      showBrushModes: false,
      showNewBrushMenu: false,
      isEditingBrush: false,
      savedBrushes: DEFAULT_BRUSHES,
      selectedBrushIndex: null,
      customShapes: [],
      removedShapes: [],
    };

    this.handleConsoleLog = (log) => {
      this.setState((state) => ({
        logs: [...state.logs, log]
      }));
    };

    /**
     * Which render function should be used for each selection type?
     */
    this.inspectorContentRenderFunctions = {
      "frame": this.renderFrame,
      "layer": this.renderLayer,
      "multiframe": this.renderMultiFrame,
      "tween": this.renderTween,
      "multitween": this.renderMultiTween,
      "clip": this.renderClip,
      "button": this.renderButton,
      "path": this.renderPath,
      "text": this.renderText,
      "image": this.renderImage,
      "multipath": this.renderMultiPath,
      "multiclip": this.renderMultiClip,
      "multitimeline": this.renderMultiTimeline,
      "multicanvas": this.renderMultiCanvas,
      "imageasset": this.renderAsset,
      "soundasset": this.renderAsset,
      "fontasset": this.renderAsset,
      "clipasset": this.renderAsset,
      "multiassetmixed": this.renderAsset,
      "multisoundasset": this.renderAsset,
      "multiimageasset": this.renderAsset,
    }

    /**
     * Which actions should be shown for which selection types.
     */
    this.actionRules = {
      'breakApart': ["clip", "button",],
      'convertSelectionToButton': ["path", "text", "image", "multipath", "multiclip", "multicanvas"],
      'convertSelectionToClip': ["path", "text", "image", "multipath", "multiclip", "multicanvas"],
      'editTimeline': ["clip", "button"],
      'addAssetToCanvas': ["imageasset", "clipasset"],
      // 'alignX': [ "multipath"] // H.A.
    }

    /**
     * What titles should be displayed for each selection type?
     */
    this.inspectorTitles = {
      "frame": "Frame",
      "multiframe": "Multi-Frame",
      "tween": "Tween",
      "multitween": "Multi-Tween",
      "clip": "Clip",
      "button": "Button",
      "path": "Path",
      "text": "Text",
      "image": "Image",
      "multipath": "Multi-Path",
      "multiclip": "Multi-Clip",
      "multitimeline": "Multi-Timeline",
      "multicanvas": "Multi-Canvas",
      "imageasset": "Image Asset",
      "soundasset": "Sound Asset",
      "fontasset": "Font Asset",
      "clipasset": "Clip Asset",
      "multiassetmixed": "Multi-Asset",
      "multisoundasset": "Multi-Asset Sound",
      "multiimageasset": "Multi-Asset Image",
      "unknown": "", // <-- note to self, this is the state when nothing is selected
    }
  }

  brushPreviewRef = React.createRef();
  brushFileInputRef = React.createRef();

  componentDidMount() {
    Hook(window.console, this.handleConsoleLog, false);
    if (this.props.activeTool === 'brush') drawBrushPreview(this.brushPreviewRef.current, {
      getToolSetting: this.props.getToolSetting,
      snapshotCurrentSettings: settings => {
        this._lastPreviewSettings = settings;
      },
      getThisRenderSeq: () => (this._previewSeq = (this._previewSeq || 0) + 1),
      thisRenderStale: seq => (this._previewSeq !== seq)
    });
    localForage.getItem('WICK.CUSTOM_SHAPES').then(shapes => {
      if (shapes && Array.isArray(shapes)) {
        this.setCustomShapes(shapes);
      }
    });
    localForage.getItem('WICK.REMOVED_SHAPES').then(removed => {
      if (removed && Array.isArray(removed)) {
        this.setState({ removedShapes: removed });
      }
    });
    localForage.getItem('WICK.BRUSHPRESETS').then(saved => {
      const brushes = (saved && Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_BRUSHES;
      localForage.getItem('WICK.BRUSHPRESETS.selectedIndex').then(idx => {
        const validIdx = (typeof idx === 'number' && idx >= 0 && idx < brushes.length) ? idx : null;
        // Restore visual selection only — ToolSettings already restores each
        // individual setting (brushSize, brushResolution, etc.) from its own
        // localforage keys, so calling applyBrush here would race and overwrite them.
        this.setState({ savedBrushes: brushes, selectedBrushIndex: validIdx });
      });
    });
  }
  componentWillUnmount() {
    Unhook(window.console);
  }

  componentDidUpdate(prevProps,prevState) { // no need to pass in prevProps, react automatically inputs it

    if(window.project.playing && this.consoleEndRef.current) {
      this.consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    if (this.props.activeTool === 'brush') {
      const justSwitchedToBrush = prevProps.activeTool !== 'brush';
      if (justSwitchedToBrush) this._lastPreviewSettings = null;
      const keys = [
        'brushResolution', 'brushSpacing', 'brushScatterAmount',
        'brushRotationMode', 'brushRotationOffset', 'brushShape'
      ];
      const last = this._lastPreviewSettings;
      const currColor = this.props.getToolSetting('fillColor');
      const colorChanged = !last || (currColor && currColor.rgba) !== last.fillColorRgba;
      const settingChanged = !last || keys.some(k => this.props.getToolSetting(k) !== last[k]);
      if (colorChanged || settingChanged) drawBrushPreview(this.brushPreviewRef.current, {
        getToolSetting: this.props.getToolSetting,
        snapshotCurrentSettings: settings => {
          this._lastPreviewSettings = settings;
        },
        getThisRenderSeq: () => (this._previewSeq = (this._previewSeq || 0) + 1),
        thisRenderStale: seq => (this._previewSeq !== seq)
      });
    }

  }

  /**
   * Returns the value of a requested selection attribute.
   * @param  {string} attribute Selection attribute to retrieve.
   * @return {string|number|undefined} Value of the selection attribute to retrieve. Returns undefined is attribute does not exist.
   */
  getSelectionAttribute = (attribute) => {
    if (attribute === 'fillColorOpacity') {
      return this.getSelectionFillColorOpacity();
    }

    return this.props.getAllSelectionAttributes()[attribute];
  }

  /**
   * Returns the selection fill color opacity.
   * @return {string} fill color opacity from 0 to 1.
   */
  getSelectionFillColorOpacity = () => {
    let color = this.getSelectionAttribute('fillColor');
    if (color instanceof window.paper.Color && color.gradient) {
      let maxOpacity = color.gradient.stops.reduce((total, stop) => stop.color.alpha > total ? stop.color.alpha : total, 0);
      return maxOpacity;
    }
    return color.alpha;
  }

  /**
   * Sets the value of the selection fillColor opacity.
   * @param  {string} attribute Selection attribute to retrieve.
   */
  setSelectionFillColorOpacity = (value) => {
    var color = this.getSelectionAttribute('fillColor');
    if (color instanceof window.paper.Color && color.gradient) {
      let maxOpacity = color.gradient.stops.reduce((total, stop) => stop.color.alpha > total ? stop.color.alpha : total, 0);
      if (maxOpacity === 0) {
        color.gradient.stops.forEach(stop => {
          stop.color.alpha = value;
        });
      }
      else {
        let changeFactor = value / maxOpacity;
        color.gradient.stops.forEach(stop => {
          stop.color.alpha *= changeFactor;
        });
      }

    }
    else {
      color.alpha = value;
      this.setSelectionAttribute('fillColor', color);
    }
  }

  /**
   * Updates the value of a selection attribute for the selected item in the editor.
   * @param {string} attribute Name of the attribute to update.
   * @param {string|number} newValue  New value of the attribute to update.
   */
  setSelectionAttribute = (attribute, newValue) => {
    if (attribute === 'fillColorOpacity') {
      return this.setSelectionFillColorOpacity(newValue);
    }
    this.props.setSelectionAttribute(attribute, newValue);
  }

  /**
   * Updates the value of a selection attribute without adding to the undo stack.
   * @param {string} attribute Name of the attribute to update.
   * @param {string|number} newValue  New value of the attribute to update.
   */
  setSelectionAttributeIntermediate = (attribute, newValue) => {
    if (attribute === 'fillColorOpacity') {
      return this.setSelectionFillColorOpacity(newValue);
    }
    this.props.project.selection[attribute] = newValue;
    this.props.project.view.render();
    this.props.project.guiElement.draw();
  }

  // Inspector Row Types

  /**
   * Renders an inspector row allowing viewing and editing of the selection stroke width.
   */
  renderSelectionStrokeWidth = () => {
    return (
      <InspectorNumericSlider
        tooltip="Stroke Width"
        val={this.getSelectionAttribute('strokeWidth')}
        onChange={(val) => this.setSelectionAttribute('strokeWidth', val)}
        divider={false}
        inputProps={this.getSelectionInputProps('strokeWidth')}
        id="inspector-selection-stroke-width"/>
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection fill color.
   */
  renderSelectionColor = () => {
    return (
      <div className="inspector-item">
        <InspectorColorNumericInput
          tooltip1="Fill"
          tooltip2="Opacity"
          val1={this.getSelectionAttribute('fillColor')}
          onChange1={(col) => this.setSelectionAttribute('fillColor', col)}
          onChangeIntermediate1={(col) => this.setSelectionAttributeIntermediate('fillColor', col)}
          enableGradient={true}
          selectionProps={{
            getSelection: () => this.props.project.selection,
            renderSelection: () => this.props.project.view.render(),
            targetCanvas: this.props.project.view._svgCanvas
          }}
          id={"inspector-selection-fill-color"}
          val2={this.getSelectionAttribute('fillColorOpacity')}
          onChange2={(val) => this.setSelectionAttribute('fillColorOpacity', val)}
          divider={false}
          colorPickerType={this.props.colorPickerType}
          changeColorPickerType={this.props.changeColorPickerType}
          updateLastColors={this.props.updateLastColors}
          lastColorsUsed={this.props.lastColorsUsed}
        />
        <InspectorColorNumericInput
          tooltip1="Stroke"
          tooltip2="Weight"

          val1={this.getSelectionAttribute('strokeColor')}
          onChange1={(col) => this.setSelectionAttribute('strokeColor', col)}
          onChangeIntermediate1={(col) => this.setSelectionAttributeIntermediate('strokeColor', col)}
          enableGradient={true}
          selectionProps={{
            getSelection: () => this.props.project.selection,
            renderSelection: () => this.props.project.view.render(),
            targetCanvas: this.props.project.view._svgCanvas
          }}
          id={"inspector-selection-stroke-color"}
          stroke={true}

          val2={this.getSelectionAttribute('strokeWidth')}
          onChange2={(val) => this.setSelectionAttribute('strokeWidth', val)}
          divider={false}
          colorPickerType={this.props.colorPickerType}
          changeColorPickerType={this.props.changeColorPickerType}
          updateLastColors={this.props.updateLastColors}
          lastColorsUsed={this.props.lastColorsUsed}
        />
      </div>
    );
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selected object's font.
   */
  renderFontFamily = () => {
    let opts = this.props.fontInfoInterface.allFontNames;

    let getFontClass = (font) => {
      let fontClass = 'font-selector-' + font.split(" ").join("-");
      let existingClass = this.props.fontInfoInterface.isExistingFont(font) ? ' existing-font' : '';
      return fontClass + existingClass;
    };

    opts = opts.map(opt => {
      return {
        value: opt,
        label: opt,
        className: getFontClass(opt),
      }
    });

    return (
      <InspectorSelector
        className="font-family"
        value={this.getSelectionAttribute('fontFamily')}
        tooltip="Font Family"
        type="select"
        isSearchable={true}
        options={opts}
        onChange={(val) => {
          let font = val.value;

          // Don't fetch the file if we already have it.
          if (this.props.fontInfoInterface.hasFont(val.value)) {
            this.setSelectionAttribute('fontFamily', font);
            return;
          }

          // Fetch the file if it's missing.
          this.props.fontInfoInterface.getFontFile({
            font: font,
            callback: blob => {
                var file = new File([blob], font+'.ttf', {type:'font/ttf'});
                this.props.importFileAsAsset(file, () => {
                  this.setSelectionAttribute('fontFamily', font)
                });
            },
            error: error => {
              console.error(error)
            }
          });

        }}>
        </InspectorSelector>
    )
  }

  renderFontStyle = () => {
    let options = [{value: 'normal', label: 'normal'}, {value: 'italic', label: 'italic'}]
    return (
      <InspectorSelector
        tooltip="Style"
        type="select"
        isSearchable={true}
        value={this.getSelectionAttribute('fontStyle')}
        options={options}
        onChange={(val) => {
          this.setSelectionAttribute('fontStyle', val.value);
        }} />
    )
  }

  renderFontWeight = () => {
    let fontWeights = [
      {label: 'thin', value: 100},
      {label: 'extra light', value: 200},
      {label: 'light', value: 300},
      {label: 'normal', value: 400},
      {label: 'medium', value: 500},
      {label: 'semi bold', value: 600},
      {label: 'bold', value: 700},
      {label: 'extra bold', value: 800},
      {label: 'black', value: 900},
    ];

    let weight = Math.min(Math.max(this.getSelectionAttribute('fontWeight'), 100), 900);

    return (
      <InspectorSelector
        tooltip="Weight"
        type="select"
        isSearchable={true}
        value={weight}
        options={fontWeights}
        onChange={(val) => {
          let newWeight = val.value || 400;
          this.setSelectionAttribute('fontWeight', newWeight);
        }} />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection font size.
   */
  renderFontSize = () =>  {
    return (
      <InspectorNumericInput
        tooltip="Font Size"
        val={this.getSelectionAttribute('fontSize')}
        onChange={(val) => this.setSelectionAttribute('fontSize', val)} />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's name.
   */
  renderName = () => {
    return (
      <div className="inspector-item">
        <InspectorTextInput
          tooltip="Name"
          val={this.getSelectionAttribute('name')}
          onChange={(val) => {this.setSelectionAttribute('name', val);}}
          placeholder="no_name"
          id="inspector-name" />
      </div>
    );
  }

  /**
   * Renders an inspector row allowing viewing and editing of a selection's identifier
   */
  renderIdentifier = () => {
    return (
      <div className="inspector-item">
        <InspectorTextInput
          tooltip="Name"
          val={this.getSelectionAttribute('identifier')}
          onChange={(val) => {this.setSelectionAttribute('identifier', val);}}
          placeholder="no_name"
          id="inspector-name" />
      </div>
    );
  }

  /**
   * Renders an inspector row allowing viewing of the selection's file name.
   */
  renderFilename = () => {
    return (
      <div className="inspector-item">
        <InspectorTextInput
          tooltip="File"
          val={this.getSelectionAttribute('filename')}
          readOnly={true}
          id="inspector-file-name"/>
      </div>
    );
  }

  /**
   * Renders an inspector row allowing viewing of the selection's src image.
   */
  renderAssetPreview = () => {
    let selectionType = this.props.getSelectionType();
    if(selectionType === 'imageasset') {
      return (
        <InspectorImagePreview
          src={this.getSelectionAttribute('src')}
          id="inspector-image-preview" />
      );
    } else if (selectionType === 'soundasset') {
      return (
        <InspectorSoundPreview
          src={this.getSelectionAttribute('src')}
          id="inspector-sound-preview" />
      );
    }
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's frame length.
   */
  renderFrameLength = () => {
    return (
      <div className="inspector-item">
        <InspectorNumericInput
          tooltip="Length"
          val={this.getSelectionAttribute('frameLength')}
          onChange={(val) => this.setSelectionAttribute('frameLength', val)}
          id="inspector-frame-length" />
      </div>
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's x y position.
   */
  renderPosition = () => {
    return (
      <InspectorDualNumericInput
        tooltip1="Origin X"
        tooltip2="Origin Y"
        val1={this.getSelectionAttribute('originX')}
        val2={this.getSelectionAttribute('originY')}
        onChange1={(val) => this.setSelectionAttribute('originX', val)}
        onChange2={(val) => this.setSelectionAttribute('originY', val)}
        id="inspector-origin" />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's origin x y position.
   */
  renderOrigin = () => {
    return (
      <InspectorDualNumericInput
        tooltip1="X"
        tooltip2="Y"
        val1={this.getSelectionAttribute('x')}
        val2={this.getSelectionAttribute('y')}
        onChange1={(val) => this.setSelectionAttribute('x', val)}
        onChange2={(val) => this.setSelectionAttribute('y', val)}
        id="inspector-position" />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's width and height.
   */
  renderSize = () => {
    return (
      <InspectorDualNumericInput
        tooltip1="Width"
        tooltip2="Height"
        val1={this.getSelectionAttribute('width')}
        val2={this.getSelectionAttribute('height')}
        onChange1={(val) => this.setSelectionAttribute('width', val)}
        onChange2={(val) => this.setSelectionAttribute('height', val)}
        id="inspector-size" />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's scaleX and scaleY.
   */
  renderScale = () => {
    return (
      <InspectorDualNumericInput
        tooltip1="Scale W"
        tooltip2="Scale H"
        val1={this.getSelectionAttribute('scaleX')}
        val2={this.getSelectionAttribute('scaleY')}
        onChange1={(val) => this.setSelectionAttribute('scaleX', val)}
        onChange2={(val) => this.setSelectionAttribute('scaleY', val)}
        id="inspector-scale" />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's rotation.
   */
  renderRotation = () => {
    return (
      <InspectorNumericInput
        tooltip="Rotation"
        val={this.getSelectionAttribute('rotation')}
        onChange={(val) => this.setSelectionAttribute('rotation', val)}
        id="inspector-rotation" />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's shear.
   */
  renderShear = () => {
    return (
      <InspectorNumericInput
        tooltip="Shear"
        val={this.getSelectionAttribute('shear')}
        onChange={(val) => this.setSelectionAttribute('shear', val)}
        id="inspector-shear" />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's pivot x y position.
   */
  renderPivot = () => {
    var { x, y } = this.getSelectionAttribute('relativePivot');
    return (
      <InspectorDualNumericInput
        tooltip1="Pivot X"
        tooltip2="Pivot Y"
        val1={x}
        val2={y}
        onChange1={(val) => this.setSelectionAttribute('relativePivot', {x: val, y})}
        onChange2={(val) => this.setSelectionAttribute('relativePivot', {x, y: val})}
        id="inspector-pivot" />
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of the selection's opacity.
   */
  renderOpacity = () => {
    return (
      <InspectorNumericSlider
        tooltip="Opacity"
        val={this.getSelectionAttribute('opacity')}
        onChange={(val) => this.setSelectionAttribute('opacity', val)}
        divider={false}
        inputProps={{min: 0, max: 1, step: 0.01}}
        id="inspector-opacity"/>
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of all transformation properties
   * icluding position, scale, size, rotation and opacity.
   */
  renderSelectionTransformProperties = () => {
    return (
      <div className="inspector-item">
        {this.renderPosition()}
        {this.renderOrigin()}
        {this.renderSize()}
        {this.renderScale()}
        {this.renderRotation()}
        {this.renderShear()}
        {this.renderPivot()}
        {this.renderOpacity()}
      </div>
    )
  }

  /**
   * Renders an inspector row allowing viewing and editing of sound assets attached to the
   * current object.
   */
  renderSelectionSoundAsset = () => {
    let options = [{
      value: null,
      label: "No Sound"
    }]

    let mapAsset = asset => {
      if (!asset) {
        return {
          value: "novalue",
          label: "No Sound",
        }
      }
      return {
        value: asset,
        label: asset.name,
      }
    }

    options = options.concat(this.props.getAllSoundAssets().map(mapAsset));

    let value = this.getSelectionAttribute('sound');
    return (
      <InspectorSelector
        tooltip="Sound"
        type="select"
        options={options}
        value={value}
        isSearchable={true}
        onChange={(val) => {this.setSelectionAttribute('sound', val.value)}} />
    );
  }

  renderSelectionSoundVolume = () => {
    return (
      <InspectorNumericInput
        tooltip="Volume"
        val={this.getSelectionAttribute('soundVolume')}
        onChange={(val) => {this.setSelectionAttribute('soundVolume', val)}}
        id="inspector-sound-volume" />
    )
  }

  renderSelectionSoundStart = () => {
    return (
      <InspectorNumericInput
        tooltip="Start (ms)"
        type="numeric"
        val={this.getSelectionAttribute('soundStart')}
        onChange={(val) => {this.setSelectionAttribute('soundStart', val)}} />
    )
  }

  renderSoundContent = () => {
    return (
      <div className="inspector-item">
        {this.renderSelectionSoundAsset()}
        {this.getSelectionAttribute('sound') && this.renderSelectionSoundVolume()}
        {this.getSelectionAttribute('sound') && this.renderSelectionSoundStart()}
      </div>
    )
  }

  renderAnimationType = () => {
    return (
      <div className="inspector-item">
        <InspectorSelector
          tooltip="Animation"
          type="select"
          options={this.props.getClipAnimationTypes()}
          value={this.getSelectionAttribute('animationType')}
          isSearchable={true}
          onChange={(val) => {this.setSelectionAttribute('animationType', val.value)}} />
          {
            this.getSelectionAttribute('singleFrameNumber') &&
            <InspectorNumericInput
            tooltip="Frame"
            val={this.getSelectionAttribute('singleFrameNumber')}
            onChange={(val) => this.setSelectionAttribute('singleFrameNumber', val)} />
          }
        {this.getSelectionAttribute('animationType') !== "single" &&
        <InspectorCheckbox
          tooltip="Synced" 
          checked={this.getSelectionAttribute('isSynced')}
          onChange={(val) => this.setSelectionAttribute('isSynced', !this.getSelectionAttribute('isSynced'))}/>}
      </div>
    )
  }

  renderTweenEasingType = () => {
    let options = window.Wick.Tween.VALID_EASING_TYPES;
    let optionLabels = [];
    options.forEach((option) => {
      optionLabels.push({label: option, value: option});
    })
    return (
      <div className="inspector-item">
        <InspectorSelector
          tooltip="Easing Type"
          type="select"
          options={optionLabels}
          value={this.getSelectionAttribute('easingType')}
          isSearchable={true}
          onChange={(val) => {this.setSelectionAttribute('easingType', val.value)}} />
      </div>
    );
  }

  renderTweenFullRotations = () => {
    return (
      <div className="inspector-item">
        <InspectorNumericInput
          tooltip="Full Rotations"
          val={this.getSelectionAttribute('fullRotations')}
          onChange={(val) => this.setSelectionAttribute('fullRotations', val)}
          id="inspector-full-rotation" />
      </div>
    );
  }

  // Selection contents and properties

  /**
   * Renders the inspector view for all properties of a frame.
   */
  renderFrame = () => {
    return (
        <div className="inspector-content">
          {this.renderIdentifier()}
          {this.renderFrameLength()}
          {this.renderSoundContent()}
        </div>
    );
  }

  /**
   * Renders the inspector view for all properties of a layer.
   */
  renderLayer = () => {
    return  (
      <div className="inspector-content">
        {this.renderName()}
        {this.renderOpacity()}
      </div>
    )
  }

  /**
   * Renders the inspector view for all properties of a multi-frame selection.
   */
  renderMultiFrame = () => {
    return ( <div className="inspector-content" /> );
  }

  /**
   * Renders the inspector view for all properties of a multi-clip selection.
   */
  renderMultiClip = () => {
    return ( <div className="inspector-content">
      {this.renderSelectionTransformProperties()}
      </div> );
  }

  /**
   * Renders the inspector view for all properties of a tween selection.
   */
  renderTween = () =>  {
    return (
      <div className="inspector-content">
        {this.renderTweenEasingType()}
        {this.renderTweenFullRotations()}
      </div>
     );
  }

  /**
   * Renders the inspector view for all properties of a multi-tween selection.
   */
  renderMultiTween = () => {
    return ( <div className="inspector-content">
      {this.renderTweenEasingType()}
      {this.renderTweenFullRotations()}
    </div> );
  }

  /**
   * Renders the inspector view for all properties of a selection with group properties.
   */
  renderGroupContent = () => {
    return (
      <div className="inspector-content">
        {this.renderIdentifier()}
        {this.renderSelectionTransformProperties()}
      </div>
    );
  }

  /**
   * Renders the inspector view for all properties of a group selection.
   */
  renderGroup = () => {
    return ( this.renderGroupContent() );
  }

  /**
   * Renders the inspector view for all properties of a multi-group selection.
   */
  renderMultiGroup = () => {
    return ( this.renderGroupContent() );
  }

  /**
   * Renders the inspector view for all properties of a clip selection.
   */
  renderClip = () => {
    return ( this.renderGroupContent() );
  }

  /**
   * Renders the inspector view for all properties of a button selection.
   */
  renderButton = () => {
    return ( this.renderGroupContent() );
  }

  renderFontContent = () => {
    return (
      <div className="inspector-item">
        {this.renderFontFamily()}
        {this.renderFontStyle()}
        {this.renderFontWeight()}
        {this.renderFontSize()}
      </div>
    )
  }

  /**
   * Renders the inspector view for all properties of a selection with path properties.
   */
  renderPathContent = () => {
    return(
      <div className="inspector-content">
        {this.renderSelectionTransformProperties()}
        {this.renderSelectionColor()}
      </div>
    )

  }

  /**
   * Renders the inspector view for all properties of a path selection.
   */
  renderPath = () => {
    return ( this.renderPathContent() );
  }

  /**
   * Renders the inspector view for all text properties.
   */
  renderText = () => {
    return (
      <div className="inspector-content">
        {this.renderIdentifier()}
        {this.renderSelectionTransformProperties()}
        {this.renderSelectionColor()}
        {this.renderFontContent()}
      </div>
    )
  }

  /**
   * Renders the inspector view for clip animation type.
   */
  renderAnimationSetting = () => {
    return (
      <div className="inspector-content">
        {this.renderAnimationType()}
      </div>
    );
  }

  /**
   * Renders the inspector view for all image properties.
   */
  renderImage = () => {
    return (
      <div className="inspector-content">
        {this.renderSelectionTransformProperties()}
      </div>
    )
  }

  /**
   * Renders the inspector view for all properties of a multi-path selection.
   */
  renderMultiPath = () => {
    return (
      <div className="inspector-content">
        {this.renderSelectionTransformProperties()}
        {this.renderSelectionColor()}
        {this.getSelectionAttribute('fontFamily') && this.renderFontContent()}
      </div>
    );
  }

  /**
   * Renders the inspector view for all properties of a multi-canvas selection.
   */
  renderMultiCanvas = () => {
    return ( this.renderSelectionTransformProperties() )
  }

  /**
   * Renders the inspector view for all properties of a multi-timeline selection.
   */
  renderMultiTimeline = () => {
    return (
      <div>
      </div>
    )
  }

  /**
   * Renders the inspector view for all properties of an asset selection.
   */
  renderAsset = () => {
    return (
      <div className="inspector-content">
        {this.renderName()}
        {this.renderFilename()}
        {this.renderAssetPreview()}
      </div>
    )
  }

  setCustomShapes = (shapes) => {
    // Register with engine so _buildBrushTipCanvas can find them
    window.wickCustomBrushShapes = window.wickCustomBrushShapes || {};
    shapes.forEach(cs => { window.wickCustomBrushShapes[cs.id] = cs; });
    this.setState({ customShapes: shapes });
  }
  addCustomShape = (shape) => {
    window.wickCustomBrushShapes = window.wickCustomBrushShapes || {};
    window.wickCustomBrushShapes[shape.id] = shape;
    const updatedCustomShapes = [...this.state.customShapes, shape];
    localForage.setItem('WICK.CUSTOM_SHAPES', updatedCustomShapes);
    this.setState({ customShapes: updatedCustomShapes });
  }
  removeCustomShape = (shape) => {
    if (window.wickCustomBrushShapes) delete window.wickCustomBrushShapes[shape];
    const updatedCustomShapes = this.state.customShapes.filter(cs => cs.id !== shape);
    this.setState({ customShapes: updatedCustomShapes });
    localForage.setItem('WICK.CUSTOM_SHAPES', updatedCustomShapes);
  }

  toggleBrushModes = () => {
    this.setState({ showBrushModes: !this.state.showBrushModes });
  }

  closeBrushModes = () => {
    this.setState({ showBrushModes: false });
  }

  toggleNewBrushMenu = () => {
    this.setState({ showNewBrushMenu: !this.state.showNewBrushMenu });
  }

  closeNewBrushMenu = () => {
    this.setState({ showNewBrushMenu: false });
  }

  startNewBrush = () => {
    this._captureEditSnapshot();
    this.setState({ selectedBrushIndex: null, isEditingBrush: true, showNewBrushMenu: false });
  }

  importBrush = () => {
    if (this.brushFileInputRef.current) this.brushFileInputRef.current.click();
  }

  handleBrushFileImport = (e) => {
    const input = this.brushFileInputRef.current;
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const brush = JSON.parse(ev.target.result);
        if (!brush || typeof brush !== 'object') throw new Error('Invalid');
        // If brush has an embedded custom shape, register it with a fresh ID
        let resolvedShape = brush.shape || 'circle';
        if (brush.shapeData && brush.shapeData.pathD) {
          const newId = 'custom_' + Date.now();
          const newShape = { ...brush.shapeData, id: newId };
          resolvedShape = newId;
          this.addCustomShape(newShape);
        }
        // FIXME: these "default" values are in 3 places (search for this same comment)
        const newBrush = {
          name: brush.name || fileName.replace(/\.cbrush$/i, '') || 'Imported Brush',
          shape: resolvedShape,
          brushSize: brush.brushSize ?? 10,
          brushResolution: brush.brushResolution ?? 1,
          brushSpacing: brush.brushSpacing ?? 0.2,
          brushScatterAmount: brush.brushScatterAmount ?? 0,
          brushRotationMode: brush.brushRotationMode ?? 'fixed',
          brushRotationOffset: brush.brushRotationOffset ?? 0,
          brushStabilizerWeight: brush.brushStabilizerWeight ?? 20,
          fillColorRgba: brush.fillColorRgba || '#000000',
        };
        const updated = [...this.state.savedBrushes, newBrush];
        const newIndex = updated.length - 1;
        this.setState({ savedBrushes: updated, selectedBrushIndex: newIndex });
        localForage.setItem('WICK.BRUSHPRESETS', updated);
        localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', newIndex);
        this.applyBrush(newBrush);
      } catch (err) {
        toast.warning('Could not import brush file.', {
          position: 'top-right', autoClose: 3000, hideProgressBar: true,
          closeOnClick: true, pauseOnHover: true, draggable: true,
          className: 'warning-toast-background', bodyClassName: 'warning-toast-body',
        });
      }
      // Reset so the same file can be re-imported
      if (input) input.value = '';
    };
    reader.readAsText(file);
  }

  exportBrush = (brush) => {
    if (!brush) return;
    const exportData = { ...brush };
    // Embed custom shape data so it can be re-imported on another machine
    if (brush.shape && brush.shape.startsWith('custom_')) {
      const shapeData = this.state.customShapes.find(cs => cs.id === brush.shape);
      if (shapeData) exportData.shapeData = shapeData;
    }
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (brush.name || 'brush') + '.cbrush';
    a.click();
    URL.revokeObjectURL(url);
  }

  deleteSelectedShape = () => {
    const shape = this.props.getToolSetting('brushShape');
    if (!shape) return;
    // Block deletion if any saved preset uses this shape
    const inUse = this.state.savedBrushes.some(b => b.shape === shape);
    if (inUse) {
      toast.warning('This shape is still being used by a brush.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'warning-toast-background',
        bodyClassName: 'warning-toast-body',
        progressClassName: 'warning-toast-progress',
      });
      return;
    }
    const { customShapes, removedShapes } = this.state;
    // Build the current available shape list to find the next one to select
    const allAvailable = [
      ...BRUSH_SHAPES.filter(s => !removedShapes.includes(s.id)),
      ...customShapes,
    ];
    if (allAvailable.length <= 1) return; // never delete the last shape
    const currentIdx = allAvailable.findIndex(s => s.id === shape);
    const nextIdx = currentIdx > 0 ? currentIdx - 1 : 1;
    const nextShape = allAvailable[nextIdx] || allAvailable[0];

    if (shape.startsWith('custom_')) {
      this.removeCustomShape(shape);
    } else {
      // Add to removedShapes (built-in shapes are hidden, not truly deleted)
      const updatedRemoved = [...removedShapes, shape];
      this.setState({ removedShapes: updatedRemoved });
      localForage.setItem('WICK.REMOVED_SHAPES', updatedRemoved);
    }
    // Select and apply the next shape
    this.props.setToolSetting('brushShape', nextShape.id);
  }

  deleteSelectedBrush = () => {
    const { savedBrushes, selectedBrushIndex } = this.state;
    if (selectedBrushIndex === null) return;
    if (savedBrushes.length <= 1) return; // keep at least one preset
    const updated = savedBrushes.filter((_, i) => i !== selectedBrushIndex);
    const newIndex = Math.min(selectedBrushIndex, updated.length - 1);
    this.setState({ savedBrushes: updated, selectedBrushIndex: newIndex });
    localForage.setItem('WICK.BRUSHPRESETS', updated);
    localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', newIndex);
    // Apply the newly selected brush
    this.applyBrush(updated[newIndex]);
  }

  saveBrush = () => {
    const { savedBrushes, selectedBrushIndex } = this.state;
    const brushData = {
      name: selectedBrushIndex !== null ? savedBrushes[selectedBrushIndex].name : `Brush ${savedBrushes.length + 1}`,
      shape:             this.props.getToolSetting('brushShape'),
      brushSize:         this.props.getToolSetting('brushSize'),
      brushResolution:   this.props.getToolSetting('brushResolution'),
      brushSpacing:      this.props.getToolSetting('brushSpacing'),
      brushScatterAmount:   this.props.getToolSetting('brushScatterAmount'),
      brushRotationMode:    this.props.getToolSetting('brushRotationMode'),
      brushRotationOffset:  this.props.getToolSetting('brushRotationOffset'),
      brushStabilizerWeight: this.props.getToolSetting('brushStabilizerWeight'),
      fillColorRgba: (() => { try { return this.props.getToolSetting('fillColor').rgba; } catch(e) { return '#000000'; } })(),
    };
    if (selectedBrushIndex !== null) {
      const updated = [...savedBrushes];
      updated[selectedBrushIndex] = brushData;
      this.setState({ savedBrushes: updated, isEditingBrush: false });
      localForage.setItem('WICK.BRUSHPRESETS', updated);
      localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', selectedBrushIndex);
    } else {
      const newIndex = savedBrushes.length;
      const updated = [...savedBrushes, brushData];
      this.setState({ savedBrushes: updated, selectedBrushIndex: newIndex, isEditingBrush: false });
      localForage.setItem('WICK.BRUSHPRESETS', updated);
      localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', newIndex);
    }
  }

  applyBrush = (brush) => {
    this.props.setToolSetting('brushShape', brush.shape);
    this.props.setToolSetting('brushSize', brush.brushSize);
    this.props.setToolSetting('brushResolution', brush.brushResolution);
    this.props.setToolSetting('brushSpacing', brush.brushSpacing);
    this.props.setToolSetting('brushScatterAmount', brush.brushScatterAmount);
    this.props.setToolSetting('brushRotationMode', brush.brushRotationMode);
    this.props.setToolSetting('brushRotationOffset', brush.brushRotationOffset);
    this.props.setToolSetting('brushStabilizerWeight', brush.brushStabilizerWeight);
  }

  // Snapshot the live brush settings right before entering edit mode, so
  // cancelEditingBrush can put everything back the way it was.
  _captureEditSnapshot = () => {
    this._preEditSnapshot = {
      selectedBrushIndex: this.state.selectedBrushIndex,
      settings: {
        shape:             this.props.getToolSetting('brushShape'),
        brushSize:         this.props.getToolSetting('brushSize'),
        brushResolution:   this.props.getToolSetting('brushResolution'),
        brushSpacing:      this.props.getToolSetting('brushSpacing'),
        brushScatterAmount:    this.props.getToolSetting('brushScatterAmount'),
        brushRotationMode:     this.props.getToolSetting('brushRotationMode'),
        brushRotationOffset:   this.props.getToolSetting('brushRotationOffset'),
        brushStabilizerWeight: this.props.getToolSetting('brushStabilizerWeight'),
      },
    };
  }

  cancelEditingBrush = () => {
    const snapshot = this._preEditSnapshot;
    this._preEditSnapshot = null;
    if (snapshot) {
      this.applyBrush(snapshot.settings);
      this.setState({ isEditingBrush: false, selectedBrushIndex: snapshot.selectedBrushIndex });
    } else {
      this.setState({ isEditingBrush: false });
    }
  }

  createBrushFromPath = () => {
    this._captureEditSnapshot();
    const objs = this.props.project.selection.getSelectedObjects();
    if (!objs || objs.length !== 1) return;
    const wickPath = objs[0];
    if (!wickPath.view || !wickPath.view.item) return;

    const item = wickPath.view.item;
    const svgEl = item.exportSVG();
    const d = svgEl.getAttribute('d');
    if (!d) return;

    const b = item.bounds;
    const size = Math.max(b.width, b.height) || 1;
    const scale = 24 / size;
    const tx = 2 + (24 - b.width * scale) / 2 - b.x * scale;
    const ty = 2 + (24 - b.height * scale) / 2 - b.y * scale;

    const id = 'custom_' + Date.now();
    const newShape = { id, name: 'Custom', pathD: d, tx, ty, scale };

    // Register with engine immediately so brush can draw it right away
    this.addCustomShape(newShape);

    this.setState({ isEditingBrush: true, selectedBrushIndex: null });

    this.props.setActiveTool('brush');
    this.props.setToolSetting('brushShape', id);
  }

  /**
   * Renders a default selection view with no properties.
   */
  renderUnknown = () => {
    // if(!window.project.playing)
      // this.state.logs = []; // <-- note: mutate state directly, DO NOT USE setState()
    const logsForRender = window.project.playing ? this.state.logs : [];
    // scroll reference
    this.consoleEndRef = React.createRef();

    return (
      <div>
        <div className="inspector-content">
          {/* Code for displaying console - H.A. */}
          {window.project.playing && (
        <div style={{ width: '110%', height: 'auto', overflowY: 'scroll', backgroundColor: '#242424' }}>
          <Console logs={logsForRender} variant="dark" />
          <div ref={this.consoleEndRef} />
        </div>
      )}
        </div>
      </div>
    )
  }

  /**
   * Renders the proper view for the given selection type.
   * @param   {string} selectionType A string representation of the selection to display.
   * @returns {Component} JSX component to render.
   */
  renderDisplay = (selectionType) => {
    let renderFunction = null;

    if (selectionType in this.inspectorContentRenderFunctions) {
      renderFunction = this.inspectorContentRenderFunctions[selectionType];
    } else {
      renderFunction = this.renderUnknown;
    }

    return (
      renderFunction()
    );
  }

  /**
   * Renders a single action button for a given editor action.
   * @param {object} btn editor action with action, icon, color, and tooltip text properties.
   * @param {number} i unique key to be applied to returned object.
   * @returns {Component} JSX component to render.
   */
  renderActionButton = (action, i) => {
    return (
      <div key={i} className="inspector-item">
        <InspectorActionButton
          action={action} />
      </div>
    );
  }

  /**
   * Renders all actions for the current selection.
   * @returns {Component} JSX component containing all the actions for the current selection.
   */
  renderActions = () => {
    let actions = [];
    let selectionType = this.props.getSelectionType();

    Object.keys(this.actionRules).forEach(action => {
        let actionList = this.actionRules[action];
        if (actionList.indexOf(selectionType) > -1) actions.push(action);
    });

    return(
      <div className="inspector-content">
        {actions.map((action, i) => {
            return this.renderActionButton(this.props.editorActions[action], i);
          })}
        {selectionType === 'path' && (
          <div className="inspector-item">
            <InspectorActionButton action={{
              id: 'create-brush',
              icon: 'brush-black',
              tooltip: 'Create Brush',
              color: 'inspector',
              action: this.createBrushFromPath,
            }} />
          </div>
        )}
      </div>
    )
  }

  /**
   * Renders an edit script window if a script exists for the selected object.
   * @returns {Component} JSX component containing script window.
   */
  renderScripts = () => {
    return (
      <div className="inspector-item">
        <InspectorScriptWindow
          script={this.props.script}
          deleteScript={this.props.deleteScript}
          editScript={this.props.editScript}
          scriptInfoInterface={this.props.scriptInfoInterface}
        />
      </div>
    );
  }

  /**
   * Renders the inspector title for the current selection.
   * @param {string} selectionType selection type to return.
   */
  renderTitle = (selectionType) => {
    if (!(selectionType in this.inspectorTitles)) selectionType = "";

    return (
      <div className="inspector-title-container">
        <InspectorTitle
          type={selectionType}
          title={this.inspectorTitles[selectionType]} />
      </div>
    );
  }

  render() {
    let selectionType = this.props.getSelectionType();

    if (this.props.activeTool === 'brush') {
      return (
        <div className="docked-pane inspector" aria-label="Inspector Panel">
          <div className="inspector-title-container">
            <InspectorTitle type="brush" title={(() => { const { savedBrushes, selectedBrushIndex } = this.state; return (selectedBrushIndex !== null && savedBrushes[selectedBrushIndex]?.name) || 'Brush Sets'; })()} />
          </div>
          <div className="inspector-body">
            <InspectorBrush
              getToolSetting={this.props.getToolSetting}
              getToolSettingRestrictions={this.props.getToolSettingRestrictions}
              setToolSetting={this.props.setToolSetting}
              brushPreviewRef={this.brushPreviewRef}

              isEditingBrush={this.state.isEditingBrush}
              editBrush={() => {
                this._captureEditSnapshot();
                this.setState({ isEditingBrush: true });
              }}
              saveEditingBrush={this.saveBrush}
              cancelEditingBrush={this.cancelEditingBrush}

              savedBrushes={this.state.savedBrushes}
              selectedBrushIndex={this.state.selectedBrushIndex}
              selectBrush={(brush, i) => {
                this.setState({ selectedBrushIndex: i, isEditingBrush: false });
                this.applyBrush(brush);
                localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', i);
              }}
              renameSelectedBrush={(name) => {
                if (this.state.selectedBrushIndex === null) return;
                const updated = [...this.state.savedBrushes];
                updated[this.state.selectedBrushIndex] = { ...updated[this.state.selectedBrushIndex], name };
                this.setState({ savedBrushes: updated });
              }}
              deleteSelectedBrush={this.deleteSelectedBrush}

              showNewBrushMenu={this.state.showNewBrushMenu}
              toggleNewBrushMenu={this.toggleNewBrushMenu}
              closeNewBrushMenu={this.closeNewBrushMenu}
              startNewBrush={this.startNewBrush}
              importBrush={this.importBrush}

              showBrushModes={this.state.showBrushModes}
              toggleBrushModes={this.toggleBrushModes}
              closeBrushModes={this.closeBrushModes}

              removedShapes={this.state.removedShapes}
              customShapes={this.state.customShapes}
              deleteSelectedShape={this.deleteSelectedShape}

              downloadBrush={() => {
                const brush = this.state.selectedBrushIndex !== null
                  ? this.state.savedBrushes[this.state.selectedBrushIndex]
                  : {
                      name: 'brush',
                      shape: this.props.getToolSetting('brushShape'),
                      brushSize: this.props.getToolSetting('brushSize'),
                      brushResolution: this.props.getToolSetting('brushResolution'),
                      brushSpacing: this.props.getToolSetting('brushSpacing'),
                      brushScatterAmount: this.props.getToolSetting('brushScatterAmount'),
                      brushRotationMode: this.props.getToolSetting('brushRotationMode'),
                      brushRotationOffset: this.props.getToolSetting('brushRotationOffset'),
                      brushStabilizerWeight: this.props.getToolSetting('brushStabilizerWeight'),
                    };
                this.exportBrush(brush);
              }}
              brushFileInputRef={this.brushFileInputRef}
              handleBrushFileImport={this.handleBrushFileImport}
            />
          </div>
        </div>
      );
    }

    return(
      <div className="docked-pane inspector" aria-label="Inspector Panel">
        {this.renderTitle(selectionType)}
        <div className="inspector-body">
          {this.renderDisplay(selectionType)}
          {this.renderActions()}
          {this.props.selectionIsScriptable() && this.renderScripts()}
          {selectionType === 'clip' && this.renderAnimationSetting()}
        </div>
      </div>
    )
  }
}

export default Inspector
