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

import { Component } from 'react';
// import { readFile } from '@tauri-apps/plugin-fs'; // 
import VideoExport from './export/VideoExport';
import GIFExport from './export/GIFExport';
import GIFImport from './import/GIFImport';
// import MP4Import from './import/MP4Import';
import MP4ImportPure from './import/MP4Import_Pure';
import AudioExport from './export/AudioExport';
import { importPDFAsSequence } from "./import/PDFImport"

class EditorCore extends Component {

    /**
     * Returns the name of the active tool.
     * @returns {string} The string representation active tool name.
     */
    getActiveTool = () => {
        return this.project.activeTool;
    }

    /**
     * Change the active tool.
     * @param {string} newTool - The string representation of the tool to switch to.
     */
    setActiveTool = (newTool) => {
        if (newTool !== this.getActiveTool().name) {
            this.lastUsedTool = this.getActiveTool();
            this.project.activeTool = newTool;

            this._onEyedropperPickedColor = (color) => {
                this.project.toolSettings.setSetting('fillColor', new window.Wick.Color(color));
            };

            // We must manually close the brush modes popup here, because otherwise the page
            // will crash because the popup can no longer find the brush modes toggle button
            // on the page.
            // See: https://github.com/reactstrap/reactstrap/issues/894
            this.toggleBrushModes(false);

            this.projectDidChange({ actionName: "Set Active Tool: " + newTool });
        }
    }

    /**
     * Toggles highlighted clip borders.
     */
    toggleClipBorders = () => {
        this.project.showClipBorders = !this.project.showClipBorders;
        this.projectDidChange({ actionName: "Toggle Clip Borders" });
    }

    /**
     * Activates the tool that was used before the current tool was activated.
     */
    activateLastTool = () => {
        this.project.activeTool = this.lastUsedTool;
        this.projectDidChange({ actionName: "Activate Last Tool" });
    }

    /**
     * Undo the last action that was done.
     */
    undoAction = () => {
        let undo = this.project.undo();
        // console.log({ undo })
        if (!undo) {
            this.toast('Nothing to undo.', 'warning');
        } else {
            this.projectDidChange({ skipHistory: true, actionName: "Undo" });
        }
    }

    /**
     * Recover the state of the project from before the last action was done.
     */
    redoAction = () => {
        let redo = this.project.redo();
        // console.log({ redo });
        if (!redo) {
            this.toast('Nothing to redo.', 'warning');
        } else {
            this.projectDidChange({ skipHistory: true, actionName: "Redo" });
        }
    }

    /**
     * Recenters the canvas.
     */
    recenterCanvas = () => {
        this.project.recenter();
        this.projectDidChange({ skipHistory: true, actionName: "recenterCanvas" });
    }

    /**
     * Zooms in the canvas.
     */
    zoomIn = () => {
        this.project.zoomIn();
        this.project.view.render();
    }

    /**
     * Zooms out the canvas.
     */
    zoomOut = () => {
        this.project.zoomOut();
        this.project.view.render();
    }

    /**
     * Returns an object containing the tool settings.
     * @returns {object} The object containing the tool settings.
     */
    getToolSetting = (name) => {
        return this.project.toolSettings.getSetting(name);
    }

    /**
     * Updates the tool settings state.
     * @param {object} newToolSettings - An object of key-value pairs where the keys represent tool settings and the values represent the values to change those settings to.
     */
    setToolSetting = (name, value) => {
        this.project.toolSettings.setSetting(name, value);
        this.projectDidChange({ actionName: "Change Tool Setting " + name + ":" + value });
    }

    /**
     *
     */
    getToolSettingRestrictions = (name) => {
        return this.project.toolSettings.getSettingRestrictions(name);
    }

    /**
     * Returns all animation types available
     * @returns {Object[]} - Animation types listed as objects with label and value keys.
     */
    getClipAnimationTypes = () => {
        let outputTypes = [];
        Object.keys(window.Wick.Clip.animationTypes).forEach(key => {
            outputTypes.push({ label: window.Wick.Clip.animationTypes[key], value: key });
        });
        return outputTypes;
    }

    /**
     * Shrinks the brush/eraser size by a given amount.
     */
    changeBrushSize = (amt) => {
        var tool = this.project.activeTool.name
        var option;
        if (tool === 'brush') {
            option = 'brushSize';
        } else if (tool === 'eraser') {
            option = 'eraserSize';
        } else {
            return;
        }

        let brushSize = this.getToolSetting(option);
        let newBrushSize = brushSize += amt;

        this.setToolSetting(option, newBrushSize);
    }

    /**
     * Moves the active timeline's playhead forward one frame.
     */
    movePlayheadForwards = () => {
        this.project.focus.timeline.playheadPosition++;
        this.project.guiElement.checkForPlayheadAutoscroll();
        this.project.view.render();
        this.project.guiElement.draw();
    }

    /**
     * Moves the active timeline's playhead backwards one frame.
     */
    movePlayheadBackwards = () => {
        this.project.focus.timeline.playheadPosition--;
        this.project.guiElement.checkForPlayheadAutoscroll();
        this.project.view.render();
        this.project.guiElement.draw();
    }

    /**
     * Finishes a playhead moving operation.
     */
    finishMovingPlayhead = () => {
        this.projectDidChange({ actionName: "Finish Moving Playhead" });
    }

    /**
     * Determines the type of the object/objects that are in the selection state.
     * @returns {string} The string representation of the type of object/objects selected
     */
    getSelectionType = () => {
        return this.project.selection.selectionType;
    }

    /**
     * Returns true if the selection is scriptable.
     * @return {boolean} True if the selection is scriptable.
     */
    selectionIsScriptable = () => {
        return this.project.selection.isScriptable;
    }

    /**
     * The selected scriptable object.
     * @return {Wick.Frame|Wick.Clip} object - the scriptable object that is selected
     */
    getSelectedObjectScript = () => {
        if (this.selectionIsScriptable()) {
            return this.project.selection.getSelectedObject();
        } else {
            return null;
        }
    }

    /**
     * Returns all selected objects on the timeline.
     * @returns {(<Wick.Frame>|<Wick.Tween>)[]} An array containing the selected
     * tweens and frames
     */
    getSelectedTimelineObjects = () => {
        return this.project.selection.getSelectedObjects('Timeline');
    }

    /**
     * Returns all selected frames.
     * @returns {<Wick.Frame>)[]} An array containing the selected frames.
     */
    getSelectedFrames = () => {
        return this.project.selection.getSelectedObjects('Frame');
    }

    /**
     * Returns all selected tweens.
     * @returns {<Wick.Tween>)[]} An array containing the selected tweens.
     */
    getSelectedTweens = () => {
        return this.project.selection.getSelectedObjects('Tween');
    }

    /**
     * Returns all selected objects on the timeline.
     * @returns {(<Wick.Path>|<Wick.Clip>|<Wick.Button>)[]} An array containing
     * the selected clips and paths
     */
    getSelectedCanvasObjects = () => {
        return this.project.selection.getSelectedObjects('Canvas');
    }

    /**
     * Returns all selected paths.
     * @returns {<Wick.Path>)[]} An array containing the selected paths.
     */
    getSelectedPaths = () => {
        return this.project.selection.getSelectedObjects('Path');
    }

    /**
     * Returns all selected clips.
     * @returns {<Wick.Clip>)[]} An array containing the selected clips.
     */
    getSelectedClips = () => {
        return this.project.selection.getSelectedObjects('Clip');
    }

    /**
     * Returns all selected buttons.
     * @returns {<Wick.Button>)[]} An array containing the selected buttons.
     */
    getSelectedButtons = () => {
        return this.project.selection.getSelectedObjects('Button');
    }

    /**
     * Returns all selected objects in the asset library.
     * @returns {(<Wick.ImageAsset>|<Wick.SoundAsset>)[]} An array containing the
     * selected assets
     */
    getSelectedAssetLibraryObjects = () => {
        return this.project.selection.getSelectedObjects('AssetLibrary');
    }

    /**
     * Returns all selected sound assets from the asset library.
     * @returns {(<Wick.SoundAsset>)[]} An array containing the selected sound
     * assets.
     */
    getSelectedSoundAssets = () => {
        return this.project.selection.getSelectedObjects('SoundAsset');
    }

    /**
     * Returns all selected image assets from the asset library.
     * @returns {(<Wick.ImageAsset>)[]} An array containing the selected image
     * assets.
     */
    getSelectedImageAssets = () => {
        return this.project.selection.getSelectedObjects('ImageAsset');
    }

    /**
     * Returns the selected scriptable object if selection is a single scriptable
     * object.
     * @return {object|null} selected scriptable object.
     */
    getSelectedScriptableObject = () => {
        return this.project.selection.getSelectedObject().isScriptable
            && this.project.selection.getSelectedObject();
    }

    /**
     * Returns the number of objects selected on the canvas.
     * @return {number} Number of canvas objects selected.
     */
    getNumCanvasObjectsSelected = () => {
        return this.project.selection.numObjects;
    }

    /**
     * Sets the active layer
     * @param {number} index The index to set as active
     */
    setActiveLayerIndex = (index) => {
        this.project.activeTimeline.activeLayerIndex = index;
        this.projectDidChange({ actionName: "Set Active Layer" });
    }

    /**
     * Toggles layer hidden
     * @param {object} layer The layer to toggle
     */
    toggleHidden = (layer) => {
        layer.hidden = !layer.hidden;
        this.projectDidChange({ actionName: "Toggle Layer Hidden" });
    }

    /**
     * Toggles layer locked
     * @param {object} layer The layer to toggle
     */
    toggleLocked = (layer) => {
        layer.locked = !layer.locked;
        this.projectDidChange({ actionName: "Toggle Layer Locked" });
    }

    /**
     * Moves selection into target at index
     * @param {object} target The object to insert into
     * @param {number} index The index to insert at
     */
    moveSelection = (target, index) => {
        if (this.project.moveSelection(target, index)) {
            this.projectDidChange({ actionName: "Moved Selection" });
        }
    }

    /**
     * Adds the given object to the selection.
     * @param {object} object - The object to add to the selection.
     */
    selectObject = (object) => {
        this.project.selection.select(object);
        this.projectDidChange({ actionName: "Select Object" });
    }

    /**
     * Adds the given objects to the selection. No
     * changes will be made if the selection does not change.
     * @param {object[]} objects - The objects to add to the selection.
     */
    selectObjects = (objects) => {
        this.project.selection.selectMultipleObjects(objects);
        this.projectDidChange({ actionName: "Select Multiple Objects" });
    }

