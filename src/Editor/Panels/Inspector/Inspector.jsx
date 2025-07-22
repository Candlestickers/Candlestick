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

// import WickColorPicker from '../../Util/ColorPicker/WickColorPicker';


// setting default gradient colors
window.gradientStartColor = '#ff0000ff';
window.gradientEndColor = '#0000ffff';
window.gradientIsRadial = true;
window.gradientStopsTrackPosition = [[0,0],[0,0]];

window.EditorGradientColorSwapState = false;

class Inspector extends Component {
  constructor (props) {
    super(props);

    this.state = {
      gradientStartColor: window.gradientStartColor || "#ff0000",
      gradientEndColor: window.gradientEndColor || "#0000ff",
      gradientRadial: true
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
      "multiassetmixed": this.renderAsset,
      "multisoundasset": this.renderAsset,
      "multiimageasset": this.renderAsset,
    }

    /**
     * Which actions should be shown for which selection types.
     */
    this.actionRules = {
      'breakApart': ["clip", "button",],
      'fillGradient': ["gradient","path","multipath"], // adding in extra action for gradient, ignore this one
      'convertSelectionToButton': ["path", "text", "image", "multipath", "multiclip", "multicanvas"],
      'convertSelectionToClip': ["path", "text", "image", "multipath", "multiclip", "multicanvas"],
      'editTimeline': ["clip", "button"],
      'addAssetToCanvas': ["imageasset"],
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
      "multiassetmixed": "Multi-Asset",
      "multisoundasset": "Multi-Asset Sound",
      "multiimageasset": "Multi-Asset Image",
      "unknown": "", // <-- note to self, this is the state when nothing is selected
    }
  }

  componentDidUpdate(prevProps,prevState) { // no need to pass in prevProps, react automatically inputs it
    
    const selection = this.props.selection;
    // make sure selection is single gradient Path object
    if (
    selection.length>0 &&
    selection.length === 1 &&
    selection[0]._classname === "Path" &&
    selection[0].fillColor.gradient
    ){
    
      // when object is first selected ... set gradient settings color to object color
      if(prevProps.selection.length===0 || prevProps.selection[0]._uuid !== selection[0]._uuid){
        const fill = [
          selection[0].fillColor.gradient.stops[0]._color,
          selection[0].fillColor.gradient.stops[1]._color
        ];
    
        const num2Hex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
        const fil2Hex = (n) => `#${num2Hex(n._components[0])}${num2Hex(n._components[1])}${num2Hex(n._components[2])}${num2Hex(n._alpha)}`;
    
        const startHex = fil2Hex(fill[0]);
        const endHex = fil2Hex(fill[1]);
    
        const radBool = (selection[0].fillColor._components[0]._radial);

        if (window.gradientStartColor !== startHex || window.gradientEndColor !== endHex || window.gradientIsRadial !== radBool) {
          window.gradientStartColor = startHex;
          window.gradientEndColor = endHex;

          window.gradientIsRadial = radBool;
    
          this.setState({
            gradientStartColor: startHex,
            gradientEndColor: endHex,
            gradientRadial: radBool
          });
          // this.setState({ gradientRadial: radBool });
        }
      //  console.error((selection[0].fillColor._components[0]._radial));
      }else{ // as long as object is selected ... set its gradient to gradient settings
            
        const paper = window.editor.paper;
        const gradient = new paper.Gradient();
        gradient.stops = [
          [new paper.Color(this.state.gradientStartColor), 0],
          [new paper.Color(this.state.gradientEndColor), 1],
        ];

        // gradient.radial = true; // TODO add in the option to toggle this... 
        gradient.radial = this.state.gradientRadial; // || true;

        const item = selection[0];
        const bounds = selection[0].fillColor._components; //item.bounds;

        let GSTP = window.gradientStopsTrackPosition;
        const newfillColor = {
          gradient: gradient,
          origin: new paper.Point(GSTP[0][0]||bounds[1].x, GSTP[0][1]||bounds[1].y),
          destination: new paper.Point(GSTP[1][0]||bounds[2].x, GSTP[1][1]||bounds[2].y),
        };
        window.gradientStopsTrackPosition = [[0,0],[0,0]];

          item.fillColor = newfillColor;
          this.props.project.view.render();
          this.props.project.guiElement.draw();
          if(this.props.projectDidChange)
            this.props.projectDidChange({ actionName: "Live Gradient Update" });

      }

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
    return this.getSelectionAttribute('fillColor').alpha;
  }

  /**
   * Sets the value of the selection fillColor opacity.
   * @param  {string} attribute Selection attribute to retrieve.
   */
  setSelectionFillColorOpacity = (value) => {
    var color = this.getSelectionAttribute('fillColor');
    color.alpha = value;
    this.setSelectionAttribute('fillColor', color);
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
          val1={this.getSelectionAttribute('fillColor').toCSS()}
          onChange1={(col) => this.setSelectionAttribute('fillColor', col)}
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

          val1={this.getSelectionAttribute('strokeColor').toCSS()}
          onChange1={(col) => this.setSelectionAttribute('strokeColor', col)}
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

    if (this.props.selection && this.props.selection[0].fillColor.gradient)
      return(
        <div className="inspector-content">
          {this.renderSelectionTransformProperties()}
          {this.renderSelectionColor()}

          
          
          <div
          className="inspector-item"
          style={{
            display: 'flex',
            flexDirection: 'column',
            // gap: '8px',
            color: 'white',
            fontSize: '18px'
          }}
        >
          <label>Gradient:</label>

          {/* Start Color Block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          {/* <label>Left</label> */}
            <input
              type="color"
              value={this.state.gradientStartColor.slice(0, 7)}
              onChange={(e) => {
                const alpha = this.state.gradientStartColor.slice(7) || 'ff';
                const fullColor = e.target.value + alpha;
                window.gradientStartColor = fullColor;
                this.setState({ gradientStartColor: fullColor });
              }}
            />
            <input
              type="text"
              value={this.state.gradientStartColor}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{6,8}$/.test(val)) {
                  window.gradientStartColor = val;
                  this.setState({ gradientStartColor: val });
                }
              }}
              style={{ width: '90px' }}
              title="Start Color HEX"
            />
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={parseInt(this.state.gradientStartColor.slice(7) || 'ff', 16)}
            onChange={(e) => {
              const alpha = Number(e.target.value).toString(16).padStart(2, '0');
              const fullColor = this.state.gradientStartColor.slice(0, 7) + alpha;
              window.gradientStartColor = fullColor;
              this.setState({ gradientStartColor: fullColor });
            }}
            style={{ width: '100%' }}
            title="Start Alpha"
          />

