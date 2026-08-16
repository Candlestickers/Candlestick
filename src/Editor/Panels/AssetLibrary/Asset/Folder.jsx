/*
 * Copyright 2026 Candlestickers
 *
 * This file is part of Wick Editor: Candlestick.
 *
 * Wick Editor: Candlestick is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor: Candlestick is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor: Candlestick.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import classNames from "classnames";
import { useDrag, useDrop } from "react-dnd";
import ToolIcon from "Editor/Util/ToolIcon/ToolIcon";
import ActionButton from "Editor/Util/ActionButton/ActionButton";
import "./_asset.scss";

const DROPPABLE_ASSET_TYPES = ["ImageAsset", "SoundAsset", "ClipAsset", "ButtonAsset", "SVGAsset", "FontAsset", "GIFAsset"];
const FOLDER_TYPE = "Folder";
const ACCEPT_TYPES = [...DROPPABLE_ASSET_TYPES, FOLDER_TYPE];

function Folder(props) {
  let icon = "folder";

  const [{ isDragging }, drag] = useDrag(() => ({
    type: FOLDER_TYPE,
    item: () => ({ folderId: props.folder.id }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [props.folder.id]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ACCEPT_TYPES,
    drop: (item, monitor) => {
      if (monitor.getItemType() === FOLDER_TYPE) {
        props.onDropFolder(item.folderId);
      } else {
        props.onDropAsset(item.uuid);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [props.onDropAsset, props.onDropFolder]);

  return (
    <div
      ref={node => drag(drop(node))}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={classNames("asset-item", { "asset-selected": props.isSelected || isOver })}>
      <button className="select" onClick={props.onClick} onDoubleClick={props.onOpen}>
        <div className="asset-name-text">
          <span>
            <ToolIcon className="asset-icon" name={icon} />
          </span>
          <span>{props.folder.name}</span>
        </div>
      </button>
      {props.isSelected && (
        <div className="asset-buttons-container">
          <span className="asset-button add">
            <ActionButton className="add" color="yellow" text="Open" action={props.onOpen} />
          </span>
          <span className="asset-button delete">
            <ActionButton
              className="delete"
              color="red"
              icon="delete-black"
              action={props.onDelete}
            />
          </span>
        </div>
      )}
    </div>
  );
}

export default Folder;