    /**
     * Selects a folder in the Asset Library. Folders are an editor-side
     * concept (see AssetLibrary.jsx), not Wick.Base objects, so this goes
     * through a dedicated selection path rather than selectObjects.
     * @param {object} folder - The folder to select.
     */
    selectFolder = (folder) => {
        this.project.selection.selectFolder(folder);
        this.projectDidChange({ actionName: "Select Folder" });
    }

    /**
     * Removes the given objects from the selection. No
     * changes will be made if the selection does not change.
     * @param {object[]} objects - The objects to remove from the selection.
     */
    deselectObjects = (objects) => {
        objects.forEach(object => {
            this.project.selection.deselect(object);
        });
        this.projectDidChange({ actionName: "Deselect Multiple Objects" });
    }

    /**
     * Clears the selection.
     */
    clearSelection = () => {
        this.project.selection.clear();
        this.projectDidChange({ actionName: "Clear Selection" });
    }

    /**
     * Selects everything on the canvas.
     */
    selectAll = () => {
        this.project.selectAll();
        this.projectDidChange({ actionName: "Select All" });
    }

    /**
     * Returns the value of a requested selection attribute.
     * @param  {string} attributeName Selection attribute to retrieve.
     * @return {string|number|undefined} Value of the selection attribute to
     * retrieve. Returns undefined is attribute does not exist.
     */
    getSelectionAttribute = (attributeName) => {
        let attribute = this.project.selection[attributeName];

        if (attribute instanceof Array) {
            if (attribute.length === 0) {
                return undefined;
            } else if (attribute.length === 1) {
                return attribute[0];
            } else {
                // TODO: Should return info about "mixed" attributes, but just
                // return the attribute of the first object for now.
                return attribute[0];
            }
        } else {
            return attribute;
        }
    }

    /**
     * Returns the names of all possible selection attribute names.
     * @return {string[]} Array of selection attribute names.
     */
    getAllSelectionAttributeNames = () => {
        return this.project.selection.allAttributeNames;
    }

    /**
     * Returns the new selection Attributes.
     * @return {object} object with new attributes.
     */
    getAllSelectionAttributes = () => {
        let newAttributes = {};

        let selectionAttributeNames = this.getAllSelectionAttributeNames();

        selectionAttributeNames.forEach(name => {
            newAttributes[name] = this.getSelectionAttribute(name);
        });

        return newAttributes;
    }

    /**
     * Updates the value of a selection attribute for the selected item in the editor.
     * @param {string} attribute Name of the attribute to update.
     * @param {string|number} newValue  New value of the attribute to update.
     */
    setSelectionAttribute = (attribute, newValue) => {
        this.project.selection[attribute] = newValue;
        this.projectDidChange({ actionName: "Set Selection Attribute: " + attribute + ":" + newValue });
    }

    /**
     * Determines if a given object is selected.
     * @param {object} object - Selection object to check if it is selected
     * @returns {boolean} - True if the object is selected, false otherwise
     */
    isObjectSelected = (object) => {
        return this.project.selection.isObjectSelected(object);
    }

    /**
     * Creates a new clip from the selected paths and clips and adds it to the project.
     * @param {string} name The name of the clip after creation.
     * @param {boolean} wrapSingularClip If the selection is just one Clip, should it be wrapped within another Clip?
     *    Default is true, to preserve existing script behavior.
     *    Calling this function with false ensures user doesn't accidentally wrap a Clip within another Clip.
     */
    createClipFromSelection = (name, wrapSingularClip = true) => {
        if (this.project.selection.numObjects === 0) {
            console.log("No selection from which to create clips.");
            return;
        } else if (!wrapSingularClip && this.project.selection.numObjects === 1
            && this.project.selection.types[0] === "Clip") {
            console.log("That's already a Clip.");
            return;
        }
        this.project.createClipFromSelection({
            identifier: name,
            type: 'Clip'
        });
        this.projectDidChange({ actionName: "Create Clip From Selection" });
    }

    /**
     * Creates a new button from the selected paths and clips and adds it to the project.
     * @param {string} name The name of the button after creation.
     */
    createButtonFromSelection = (name) => {
        this.project.createClipFromSelection({
            identifier: name,
            type: 'Button'
        });
        this.projectDidChange({ actionName: "Create Button From Selection" });
    }

    /**
     * Updates the focus object of the project.
     * @param {Wick.Clip} object Object to set as focus.
     */
    setFocusObject = (object) => {
        this.project.focus = object;
        this.projectDidChange({ actionName: "Set Focus Object" });
    }

    /**
     * Break apart the selected clip(s) and select the objects that were contained within those clip(s).
     */
    breakApartSelection = () => {
        //only break apart selections that have at least 1 clip or button
        //it might be better for these checks to go wherever project.breakApartSelection is defined
        var sel = this.project.selection;
        if (sel.numObjects === 0 || (!sel.types.includes("Clip") && !sel.types.includes("Button"))) {
            return;
        }
        this.project.breakApartSelection();
        this.projectDidChange({ actionName: "Break Apart Selection" });
    }

    /**
     * Deletes all selected objects.
     * @returns {object[]} The objects that were deleted.
     */
    deleteSelectedObjects = () => {
        if (this.project.selection.location === 'AssetLibrary') {
            this.openWarningModal({
                description: "Any objects in the project using this asset will also be deleted.",
                title: "Delete this asset?",
                acceptAction: (() => {
                    this.project.deleteSelectedObjects();
                    this.projectDidChange({ actionName: "Delete Selected Asset" });
                }),
                cancelAction: (() => { }),
                finalAction: (() => { }),
                acceptText: "Delete",
                cancelText: "Cancel",
            });
        } else {
            if(this.project.selection.useGradientGUI) {
                this.project.selection.deleteSelectedStop();
                this.projectDidChange({actionName: "Delete Selected Stop"});
            } else {
                this.project.deleteSelectedObjects();
                this.projectDidChange({actionName: "Delete Selected Objects"});
            }
        }
    }

    /**
     * Deletes a sub script from a script object.
     * @param {Object} scriptOwner Script owner to remove sub script from
     * @param {string} scriptName Name of the script to remove
     */
    deleteScript = (scriptOwner, scriptName) => {
        let oldEditorState = this.state.codeEditorOpen;

        // Turn off code editor if necessary, then open warning modal.
        this.toggleCodeEditor(false);

        this.openWarningModal({
            description: 'Delete Script: "' + scriptName + '" from the object?',
            title: "Delete Script",
            acceptText: "Delete",
            cancelText: "Cancel",
            acceptAction: (() => scriptOwner.removeScript(scriptName)),
            finalAction: (() => this.toggleCodeEditor(oldEditorState)), // Reopen code editor if necessary.
        });

    }

    /**
     * Opens the code editor to the script name tab if that tab exists.
     * @param {string} scriptName Name of the script to open the tab of. Must be all lowercase.
     */
    editScript = (scriptName) => {
        this.setState({
            scriptToEdit: scriptName,
            codeEditorOpen: true,
        });
    }

    /**
     * Moves the selected objects on the canvas to the back.
     */
    sendSelectionToBack = () => {
        this.project.selection.sendToBack();
        this.projectDidChange({ actionName: "Send Selection to Back" });
    }

    /**
     * Moves the selected objects on the canvas to the front.
     */
    sendSelectionToFront = () => {
        this.project.selection.bringToFront();
        this.projectDidChange({ actionName: "Bring Selection to Front" });
    }

    /**
     * Moves the selected objects on the canvas backwards.
     */
    moveSelectionBackwards = () => {
        this.project.selection.moveBackwards();
        this.projectDidChange({ actionName: "Move Selection Backwards" });
    }

    /**
     * Moves the selected objects on the canvas forwards.
     */
    moveSelectionForwards = () => {
        this.project.selection.moveForwards();
        this.projectDidChange({ actionName: "Move Selection Forwards" });
    }

    /**
     * Horizontally flips the canvas selection.
     */
    flipSelectedHorizontal = () => {
        this.project.selection.flipHorizontally();
        this.projectDidChange({ actionName: "Flip Selection Horizontal" });
    }

    /**
     * Vertically flips the canvas selection.
     */
    flipSelectedVertical = () => {
        this.project.selection.flipVertically();
        this.projectDidChange({ actionName: "Flip Selection Vertical" });
    }

    nudgeSelection = (x, y) => {
        if (this.project.selection.numObjects === 0) return; // Ignore if no objects are selected.
        this.project.selection.x += x;
        this.project.selection.y += y;
        this.projectDidChange({ skipHistory: true, actionName: "Nudge Selection", skipReactRender: true });
    }

    /**
     * Moves the selected objects up 1 pixel.
     */
    nudgeSelectionUp = () => {
        this.nudgeSelection(0, -1);
    }

    /**
     * Moves the selected objects down 1 pixel.
     */
    nudgeSelectionDown = () => {
        this.nudgeSelection(0, 1);
    }

    /**
     * Moves the selected objects right 1 pixel.
     */
    nudgeSelectionRight = () => {
        this.nudgeSelection(1, 0);
    }

    /**
     * Moves the selected objects left 1 pixel.
     */
    nudgeSelectionLeft = () => {
        this.nudgeSelection(-1, 0);
    }

    /**
     * Moves the selected objects up 10 pixels.
     */
    nudgeSelectionUpMore = () => {
        this.nudgeSelection(0, -10);
    }

    /**
     * Moves the selected objects down 10 pixels.
     */
    nudgeSelectionDownMore = () => {
        this.nudgeSelection(0, 10);
    }

    /**
     * Moves the selected objects right 10 pixels.
     */
    nudgeSelectionRightMore = () => {
        this.nudgeSelection(10, 0);
    }

    /**
     * Moves the selected objects left 10 pixels.
     */
    nudgeSelectionLeftMore = () => {
        this.nudgeSelection(-10, 0);
    }

    /**
     * Finish the current nudging operation
     */
    finishNudgingObject = () => {
        this.projectDidChange({ actionName: "Nudge Elements" });
    }

    /**
     * Perform a boolean unite on the selected paths.
     */
    booleanUnite = () => {
        this.project.doBooleanOperationOnSelection('unite');
        this.projectDidChange({ actionName: "Boolean Unite" });
    }

    /**
     * Perform a boolean subtraction on the selected paths.
     */
    booleanSubtract = () => {
        this.project.doBooleanOperationOnSelection('subtract');
        this.projectDidChange({ actionName: "Boolean Subtract" });
    }

    /**
     * Perform a boolean intersection on the selected paths.
     */
    booleanIntersect = () => {
        this.project.doBooleanOperationOnSelection('intersect');
        this.projectDidChange({ actionName: "Boolean Intersect" });
    }


    // refresh bounds/center for current objects
    refreshSelectionBounds = () => {
        const objs = this.getSelectedCanvasObjects();
        if (objs && objs.length)
            this.project.selection.selectMultipleObjects(objs);
    };


