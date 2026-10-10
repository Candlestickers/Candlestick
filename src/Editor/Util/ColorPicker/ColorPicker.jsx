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

import React, { useState } from 'react';
import { Popover } from 'reactstrap';
import WickColorPicker from 'Editor/Util/ColorPicker/WickColorPicker';
import { CHECKERBOARD_URL } from 'Editor/Util/ColorPicker/ColorPickerComponents/ColorPickerComponents';

import './_colorpicker.scss';

// Check if mouseclick started on popover
const oldComponentDidMount = Popover.prototype.componentDidMount;
Popover.prototype.componentDidMount = function () {
  this.downPopover = false;
  this.handleDocumentMouseDown = (e) => {
    this.downPopover = this._popover && this._popover.contains(e.target);
    this.downTarget = e.target;
  }

  oldComponentDidMount.call(this);
}
Popover.prototype.addTargetEvents = function () {
  ['click', 'touchstart'].forEach(event =>
    document.addEventListener(event, this.handleDocumentClick, true)
  );
  document.addEventListener('mousedown', this.handleDocumentMouseDown)
}

Popover.prototype.removeTargetEvents = function () {
  ['click', 'touchstart'].forEach(event =>
    document.removeEventListener(event, this.handleDocumentClick, true)
  );
  document.removeEventListener('mousedown', this.handleDocumentMouseDown)
}
Popover.prototype.handleDocumentClick = function (e) {
  if (this._target) {
    if (e.target !== this._target && !this._target.contains(e.target) && e.target !== this._popover && !(this._popover && this._popover.contains(e.target))) {
      if (this._hideTimeout) {
        this.clearHideTimeout();
      }

      if (this.props.isOpen) {
        this.toggle(e, { clickedPopover: this.downPopover, downTarget: this.downTarget });
      }
    }
  }
  this.downPopover = false;
}
Popover.prototype.toggle = function (e, data) {
  if (this.props.disabled) {
    return e && e.preventDefault();
  }

  return this.props.toggle(e, data);
}

function arraysEqual(arr1, arr2) {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

export default function ColorPicker (props) {
  let selectedObjects =
    (typeof props.getSelection === 'function') ?
    [...props.getSelection()._selectedObjectsUUIDs] : null;
  if (selectedObjects) selectedObjects.sort();

  const [open, setOpen] = useState(false);
  const [lastObjects, setLastObjects] = useState(selectedObjects);
  if (!arraysEqual(selectedObjects, lastObjects)) {
    setLastObjects(selectedObjects);

    // Close pop-up if selection changed
    if (open)
      toggle();
  }
  let itemID = props.id;
  let popoverID = itemID+'-popover';

  function toggle (e, data) {
    if (!open) {
      setTimeout(selectPopover, 200);
    }
    if (!e || !data || !open) {
      // Either `toggle()` was used, or no mouse-down data was needed
      setOpen(!open);
      return;
    }

    // Don't close if click started on popover
    // Don't close if clicked on selected objects
    let clickedCanvas = (e.touches ? e.target : data.downTarget) === props.targetCanvas;
    let selectionUnchanged = arraysEqual(selectedObjects, lastObjects);
    if (!data.clickedPopover && !(clickedCanvas && selectionUnchanged))
      setOpen(false);
  }

  function selectPopover () {
    let ele = document.getElementById(popoverID);
    if (ele)
      ele.focus();
  }

  let color = props.color ? props.color : new window.Wick.Color("#FFFFFF")
  let colorCSS = color;
  let colorCSSOpaque = color;
  if (color instanceof window.paper.Color) {
    if (color.gradient) {
      colorCSS = colorCSSOpaque = 'linear-gradient(to right';

      const sortedControlStops = [...color.gradient.stops];
      sortedControlStops.sort((objectA, objectB) => objectA.offset - objectB.offset);
      sortedControlStops.forEach(paperControlStop => {
          colorCSS += `, ${paperControlStop.color.toCSS()} ${paperControlStop.offset * 100}%`;
          let { red, green, blue } = paperControlStop.color;
          colorCSSOpaque += `, rgb(${red*255},${green*255},${blue*255}) ${paperControlStop.offset * 100}%`;
      });
      colorCSS += ')';
      colorCSSOpaque += ')';
    }
    else {
      colorCSS = color.toCSS(); colorCSSOpaque = `rgb(${color.red*255},${color.green*255},${color.blue*255})`;
      colorCSS = `linear-gradient(${colorCSS}, ${colorCSS})`;
      colorCSSOpaque = `linear-gradient(${colorCSSOpaque}, ${colorCSSOpaque})`;
    }
  }
  else if (typeof color === 'string') {
    // Used as a background-image
    colorCSS = colorCSSOpaque = `linear-gradient(${color}, ${color})`;
    // regex to remove alpha from color string
    colorCSSOpaque = colorCSSOpaque.replaceAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/g, 'rgb($1, $2, $3)');
  }
  // Bring desynced color state up, so if the solid-gradient state updates, the pop-up position updates
  const [desyncedColor, setDesyncedColor] = useState(color);

  // Bring functions involving selection down to avoid repeating code
  let selectionGiven = (typeof props.getSelection === 'function');
  let setGradientActive = (stopIndex) => {
    if (!selectionGiven) return;
    let selection = props.getSelection();

    if (stopIndex !== undefined && selection.useGradientGUI) return;
    selection.useGradientGUI = props.stroke ? 'stroke' : 'fill';
    selection.selectedStopIndex = stopIndex || 0;
    props.renderSelection();
  };
  let setGradientInactive = () => {
    if (!selectionGiven) return;
    let selection = props.getSelection();

    selection.useGradientGUI = false;
    selection.selectedStopIndex = 0;
    props.renderSelection();
  };
  let getSelectedStopIndex = () => selectionGiven && props.getSelection().selectedStopIndex;
  let setSelectedStopIndex = (index) => {
    if (!selectionGiven) return;
    props.getSelection().selectedStopIndex = index;
  };
  let selectedObjectsBounds = selectionGiven && props.getSelection().view._getSelectedObjectsBounds();

  return (
      <button
        className={"btn-color-picker" + (props.stroke ? " btn-color-picker-stroke" : "")}
        aria-label="color picker button"
        id={itemID}
        onClick={toggle}
        style={{
          backgroundImage: `${colorCSS}, ${CHECKERBOARD_URL}`,
          backgroundColor: 'white'
        }}>
          <div className="btn-color-picker-background-opaque"
            style={{ backgroundImage: colorCSSOpaque }} />
          <Popover
            tabIndex={-1}
            id={popoverID}
            placement={props.placement}
            isOpen={open}
            toggle={toggle}
            target={itemID}
            boundariesElement={'viewport'}>
            <WickColorPicker
              toggle={toggle}
              colorPickerType={props.colorPickerType}
              changeColorPickerType={props.changeColorPickerType}
              disableAlpha={props.disableAlpha}
              enableGradient={props.enableGradient}

              color={color}
              desyncedColor={desyncedColor}
              onDesyncedChange={setDesyncedColor}
              onChangeComplete={props.onChangeComplete}
              onChangeIntermediate={props.onChangeIntermediate}

              selectedObjectsBounds={selectedObjectsBounds}
              setGradientActive={setGradientActive}
              setGradientInactive={setGradientInactive}
              getSelectedStopIndex={getSelectedStopIndex}
              setSelectedStopIndex={setSelectedStopIndex}

              lastColorsUsed={props.lastColorsUsed}
              updateLastColors={props.updateLastColors}
            />
          </Popover>
      </button>
  )
}
