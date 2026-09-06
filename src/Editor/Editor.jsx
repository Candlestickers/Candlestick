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

import './_editor.scss';
import './styles/default_theme.css';
import './styles/default_styles.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'
import 'react-reflex/styles.css'
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex'
import localForage from 'localforage';
import 'react-toastify/dist/ReactToastify.css';
import { toast } from 'react-toastify';
import { useResizeDetector } from 'react-resize-detector';

import HotKeyInterface from './hotKeyMap';
import ActionMapInterface from './actionMap';
import ScriptInfoInterface from './scriptInfo';
import FontInfoInterface from './fontInfo';
import EditorCore from './EditorCore';

import DockedPanel from './Panels/DockedPanel/DockedPanel';
import Canvas from './Panels/Canvas/Canvas';
import Inspector from './Panels/Inspector/Inspector';
import MenuBar from './Panels/MenuBar/MenuBar';
import Timeline from './Panels/Timeline/Timeline';
import MobileContainer from './Panels/MobileContainer/MobileContainer'
import DeleteCopyPaste from './Panels/DeleteCopyPaste/DeleteCopyPaste';
import CanvasTransforms from './Panels/CanvasTransforms/CanvasTransforms';
import Toolbox from './Panels/Toolbox/Toolbox';
import AssetLibrary from './Panels/AssetLibrary/AssetLibrary';
import Outliner from './Panels/Outliner/Outliner';
import OutlinerExpandButton from './Panels/OutlinerExpandButton/OutlinerExpandButton';
import WickCodeEditor from './PopOuts/WickCodeEditor/WickCodeEditor';

import EditorWrapper from './EditorWrapper';


import { readFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core';

function throttle(fn, wait) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

// app wick, for handling directly opening files from finder/ file explorer
async function loadPathIntoEditor(editorThis, filePath) {
    try {

        const name = filePath.split('/').pop();

        // .WICK/ PROJECT FILE
        const VIDEO_MIME = {
            '.mp4': 'video/mp4', '.m4v': 'video/x-m4v',
            '.mov': 'video/quicktime',
            '.webm': 'video/webm',
            '.ogv': 'video/ogg', '.ogg': 'video/ogg',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.3gp': 'video/3gpp',
            '.wmv': 'video/x-ms-wmv',
        }
        const videoExt = Object.keys(VIDEO_MIME).find(ext => name.endsWith(ext))

        if (
            name.endsWith('.wick') ||
            videoExt
        ) {


            const bytes = await readFile(filePath, { encoding: null })
            const blob = new Blob([bytes])
            const file = new File([blob], name, {
                type: (name.endsWith('.wick') && 'application/zip') || (videoExt && VIDEO_MIME[videoExt]) || 'video/mp4'
            });


            editorThis.handleWickFileLoad({ target: { files: [file] } })

            // .WICKOBJ/ ASSET FILE
        } else if (
            name.endsWith('.wickobj') ||
            name.endsWith('.mp3') ||
            name.endsWith('.wav') ||
            name.endsWith('.png') ||
            name.endsWith('.jpeg') ||
            name.endsWith('.jpg') ||
            name.endsWith('.gif')
        ) {
            if (name.endsWith('.wickobj')) {
                const json = await readFile(filePath, { encoding: 'utf-8' })
                const projectData = JSON.parse(json)
                editorThis.importFileAsAsset(projectData)
            } else {
                const bytes = await readFile(filePath, { encoding: null })
                let mimeType = ''

                if (name.endsWith('.mp3')) mimeType = 'audio/mpeg'
                else if (name.endsWith('.wav')) mimeType = 'audio/wav'
                else if (name.endsWith('.png')) mimeType = 'image/png'
                else if (name.endsWith('.jpeg') || name.endsWith('.jpg')) mimeType = 'image/jpeg'
                else if (name.endsWith('.gif')) mimeType = 'image/gif'

                const blob = new Blob([bytes], { type: mimeType })
                const file = new File([blob], name, { type: mimeType })
                editorThis.importFileAsAsset(file)
            }

        } else { // if all else fails
            editorThis.toast('Unsupported file type.', 'error')
        }
    } catch (e) {
        console.error('Failed to open file from system:', e)
        editorThis.toast('Could not open file.', 'error')
    }
}


import { version } from '../../package.json';

import classNames from 'classnames';

// Watches for container resize and calls onResize, replacing react-sizeme
function ResizeTrigger({ onResize, children }) {
    const { ref } = useResizeDetector({ onResize });
    return <div ref={ref} style={{ width: '100%', height: '100%' }}>{children}</div>;
}

class Editor extends EditorCore {
    constructor() {
        super();

        // Set path for engine dependencies
        window.Wick.resourcepath = 'corelibs/wick-engine/';

        // "Live" editor states
        this.project = null;
        this.paper = null;
        this.editorVersion = version + '';

        // GUI state
        this.state = {
            project: null,
            previewPlaying: false,
            activeModalName: window.localStorage.skipWelcomeMessage ? null : "WelcomeMessage",
            activeModalQueue: [],
            codeEditorOpen: false,
            scriptToEdit: "default",
            showCanvasActions: false,
            showBooleanCanvasActions: false,
            showLayersCanvasActions: false,
            showAlignmentCanvasActions: false,
            showBrushModes: false,
            showCodeErrors: false,
            codeError: null,
            popoutOutlinerSize: 250,
            outlinerPoppedOut: false,
            inspectorSize: 250,
            timelineSize: 175,
            assetLibrarySize: 150,
            consoleLogs: [],
            warningModalInfo: {
                description: "No Description Given",
                title: "Title",
                acceptText: "Accept",
                cancelText: "Cancel",
                acceptAction: (() => { console.warn("No Accept Action") }),
                cancelAction: (() => { console.warn("No Cancel Action") }),
            },
            renderProgress: 0,
            renderType: "default",
            renderStatusMessage: "",
            customHotKeys: {},
            colorPickerType: "swatches",
            lastColorsUsed: ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"],
            exporting: false,
            useCustomOnionSkinningColors: false,
            customOnionSkinningColors: {
                backward: "rgba(0, 255, 0, .3)",
                forward: "rgba(255, 0, 0, .3)",
            },
            onionSkinningWasOn: false,
            localSavedFiles: [], // Files to display in savedProjects Modal.
        };

        // Catch all errors that happen in the editor.
        window.onerror = function (error, url, line) {

            console.error(error);
            console.log("Error Details:", {
                error,
                url,
                line
            })
            return true;
        }


        // Set up error.
        this.error = null;

        // Last Autosave
        this._lastAutosave = 0;

        // Create interfaces.
        this.fontInfoInterface = new FontInfoInterface(this);

        // Init hotkeys
        this.hotKeyInterface = new HotKeyInterface(this);

        // Init actions
        this.actionMapInterface = new ActionMapInterface(this);

        // Init Script Info
        this.scriptInfoInterface = new ScriptInfoInterface();

        // Check if we are using local saving (apps)...
        if (window.wickEditorFileSystemType === 'local') {
            window.openWickLocalFileViewer = (files) => {
                console.log("Files Received", files);
                this.setState({
                    localSavedFiles: files,
                    activeModalName: 'SavedProjects',
                });
            }

            /**
             * Called if a save is attempted and a file with the same name already exists.
             * @param {Object} args - Wrapper for openWarningModal 
             */
            window.warnBeforeSave = (args) => { this.openWarningModal(args) };
        }

        // Wick Project File Input
        this.openProjectFileFromClient = window.createFileInput({
            accept: '.zip, .wick, video/*, .pdf',
            onChange: this.handleWickFileLoad,
        });

        // Wick file input
        this.openAssetFileFromClient = window.createFileInput({
            accept: window.Wick?.FileAsset?.getValidExtensions().join(', '),
            onChange: this.handleAssetFileImport,
            multiple: true,
        });

        // Set up color picker
        this.maxLastColors = 8;
        this._onEyedropperPickedColor = (color) => { };

        // Resizable panels
        this.RESIZE_THROTTLE_AMOUNT_MS = 100;
        this.WINDOW_RESIZE_THROTTLE_AMOUNT_MS = 300;
        this.resizeProps = {
            onStopResize: throttle(this.onStopResize, this.resizeThrottleAmount),
            onStopPopoutOutlinerResize: throttle(this.onStopPopoutOutlinerResize, this.resizeThrottleAmount),
            onStopInspectorResize: throttle(this.onStopInspectorResize, this.resizeThrottleAmount),
            onStopAssetLibraryResize: throttle(this.onStopAssetLibraryResize, this.resizeThrottleAmount),
            onStopTimelineResize: throttle(this.onStopTimelineResize, this.resizeThrottleAmount),
            onStopCodeEditorResize: throttle(this.onStopCodeEditorResize, this.resizeThrottleAmount),
            onResize: throttle(this.onResize, this.resizeThrottleAmount),
            onWindowResize: throttle(this.onWindowResize, this.windowResizeThrottleAmount),
        };
        window.addEventListener("resize", this.resizeProps.onWindowResize);

        this.canvasComponent = null;
        this.timelineComponent = null;

        this.lastUsedTool = 'cursor';

        this.builtinPreviews = {};
    }

    componentDidMount = async () => {
        document.title = `Candlestick ${this.editorVersion}`;

        // Initialize "live" engine state
        this.project = new window.Wick.Project();
        this.attachErrorHandlers();
        this.paper = window.paper;

        // Initialize local storage
        localForage.config({
            name: 'WickEditor',
            description: 'Live Data storage of the Wick Editor app.'
        });

        this.customHotKeysKey = "wickEditorcustomHotKeys";
        this.colorPickerTypeKey = "wickEditorColorPickerType";

        // Set up custom hotkeys if they exist.
        localForage.getItem(this.customHotKeysKey).then(
            (customHotKeys) => {
                if (!customHotKeys) customHotKeys = {}; // Ensure we never send a null hotkey setting.
                this.hotKeyInterface.setCustomHotKeys(customHotKeys);

                this.setState({
                    customHotKeys: customHotKeys,
                });
            }
        );

        // Set color picker state.
        localForage.getItem(this.colorPickerTypeKey).then(
            (colorPickerType) => {
                if (!colorPickerType) colorPickerType = "swatches";
                this.setState({
                    colorPickerType: colorPickerType,
                });
            }
        );

        // Setup the initial project state
        this.setState({
            ...this.state,
            project: this.project.serialize(),
            codeEditorWindowProperties: this.getDefaultCodeEditorProperties(),
        });

        // Leave Page warning.
        window.onbeforeunload = function (event) {
            // Don't show the warning if nothing has been done to the project
            if (this.project.numUndoStates > 1) {
                return null;
            }

            var confirmationMessage = 'Warning: All unsaved changes will be lost!';
            (event || window.event).returnValue = confirmationMessage; //Gecko + IE
            return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
        };

        console.log("Project Mounted");
        this.project.WickPM.install();
        this.hidePreloader();
        this.onWindowResize();
        // onWindowResize() call above. second resize after a short delay to lets WebKit complete its paint before we recalculate panel sizes
        // THIS IS IMPORTANT for safari & mac builts -H.A.
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
        if (!this.tryToParseProjectURL()) {
            this.showAutosavedProjects();
        }

        this.watchForHover();

        // Track mouse position to use whn pasting images 👀
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        this._mouseMoveHandler = (e) => {
            this._lastMouseX = e.clientX;
            this._lastMouseY = e.clientY;
        };
        document.addEventListener('mousemove', this._mouseMoveHandler);

        // Paste event listener — fires because we no longer call e.preventDefault() on the
        // Cmd+V keydown for 'paste'. This gives us clipboardData with real File objects
        // (original filenames, Finder file copies, Discord/Figma images, etc.)
        this._pasteHandler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            this._handlePasteEvent(e);
        };
        document.addEventListener('paste', this._pasteHandler);

        // check to see if we're in the app
        if (window.__TAURI__) {
            // Force a window resize event shortly after app launches.
            // This is a hacky fix to make sure the MacOS tauri app doesn't render the UI with a width/height of zero.

            window.alert = (text) => window.editor.toast(text);

            // Let Rust know we’re alive
            invoke('frontend_ready').catch(() => { })

            // ask Rust if this window has a pending file
            // (this is to allow opening wick files by double clicking em')
            setTimeout(async () => {
                try {
                    const path = await invoke('take_pending_file');
                    if (path) { // open the file if so
                        console.log('Taking pending file for this window:', path);
                        await loadPathIntoEditor(this, path);
                    }
                } catch (e) {
                    console.warn('take_pending_file failed', e)
                }
            }, 200) // small delay
        }
    }

    // apparently need this for cleanup -H.A.
    componentWillUnmount = () => {
        document.removeEventListener('mousemove', this._mouseMoveHandler);
        document.removeEventListener('paste', this._pasteHandler);
        window.removeEventListener('resize', this.resizeProps.onWindowResize);
    }

    componentDidUpdate = (prevProps, prevState) => {
        if (this.state.previewPlaying && !prevState.previewPlaying) {
            this.project.view.canvas.focus();
            this.project.play({
                onError: (error) => {
                    if (error) {
                        console.error(new Error(`${error.message} on line ${error.lineNumber} in script "${error.name}".`));
                        this.setState({
                            codeError: error,
                        });
                    }


                    this.stopPreviewPlaying(error)
                },
                onAfterTick: () => {
                    //this.project.view.render();
                    this.project.guiElement.draw();
                },
                onBeforeTick: () => {

                },
            });
        }

        if (!this.state.previewPlaying && prevState.previewPlaying) {
            this.project.stop();
            this.projectDidChange({ skipHistory: true, actionName: "Stop Project" });
        }
    }

    // Detects if the device has hover capability. Adds "hasHover" to the body to avoid 'Sticky-hover' on touch devices.
    // https://stackoverflow.com/questions/23885255/how-to-remove-ignore-hover-css-style-on-touch-devices
    watchForHover = () => {
        // lastTouchTime is used for ignoring emulated mousemove events
        let lastTouchTime = 0

        function enableHover() {
            if (new Date() - lastTouchTime < 500) return
            document.body.classList.add('hasHover')
        }

        function disableHover() {
            document.body.classList.remove('hasHover')
        }

        function updateLastTouchTime() {
            lastTouchTime = new Date()
        }

        document.addEventListener('touchstart', updateLastTouchTime, true)
        document.addEventListener('touchstart', disableHover, true)
        document.addEventListener('mousemove', enableHover, true)

        enableHover()
    }

    hidePreloader = () => {
        let preloader = window.document.getElementById('preloader');
        setTimeout(() => {
            preloader.style.opacity = '0';
            this.recenterCanvas(); // Recenter the canvas after reload;
            setTimeout(() => {
                preloader.style.display = 'none';
                preloader.remove();
            }, 500);
            this.project?.view?.render()
        }, 2000); // Wait two seconds to allow editor to set up... TODO: Should connect this to load events.
    }

    showWaitOverlay = (message) => {
        window.clearTimeout(this._showWaitOverlayTimeoutID);
        this._showWaitOverlayTimeoutID = window.setTimeout(() => {
            let waitOverlay = window.document.getElementById('wait-overlay');
            waitOverlay.innerHTML = message || "Please wait...";
            waitOverlay.style.display = 'block';
        }, 250);
    }

    hideWaitOverlay = () => {
        window.clearTimeout(this._showWaitOverlayTimeoutID);
        let waitOverlay = window.document.getElementById('wait-overlay');
        waitOverlay.style.display = 'none';
    }

    /**
     * Resets the editor in preparation for a project load.
     */
    resetEditorForLoad = () => {
        // Re-apply saved frame size so HIDE_CONTENT_DOTS and cell dims are correct after every project load
        if (window.Wick && window.Wick.GUIElement) {
            const G = window.Wick.GUIElement;
            const stored = localStorage.getItem('wickEditorFrameSizeValue');
            if (stored !== null) {
                const v = parseInt(stored);
                const XSW = 8, XSH = 16;
                let w, h;
                if (v <= 50) {
                    const t = v / 50;
                    w = Math.round(XSW + t * (G.GRID_SMALL_CELL_WIDTH - XSW));
                    const ht = Math.max(v, 25) / 50;
                    h = Math.round(XSH + ht * (G.GRID_SMALL_CELL_HEIGHT - XSH));
                } else if (v <= 100) {
                    const t = (v - 50) / 50;
                    w = Math.round(G.GRID_SMALL_CELL_WIDTH + t * (G.GRID_NORMAL_CELL_WIDTH - G.GRID_SMALL_CELL_WIDTH));
                    h = Math.round(G.GRID_SMALL_CELL_HEIGHT + t * (G.GRID_NORMAL_CELL_HEIGHT - G.GRID_SMALL_CELL_HEIGHT));
                } else {
                    const t = (v - 100) / 50;
                    w = Math.round(G.GRID_NORMAL_CELL_WIDTH + t * (G.GRID_LARGE_CELL_WIDTH - G.GRID_NORMAL_CELL_WIDTH));
                    h = Math.round(G.GRID_NORMAL_CELL_HEIGHT + t * (G.GRID_LARGE_CELL_HEIGHT - G.GRID_NORMAL_CELL_HEIGHT));
                }
                G.GRID_DEFAULT_CELL_WIDTH = w;
                G.GRID_DEFAULT_CELL_HEIGHT = Math.max(h, 30);
                G.HIDE_CONTENT_DOTS = v < 15;
            }
        }
    }

    /**
     * Updates the color picker type within the editor state.
     * @param {String} type String representing the type of the color picker, can be swatches, spectrum, or gradient (TODO).
     */
    changeColorPickerType = (type) => {
        localForage.setItem(this.colorPickerTypeKey, type);
        this.setState({
            colorPickerType: type,
        });
    }

    onWindowResize = () => {
        // Ensure that all elements resize on window resize.
        this.resizeProps.onResize();

        // reset the code window if we resize the window.
        this.setState({
            codeEditorWindowProperties: this.getDefaultCodeEditorProperties(),
        });

        // re-render project to avoid incorrect pan
        this.project?.view.render();
        this.recenterCanvas();
    }

    getDefaultCodeEditorProperties = () => {
        return (
            {
                width: window.innerWidth - 510, // magic number: outliner/inspector width
                height: window.innerHeight - 260, // magic number: toolbar/timeline height
                x: 0,
                y: 40, // magic number: toolbar height (not including the menubar, since for some reason y=0 is at the bottom of the menubar?)
                minWidth: 400,
                minHeight: 250,
                consoleHeight: 100,
                consoleOpen: true,
                fontSize: 16,
                theme: 'monokai'
            }
        );
    }

    updateLastColors = (color, edit) => {
        let newArray = this.state.lastColorsUsed.concat([]); // make a deep copy.

        let index = newArray.indexOf(color);
        if (edit) {
        // Replace the last color with the new color.
        if (index > -1) {
            newArray.splice(index, 1);
            newArray.unshift(color);
        }
        else newArray[0] = color;
        }
        else {
        // Remove a color from the array. If the new color is in the array, remove it.
        if (index > -1) {
            newArray.splice(index, 1);
        } else {
            newArray.pop();
        }

        // Add the new color to the front of the array.
        newArray.unshift(color);
        }

        this.setState({
            lastColorsUsed: newArray,
        });
    }

    toggleOutliner = () => {
        this.setState({ outlinerPoppedOut: !this.state.outlinerPoppedOut });
    }

    onResize = (e) => {
        this.project?.view?.resize();
        this.project?.guiElement?.draw();
    }

    onStopResize = ({ domElement, component }) => {

    }

    getSizeHorizontal = (domElement) => {
        return domElement.offsetWidth;
    }

    getSizeVertical = (domElement) => {
        return domElement.offsetHeight;
    }

    /**
     * Updates the code editor properties in the state.
     * @param  {object} newProperties object with new code editor properties. Can include width, height, x, y.
     */
    updateCodeEditorWindowProperties = (newProperties) => {
        let finalProperties = this.state.codeEditorWindowProperties;
        Object.keys(newProperties).forEach(key => {
            finalProperties[key] = newProperties[key];
        });

        this.setState({
            codeEditorWindowProperties: finalProperties,
        });
    }


    /**
     * Called when any script is updated.
     */
    onScriptUpdate = () => {
        if (this.project.error) {
            this.clearCodeEditorError();
        }
    }

    /**
     * Called when the outliner is resized.
     * @param  {DomElement} domElement DOM element containing the outliner
     * @param  {React.Component} component  React component of the outliner.
     */
    onStopPopoutOutlinerResize = ({ domElement, component }) => {
        if (!domElement) return

        this.setState({
            popoutOutlinerSize: this.getSizeHorizontal(domElement)
        });
    }

    /**
     * Called when the inspector is resized.
     * @param  {DomElement} domElement DOM element containing the inspector
     * @param  {React.Component} component  React component of the inspector.
     */
    onStopInspectorResize = ({ domElement, component }) => {
        if (!domElement) return
        this.setState({
            inspectorSize: this.getSizeHorizontal(domElement)
        });
    }

    /**
     * Called when the asset library is resized.
     * @param  {DomElement} domElement DOM element containing the asset library
     * @param  {React.Component} component  React component of the asset library
     */
    onStopAssetLibraryResize = ({ domElement, component }) => {
        if (!domElement) return
        this.setState({
            assetLibrarySize: this.getSizeVertical(domElement)
        });
    }

    /**
     * Called when the timeline is resized.
     * @param  {DomElement} domElement DOM element containing the timeline
     * @param  {React.Component} component  React component of the timeline.
     */
    onStopTimelineResize = ({ domElement, component }) => {
        if (!domElement) return
        var size = this.getSizeVertical(domElement);

        this.setState({
            timelineSize: size
        });
    }

    /**
     * Opens the requested modal.
     * @param  {string} name name of the modal to open.
     */
    openModal = (name) => {
        this.setState({
            activeModalName: name,
        });
    }

    /**
     * Queues a modal to be opened at the next opportunity.
     * @param  {string} name [description]
     */
    queueModal = (name) => {
        if (this.state.activeModalName !== name) {
            // If there is another modal up, queue the modal.
            if (this.state.activeModalName !== null && this.state.activeModalQueue.indexOf(name) === -1) {
                this.setState(prevState => {
                    return {
                        activeModalQueue: [name].concat(prevState.activeModalQueue),
                    }
                });
                // Otherwise, just open it.
            } else {
                this.openModal(name)
            }
        }
    }

    /**
     * Closes the active modal, if there is one. Opens the next modal in the
     * if necessary.
     */
    closeActiveModal = () => {
        let oldQueue = [].concat(this.state.activeModalQueue);
        if (oldQueue.length === 0) {
            this.openModal(null);
            return;
        }
        var newModalName = oldQueue.shift();
        this.setState({
            activeModalQueue: oldQueue,
        }, () => this.openModal(newModalName));
    }

    /**
     * Opens and closes the code editor depending on the state of the codeEditor.
     * @param {boolean} state - Optional. True will open the code editor, false will close.
     */
    toggleCodeEditor = (state) => {
        if (state === undefined || (typeof state !== "boolean")) {
            state = !this.state.codeEditorOpen;
        }

        this.setState({
            codeEditorOpen: state,
        });
    }

    /**
     * Opens and closes the canvas actions popover.
     * @param {boolean} state - Optional. True will open the canvas actions menu, false will close.
     */
    toggleCanvasActions = (state) => {
        if (state === undefined || (typeof state !== "boolean")) {
            state = !this.state.showCanvasActions;
        }

        this.setState({
            showCanvasActions: state,
        });
    }

    /**
     * Opens and closes the BOOLEAN canvas actions popover.
     * @param {boolean} state - Optional. True will open the canvas boolean actions menu, false will close.
     */
    toggleBooleanCanvasActions = (state) => {
        if (state === undefined || (typeof state !== "boolean")) {
            state = !this.state.showBooleanCanvasActions;
        }

        this.setState({
            showBooleanCanvasActions: state,
        });
    }

    /**
     * Opens and closes the LAYERS canvas actions popover.
     * @param {boolean} state - Optional. True will open the canvas layers actions menu, false will close.
     */
    toggleLayersCanvasActions = (state) => {
        if (state === undefined || (typeof state !== "boolean")) {
            state = !this.state.showLayersCanvasActions;
        }

        this.setState({
            showLayersCanvasActions: state,
        });
    }

    /**
     * Opens and closes the ALIGNMENT canvas actions popover.
     * @param {boolean} state - Optional. True will open the canvas alignment actions menu, false will close.
     */
    toggleAlignmentCanvasActions = (state) => {
        if (state === undefined || (typeof state !== "boolean")) {
            state = !this.state.showAlignmentCanvasActions;
        }

        this.setState({
            showAlignmentCanvasActions: state,
        });
    }

    /**
     * Opens and closes the brush modes popover.
     * @param {boolean} state - Optional. True will open the brush modes menu, false will close.
     */
    toggleBrushModes = (state) => {
        if (state === undefined || (typeof state !== "boolean")) {
            state = !this.state.showBrushModes;
        }

        this.setState({
            showBrushModes: state,
        });
    }

    /**
     * Show code errors in the code editor by popping it up.
     * @param  {object[]} errors Array of error objects.
     */
    showCodeErrors = (errors) => {
        this.setState({
            codeEditorOpen: errors === undefined ? this.state.codeEditorOpen : true,
        });

        if (errors.length > 0) {
            let uuid = errors[0].uuid;
            let obj = window.Wick.ObjectCache.getObjectByUUID(uuid);
            this.setFocusObject(obj.parentClip);
            this.selectObject(obj)
            this.projectDidChange({ actionName: "Show Code Errors" });
        }
    }

    /**
     * Update the onion skinning colors in the editor.
     * @param {object} colors An object with colors to be used for onion skinning. colors.backward is used for previous frames. colors.forward is used for following frames.
     */
    changeOnionSkinningColors = (colors) => {
        if (!colors) return; // ignore change if no colors are passed.

        this.setState({
            customOnionSkinningColors: {
                backward: colors.backward || this.state.customOnionSkinningColors.backward,
                forward: colors.forward || this.state.customOnionSkinningColors.forward,
            }
        });
    }

    /**
     * Signals to React that the "live" project changed, so that all components
     * displaying info about the project will render.
     * @param {boolean} skipHistory - If set to true, the current state will not be pushed to the history.
     * @param {string} actionName - Name of the action committed, to save to the history stack.
     * @param {boolean} skipReactRender - If set to true, will not force react to rerender. Use sparingly.
     */
    projectDidChange = (options) => {
        if (!options) options = {};

        if (!options.actionName) { options.name = "Unknown Action" };

        // Request an autosave, so a save will happen sometime later.
        this.requestAutosave();

        // Save state to history if needed
        if (!options.skipHistory) {
            this.project.history.pushState(window.Wick.History.StateType.ONLY_VISIBLE_OBJECTS, options.actionName);
        }

        // Render engine
        this.project?.view.render();
        this.project?.guiElement.draw();

        // Force react to render
        // TODO: Determine a non-hack way to do this.
        if (!options.skipReactRender) {
            this.setState({
                project: '' + Math.random(),
            });
        }
    }

    /**
     * Create a toast notification.
     * @param {string} message - the message to display inside the toast.
     * @param {string} type - the type of the toast. ("info", "success", "warning", or "error". See react-toastify docs for more info)
     * @param {object} options - the options for the toast notification. For all options, see the demo for react-toastify: https://fkhadra.github.io/react-toastify/
     */
    toast = (message, type, options) => {
        if (!message) {
            console.error("toast() requires a message.");
            return;
        }

        // If no type is given, default to "info"
        if (!type) type = "info";

        if (["info", "success", "warning", "error"].indexOf(type) === -1) {
            console.error("toast(): Invalid type: " + type);
            return;
        }

        // If no options are given, set the options param to an empty object so only the default options are used.
        if (!options) options = {};

        // Default options for the toast:
        let defaultOptions = {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className: (type + '-toast-background'),
            bodyClassName: (type + '-toast-body'),
            progressClassName: (type + '-toast-progress'),
        };

        // Mix default options and options param:
        let mixOptions = Object.assign(defaultOptions, options);

        return toast[type](message, mixOptions);
    }

    /**
     * Updates an existing toast to a new toast type
     * @param {string} id ID of the toast to update.
     * @param {object} options options to apply to the newly updated toast.
     */
    updateToast = (id, options) => {
        if (options.text) {
            options.render = options.text;
        }

        if (options.type) {
            options.className = options.type + '-toast-background';
            options.bodyClassName = options.type + '-toast-body';
        }

        if (!options.autoClose) {
            options.autoClose = 5000;
        }

        toast.update(id, options);
    }


    /**
     * Opens a warning modal with a description. If the modal is accepted, the accept action is called.
     * @param {Object} args can contain description {string}, acceptAction {function}, cancelAction {function},
     * acceptText {string}, cancelText {string}, title {string}.
     */
    openWarningModal = (args) => {
        let modalInfo = {
            description: args.description || "No Description",
            title: args.title || "Title",
            acceptAction: args.acceptAction || (() => { console.warn("No accept action implemented.") }),
            cancelAction: args.cancelAction || (() => { console.warn("No cancel action implemented.") }),
            finalAction: args.finalAction || (() => { console.warn("No final action implemented.") }),
            acceptText: args.acceptText || "Accept",
            acceptIcon: args.acceptIcon,
            cancelText: args.cancelText || "Cancel",
            cancelIcon: args.cancelIcon,
        }

        this.setState({
            warningModalInfo: modalInfo,
            activeModalName: "GeneralWarning",
        });
    }



    /**
     * Returns a string representing the render size elements should use in the editor.
     * @returns {String} "large", "medium" or "small" depending on the width of the window.
     */
    getRenderSize = () => {
        if (window.innerWidth > 1200) {
            return "large";
        } else if (window.innerWidth > 800) {
            return "medium";
        } else {
            return "small";
        }
    }
    /**
     *  Combines two custom hotkey objects into a single custom hotkey object.
     *  Any hotkeys in hotkeys2 will overwrite hotkeys1.
     * @param {Object} hotkeys1 - Custom hotkey map.
     * @param {Object} hotkeys2 - Custom hotkey map.
     * @returns {Object} - Combined custom hotkey map.
     **/


    // TODO: Fix caps lock issue here - TODO H.A.
    combineHotKeys = (hotkeys1, hotkeys2) => {
        // Try to combine all keys

        let newHotKeys = { ...hotkeys1, ...hotkeys2 };

        let keys1 = Object.keys(hotkeys1);
        let keys2 = Object.keys(hotkeys2);

        let similarKeys = keys2.filter(key => keys1.indexOf(key) > -1);

        similarKeys.forEach(key => {
            let combinedKey = { ...hotkeys1[key], ...hotkeys2[key] };
            newHotKeys[key] = combinedKey;
        });

        return newHotKeys;
    }

    /**
     * Converts an array of hotkeys to a custom hotkey object.
     */
    convertHotkeyArray = (hotkeys) => {
        let keyObj = {};

        hotkeys.forEach(key => {
            if (keyObj[key.actionName]) {
                keyObj[key.actionName][key.index] = key.sequence;
            } else {
                keyObj[key.actionName] = {}
                keyObj[key.actionName][key.index] = key.sequence;
            }
        });

        return keyObj;
    }

    /**
     * Creates a combined key map from a key map object and key array.
     */
    createCombinedHotKeyMap = (hotKeyMap, hotKeyArray) => {
        return this.combineHotKeys(hotKeyMap, this.convertHotkeyArray(hotKeyArray));
    }

    /**
     * Takes an array of hot key objects. Combines these with existing custom hot keys and syncs the editor
     * to these new hot keys.
     */
    addCustomHotKeys = (newHotKeys) => {
        let combined = this.createCombinedHotKeyMap(this.state.customHotKeys, newHotKeys);

        this.syncHotKeys(combined);
    }

    /**
     * Takes a hotkeys object and sets these as the custom hot keys.
     */
    syncHotKeys = (hotkeys) => {
        this.hotKeyInterface.setCustomHotKeys(hotkeys);
        localForage.setItem(this.customHotKeysKey, hotkeys);
        this.setState({
            customHotKeys: hotkeys
        });
    }

    resetCustomHotKeys = () => {
        this.syncHotKeys({});
    }

    /**
     * A flag to prevent "double state changes" where an action tries to happen while another is still processing.
     * Set this to true before doing something asynchronous that will take a long time, and set it back to false when done.
     */
    get processingAction() {
        return this._processingAction;
    }

    set processingAction(processingAction) {
        this._processingAction = processingAction;
    }

    handleAssetFileImport = (e) => {
        this.createAssets(e.target.files, []);
    }

    openProjectFileDialog = () => {
        this.openProjectFileFromClient();
    }

    openImportAssetFileDialog = () => {
        this.openAssetFileFromClient();
    }

    /**
     * Returns the appropriate keymap based on the state of the editor.
     * @param fullKeyMap {Bool} If true, returns the full keymap for the editor. Otherwise, the appropriate keymap is returned.
     * @returns {Object} Keymap listed as actionName : Object { 0 : sequence, 1 : sequence }
     */
    getKeyMap = (fullKeyMap) => {
        if (this.state.previewPlaying && !fullKeyMap) {
            return this.hotKeyInterface.getEssentialKeyMap(this.state.customHotKeys)
        } else {
            return this.hotKeyInterface.getKeyMap(this.state.customHotKeys)
        }
    }

    /**
     * Returns the appropriate key handlers based on the state of the editor.
     * @param fullKeyHandlers {Bool} If true, returns all key handlers for the editor. Otherwise, the appropriate keyhandlers returned.
     */
    getKeyHandlers = (fullKeyHandlers) => {
        if (this.state.previewPlaying && !fullKeyHandlers) {
            return this.hotKeyInterface.getEssentialKeyHandlers(this.state.customHotKeys)
        } else {
            return this.hotKeyInterface.getHandlers(this.state.customHotKeys)
        }
    }

    setConsoleLogs = (logs) => {
        this.setState({
            consoleLogs: logs,
        })
    }

    render = () => {
        if (!this.project || !this.project.view) {
            return <div className="editor-loading">Loading editor…</div>;
        }
        // Create some references to the project and editor to make debugging in the console easier:
        window.project = this.project;
        window.editor = this;

        let renderSize = this.getRenderSize();

        return (
            <DndProvider backend={HTML5Backend}>
                <EditorWrapper editor={this}>
                    {/* Menu Bar */}

                    <div id="menu-bar-container">
                        {/* Header */}
                        <DockedPanel showOverlay={this.state.previewPlaying}>
                            <MenuBar
                                renderSize={renderSize}
                                openModal={this.openModal}
                                projectName={this.project?.name}
                                openProjectFileDialog={this.openProjectFileDialog}
                                openNewProjectConfirmation={this.openNewProjectConfirmation}
                                exportProjectAsWickFile={this.exportProjectAsWickFile}
                                importProjectAsWickFile={this.importProjectAsWickFile}
                                exporting={this.state.exporting}
                                toast={this.toast}
                                openExportMedia={() => { this.openModal('ExportMedia') }}
                                openExportOptions={() => { this.openModal('ExportOptions') }}
                            />
                        </DockedPanel>
                    </div>

                    {/* Main Editor Panel */}

                    <div id="editor-body">
                        <div className={classNames({ "mobile-editor-body": (renderSize === "small") })} id="flexible-container">
                            {/*App*/}
                            <ReflexContainer windowResizeAware={true} orientation="vertical">
                                {/* Middle Panel */}
                                <ReflexElement {...this.resizeProps}>
                                    {/*Toolbox*/}
                                    <div className={classNames("toolbox-container", { 'toolbox-container-medium': renderSize === 'medium' }, { 'toolbox-container-small': renderSize === 'small' })}>
                                        <DockedPanel showOverlay={this.state.previewPlaying}>
                                            <Toolbox
                                                project={this.state.project}
                                                getActiveToolName={() => this.getActiveTool()?.name}
                                                activeToolName={this.getActiveTool()?.name}
                                                setActiveTool={this.setActiveTool}
                                                getToolSetting={this.getToolSetting}
                                                setToolSetting={this.setToolSetting}
                                                previewPlaying={this.state.previewPlaying}
                                                editorActions={this.actionMapInterface.editorActions}
                                                getToolSettingRestrictions={this.getToolSettingRestrictions}
                                                showCanvasActions={this.state.showCanvasActions}
                                                showBooleanCanvasActions={this.state.showBooleanCanvasActions}
                                                showLayersCanvasActions={this.state.showLayersCanvasActions}
                                                showAlignmentCanvasActions={this.state.showAlignmentCanvasActions}
                                                showBrushModes={this.state.showBrushModes}
                                                toggleCanvasActions={this.toggleCanvasActions}
                                                toggleBooleanCanvasActions={this.toggleBooleanCanvasActions}
                                                toggleLayersCanvasActions={this.toggleLayersCanvasActions}
                                                toggleAlignmentCanvasActions={this.toggleAlignmentCanvasActions}
                                                toggleBrushModes={this.toggleBrushModes}
                                                colorPickerType={this.state.colorPickerType}
                                                changeColorPickerType={this.changeColorPickerType}
                                                updateLastColors={this.updateLastColors}
                                                lastColorsUsed={this.state.lastColorsUsed}
                                                keyMap={this.getKeyMap()}
                                                renderSize={renderSize}
                                            />
                                        </DockedPanel>
                                    </div>
                                    <div className={classNames("editor-canvas-timeline-panel", { 'editor-canvas-timeline-panel-medium': renderSize === 'medium' }, { 'editor-canvas-timeline-panel-small': renderSize === 'small' })}>
                                        <ReflexContainer windowResizeAware={true} orientation="horizontal">
                                            {/* Canvas and Popout Outliner */}
                                            <ReflexElement>
                                                <ReflexContainer windowResizeAware={true} orientation="vertical">
                                                    {/*Canvas*/}
                                                    <ReflexElement {...this.resizeProps}>
                                                        <DockedPanel>
                                                            <ResizeTrigger onResize={() => this.project.view.render()}>
                                                                <Canvas
                                                                    editor={this}
                                                                    project={this.project}
                                                                    projectDidChange={this.projectDidChange}
                                                                    projectData={this.state.project}
                                                                    paper={this.paper}
                                                                    previewPlaying={this.state.previewPlaying}
                                                                    createImageFromAsset={this.createImageFromAsset}
                                                                    toast={this.toast}
                                                                    onEyedropperPickedColor={this.onEyedropperPickedColor}
                                                                    createAssets={this.createAssets}
                                                                    importProjectAsWickFile={this.importProjectAsWickFile}
                                                                    openProjectFile={(file) => this.handleWickFileLoad({ target: { files: [file] } })}
                                                                    onRef={ref => this.canvasComponent = ref}
                                                                />
                                                            </ResizeTrigger>

                                                            <CanvasTransforms
                                                                onionSkinEnabled={this.project?.onionSkinEnabled}
                                                                toggleOnionSkin={this.toggleOnionSkin}
                                                                zoomIn={this.zoomIn}
                                                                zoomOut={this.zoomOut}
                                                                recenterCanvas={this.recenterCanvas}
                                                                activeToolName={this.getActiveTool()?.name}
                                                                setActiveTool={this.setActiveTool}
                                                                previewPlaying={this.state.previewPlaying}
                                                                togglePreviewPlaying={this.togglePreviewPlaying}
                                                                renderSize={renderSize}
                                                                keyMap={this.getKeyMap()}
                                                            />
                                                            {renderSize === "small" &&
                                                                <DeleteCopyPaste
                                                                    previewPlaying={this.state.previewPlaying}
                                                                    selectionEmpty={this.project.selection.getSelectedObjects().length === 0}
                                                                    editorActions={this.actionMapInterface.editorActions}
                                                                />}
                                                            {renderSize === "large" &&
                                                                <OutlinerExpandButton
                                                                    expanded={this.state.outlinerPoppedOut}
                                                                    toggleOutliner={this.toggleOutliner}
                                                                />}
                                                        </DockedPanel>
                                                    </ReflexElement>

                                                    {/* Popout Outliner */}
                                                    {renderSize === "large" && this.state.outlinerPoppedOut && <ReflexSplitter {...this.resizeProps} />}
                                                    {renderSize === "large" && this.state.outlinerPoppedOut &&
                                                        <ReflexElement
                                                            size={250}
                                                            maxSize={300} minSize={200}
                                                            onResize={this.resizeProps.onResize}
                                                            onStopResize={this.resizeProps.onStopPopoutOutlinerResize}>
                                                            <Outliner
                                                                className="popout-outliner"
                                                                project={this.project}
                                                                selectObjects={this.selectObjects}
                                                                deselectObjects={this.deselectObjects}
                                                                clearSelection={this.clearSelection}
                                                                editScript={this.editScript}
                                                                setFocusObject={this.setFocusObject}
                                                                setActiveLayerIndex={this.setActiveLayerIndex}
                                                                moveSelection={this.moveSelection}
                                                                toggleHidden={this.toggleHidden}
                                                                toggleLocked={this.toggleLocked}
                                                            />
                                                        </ReflexElement>}
                                                </ReflexContainer>
                                            </ReflexElement>

                                            {(renderSize === "small") && <ReflexSplitter {...this.resizeProps} className="mobile-reflex-splitter" />}
                                            {!(renderSize === "small") && <ReflexSplitter {...this.resizeProps} />}

                                            {/*Timeline*/}
                                            <ReflexElement
                                                minSize={100}
                                                size={this.state.timelineSize}
                                                onResize={this.resizeProps.onResize}
                                                onStopResize={this.resizeProps.onStopTimelineResize}>
                                                <DockedPanel showOverlay={this.state.previewPlaying}>
                                                    {renderSize === "small"
                                                        && <MobileContainer
                                                            project={this.project}
                                                            projectDidChange={this.projectDidChange}
                                                            projectData={this.state.project}
                                                            getSelectedTimelineObjects={this.getSelectedTimelineObjects}
                                                            setOnionSkinOptions={this.setOnionSkinOptions}
                                                            getOnionSkinOptions={this.getOnionSkinOptions}
                                                            setFocusObject={this.setFocusObject}
                                                            addTweenKeyframe={this.addTweenKeyframe}
                                                            onRef={ref => this.timelineComponent = ref}
                                                            dragSoundOntoTimeline={this.dragSoundOntoTimeline}

                                                            getToolSetting={this.getToolSetting}
                                                            setToolSetting={this.setToolSetting}
                                                            getSelectionType={this.getSelectionType}
                                                            getAllSoundAssets={this.getAllSoundAssets}
                                                            getAllSelectionAttributes={this.getAllSelectionAttributes}
                                                            setSelectionAttribute={this.setSelectionAttribute}
                                                            editorActions={this.actionMapInterface.editorActions}
                                                            selectionIsScriptable={this.selectionIsScriptable}
                                                            script={this.getSelectedObjectScript()}
                                                            scriptInfoInterface={this.scriptInfoInterface}
                                                            deleteScript={this.deleteScript}
                                                            editScript={this.editScript}
                                                            fontInfoInterface={this.fontInfoInterface}

                                                            importFileAsAsset={this.importFileAsAsset}
                                                            colorPickerType={this.state.colorPickerType}
                                                            changeColorPickerType={this.changeColorPickerType}
                                                            updateLastColors={this.updateLastColors}
                                                            lastColorsUsed={this.state.lastColorsUsed}
                                                            getClipAnimationTypes={this.getClipAnimationTypes}

                                                            assets={this.project.getAssets()}
                                                            openModal={this.openModal}
                                                            openImportAssetFileDialog={this.openImportAssetFileDialog}
                                                            selectObjects={this.selectObjects}
                                                            clearSelection={this.clearSelection}
                                                            isObjectSelected={this.isObjectSelected}
                                                            createAssets={this.createAssets}
                                                            importProjectAsWickFile={this.importProjectAsWickFile}
                                                            createImageFromAsset={this.createImageFromAsset}
                                                            toast={this.toast}
                                                            deleteSelectedObjects={this.deleteSelectedObjects}
                                                            addSoundToActiveFrame={this.addSoundToActiveFrame} />}
                                                    {renderSize !== "small" &&
                                                        <Timeline
                                                            project={this.project}
                                                            projectDidChange={this.projectDidChange}
                                                            projectData={this.state.project}
                                                            getSelectedTimelineObjects={this.getSelectedTimelineObjects}
                                                            setOnionSkinOptions={this.setOnionSkinOptions}
                                                            getOnionSkinOptions={this.getOnionSkinOptions}
                                                            setFocusObject={this.setFocusObject}
                                                            addTweenKeyframe={this.addTweenKeyframe}
                                                            onRef={ref => this.timelineComponent = ref}
                                                            dragSoundOntoTimeline={this.dragSoundOntoTimeline}
                                                        />}
                                                </DockedPanel>
                                            </ReflexElement>
                                        </ReflexContainer>
                                    </div>
                                </ReflexElement>

                                {/* Right Sidebar */}
                                {!(renderSize === "small") && <ReflexSplitter {...this.resizeProps} />}
                                {!(renderSize === "small") &&

                                    <ReflexElement
                                        size={250}
                                        maxSize={300} minSize={200}
                                        onResize={this.resizeProps.onResize}
                                        onStopResize={this.resizeProps.onStopInspectorResize}>
                                        <ReflexContainer windowResizeAware={true} orientation="horizontal">
                                            {/* Inspector */}
                                            <ReflexElement {...this.resizeProps}>
                                                <DockedPanel showOverlay={false /*this.state.previewPlaying*/}>
                                                    <Inspector
                                                        getToolSetting={this.getToolSetting}
                                                        setToolSetting={this.setToolSetting}
                                                        getSelectionType={this.getSelectionType}
                                                        getAllSoundAssets={this.getAllSoundAssets}
                                                        getAllSelectionAttributes={this.getAllSelectionAttributes}
                                                        setSelectionAttribute={this.setSelectionAttribute}
                                                        editorActions={this.actionMapInterface.editorActions}
                                                        selectionIsScriptable={this.selectionIsScriptable}
                                                        script={this.getSelectedObjectScript()}
                                                        scriptInfoInterface={this.scriptInfoInterface}
                                                        deleteScript={this.deleteScript}
                                                        editScript={this.editScript}
                                                        fontInfoInterface={this.fontInfoInterface}
                                                        project={this.project}
                                                        importFileAsAsset={this.importFileAsAsset}
                                                        colorPickerType={this.state.colorPickerType}
                                                        changeColorPickerType={this.changeColorPickerType}
                                                        updateLastColors={this.updateLastColors}
                                                        lastColorsUsed={this.state.lastColorsUsed}
                                                        getClipAnimationTypes={this.getClipAnimationTypes}
                                                    />
                                                </DockedPanel>
                                            </ReflexElement>


                                            {/* Outliner */}
                                            {renderSize === 'medium' && <ReflexSplitter {...this.resizeProps} />}
                                            {renderSize === 'medium' && <ReflexElement
                                                minSize={100}>
                                                <DockedPanel showOverlay={this.state.previewPlaying}>
                                                    <Outliner
                                                        project={this.project}
                                                        selectObjects={this.selectObjects}
                                                        deselectObjects={this.deselectObjects}
                                                        clearSelection={this.clearSelection}
                                                        editScript={this.editScript}
                                                        setFocusObject={this.setFocusObject}
                                                        setActiveLayerIndex={this.setActiveLayerIndex}
                                                        moveSelection={this.moveSelection}
                                                        toggleHidden={this.toggleHidden}
                                                        toggleLocked={this.toggleLocked}
                                                    />
                                                </DockedPanel>
                                            </ReflexElement>}



                                            {window.enableAssetLibrary && <ReflexSplitter {...this.resizeProps} />}
                                            {/* Asset Library */}
                                            {window.enableAssetLibrary &&
                                                <ReflexElement
                                                    minSize={100}
                                                    size={300}
                                                    onResize={this.resizeProps.onResize}
                                                    onStopResize={this.resizeProps.onStopAssetLibraryResize}>
                                                    <DockedPanel showOverlay={this.state.previewPlaying}>
                                                        <AssetLibrary
                                                            projectData={this.state.project}
                                                            assets={this.project?.getAssets()}
                                                            openModal={this.openModal}
                                                            openImportAssetFileDialog={this.openImportAssetFileDialog}
                                                            selectObjects={this.selectObjects}
                                                            clearSelection={this.clearSelection}
                                                            isObjectSelected={this.isObjectSelected}
                                                            createAssets={this.createAssets}
                                                            importProjectAsWickFile={this.importProjectAsWickFile}
                                                            createImageFromAsset={this.createImageFromAsset}
                                                            toast={this.toast}
                                                            deleteSelectedObjects={this.deleteSelectedObjects}
                                                            addSoundToActiveFrame={this.addSoundToActiveFrame}
                                                        />
                                                    </DockedPanel>
                                                </ReflexElement>}
                                        </ReflexContainer>
                                    </ReflexElement>
                                }
                            </ReflexContainer>
                        </div>
                        {this.state.codeEditorOpen &&
                            <WickCodeEditor
                                selectionType={this.getSelectionType()}
                                codeEditorWindowProperties={this.state.codeEditorWindowProperties}
                                updateCodeEditorWindowProperties={this.updateCodeEditorWindowProperties}
                                scriptInfoInterface={this.scriptInfoInterface}
                                selectionIsScriptable={this.selectionIsScriptable}
                                script={this.getSelectedObjectScript()}
                                scriptToEdit={this.state.scriptToEdit}
                                error={this.state.codeError}
                                onScriptUpdate={this.onScriptUpdate}
                                editScript={this.editScript}
                                toggleCodeEditor={this.toggleCodeEditor}
                                requestAutosave={this.requestAutosave}
                                clearCodeEditorError={this.clearCodeEditorError}
                                consoleLogs={this.state.consoleLogs}
                                setConsoleLogs={this.setConsoleLogs}
                                renderSize={renderSize}
                            />}
                    </div>
                </EditorWrapper>
            </DndProvider>
        )
    }
}

export default Editor