    /**
     * 
     * Performs horizontal alignment of objects -H.A.
     */
    alignSelectionX = () => {
        const selected = this.getSelectedCanvasObjects(); // Get selected objects
        if (selected.length < 2) {
            if (selected[0]) {
                selected[0].x = this.project.focus.parent !== this.project ? 0 : this.project.width / 2;
                this.refreshSelectionBounds();
                this.projectDidChange({ actionName: "Align X to project" });
            }
            return;
        };

        const referenceX = selected[0].x; // Use the first selected object's x
        selected.forEach(obj => {
            obj.x = referenceX;
        });
        this.refreshSelectionBounds();
        this.projectDidChange({ actionName: "Align X" });
    }

    /**
     * 
     * Performs vertical alignment of objects -H.A.
     */
    alignSelectionY = () => {
        const selected = this.getSelectedCanvasObjects(); // Get selected objects
        if (selected.length < 2) {
            if (selected[0]) {
                selected[0].y = this.project.focus.parent !== this.project ? 0 : this.project.height / 2;
                this.refreshSelectionBounds();
                this.projectDidChange({ actionName: "Align Y to project" });
            }
            return;
        }

        const referenceY = selected[0].y; // Use the first selected object's y
        selected.forEach(obj => {
            obj.y = referenceY;
        });
        this.refreshSelectionBounds();
        this.projectDidChange({ actionName: "Align Y" });
    }

    /**
     * 
     * Performs left side alignment of selected objects -H.A.
     */
    alignSelectionLeft = () => {
        const selected = this.getSelectedCanvasObjects(); // Get selected objects
        if (selected.length < 2) {
            if (selected[0]) {
                selected[0].x = selected[0].bounds.width / 2;
                this.refreshSelectionBounds();
                this.projectDidChange({ actionName: "Align Left to project" });
            }
            return;
        }

        const referenceX = this.project.selection.x;
        selected.forEach(obj => {
            obj.x = referenceX + (obj.width || obj.bounds.width) / 2;
        });
        this.refreshSelectionBounds();
        this.projectDidChange({ actionName: "Align Left" });
    }

    /**
     * 
     * Performs right side alignment of selected objects -H.A.
     */
    alignSelectionRight = () => {
        const selected = this.getSelectedCanvasObjects(); // Get selected objects
        if (selected.length < 2) {
            if (selected[0]) {
                selected[0].x = (this.project.focus.parent !== this.project ? 0 : this.project.width) - selected[0].bounds.width / 2;
                this.refreshSelectionBounds();
                this.projectDidChange({ actionName: "Align Right to project" });
            }
            return;
        }

        const referenceX = this.project.selection.x + this.project.selection.originalWidth;
        selected.forEach(obj => {
            obj.x = referenceX - (obj.width || obj.bounds.width) / 2;
        });
        this.refreshSelectionBounds();
        this.projectDidChange({ actionName: "Align Right" });
    }

    /**
     * 
     * Performs bottom side alignment of selected objects -H.A.
     */
    alignSelectionBottom = () => {
        const selected = this.getSelectedCanvasObjects(); // Get selected objects
        if (selected.length < 2) {
            if (selected[0]) {
                selected[0].y = (this.project.focus.parent !== this.project ? 0 : this.project.height) - selected[0].bounds.height / 2;
                this.refreshSelectionBounds();
                this.projectDidChange({ actionName: "Align Bottom to project" });
            }
            return;
        }

        const referenceY = this.project.selection.y + this.project.selection.originalHeight;
        selected.forEach(obj => {
            obj.y = referenceY - (obj.height || obj.bounds.height) / 2;
        });
        this.refreshSelectionBounds();
        this.projectDidChange({ actionName: "Align Bottom" });
    }

    /**
     * 
     * Performs top side alignment of selected objects -H.A.
     */
    alignSelectionTop = () => {
        const selected = this.getSelectedCanvasObjects(); // Get selected objects
        if (selected.length < 2) {
            if (selected[0]) {
                selected[0].y = selected[0].bounds.height / 2;
                this.refreshSelectionBounds();
                this.projectDidChange({ actionName: "Align Top to project" });
            }
            return;
        }

        const referenceY = this.project.selection.y;
        selected.forEach(obj => {
            obj.y = referenceY + (obj.height || obj.bounds.height) / 2;
        });
        this.refreshSelectionBounds();
        this.projectDidChange({ actionName: "Align Top" });
    }

    // ALIGNMENT SETTINGS END HERE


    /**
     * Updates the Wick Project settings with new values passed in as an object. Will make no changes if input is invalid or the same as the previous settings.
     * @param {object} newSettings an object containing all of the settings to update within the project. Accepts valid project settings such as 'name', 'width', 'height', 'framerate', and 'backgroundColor'.
     */
    updateProjectSettings = (newSettings) => {
        let validKeys = ["name", "width", "height", "backgroundColor", "framerate"];
        let updated = false;

        Object.keys(newSettings).forEach(key => {
            if (validKeys.indexOf(key) === -1) return;

            let oldVal = this.project[key];
            if (oldVal !== newSettings[key]) {
                this.project[key] = newSettings[key];
                updated = true;
            }
        });

        if (updated) {
            this.projectDidChange({ actionName: "Update Project Settings" });
        }
    }

    /**
     * Sets the project focus to the timeline of the currently selected clip.
     */
    focusTimelineOfSelectedObject = () => {
        this.project.focusTimelineOfSelectedClip();
        this.projectDidChange({ actionName: "Focus Selected Object Timeline" });
    }

    /**
     * Sets the project focus to the parent timeline of the currently selected clip.
     */
    focusTimelineOfParentClip = () => {
        this.project.focusTimelineOfParentClip();
        this.projectDidChange({ actionName: "Focus Timeline of Parent Clip" });
    }

    /**
     * Creates an image from an asset's uuid and places it on the canvas.
     * @param {string} uuid - The UUID of the desired asset.
     * @param {number} x - The x location of the image after creation in relation to the window.
     * @param {number} y - The y location of the image after creation in relation to the window.
     * @param {boolean} isCanvasSpace - If not set to true, x and y will be converted from screen space to canvas space
     */
    createImageFromAsset = (uuid, x, y, isCanvasSpace) => {
        // convert screen position to wick project position
        let paper = this.project.view.paper;
        let dropPoint = new paper.Point();
        if (isCanvasSpace) {
            dropPoint = new paper.Point(x, y);
        } else {
            let canvasPosition = paper.project.view.element.getBoundingClientRect();
            x -= canvasPosition.x;
            y -= canvasPosition.y;
            dropPoint = paper.view.viewToProject(new window.paper.Point(x, y));
        }

        let obj = window.Wick.ObjectCache.getObjectByUUID(uuid);

        if (obj instanceof window.Wick.ImageAsset) {
            this.project.createImagePathFromAsset(window.Wick.ObjectCache.getObjectByUUID(uuid), dropPoint.x, dropPoint.y, path => {
                this.projectDidChange({ actionName: "Create Image Path From Asset" });
            });
        } else if (obj instanceof window.Wick.ClipAsset) {
            this.project.createClipInstanceFromAsset(window.Wick.ObjectCache.getObjectByUUID(uuid), dropPoint.x, dropPoint.y, clip => {
                this.projectDidChange({ actionName: "Create Clip Instance From Asset" });
            });
        } else if (obj instanceof window.Wick.SVGAsset) {
            this.project.createSVGInstanceFromAsset(window.Wick.ObjectCache.getObjectByUUID(uuid), dropPoint.x, dropPoint.y, svg => {
                this.projectDidChange({ actionName: "Create SVG Instance From Asset" });
            });
        } else {
            console.error('object is not an ImageAsset or a ClipAsset')
        }
    }

    /**
     * Creates an instance of the selected asset at the center of the canvas
     */
    createInstanceOfSelectedAsset = () => {
        let uuid = this.project.selection.getSelectedObject().uuid;
        this.createImageFromAsset(uuid, this.project.width / 2, this.project.height / 2, true);
    }

    /**
      * Is called when a sound asset is dragged/dropped on the timeline element.
      * @param {string} uuid - The UUID of the desired asset.
      * @param {number} x - The x location of the image after creation in relation to the window.
      * @param {number} y - The y location of the image after creation in relation to the window.
      * @param {boolean} drop - If true, will drop the asset with the uuid onto the hovered frame, modifying the frame.
      */
    dragSoundOntoTimeline = (uuid, x, y, drop) => {
        this.project.guiElement.dragAssetAtPosition(uuid, x, y, drop);
    }

    addSoundToActiveFrame = (soundAsset) => {
        let frame = this.project.activeFrame;
        if (frame !== null) {
            frame.sound = soundAsset;
            this.projectDidChange({ actionName: "Add Sound to Active Frame" });
        }
        else {
            this.toast('No active frame to add sound to.', 'error');
        }
    }

    /**
     * Attempts to import an arbitrary asset to the project. Displays an error or success message
     * depending on if the action was successful.
     * @param {File} file - File object to create an asset of.
     * @param {Function} callback - (optional) Callback to return asset to. If the import was unsuccessful, null is sent to the callback.
     */
    importFileAsAsset = async (file, callback) => {
        // Content-based dedup: fingerprint the new file (size + first 64 bytes)
        // then compare against all existing assets via their data-URL base64.
        try {
            const fpBytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
            const newFp = file.size + ':' + btoa(String.fromCharCode(...fpBytes));

            for (const asset of this.project.getAssets()) {
                const src = asset.src;
                if (!src || !src.includes(',')) continue;
                const base64 = src.split(',')[1];
                // Compute byte size from base64 length minus padding
                const paddingCount = (base64.match(/=/g) || []).length;
                const assetSize = Math.floor(base64.length / 4 * 3) - paddingCount;
                if (assetSize !== file.size) continue; // fast size pre-check
                // Decode first 88 base64 chars → first ≥64 raw bytes
                try {
                    const decoded = atob(base64.slice(0, 88));
                    const assetBytes = new Uint8Array(Math.min(64, decoded.length));
                    for (let i = 0; i < assetBytes.length; i++) assetBytes[i] = decoded.charCodeAt(i);
                    const assetFp = assetSize + ':' + btoa(String.fromCharCode(...assetBytes));
                    if (assetFp === newFp) {
                        if (callback) callback(asset);
                        return;
                    }
                } catch (_) {}
            }
        } catch (_) {}

        this.project.importFile(file, (asset) => {
            if (callback) callback(asset);

            if (asset === null) {
                this.toast('Could not add files to project: ' + file.name, 'error');
            } else {
                this.toast(`Imported ${file.name || "project"} successfully.`);
                this.projectDidChange({ actionName: "Import File As Asset" });
            }
        });
    }

