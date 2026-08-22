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
import 'bootstrap/dist/css/bootstrap.min.css';
import classNames from 'classnames';
import { useDrop } from 'react-dnd';

import Asset from './Asset/Asset';
import Folder, { ACCEPT_TYPES, FOLDER_TYPE } from './Asset/Folder';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';
import WickInput from 'Editor/Util/WickInput/WickInput';
import ToolIcon from 'Editor/Util/ToolIcon/ToolIcon';

import './_assetlibrary.scss';

/**
 * The header shown above the asset grid while inside a folder. Doubles as
 * a drop target: dropping an asset or folder here moves it out to the
 * parent level, since there's otherwise no way to drag something out of
 * the folder you're currently viewing.
 */
function FolderHeader(props) {
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
    <div ref={drop} className={classNames("asset-library-folder-header", { "asset-library-folder-header-drop-target": isOver })}>
      <button className="asset-library-back-button" onClick={props.onBack}>
        <ToolIcon className="asset-library-back-icon" name="codeBack" />
      </button>
      <span className="asset-library-folder-header-title" title={props.folderPath}>{props.folderName}</span>
    </div>
  );
}

class AssetLibrary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      filterText: '',
      // Folder data itself now lives on the project (project.assetFolders /
      // project.assetFolderAssignments) so it's saved/autosaved with the
      // project. Only transient navigation/selection state lives here.
      currentFolderId: null, // null = library root
      selectedFolderId: null,
    }
  }

  componentDidUpdate(prevProps) {
    // The project was swapped out (new project, file load, autosave load) so 
    // reset navigation/selection so we don't keep pointing at folders that belonged to the old project.
    if (prevProps.project !== this.props.project) {
      this.setState({ currentFolderId: null, selectedFolderId: null });
      return;
    }

    // If new assets were added while a folder was open
    // file them into that folder instead of leaving them at the root.
    if (this.state.currentFolderId === null) return;

    let prevUuids = new Set(prevProps.assets.map(asset => asset.uuid));
    let newAssets = this.props.assets.filter(asset => !prevUuids.has(asset.uuid));
    if (newAssets.length === 0) return;

    newAssets.forEach(asset => this.props.project.assignAssetToFolder(asset.uuid, this.state.currentFolderId));
    this.props.projectDidChange({ actionName: "File Asset Into Folder", skipHistory: true });
  }

  openFileDialog = (uuid) => {
    this.props.openImportAssetFileDialog();
  }

  openBuiltinAssetLibrary = () => {
    this.props.openModal('BuiltinLibrary');
  }

  updateFilter = (text) => {
    this.setState({
      filterText: text,
    });
  }

  filterArray = (array) => {
    let filterText = this.state.filterText.toLowerCase();
    return array.filter( item => {
        return !item.isGifImage && item.name.toLowerCase().includes(filterText);
    });
  }

  makeNode = (assetObject, i) => {
    return (
      <Asset
       key={i}
       asset={assetObject}
       isSelected={this.props.isObjectSelected(assetObject)}
       onClick={() => {
         this.setState({ selectedFolderId: null });
         this.props.clearSelection();
         this.props.selectObjects([assetObject]);
      }}
        createAssets={this.props.createAssets}
        importProjectAsWickFile={this.props.importProjectAsWickFile}
        createImageFromAsset={this.props.createImageFromAsset}
        toast={this.props.toast}
        deleteSelectedObjects={this.props.deleteSelectedObjects}
        clearSelection={this.props.clearSelection}
        selectObjects={this.props.selectObjects}
        addSoundToActiveFrame={this.props.addSoundToActiveFrame}
      />
    )
  }

  makeFolderNode = (folder) => {
    return (
      <Folder
       key={folder.id}
       folder={folder}
       isSelected={this.state.selectedFolderId === folder.id}
       onClick={() => this.selectFolder(folder)}
       onOpen={() => this.openFolder(folder.id)}
       onDelete={() => this.deleteFolder(folder.id)}
       onDropAsset={(assetUuid) => this.assignAssetToFolder(assetUuid, folder.id)}
       onDropFolder={(draggedFolderId) => this.moveFolderToFolder(draggedFolderId, folder.id)}
      />
    )
  }

  /**
   * Creates a new folder inside the folder currently being viewed, with a
   * default name that's unique among its siblings.
   */
  createFolder = () => {
    this.props.project.createAssetFolder(null, this.state.currentFolderId);
    this.props.projectDidChange({ actionName: "Create Folder" });
  }

  /**
   * Deletes a folder. Its direct contents (subfolders and assets) are
   * promoted up to its own parent, rather than being deleted or bumped
   * all the way to the library root.
   * @param {string} folderId
   */
  deleteFolder = (folderId) => {
    // The delete button only shows on a selected folder, so this folder is
    // always the current engine selection — clear it so selectionType
    // doesn't keep reporting 'folder' for something that no longer exists.
    this.props.clearSelection();

    let fallbackFolderId = this.props.project.deleteAssetFolder(folderId);
    this.props.projectDidChange({ actionName: "Delete Folder" });

    this.setState(prevState => ({
      currentFolderId: prevState.currentFolderId === folderId ? fallbackFolderId : prevState.currentFolderId,
      selectedFolderId: prevState.selectedFolderId === folderId ? null : prevState.selectedFolderId,
    }));
  }

  /**
   * Navigates into a folder. Pass null to navigate to the library root.
   * @param {string} folderId
   */
  openFolder = (folderId) => {
    this.props.clearSelection();
    this.setState({ currentFolderId: folderId, selectedFolderId: null });
  }

  /**
   * Moves a folder to be a child of another folder (or to the root if
   * targetFolderId is null). No-ops if the move would create a cycle
   * (e.g. dropping a folder into its own descendant).
   * @param {string} folderId
   * @param {string} targetFolderId
   */
  moveFolderToFolder = (folderId, targetFolderId) => {
    this.props.project.moveAssetFolder(folderId, targetFolderId);
    this.props.projectDidChange({ actionName: "Move Folder" });
  }

  /**
   * Selects a folder (mirrors asset selection so its buttons appear, and
   * lets the engine's selection.selectionType know a folder is selected).
   * @param {object} folder
   */
  selectFolder = (folder) => {
    this.props.selectFolder(folder);
    this.setState({ selectedFolderId: folder.id });
  }

  /**
   * Assigns an asset to a folder (or back to root if folderId is null).
   * @param {string} assetUuid
   * @param {string} folderId
   */
  assignAssetToFolder = (assetUuid, folderId) => {
    this.props.project.assignAssetToFolder(assetUuid, folderId);
    this.props.projectDidChange({ actionName: "Assign Asset To Folder" });
  }

  /**
   * Sorts an array of assets by their names.
   * @param  {Wick.Asset[]} assets An array of Wick.Asset objects.
   * @return {Wick.Asset[]}        Returns a sorted array of Wick.Assets.
   */
  sortAssets = (assets) => {
    let copiedAssets = [].concat(assets);

    // Perform alphabetic sort.
    copiedAssets.sort( (a,b) => a.name.localeCompare(b.name) );
    return copiedAssets;
  }

  renderTitle = () => {
    return (
      <div className="asset-library-title-container">
        <div className="asset-library-title-text">
          Asset Library
        </div>
        <div className="btn-asset-newfolder">
          <ActionButton
            color="upload"
            action={this.createFolder}
            id="button-asset-newfolder"
            icon="add"
            tooltip="Make New Folder" />
        </div>
        <div className="btn-asset-upload">
          <ActionButton
            color="upload"
            action={this.openBuiltinAssetLibrary}
            id="button-asset-builtin"
            icon="add"
            tooltip="Add Builtin Asset" />
        </div>
        <div className="btn-asset-builtin">
          <ActionButton
            color="upload"
            action={this.openFileDialog}
            useClickEvent={true}
            id="button-asset-upload"
            icon="upload"
            tooltip="Upload Assets" />
        </div>
      </div>
    )
  }

  render() {
    let filteredAssets = this.filterArray(this.props.assets);
    let sortedFilteredAssets = this.sortAssets(filteredAssets);

    let { currentFolderId } = this.state;
    let folders = this.props.project.assetFolders;
    let assetFolderAssignments = this.props.project.assetFolderAssignments;

    let visibleFolders = folders.filter(folder => folder.parentFolderId === currentFolderId);
    let visibleAssets = sortedFilteredAssets.filter(asset => {
      return (assetFolderAssignments[asset.uuid] || null) === currentFolderId;
    });
    // getAssetFolderPath (called below) builds its own id->folder map
    // internally, so a single .find() here is cheaper than building a
    // second map just for this one lookup.
    let currentFolder = folders.find(folder => folder.id === currentFolderId);

    return(
      <div className="docked-pane asset-library" aria-label="Asset Library">
        {this.renderTitle()}
        <div className="asset-library-body">
          <div className="asset-library-filter">
            <div className="asset-library-filter-icon">
              <ToolIcon name="search" />
            </div>
            <WickInput
              id="asset-library-filter-input"
              aria-label="filter"
              placeholder="filter..."
              type="text"
              onChange={this.updateFilter}
              value={this.state.filterText}/>
          </div>
          {currentFolderId !== null &&
            <FolderHeader
              folderName={currentFolder ? currentFolder.name : ''}
              folderPath={this.props.project.getAssetFolderPath(currentFolderId)}
              onBack={() => this.openFolder(currentFolder ? currentFolder.parentFolderId : null)}
              onDropAsset={(assetUuid) => this.assignAssetToFolder(assetUuid, currentFolder ? currentFolder.parentFolderId : null)}
              onDropFolder={(draggedFolderId) => this.moveFolderToFolder(draggedFolderId, currentFolder ? currentFolder.parentFolderId : null)}
            />
          }
          <div className="asset-library-asset-container">
            {visibleFolders.map(this.makeFolderNode)}
            {visibleAssets.map(this.makeNode)}
          </div>
        </div>
      </div>
    )
  }
}

export default AssetLibrary