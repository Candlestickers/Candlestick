/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * This object creates a Wick namespace for wick-engine functionality and utilities.
 */
globalThis.Wick = globalThis.Wick || {
    version: window.WICK_ENGINE_BUILD_VERSION || "dev",
    resourcepath: '../dist/',
    _originals: {}, // Eventually store a single instance of each type of Wick.Base object (see Wick.Base constructor).
    // adding global variable to track finger gestures -H.A.
    gesture: {
        active: false,
        type: null
    }
}

// Ensure that the Wick namespace is accessible in environments where globals are finicky (react, webpack, etc)
const Wick = globalThis.Wick;
window.Wick = Wick;

export { Wick };
export default Wick;

// jQuery needs some setup
import jQuery from 'jquery';
export const $ = jQuery;
export { jQuery };
window.$ = jQuery;

console.log('Wick Engine version "' + Wick.version + '" is available.');

/* Import modules */

window.Wick.loaded = (async () => {
    // Packages

    // these need to be loaded first
    const uuidModule = await import('uuid');
    const { v4: uuidv4 } = uuidModule;
    Wick.uuidv4 = uuidv4;
    const quadtreeModule = await import('quadtree-lib');
    const Quadtree = quadtreeModule || quadtreeModule.Quadtree;

    const [esprima, invert, { tween }, { hull }, { arrayBuffer }, floodfillModule, { Howl, Howler },
        jszipModule, lerpModule, localforageModule, pressureModule, paperModule] =
        await Promise.all([
            import('esprima'),
            import('invert-color'),
            import('@tweenjs/tween.js'),
            import('hull'),
            import('base64-arraybuffer'),
            import('floodfill'),
            import('howler'),
            import('jszip'),
            import('lerp'),
            import('localforage'),
            import('pressure'),
            import('paper')
        ]);

    const floodfill = floodfillModule.default;
    const JSZip = jszipModule.default;
    const lerp = lerpModule.default;
    const localforage = localforageModule.default;
    const Pressure = pressureModule.default;

    // Paper needs a bit of setup
    const paper = paperModule.default || paperModule;
    window.paper = paper;
    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        document.body.appendChild(canvas);

        paper.setup(canvas);
    });

    const libs = Promise.all([
        import('../lib/timestamp.js'),
        import('../lib/soundcloud-waveform.js'),
        import('../lib/roundRect.js'),
        import('../lib/reserved-words.js'),
        import('../lib/platform.js'),
        import('../lib/is-var-name.js'),
        import('../lib/currentTransform.js'),
        import('../lib/convert-range.js'),
        import('../lib/potrace.js'),
        import('../lib/croquis.js')
    ]);

    await import('./base/Base.js');
    await import('./base/Tickable.js');
    await import('./base/Clip.js');
    await import('./base/Project.js');
    await import('./base/asset/Asset.js');
    await import('./base/asset/FileAsset.js');
    await import('./base/asset/ClipAsset.js');
    await import('./view/View.js');
    await import('./view/View.Clip.js');
    await import('./gui/GUIElement.js');
    await import('./gui/Ghost.js');
    await import('./gui/Button.js');
    await import('./export/wick/WickFile.js');
    await import('./tools/Tool.js');

    const src = Promise.all([
        import('./Clipboard.js'),
        import('./Color.js'),
        import('./Transformation.js'),
        import('./ToolSettings.js'),
        import('./Quadtree.js'),
        import('./ObjectCache.js'),
        import('./History.js'),
        import('./GlobalAPI.js'),
        import('./FileCache.js')
    ])
    const base = Promise.all([
        // These extend Wick.Base
        import('./base/Layer.js'),
        import('./base/Selection.js'),
        import('./base/Timeline.js'),
        import('./base/Tween.js'),
        import('./base/Path.js'),

        // These extend Asset.js and FileAsset.js
        import('./base/asset/FontAsset.js'),
        import('./base/asset/ImageAsset.js'),
        import('./base/asset/SoundAsset.js'),
        import('./base/asset/SVGAsset.js'),

        // This extends ClipAsset.js
        import('./base/asset/GIFAsset.js'),

        // These extend Wick.Tickable
        import('./base/Frame.js'),
        import('./base/Button.js'),
        import('./base/WickSound.js'),

        import('./builtinassets/BuiltinAssets.js')
    ]);

    const view = Promise.all([
        import('./view/View.Button.js'),

        import('./view/View.Project.js'),
        import('./view/View.Selection.js'),
        import('./view/View.Timeline.js'),
        import('./view/View.Layer.js'),
        import('./view/View.Frame.js'),
        import('./view/View.Path.js'),

        import('./view/paper-ext/Layer.erase.js'),
        import('./view/paper-ext/Paper.hole.js'),
        import('./view/paper-ext/Paper.OrderingUtils.js'),
        import('./view/paper-ext/Paper.SelectionWidget.js'),
        import('./view/paper-ext/Paper.SelectionBox.js'),
        import('./view/paper-ext/Path.potrace.js'),
        import('./view/paper-ext/TextItem.edit.js'),
        import('./view/paper-ext/View.pressure.js'),
        import('./view/paper-ext/View.gestures.js'),
        import('./view/paper-ext/View.scrollToZoom.js')
    ]);

    const gui = Promise.all([
        // These directly extend GUIElement.js
        import('./gui/Icons.js'),
        import('./gui/FramesContainer.js'),
        import('./gui/Layer.js'),
        import('./gui/LayerCreateLabel.js'),
        import('./gui/LayersContainer.js'),
        import('./gui/NumberLine.js'),
        import('./gui/OnionSkinRange.js'),
        import('./gui/Playhead.js'),
        import('./gui/PopupMenu.js'),
        import('./gui/Project.js'),
        import('./gui/Scrollbar.js'),
        import('./gui/ScrollbarGrabber.js'),
        import('./gui/Timeline.js'),
        import('./gui/Tooltip.js'),
        import('./gui/Tween.js'),
        import('./gui/ActionButtonsContainer.js'),
        import('./gui/Breadcrumbs.js'),
        import('./gui/Frame.js'),

        // These extend Button.js
        import('./gui/ActionButton.js'),
        import('./gui/BreadcrumbsButton.js'),
        import('./gui/LayerButton.js'),

        // These extend Ghost.js
        import('./gui/FrameEdgeGhost.js'),
        import('./gui/FrameGhost.js'),
        import('./gui/SelectionBox.js'),
        import('./gui/TweenGhost.js')
    ]);

    const exportThread = Promise.all([
        import('./export/ExportUtils.js'),
        import('./export/audio/AudioTrack.js'),
        import('./export/autosave/AutoSave.js'),
        import('./export/html/HTMLExport.js'),
        import('./export/html/HTMLPreview.js'),
        import('./export/image/imageSequence.js'),
        import('./export/svg/SvgFile.js'),
        import('./export/wickobj/WickObjectFile.js'),
        import('./export/zip/ZIPExport.js'),

        import('./export/wick/WickFile.Alpha.js')
    ]);

    const tools = Promise.all([
        import('./tools/Zoom.js'),
        import('./tools/Brush.js'),
        import('./tools/Cursor.js'),
        import('./tools/Eraser.js'),
        import('./tools/Eyedropper.js'),
        import('./tools/Ellipse.js'),
        import('./tools/Rectangle.js'),
        import('./tools/FillBucket.js'),
        import('./tools/Interact.js'),
        import('./tools/Line.js'),
        import('./tools/None.js'),
        import('./tools/Pan.js'),
        import('./tools/PathCursor.js'),
        import('./tools/Pencil.js'),
        import('./tools/Text.js')
    ]);

    // Wait for all threads to finish
    await src;
    await base;
    await view;
    await gui;
    await exportThread;
    await tools;

    /* One instance of each Wick.Base class is created so we can access
    * a list of all possible properties of each class. This is used
    * to clean up custom variables after projects are stopped.
    */
    for (const [name, value] of Object.entries(Wick)) {
        if (typeof value === 'function' && typeof Wick.Base === 'function') {
            if (value.prototype instanceof Wick.Base && !Wick._originals[name]) {
                Wick._originals[name] = new value();
            }
        }
    }

    return Wick;
})();