    /**
     * Adds fetched file to builtinPreviews
     * @param {string} filename - name of file
     * @param {File} file - file to add
     */
    addFileToBuiltinPreviews = (filename, file) => {
        this.builtinPreviews[filename] = { blob: file };

        let reader = new FileReader();

        reader.onload = () => {
            let dataURL = reader.result;
            this.builtinPreviews[filename].src = dataURL;

            this.projectDidChange({ skipHistory: true, actionName: "Import File To Builtin Previews" });
        }

        reader.readAsDataURL(file);
    }

    /**
     * Checks if an asset with filename filename exists
     * @param {string} filename - name of file
     */
    isAssetInLibrary = (filename) => {
        let assets = this.project.getAssets();
        for (let i = 0; i < assets.length; i++) {
            if (assets[i].filename === filename) {
                return true;
            }
        }
        return false;
    }

    /**
     * Creates and imports Wick Assets from the acceptedFiles list, and displays an alert message for rejected files.
     * @param {File[]} acceptedFiles - Files uploaded by user with supported MIME types to import into the project
     * @param {File[]} rejectedFiles - Files uploaded by user with unsupported MIME types.
     * @param {object} options - optional flags. Can include "create", which if true will create an instance of the object on the canvas.
     */
    createAssets = (acceptedFiles, rejectedFiles, options) => {
        if (!options) options = {};

        let toastID = this.toast('Importing files...', 'info');

        // Error message for failed uploads
        if (rejectedFiles.length > 0) {
            let fileNamesRejected = rejectedFiles.map(file => file.name).join(', ');
            this.updateToast(toastID, {
                type: 'error',
                text: 'Could not import files: ' + fileNamesRejected
            });
        }

        let createCallback = (asset) => {
            if (options.create) this.createImageFromAsset(asset.uuid, options.location.x || 0, options.location.y || 0);
        }

        // Add all successfully uploaded assets
        for (var i = 0; i < acceptedFiles.length; i++) {
            if (acceptedFiles[i].type === 'image/gif') {
                GIFImport.importGIFIntoProject({
                    gifFile: acceptedFiles[i],
                    project: this.project,
                    onProgress: (percent) => {
                        console.log('GIFImport onProgress: ' + percent);
                    },
                    onFinish: (gifAsset) => {
                        this.project.addAsset(gifAsset);
                        this.projectDidChange({ actionName: "Add Asset" });
                        if (options.create) this.createImageFromAsset(gifAsset.uuid, options.location.x || 0, options.location.y || 0);
                    }
                });
            } else if (acceptedFiles[i].type.startsWith('video/')) {
                const mp4File = acceptedFiles[i];
                const fps = Math.max(1, Math.min(60, Number(prompt('Enter FPS for ' + mp4File.name, String(this.project.framerate)) || this.project.framerate)));
                const mp4ToastID = this.toast(`Importing ${mp4File.name}…`, 'info', { autoClose: false });
                this.showWaitOverlay();
                this.importMP4AsAsset({
                    file: mp4File,
                    fps,
                    onProgress: (msg, p) => this.updateToast(mp4ToastID, { text: `${msg} (${Math.round(p || 0)}%)` }),
                }).then(({ gifAsset }) => {
                    this.updateToast(mp4ToastID, { text: `:) Imported ${mp4File.name}`, type: 'success', autoClose: 7000 });
                    this.hideWaitOverlay();
                    if (options.create) this.createImageFromAsset(gifAsset.uuid, options.location.x || 0, options.location.y || 0);
                }).catch(err => {
                    console.error(err);
                    this.updateToast(mp4ToastID, { text: `Failed to import ${mp4File.name}`, type: 'error', autoClose: 5000 });
                    this.hideWaitOverlay();
                });
            } else {
                var file = acceptedFiles[i];

                this.importFileAsAsset(file, createCallback);
            }
        }
    }

