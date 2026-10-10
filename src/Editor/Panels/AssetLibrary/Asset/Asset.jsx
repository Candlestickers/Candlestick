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

import React from 'react';
import { useDrag } from 'react-dnd';
import './_asset.scss';
import DragDropTypes from 'Editor/DragDropTypes.js';
import ToolIcon from 'Editor/Util/ToolIcon/ToolIcon';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';

var classNames = require('classnames');

function Asset(props) {
  const assetType = DragDropTypes.GET_ASSET_TYPE(props);
  const [, drag] = useDrag(() => ({
    type: assetType,
    item: () => ({ uuid: props.asset.uuid }),
  }), [assetType, props.asset.uuid]);

  function getIcon(classname) {
    if (classname === "ImageAsset") return "image";
    else if (classname === "SoundAsset") return "sound";
    else if (classname === "ClipAsset") return "clip";
    else if (classname === "ButtonAsset") return "button";
    else if (classname === "FontAsset") return "font";
    else if (classname === "SVGAsset") return "svg";
    else return "asset";
  }

  function addToCanvas() {
    let draggedItem = props.asset;
    if (draggedItem.files && draggedItem.files.length > 0) {
      if (draggedItem.files[0].name.endsWith('.wick')) {
        var file = draggedItem.files[0];
        props.importProjectAsWickFile(file);
      } else {
        props.createAssets(draggedItem.files, []);
      }
    } else {
      props.createImageFromAsset(draggedItem.uuid, 0, 0, true);
    }
  }

  function renderAddButton() {
    if (props.asset.classname === 'SoundAsset') {
      return <span className="asset-button add">
        <ActionButton classsName="add" color="yellow" text="Add to Frame" action={() => props.addSoundToActiveFrame(props.asset)}/>
      </span>
    } else {
      return <span className="asset-button add">
        <ActionButton classsName="add" color="yellow" text="Add to Canvas" action={addToCanvas}/>
      </span>
    }
  }

  let icon = getIcon(props.asset.classname);

  return (
    <div ref={drag} className={classNames("asset-item", {"asset-selected": props.isSelected})}>
      <button
        className="select"
        onClick={props.onClick}>
        <div className="asset-name-text">
          <span><ToolIcon className="asset-icon" name={icon}/></span>
          <span>{props.asset.name}</span>
        </div>
      </button>
      {props.isSelected &&
      <div className="asset-buttons-container">
        {renderAddButton()}
        <span className="asset-button delete">
          <ActionButton
            classsName="delete"
            color="red"
            icon="delete-black"
            action={() => {
              props.clearSelection();
              props.selectObjects([props.asset]);
              props.deleteSelectedObjects();
            }}/>
        </span>
      </div>}
    </div>
  );
}

export default Asset;