          {/* End Color Block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px'}}>
          {/* <label>Right</label> */}
            <input
              type="color"
              value={this.state.gradientEndColor.slice(0, 7)}
              onChange={(e) => {
                const alpha = this.state.gradientEndColor.slice(7) || 'ff';
                const fullColor = e.target.value + alpha;
                window.gradientEndColor = fullColor;
                this.setState({ gradientEndColor: fullColor });
              }}
            />
            <input
              type="text"
              value={this.state.gradientEndColor}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{6,8}$/.test(val)) {
                  window.gradientEndColor = val;
                  this.setState({ gradientEndColor: val });
                }
              }}
              style={{ width: '90px' }}
              title="End Color HEX"
            />
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={parseInt(this.state.gradientEndColor.slice(7) || 'ff', 16)}
            onChange={(e) => {
              const alpha = Number(e.target.value).toString(16).padStart(2, '0');
              const fullColor = this.state.gradientEndColor.slice(0, 7) + alpha;
              window.gradientEndColor = fullColor;
              this.setState({ gradientEndColor: fullColor });
            }}
            style={{ width: '100%' }}
            title="End Alpha"
          />
          {/* radial & linear mode */}
        <div style={{ margin: '2px', display: 'flex', gap: '2px' }}>
          <input
            type="checkbox"
            className="wick-checkbox"
            id="gradient-mode-toggle"
            checked={window.gradientIsRadial}
            onChange={(e) => {
              const isRadial = e.target.checked;
              window.gradientIsRadial = isRadial;
              this.setState({ gradientRadial: isRadial });
            }}
          />
          <label
            htmlFor="gradient-mode-toggle"
            className="wick-label"
            style={{
              margin: 0,
              padding: 0,
              lineHeight: 'normal'
            }}
          >
            Radial mode 
          </label>
        </div>
        </div>



      </div>
      );
    else 
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

  /**
   * Renders a default selection view with no properties.
   */
  renderUnknown = () => {
    return (
      <div>
        <div className="inspector-content">
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
        if(actionList.indexOf(selectionType) > -1 && 
          // extra operators to make sure gradient button only shows for non-gradient path objects
          (actionList[0]!=="gradient" || !this.props.selection[0].fillColor.gradient))
          actions.push(action);
    });

    return(
      <div className="inspector-content">
        {actions.map((action, i) => {
            return this.renderActionButton(this.props.editorActions[action], i);
          })}
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