    /**
     * Extracts frames from an MP4 file, builds a GIFAsset from them, and adds
     * it (plus all intermediate image assets) to the current project's asset
     * library. -H.A.
     *
     * @param {File}     file       - The MP4 file to import.
     * @param {number}   fps        - Frame rate to extract at.
     * @param {Function} onProgress - Progress callback (msg, percent).
     * @returns {Promise<{ gifAsset, audioBlob, fps, projectName, width, height }>}
     */
    importMP4AsAsset = ({ file, fps = 12, onProgress = () => {}, bakeAudio = true }) => {
        return new Promise(async (resolve, reject) => {
            try {
                const projectName = file.name.replace(/\.[^.]+$/, '');

                const { imageAssets, audioBlob, fps: extractedFps, width, height } =
                    await MP4ImportPure.importMP4AsSequence({
                        mp4File: file,
                        fps,
                        projectName,
                        onProgress,
                    });

                // Add individual frame images to the project first
                imageAssets.forEach(asset => this.project.addAsset(asset));
                await new Promise(res => this.project.loadAssets(res));

                // Stitch the frame images into a single animated GIF asset
                window.Wick.GIFAsset.fromImages(imageAssets, this.project, (gifAsset) => {
                    gifAsset.name = projectName;
                    gifAsset.filename = projectName;
                    this.project.addAsset(gifAsset);

                    if (!audioBlob || !bakeAudio) {
                        // Project flow: return audioBlob to caller so it can set up root-timeline audio
                        this.projectDidChange({ actionName: 'Imported MP4 as Asset' });
                        resolve({ gifAsset, audioBlob: audioBlob || null, fps: extractedFps, projectName, width, height });
                        return;
                    }

                    // Asset flow: import SoundAsset and bake it into the clip's second layer
                    const audioFile = new File([audioBlob], projectName + '.wav', { type: 'audio/wav' });
                    this.importFileAsAsset(audioFile, (soundAsset) => {
                        if (!soundAsset) {
                            this.projectDidChange({ actionName: 'Imported MP4 as Asset' });
                            resolve({ gifAsset, audioBlob: null, fps: extractedFps, projectName, width, height });
                            return;
                        }

                        // Instantiate the clip, add audio layer, re-serialize back into gifAsset.src
                        gifAsset.createInstance((clip) => {
                            const audioLayer = new window.Wick.Layer();
                            audioLayer.name = 'audio';
                            clip.timeline.addLayer(audioLayer);

                            const frameEnd = clip.timeline.layers[0].length;
                            const audioFrame = new window.Wick.Frame({ start: 1, end: frameEnd });
                            audioLayer.addFrame(audioFrame);
                            audioFrame.sound = soundAsset;

                            // Temporarily attach clip to project so it can be serialized
                            this.project.addObject(clip);
                            window.Wick.WickObjectFile.toWickObjectFile(clip, 'blob', (blobFile) => {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    gifAsset.src = e.target.result;
                                    clip.remove();
                                    this.projectDidChange({ actionName: 'Imported MP4 as Asset' });
                                    resolve({ gifAsset, audioBlob: null, fps: extractedFps, projectName, width, height });
                                };
                                reader.readAsDataURL(blobFile);
                            });
                        }, this.project);
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Begin interactive object creation process.
     */
    beginMakeInteractiveProcess = () => {
        this.openModal("MakeInteractive");
    }

    /**
     * Begin animated object creation process.
     */
    beginMakeAnimatedProcess = () => {
        this.openModal("MakeAnimated");
    }

    /**
     * Export the current project to a new window.
     */
    exportProjectToNewWindow = () => {
        this.showWaitOverlay();
        window.Wick.HTMLPreview.previewProject(this.project, previewWindow => {
            this.hideWaitOverlay();
            if (previewWindow) {
                this.toast('Project preview window opened.', 'info', { autoClose: true });
            } else {
                // If pop ups are disabled, previewWindow will be null.
                this.toast('Could not open a preview window. Try disabling your popup blocker!', 'error', { autoClose: false });
            }
        });
    }

    /**
     * Export the current project as a Wick File using the save as dialog.
     */
    exportProjectAsWickFile = () => {
        this.showWaitOverlay();

        let toastID = this.toast('Exporting project as a .wick file...', 'info', { autoClose: false });

        window.Wick.WickFile.toWickFile(this.project, file => {
            if (file === undefined) {
                this.updateToast(toastID, {
                    type: 'error',
                    text: "Could not export .wick file."
                });
                this.hideWaitOverlay();
                return;
            }

            let success = () => {
                this.updateToast(toastID, {
                    type: 'success',
                    text: "Successfully saved .wick file."
                });
            }

            let fail = () => {
                this.updateToast(toastID, {
                    type: 'error',
                    text: "Error saving .wick file. Please try again."
                });
            }

            file = new Blob([file], { type: 'application/wick' });
            window.saveFileFromWick(file, this.project.name, '.wick', success, fail);

            this.hideWaitOverlay();
        });
    }

    /**
     * Export the current project as an animated GIF.
     */
    exportProjectAsAnimatedGIF = (args) => {
        // Open export media loading bar modal.
        this.openModal('ExportMedia');
        this.setState({
            renderProgress: 0,
            renderType: "gif",
            renderStatusMessage: "Creating gif.",
        });

        // this.showWaitOverlay();
        let outputName = args.name || this.project.name;
        let toastID = this.toast('Exporting animated GIF...', 'info');

        let onProgress = (message, progress) => {
            this.setState({
                renderStatusMessage: message,
                renderProgress: progress
            });
        }

        let onError = (message) => {
            console.error("Gif Render had an error with message: ", message);
        }

        let onFinish = (gifBlob) => {

            let success = () => {
                this.updateToast(toastID, {
                    type: 'success',
                    text: "Successfully saved .gif file."
                });
            }

            let fail = () => {
                this.updateToast(toastID, {
                    type: 'error',
                    text: "Error saving .gif file. Please try again."
                });
            }

            window.saveFileFromWick(gifBlob, outputName, '.gif', success, fail);

            this.setState({
                renderStatusMessage: 'Finished creating GIF.',
                renderProgress: 100
            });
        }

        GIFExport.createAnimatedGIFFromProject({
            width: args.width,
            height: args.height,
            project: this.project,
            onFinish: onFinish,
            onError: onError,
            onProgress: onProgress,
        });

    }

    /**
     * Export the current project as PDF
     */
    exportProjectAsPDFFormat = (args) => {
        this.openModal('ExportMedia');
        this.setState({
            renderProgress: 0,
            renderType: "pdf",
            renderStatusMessage: "Creating PDF.",
            exporting: true,
        });

        const toastID = this.toast('Exporting PDF...', 'info');

        const onProgress = (completed, maxFrames) => {
            const message = "Rendered " + completed + "/" + maxFrames + " pages";
            const percentage = 10 + (70 * (completed / maxFrames));
            this.setState({
                renderStatusMessage: message,
                renderProgress: percentage,
            });
        };

        const finishFail = (msg) => {
            this.updateToast(toastID, { type: 'error', text: msg });
            this.setState({ exporting: false });
        };

        const onFinish = async (frameImages) => {
            try {
                this.setState({ renderStatusMessage: "Building PDF…", renderProgress: 85 });

                if (!frameImages || !frameImages.length) {
                    finishFail("PDF export failed: no frames rendered.");
                    return;
                }

                // Use the ACTUAL rendered frame size (most reliable)
                const pageW = frameImages[0].naturalWidth || frameImages[0].width || (args.width || this.project.width);
                const pageH = frameImages[0].naturalHeight || frameImages[0].height || (args.height || this.project.height);

                // Convert to JPEG DataURLs if needed (PDF writer expects JPEG for /DCTDecode)
                const jpegDataUrls = [];
                for (let i = 0; i < frameImages.length; i++) {
                    const src = frameImages[i].src || "";
                    if (src.startsWith("data:image/jpeg")) {
                        jpegDataUrls.push(src);
                    } else {
                        // Convert PNG/whatever -> JPEG via canvas
                        const jpeg = await new Promise((resolve) => {
                                const canvas = document.createElement("canvas");
                                canvas.width = pageW;
                                canvas.height = pageH;
                                const ctx = canvas.getContext("2d");

                                // White background so transparent PNGs don't go black
                                ctx.fillStyle = "#fff";
                                ctx.fillRect(0, 0, pageW, pageH);

                                ctx.drawImage(frameImages[i], 0, 0, pageW, pageH);
                                resolve(canvas.toDataURL("image/jpeg", 0.92));
                            });
                        // _toJpegDataUrl(frameImages[i], pageW, pageH);
                        jpegDataUrls.push(jpeg);
                    }

                    if (i % 5 === 0) {
                        this.setState({ renderProgress: 85 + Math.round(10 * (i / frameImages.length)) });
                    }
                }

                const pdfBlob = _pdf_buildFromJpegDataUrls(jpegDataUrls, pageW, pageH, Math.round(pageW / 2), Math.round(pageH / 2));

                const success = () => {
                    this.updateToast(toastID, { type: 'success', text: "Successfully saved .pdf file." });
                };

                const fail = () => {
                    this.updateToast(toastID, { type: 'error', text: "Error saving .pdf file. Please try again." });
                };

                window.saveFileFromWick(pdfBlob, this.project.name, '.pdf', success, fail);

                this.setState({
                    renderStatusMessage: 'Finished creating PDF.',
                    renderProgress: 100,
                    exporting: false,
                });
            } catch (e) {
                console.error(e);
                finishFail("Error creating PDF. Check console for details.");
            }
        };

        // Render frames (you CAN request jpeg, but we still convert safely in onFinish)
        this.project.generateImageSequence({
            width: args.width,
            height: args.height,
            imageType: "image/jpeg",
            onProgress,
            onFinish,
        });
    };


    /**
     * Export the current project as an image sequence
     */
    exportProjectAsImageSequence = (args) => {
        this.openModal('ExportMedia');
        this.setState({
            renderProgress: 0,
            renderType: "image sequence",
            renderStatusMessage: "Creating image sequence.",
            exporting: true,
        });

        let toastID = this.toast('Exporting image sequence...', 'info');

        let onProgress = (completed, maxFrames) => {
            let message = "Rendered " + completed + "/" + maxFrames + " frames";
            let percentage = 10 + (90 * (completed / maxFrames));
            this.setState({
                renderStatusMessage: message,
                renderProgress: percentage,
            });
        }

        let onError = (message) => {
            console.error("Image Render had an error with message: ", message);
        }

        let onFinish = (sequenceBlobZip) => {

            let success = () => {
                this.updateToast(toastID, {
                    type: 'success',
                    text: "Successfully saved image sequence."
                });
            }

            let fail = () => {
                this.updateToast(toastID, {
                    type: 'error',
                    text: "Error saving image sequence. Please try again."
                });
            }

            window.saveFileFromWick(sequenceBlobZip, this.project.name + '_imageSequence', '.zip', success, fail);

            this.setState({
                exporting: false,
            })
        }

        window.Wick.ImageSequence.toPNGSequence({
            project: this.project,
            width: args.width,
            height: args.height,
            onProgress: onProgress,
            onError: () => {
                this.hideWaitOverlay();
                onError();
            },
            onFinish: (file) => {
                this.hideWaitOverlay();
                onFinish(file);
            },
        });
    }

    /**
     * Export the current project as a video.
     */
    exportProjectAsVideo = (args) => {
        // Open export media loading bar modal.
        this.openModal('ExportMedia');
        this.setState({
            renderProgress: 10,
            renderType: "video",
            renderStatusMessage: "Creating video.",
            exporting: true,
        });

        let toastID = this.toast('Exporting video...', 'info');

        let onProgress = (message, progress) => {
            this.setState({
                renderStatusMessage: message,
                renderProgress: progress
            });
        }

        let onError = (message) => {
            console.error("Video Render had an error with message: ", message);
        }

        let onFinish = (message) => {
            this.updateToast(toastID, {
                type: 'success',
                text: "Successfully created .mp4 file."
            });
            console.log("Video Render Complete: ", message);

            this.setState({
                exporting: false,
            });
        }

        // this.showWaitOverlay('Rendering video...');
        VideoExport.renderVideo({
            project: this.project,
            width: args.width,
            height: args.height,
            onProgress: onProgress,
            onError: () => {
                this.hideWaitOverlay();
                onError();
            },
            onFinish: () => {
                this.hideWaitOverlay();
                onFinish();
            },
        });
    }
    /**
   * Export the current project as a video.
   */

    exportProjectAsImageSVG = () => {
        // Open export media loading bar modal.
        this.openModal('ExportMedia');
        this.setState({
            renderProgress: 0,
            renderType: "svg",
            renderStatusMessage: "Creating svg.",
        });

        let toastID = this.toast('Exporting svg...', 'info');

        let onError = (message) => {
            console.error("SVG builder had an error with message: ", message);
        }

        let onFinish = (file) => {


            let success = () => {
                this.updateToast(toastID, {
                    type: 'success',
                    text: "Successfully saved .svg file."
                });
            }

            let fail = () => {
                this.updateToast(toastID, {
                    type: 'error',
                    text: "Error saving .svg file. Please try again."
                });
            }

            window.saveFileFromWick(file, this.project.name, '.svg', success, fail);

            this.hideWaitOverlay();
        }

        // this.showWaitOverlay('Rendering video...');
        window.Wick.SVGFile.toSVGFile(this.project.activeTimeline,
            onError, file => {
                this.hideWaitOverlay();
                onFinish(file);
            });
    }

    /**
     * Export the current project as a bundled standalone ZIP that can be uploaded to itch/newgrounds/etc.
     */
    exportProjectAsStandaloneZip = (args) => {
        let toastID = this.toast('Exporting project as ZIP...', 'info');
        let outputName = args.name || this.project.name;
        window.Wick.ZIPExport.bundleProject(this.project, blob => {
            let success = () => {
                this.updateToast(toastID, {
                    type: 'success',
                    text: "Successfully saved .zip file."
                });
            }

            let fail = () => {
                this.updateToast(toastID, {
                    type: 'error',
                    text: "Error saving .zip file. Please try again."
                });
            }

            window.saveFileFromWick(blob, outputName, '.zip', success, fail);

        });
    }

    /**
     * Export the current project as a bundled standalone HTML file.
     */
    exportProjectAsStandaloneHTML = (args) => {
        let toastID = this.toast('Exporting project as HTML...', 'info');
        let outputName = args.name || this.project.name;
        window.Wick.HTMLExport.bundleProject(this.project, html => {
            let file = new Blob([html], { type: 'text/html' });

            let success = () => {
                this.updateToast(toastID, {
                    type: 'success',
                    text: "Successfully saved .html file."
                });
            }

            let fail = () => {
                this.updateToast(toastID, {
                    type: 'error',
                    text: "Error saving .html file. Please try again."
                });
            }

            window.saveFileFromWick(file, outputName, '.html', success, fail);

        });
    }

    /**
     * Exports the audio of a Wick project's audio as a single track in an audio file.
     */
    exportProjectAsAudioTrack = (args) => {
        AudioExport.generateAudioFile({
            project: this.project,
        }).then((result) => {
            window.saveFileFromWick(new Blob([result]), 'audiotrack', '.wav');
        });
    }

    /**
     * Imports a wick file into the editor.
     * @param {File} file Zipped wick file to import.
     */
    // MP4 File Import stuff starts here -H.A.
    importProjectAsWickFile = (file) => {
        this.showWaitOverlay();
        window.Wick.WickFile.fromWickFile(file, project => {
            if (project) {
                this.setupNewProject(project);
                this.toast(`Opened ${file.name || "project"} successfully.`, 'success');
            } else {
                this.toast('Could not open project.', 'error');
                this.hideWaitOverlay();
            }
        });
    }

    /**
     * Sets up a new project in the editor. This operation will remove the
     * history, selection, and all other ability to retrieve your project.
     * @param {Wick.Project} project - the project to load.
     */
    setupNewProject = (project) => {
        // if (!project) return;
        this.resetEditorForLoad();
        this.project = project || new window.Wick.Project();
        this.project.selection.clear();

        // Attach error handling messages
        this.attachErrorHandlers();

        this.projectDidChange({ actionName: "Setup New Project" });
        this.hideWaitOverlay();

        this.project.prepareProjectForEditor();
    }

    openNewProjectConfirmation = () => {
        this.openWarningModal({
            description: "You will lose any unsaved changes.",
            title: "Create New Project?",
            acceptAction: (() => {
                setTimeout(() => {
                    this.setupNewProject();
                }, 100)
            }),
            cancelAction: (() => { }),
            finalAction: (() => {

            }),
            acceptText: "Create",
            acceptIcon: "create",
            cancelText: "Cancel",
            cancelIcon: "cancel-white"
        });
    }

    showAutosavedProjects = () => {
        this.doesAutoSavedProjectExist(exists => {
            if (exists) {
                this.queueModal('AutosaveWarning');
            }
        });
    }

    /**
       * Attempts to parse a url passed to the editor.
       * 
       * if a url is passed to with the 'project' parameter, the editor will attempt to oad that project over https.
       * if a example file name is passed with the 'example' parameter, the editor will attempt to load the example locally.
       * 
       * If the projects are not served over https, or do not exist, an error will be thrown.
       * 
       * the example parameter takes precedence.
       */
    tryToParseProjectURL = () => {
        var urlParams = new URLSearchParams(window.location.search);


        let loadProjectFromURL = (url) => {
            // Download and open the wick project.
            fetch(url)
                .then(resp => resp.blob())
                .then(blob => {
                    window.Wick.WickFile.fromWickFile(blob, loadedProject => {
                        this.setupNewProject(loadedProject);
                    }, 'blob');
                })
                .catch((e) => {
                    this.toast('Could not download project from URL.', 'warning');
                    console.error('tryToParseProjectURL: Could not download Wick project.')
                    console.error(e);
                });;
        }


        if (urlParams.get('example')) {
            let url = window.location.origin + '/examples/' + urlParams.get('example');
            console.log('attempting to load project', url);
            loadProjectFromURL(url);
            return;
        }

        var projectLink = urlParams.get('project');

        // No URL param, skip the download
        if (!projectLink) {
            return false;
        }

        if (!projectLink.startsWith('http')) {
            projectLink = 'https://' + projectLink;
        }

        try {
            // Parse requested URL
            var url = new URL(projectLink);
        } catch {
            this.toast("Project URL is invalid!", 'warning');
            return false;
        }

        // Check if the provided URL is allowed in the whitelist.
        var whitelist = ['wickeditor.com', 'editor.wickeditor.com', 'test.wickeditor.com', 'aka.ms'];

        if (whitelist.indexOf(url.hostname) === -1) {
            this.toast('Could not open project from link! \n URL is not on whitelist.', 'warning');
            console.error('tryToParseProjectURL: URL is not in the whitelist.');
            return false;
        }

        loadProjectFromURL(url);

        return true;
    }

    /**
     * Attach toast messages to the engine error handler.
     */
    attachErrorHandlers = () => {
        // Release any messages we may have had while loading the project.
        if (this.project && this.project._internalErrorMessages) {
            let errors = this.project._internalErrorMessages.concat([]);
            for (let error of errors) {
                this.toast(error, 'error', { autoClose: false }); // Show all errors that occurred while loading the project.
            }
        }

        this.project.onError(message => {
            if (message === 'OUT_OF_BOUNDS' || message === 'LEAKY_HOLE') {
                this.toast('The shape you are trying to fill has a gap.', 'warning');
            } else if (message === 'FILL_EQUALS_HOLE') {
                this.toast("Error: Can't fill the same color.", 'warning');
            } else if (message === 'LOOPING') {
                this.toast('Fill bucket failed. Error: Looping. Try Again?', 'warning');
            } else if (message === 'NO_VALID_CROSSINGS') {
                this.toast('Fill bucket failed. Overlapping shape above?', 'warning');
            } else if (message === 'TOO_COMPLEX') {
                this.toast('Shape is too complex.', 'warning');
            } else if (message === 'NO_PATHS') {
                this.toast('There is no hole to fill.', 'warning');
            } else if (message === 'CLICK_NOT_ALLOWED_LAYER_LOCKED') {
                this.toast('The layer you are trying to draw onto is locked.', 'warning');
            } else if (message === 'CLICK_NOT_ALLOWED_LAYER_HIDDEN') {
                this.toast('The layer you are trying to draw onto is hidden.', 'warning');
            } else if (message === 'CLICK_NOT_ALLOWED_NO_FRAME') {
                this.toast('There is no frame to draw onto.', 'warning');
            } else {
                this.toast(message, 'warning');
            }
        });
    }

    /**
     * Attempts to autosave if enough time has passed since the last autosave.
     */
    requestAutosave = () => {
        let now = Date.now();
        let last = this._lastAutosave;
        let timeSince = now - last;

        // Only autosave every 15 seconds.
        if (timeSince > 15000) {
            this.autoSaveProject(() => {
                this._lastAutosave = Date.now();
            });
        }
    }

    /**
     * Save the current project in localstorage
     */
    autoSaveProject = (callback) => {
        if (!this.project) return;
        if (this.state.previewPlaying) return;
        if (this.state.activeModalName !== null) return;

        window.Wick.AutoSave.save(this.project, () => {
            callback();
        });
    }

    /**
     * Attempts to automatically load an autosaved project if it exists.
     * Does nothing if not autosaved project is stored.
     */
    loadAutosavedProject = (callback) => {
        window.Wick.AutoSave.getAutosavesList(autosaveList => {
            if (!autosaveList[0]) {
                callback();
            } else {
                this.showWaitOverlay();
                window.Wick.AutoSave.load(autosaveList[0].uuid, project => {
                    this.setupNewProject(project);
                    this.hideWaitOverlay();
                    callback();
                });
            }
        });
    }

    /**
     * Check if auto saved project exists.
     * @param  {Function} callback a callback which receives a boolean.
     * True if an autosave exists.
     */
    doesAutoSavedProjectExist = (callback) => {
        window.Wick.AutoSave.getAutosavesList(autosaveList => {
            callback(autosaveList.length > 0);
        });
    }

    /**
     * Clears any autosaved project from local storage.
     */
    clearAutoSavedProject = (callback) => {
        window.Wick.AutoSave.delete(this.project.uuid, () => {
            callback();
        });
    }

    /**
     * Toggle onion skinning on/off.
     */
    toggleOnionSkin = () => {
        this.project.onionSkinEnabled = !this.project.onionSkinEnabled;
        this.projectDidChange({ actionName: "Toggle Onion Skinning" });
    }

    /**
     * Return all possible sound assets.
     */
    getAllSoundAssets = () => {
        return this.project.getAssets('Sound');
    }

    /**
     * Toggles the preview play between on and off states.
     */
    togglePreviewPlaying = () => {
        if (this.processingAction) return;

        let onionSkinningWasOn = false;
        if (!this.state.previewPlaying && this.project.onionSkinEnabled) {
            this.toggleOnionSkin();
            onionSkinningWasOn = true;
        }

        this.showWaitOverlay();
        this.processingAction = true;

        // Apply the change of the current selection before clearing it.
        if (this.project.selection.numObjects > 0) {
            this.project.view.applyChanges();
            this.project.selection.clear();
        }

        // Turn onion skinning back on if it was turned off.
        if (this.state.previewPlaying && this.state.onionSkinningWasOn && !this.project.onionSkinEnabled) {
            this.toggleOnionSkin();
        }

        this.setState({
            previewPlaying: !this.state.previewPlaying,
            showCodeErrors: false,
            onionSkinningWasOn: onionSkinningWasOn,
        });

        this.hideWaitOverlay();
        this.processingAction = false;
    }

    /**
     * Start playing the project from the beginning of the timeline.
     */
    startPreviewPlayFromBeginning = () => {
        if (this.state.previewPlaying) return;

        this.project.focus.timeline.playheadPosition = 1;
        this.togglePreviewPlaying();
    }

    /**
     * Stops the project if it is currently preview playing and displays any errors in the code window.
     * @param {object} error - any errors called while playing
     */
    stopPreviewPlaying = (error) => {

        this.setState({
            previewPlaying: false,
            codeEditorOpen: this.project.error === undefined ? this.state.codeEditorOpen : true,
            showCodeErrors: this.project.error === undefined ? false : true,
        });

        if (error) {
            let obj = window.Wick.ObjectCache.getObjectByUUID(error.uuid);

            if (obj) {
                this.selectObject(obj)
            }

            this.editScript(error.name);
        }

        this.projectDidChange({ actionName: "Stop Preview Playing" });
    }

    /**
     * Clears the current error message in the project.
     */
    clearCodeEditorError = () => {
        this.project.error = null;
        this.setState({
            codeError: null,
        })
        this.projectDidChange({ actionName: "Clear Code Editor Error" });
    }

    /**
     * Returns a lightweight fingerprint of the current system clipboard image (size + first 64 bytes).
     * Used to detect when a clipboard image has become "stale" after an in-editor copy.
     */

    //  Returns the effective clipboard mode, defaulting to 'wick' on iOS/Safari -H.A.
    _getClipboardMode = () => {
        const stored = localStorage.getItem('CandleClipboardMode');
        if(stored) return stored;
        const defaultMode = 'wick';
        localStorage.setItem('CandleClipboardMode', 'wick');
        return defaultMode;
    }

    _getClipboardImageFingerprint = async () => {
        if (!navigator.clipboard || !navigator.clipboard.read) return null;
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
                    return blob.size + ':' + btoa(String.fromCharCode(...bytes));
                }
            }
        } catch (e) {}
        return null;
    }

    /**
     * Copies the selection state and selected objects to the clipboard.
     */
    copySelectionToClipboard = () => {
        if (this.project.copySelectionToClipboard()) {
            this.projectDidChange({ actionName: "Copy Selection" });
            // Mark whatever image is currently in the system clipboard as stale
            // so the next paste prioritizes the wick clipboard over it
            // skip entirely in wick-only mode obv -H.A.
            if (this._getClipboardMode() !== 'wick') {
                this._getClipboardImageFingerprint().then(fp => {
                    // Only update the stale marker when we successfully read the clipboard
                    // If fp is null, clipboard.read() was either blocked or is empty -H.A.
                    if (fp !== null) localStorage.setItem('wickEditorStaleClipboardFP', fp);
                });
            }
        } else {
            this.toast('There is nothing to copy.', 'warning');
        }
    }

    /**
     * Duplicates the current objects in the selection.
     */
    duplicateSelection = () => {
        if (this.project.duplicateSelection()) {
            this.projectDidChange({ actionName: "Duplicate Selection" });
        } else {
            this.toast('There is nothing to duplicate.', 'warning');
        }
    }

    /**
     * Copies the selected objects to the clipboard and then deletes them from the project.
     */
    cutSelectionToClipboard = () => {
        if (this.project.cutSelectionToClipboard()) {
            this.projectDidChange({ actionName: "Cut Selection" });
            // Same stale-image marking as copy — skip in wick-only mode. -H.A.
            if (this._getClipboardMode() !== 'wick') {
                this._getClipboardImageFingerprint().then(fp => {
                    if (fp !== null) localStorage.setItem('wickEditorStaleClipboardFP', fp);
                });
            }
        } else {
            this.toast('There is nothing to duplicate.', 'warning');
        }
    }

    /**
     * Called by the hotkey handler for Cmd+V
     */
    pasteFromClipboard = () => {
        // handled by the 'paste' event listener (see Editor componentDidMount -H.A.)
    }

    /**
     * Pastes from the wick-internal clipboard used by UI buttons (which do NOT
     * fire a browser paste event, so _handlePasteEvent never runs for them)
     */
    pasteWickClipboard = async () => {
        // Button clicks are direct user gestures, so navigator.clipboard.read() is allowed
        // even on iOS Safari. Try system clipboard image first before wick clipboard,
        // unless the user has set wick-only mode in Editor Settings. -H.A.
        if (this._getClipboardMode() !== 'wick' &&
            await this._tryImportSystemClipboardImage()) return;

        if (this.project.pasteClipboardContents())
            this.projectDidChange({ actionName: "Paste from Clipboard" });
        else
            this.toast('There is nothing in the clipboard to paste.', 'warning');
    }

    /**
     * Reads an image from the system clipboard via navigator.clipboard.read()
     * Returns true if paste successful, false to fall back to wick clipboard
     * MUST BE CALLED from direct "user-gesture" (click) so iOS Safari grants 
     * clipboard access -H.A.
     */
    _tryImportSystemClipboardImage = async () => {
        if (!navigator.clipboard || !navigator.clipboard.read) return false;
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (!imageType) continue;
                const blob = await item.getType(imageType);
                const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
                const fp = blob.size + ':' + btoa(String.fromCharCode(...bytes));
                const stale = localStorage.getItem('wickEditorStaleClipboardFP');
                if (stale && fp === stale) return false; // stale — caller should use wick clipboard

                const ext = (imageType.split('/')[1] || 'png');
                const rawName = 'pasted-image.' + ext;
                const assetNames = new Set(this.project.getAssets().map(a => a.filename));
                let finalName = rawName;
                let counter = 0;
                while (assetNames.has(finalName)) { counter++; finalName = 'pasted-image-' + counter + '.' + ext; }
                const finalFile = new File([blob], finalName, { type: imageType });

                const loc = { x: this._lastMouseX || 0, y: this._lastMouseY || 0 };
                this.importFileAsAsset(finalFile, (asset) => {
                    if (!asset) {
                        localStorage.setItem('wickEditorStaleClipboardFP', fp);
                        if (this.project.pasteClipboardContents())
                            this.projectDidChange({ actionName: "Paste from Clipboard" });
                        return;
                    }
                    const paper = this.project.view.paper;
                    const canvasPos = paper.project.view.element.getBoundingClientRect();
                    const relX = loc.x - canvasPos.left;
                    const relY = loc.y - canvasPos.top;
                    const onCanvas = relX >= 0 && relX <= canvasPos.width && relY >= 0 && relY <= canvasPos.height;
                    const dropPoint = paper.view.viewToProject(
                        new window.paper.Point(
                            onCanvas ? relX : canvasPos.width / 2,
                            onCanvas ? relY : canvasPos.height / 2
                        )
                    );
                    this.project.createImagePathFromAsset(asset, dropPoint.x, dropPoint.y, (path) => {
                        if (path) {
                            this.clearSelection();
                            this.selectObject(path);
                            this.project.copySelectionToClipboard();
                        }
                        localStorage.setItem('wickEditorStaleClipboardFP', fp);
                        this.projectDidChange({ actionName: "Paste Image from Clipboard" });
                    });
                });
                return true;
            }
        } catch (e) {}
        return false;
    }

    /**
     * Core paste handler — called from the document 'paste' event listener.
     * Uses e.clipboardData which gives us real File objects with filenames and etc. -H.A.
     */
    _handlePasteEvent = async (e) => {
        // Wick-only mode: skip device clipboard entirely -H.A.
        if (this._getClipboardMode() === 'wick') {
            if (this.project.pasteClipboardContents())
                this.projectDidChange({ actionName: "Paste from Clipboard" });
            else
                this.toast('There is nothing in the clipboard to paste.', 'warning');
            return;
        }

        const items = Array.from((e.clipboardData && e.clipboardData.items) || []);

        // imageFile  — what gets imported (PNG JPEG etc. or TIFF→PNG converted)
        // rawFileForFP — raw bytes used for fingerprint (must match _getClipboardImageFingerprint)
        let imageFile = null, rawFileForFP = null;

        // Pass 1: directly usable image formats (PNG, JPEG, GIF, WEBP)
        // getAsFile() returns a File with the ORIGINAL filename when copied from Finder/Discord/etc.
        for (const item of items) {
            if (item.kind !== 'file') continue;
            if (['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(item.type)) {
                imageFile = rawFileForFP = item.getAsFile();
                break;
            }
        }

        // Pass 2: TIFF (macOS clipboard for Finder/app copies) → convert to PNG via canvas
        if (!imageFile) {
            for (const item of items) {
                if (item.kind !== 'file' || item.type !== 'image/tiff') continue;
                const tiffFile = item.getAsFile();
                if (!tiffFile) continue;
                rawFileForFP = tiffFile;
                try {
                    const pngBlob = await new Promise((resolve, reject) => {
                        const url = URL.createObjectURL(tiffFile);
                        const img = new Image();
                        img.onload = () => {
                            const c = document.createElement('canvas');
                            c.width = img.naturalWidth; c.height = img.naturalHeight;
                            c.getContext('2d').drawImage(img, 0, 0);
                            c.toBlob(b => { URL.revokeObjectURL(url); resolve(b); }, 'image/png');
                        };
                        img.onerror = () => { URL.revokeObjectURL(url); reject(); };
                        img.src = url;
                    });
                    // Replace .tiff/.tif extension with .png in the filename
                    const pngName = (tiffFile.name || 'image.tiff').replace(/\.tiff?$/i, '.png');
                    imageFile = new File([pngBlob], pngName, { type: 'image/png' });
                } catch (_) {
                    rawFileForFP = null;
                }
                break;
            }
        }

        if (imageFile && rawFileForFP) {
            // Fingerprint from rawFileForFP keeps consistency with _getClipboardImageFingerprint
            const fpBytes = new Uint8Array(await rawFileForFP.slice(0, 64).arrayBuffer());
            const fp = rawFileForFP.size + ':' + btoa(String.fromCharCode(...fpBytes));
            const stale = localStorage.getItem('wickEditorStaleClipboardFP');

            if (!stale || fp !== stale) {
                // naming convention stuff here -H.A.
                const rawName = imageFile.name || ('pasted-image.' + ((imageFile.type || 'image/png').split('/')[1] || 'png'));
                const dotIdx = rawName.lastIndexOf('.');
                const stem = dotIdx >= 0 ? rawName.slice(0, dotIdx) : rawName;
                const extPart = dotIdx >= 0 ? rawName.slice(dotIdx) : '';
                const assetNames = new Set(this.project.getAssets().map(function(a) { return a.filename; }));
                let finalName = rawName;
                let counter = 0;
                while (assetNames.has(finalName)) { counter++; finalName = stem + '-' + counter + extPart; }
                const finalFile = counter > 0 ? new File([imageFile], finalName, { type: imageFile.type }) : imageFile;

                const loc = { x: this._lastMouseX || 0, y: this._lastMouseY || 0 };
                this.importFileAsAsset(finalFile, (asset) => {
                    if (!asset) {
                        // import failed — mark this image as stale so future pastes
                        localStorage.setItem('wickEditorStaleClipboardFP', fp);
                        if (this.project.pasteClipboardContents())
                            this.projectDidChange({ actionName: "Paste from Clipboard" });
                        return;
                    }
                    const paper = this.project.view.paper;
                    const canvasPos = paper.project.view.element.getBoundingClientRect();
                    // If the mouse is outside the canvas, paste at canvas centeer instead -H.A. :P
                    const relX = loc.x - canvasPos.left;
                    const relY = loc.y - canvasPos.top;
                    const onCanvas = relX >= 0 && relX <= canvasPos.width && relY >= 0 && relY <= canvasPos.height;
                    const dropPoint = paper.view.viewToProject(
                        new window.paper.Point(
                            onCanvas ? relX : canvasPos.width / 2,
                            onCanvas ? relY : canvasPos.height / 2
                        )
                    );
                    this.project.createImagePathFromAsset(asset, dropPoint.x, dropPoint.y, (path) => {
                        if (path) {
                            this.clearSelection();
                            this.selectObject(path);
                            this.project.copySelectionToClipboard();
                        }
                        localStorage.setItem('wickEditorStaleClipboardFP', fp);
                        this.projectDidChange({ actionName: "Paste Image from Clipboard" });
                    });
                });
                return;
            }
        }

        // iOS Safari doesn't populate clipboardData with images — try Clipboard API as fallback
        if (!imageFile && await this._tryImportSystemClipboardImage()) return;

        // No image in paste event (or image was stale) — fall back to Wick clipboard
        if (this.project.pasteClipboardContents()) {
            this.projectDidChange({ actionName: "Paste from Clipboard" });
        } else {
            this.toast('There is nothing in the clipboard to paste.', 'warning');
        }
    }

    /**
     * Creates a new keyframe at the current playhead position.
     */
    addTweenKeyframe = () => {
        if (!this.project.activeFrame) return;
        this.project.activeFrame.createTween();
        this.projectDidChange({ actionName: "Add Tween Keyframe" });
    }

    /**
     * Returns all existing fonts in the project.
     */
    getExistingFonts = () => {
        return this.project.getFonts();
    }

    /**
     * returns true if the project has the passed in font.
     * @param {string} font Font to check
     * @return {boolean} true if the project has this font.
     */
    hasFont = (font) => {
        return this.project.hasFont(font);
    }

    extendFrame = () => {
        var frames = this.project.selection.getSelectedObjects('Frame');
        this.project.extendFrames(frames);
        this.project.guiElement.draw();
    }

    shrinkFrame = () => {
        var frames = this.project.selection.getSelectedObjects('Frame');
        this.project.shrinkFrames(frames);
        this.project.guiElement.draw();
    }

    moveFrameRight = () => {
        this.project.moveSelectedFramesRight();
        this.project.guiElement.draw();
    }

    moveFrameLeft = () => {
        this.project.moveSelectedFramesLeft();
        this.project.guiElement.draw();
    }

    createTween = () => {
        this.project.createTween();
        this.projectDidChange({ actionName: "Create Tween" });
    }

    cutFrame = () => {
        this.project.cutSelectedFrames();
        this.projectDidChange({ actionName: "Cut Frame" });
    }

    insertBlankFrame = () => {
        this.project.insertBlankFrame();
        this.projectDidChange({ actionName: "Insert Blank Frame" });
    }

    extendSelectedFramesAndPushOtherFrames = () => {
        var frames = this.project.selection.getSelectedObjects('Frame');
        this.project.extendFramesAndPushOtherFrames(frames);
        this.project.guiElement.draw();
    }

    shrinkSelectedFramesAndPullOtherFrames = () => {
        var frames = this.project.selection.getSelectedObjects('Frame');
        this.project.shrinkFramesAndPullOtherFrames(frames);
        this.project.guiElement.draw();
    }

    extendActiveFramesAndPushOtherFrames = () => {
        var frames = this.project.activeTimeline.activeFrames;
        this.project.extendFramesAndPushOtherFrames(frames);
        this.project.guiElement.draw();
    }

    shrinkActiveFramesAndPullOtherFrames = () => {
        var frames = this.project.activeTimeline.activeFrames;
        this.project.shrinkFramesAndPullOtherFrames(frames);
        this.project.guiElement.draw();
    }

    exportSelectedClip = () => {
        var clip = this.project.selection.getSelectedObject();
        if (!clip) return;
        if (!(clip instanceof window.Wick.Clip)) return;

        window.Wick.WickObjectFile.toWickObjectFile(clip, 'blob', file => {
            window.saveFileFromWick(file, (clip.identifier || 'object'), '.wickobj');
        });
    }

    onEyedropperPickedColor = (e) => {
        this._onEyedropperPickedColor(e.color);
        this.activateLastTool();
    }

    handleWickFileLoad = async (e) => {
        var file = e.target.files[0];
        if (!file) {
            console.warn('handleWickFileLoad: no files recieved');
            return;
        }

        // if file is a PDF, handle differently
        if (file.type === 'application/pdf') {
            const toastID = this.toast(`Loading ${file.name}…`, 'info', { autoClose: false });
            this.showWaitOverlay() // disable clicking anywhere

            // start up a new project
            this.setupNewProject();
            this.projectDidChange({ actionName: 'Reset project' });
            // this.showWaitOverlay();

            // GET ALL FRAMES FROM GIF
            const { pageFiles, width, height } = await importPDFAsSequence({
                pdfFile: file,
                scale: 2,
                onProgress: (msg, p) => this.updateToast(toastID, { text: `${msg} (${Math.round(p)}%)` })
            })

            this.project.width = width
            this.project.height = height
            this.project.name = file.name.replace(".pdf", "")
            this.projectDidChange({ actionName: 'Adjusted settings based on PDF' });

            // adding all new page image files to the asset library
            for (const f of pageFiles) {
                await new Promise(res => this.importFileAsAsset(f, res))
            }

            await new Promise(res => this.project.loadAssets(res))

            const pages = this.project.assets;
            let tl = this.project.activeTimeline;
            tl.layers[0].name = "PDF";

            const x = this.project.width / 2
            const y = this.project.height / 2
            // add every page asset on a frame
            for (let i = 0; i < pages.length; i++) {
                tl.playheadPosition = i + 1

                await new Promise(done => {
                    this.project.createImagePathFromAsset(pages[i], x, y, () => done())
                })
            }
            this.project.focus.timeline.playheadPosition = 1;

            this.projectDidChange({ actionName: 'Placed PDF pages onto frames' })
            this.updateToast(toastID, { text: `:) Imported ${file.name}`, type: 'success', autoClose: 7000 })
            this.hideWaitOverlay(); // disable clicking anywhere

            return;
        }


        // if not a video file just load it then
        if (!file.type.startsWith('video/')) {
            this.importProjectAsWickFile(file);
            return;
        }

        // if an mp4 file then translate it before opening it
        try {
            const fps = Math.max(1, Math.min(60, Number(prompt("Enter FPS", String(this.project.framerate)) || this.project.framerate)));
            const toastID = this.toast(`Loading ${file.name}…`, 'info', { autoClose: false });

            // NOTE: must set up the new project BEFORE importing so assets have
            // somewhere to live (avoids stale-project console errors).
            this.setupNewProject();
            this.projectDidChange({ actionName: 'Reset project' });
            this.showWaitOverlay();

            // Extract frames + build GIF asset → adds everything to this.project
            // bakeAudio: false so we handle audio on the root timeline instead
            const { gifAsset, audioBlob, fps: extractedFps, projectName, width, height } =
                await this.importMP4AsAsset({
                    file,
                    fps,
                    bakeAudio: false,
                    onProgress: (msg, p) => this.updateToast(toastID, { text: `${msg} (${Math.round(p || 0)}%)` }),
                });

            // Fit project to the video
            this.project.width = width;
            this.project.height = height;
            this.project.framerate = extractedFps;
            this.project.name = projectName;
            this.projectDidChange({ actionName: 'Adjusted settings based on MP4' });

            // Extend the root frame and place the clip on the canvas
            this.project._children[1].activeFrame.end = this.project._children.length - 3;

            this.project.createClipInstanceFromAsset(gifAsset, this.project.width / 2, this.project.height / 2, (clip) => {
                this.selectObject(clip);
                this.setSelectionAttribute('animationType', 'playOnce');
                this.setSelectionAttribute('isSynced', true);
                this.clearSelection();

                const tl = this.project.activeTimeline;
                tl.layers[0].name = "video";

                // Add an empty drawing layer and move it to the top
                const drawingLayer = new window.Wick.Layer();
                drawingLayer.name = 'Layer';
                tl.addLayer(drawingLayer);
                drawingLayer.addFrame(new window.Wick.Frame({ start: 1, end: 1 }));
                tl.moveLayer(drawingLayer, 0);
                // Layer order: drawing(0), video(1), then audio below

                // Add the audio track if the video had audio
                if (audioBlob) {
                    tl.addLayer(new window.Wick.Layer());
                    // Layer order: drawing(0), video(1), audio(2)
                    tl.layers[2].name = "audio";
                    tl.layers[2].addFrame(new window.Wick.Frame());
                    tl.layers[2].frames[0].end = tl.layers[1].frames[0].end;

                    const audioFile = new File([audioBlob], projectName + ".wav", { type: 'audio/wav' });
                    this.importFileAsAsset(audioFile, () => {
                        this.project.loadAssets(() => {
                            this.setActiveLayerIndex(2);
                            this.addSoundToActiveFrame(this.project.assets[this.project.assets.length - 1]);
                            this.setActiveLayerIndex(0);
                        });
                    });
                }

                this.projectDidChange({ actionName: 'Opened MP4 as GIF sequence' });
                this.updateToast(toastID, { text: `:) Imported ${file.name}`, type: 'success', autoClose: 7000 });
                this.hideWaitOverlay();
            });

        } catch (err) {
            console.error(err);
            this.toast('Failed to import MP4.', 'error');
            this.hideWaitOverlay();
        }

    }

    /**
     * Loads Local Wick File from
     * @param {*} fileEntry 
     */
    loadLocalWickFile = (fileEntry) => {
        if (window.loadWickFileEntry) {
            window.loadWickFileEntry(fileEntry, (blob) => {
                // Wraps the file in a fake event. TODO: Simplify this.
                this.handleWickFileLoad({
                    target: {
                        files: [blob]
                    }
                });
            });
        } else {
            console.error("No File Entry Opener Provided");
        }
    }

    /**
     * Deletes local Wick File From Storage.
     * @param {FileEntry} fileEntry 
     */
    deleteLocalWickFile = (fileEntry) => {
        window.deleteLocalWickFile(fileEntry);
    }

    /**
     * Reloads any saved files currently on disk.
     */
    reloadSavedWickFiles = () => {
        if (window.getSavedWickFiles) {
            window.getSavedWickFiles(files => {
                this.setState({
                    localSavedFiles: files,
                });
            });
        }
    }

}

function _pdf_strToU8(str) {
    const out = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff
    return out
}

function _pdf_b64ToU8(b64) {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

function _pdf_concatU8(chunks) {
    let total = 0
    for (const c of chunks) total += c.length
    const out = new Uint8Array(total)
    let off = 0
    for (const c of chunks) {
        out.set(c, off)
        off += c.length
    }
    return out
}

function _pdf_buildFromJpegDataUrls(jpegDataUrls, imgW, imgH, pdfW, pdfH) {
    // imgW/imgH = pixel dimensions of the JPEG (image quality)
    // pdfW/pdfH = PDF page dimensions in points (physical size, 72pt = 1 inch)
    if (!pdfW) pdfW = imgW;
    if (!pdfH) pdfH = imgH;

    const objects = [] // each entry is Uint8Array of object BODY (no "obj/endobj")
    //this warning for unexpected use of comma operator is kinda annoying therefore added the eslint
// eslint-disable-next-line
    const addObj = (bodyU8) => (objects.push(bodyU8), objects.length) // returns obj id (1-based)

    // placeholders
    const catalogId = addObj(_pdf_strToU8(""))
    const pagesId = addObj(_pdf_strToU8(""))

    const pageIds = []

    for (let i = 0; i < jpegDataUrls.length; i++) {
        const url = jpegDataUrls[i]
        const b64 = url.split(",")[1] || ""
        const jpg = _pdf_b64ToU8(b64)

        const imgName = `/Im${i}`

        // Image XObject — use full pixel dimensions for crispness
        const imgDict =
            `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`
        const imgBody = _pdf_concatU8([
            _pdf_strToU8(imgDict),
            jpg,
            _pdf_strToU8("\nendstream\n")
        ])
        const imgId = addObj(imgBody)

        // Contents stream — scale image to fill pdfW x pdfH points
        const contents = `q ${pdfW} 0 0 ${pdfH} 0 0 cm ${imgName} Do Q\n`
        const contentsDict = `<< /Length ${contents.length} >>\nstream\n${contents}endstream\n`
        const contentsId = addObj(_pdf_strToU8(contentsDict))

        // Page object — physical page size in points
        const pageObj =
            `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] ` +
            `/Resources << /XObject << ${imgName} ${imgId} 0 R >> >> ` +
            `/Contents ${contentsId} 0 R >>\n`
        const pageId = addObj(_pdf_strToU8(pageObj))
        pageIds.push(pageId)
    }

    // Fill Pages + Catalog
    const kids = pageIds.map(id => `${id} 0 R`).join(" ")
    objects[pagesId - 1] = _pdf_strToU8(`<< /Type /Pages /Count ${pageIds.length} /Kids [ ${kids} ] >>\n`)
    objects[catalogId - 1] = _pdf_strToU8(`<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`)

    // Assemble final PDF
    const header = _pdf_strToU8("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
    const chunks = [header]

    const offsets = new Array(objects.length + 1).fill(0) // offsets[0] unused for xref
    let cursor = header.length

    for (let i = 0; i < objects.length; i++) {
        const id = i + 1
        offsets[id] = cursor

        const objHeader = _pdf_strToU8(`${id} 0 obj\n`)
        const objFooter = _pdf_strToU8("endobj\n")
        const objBytes = _pdf_concatU8([objHeader, objects[i], objFooter])

        chunks.push(objBytes)
        cursor += objBytes.length
    }

    const xrefStart = cursor
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    for (let i = 1; i <= objects.length; i++) {
        xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
    }
    const trailer =
        `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

    chunks.push(_pdf_strToU8(xref))
    chunks.push(_pdf_strToU8(trailer))

    const pdfBytes = _pdf_concatU8(chunks)
    return new Blob([pdfBytes], { type: "application/pdf" })
}


export default EditorCore;
