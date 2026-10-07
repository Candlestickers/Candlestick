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

import 'lib/base64-arraybuffer.js';
import 'lib/convert-range.js';
import 'lib/croquis.js';
import 'lib/currentTransform.js';
import 'lib/esprima.js';
import 'lib/floodfill.min.js';
import 'lib/howler.js';
import 'lib/hull.js';
import 'lib/invert.min.js';
import 'lib/is-var-name.js';
import jQuery from 'lib/jquery-3.3.1.min.js';
import jQueryMousewheel from 'lib/jquery.mousewheel.js';
import 'lib/jquery.pressure.js';
import 'lib/jszip.js';
import 'lib/lerp.js';
import 'lib/localforage.min.js';
import 'lib/paper.js';
import 'lib/platform.js';
import 'lib/potrace.js';
import 'lib/quadtree.min.js';
import 'lib/reserved-words.js';
import 'lib/roundRect.js';
import 'lib/timestamp.js';
import 'lib/soundcloud-waveform.js';
import 'lib/Tween.js';
import 'lib/uuid.js';

import Clipboard from './Clipboard';
import Quadtree from './Quadtree';
import Color from './Color';
import FileCache from './FileCache';
import History from './History';
import WickObjectCache from './ObjectCache';
import Transformation from './Transformation';
import ToolSettings from './ToolSettings';

import BuiltinAssets from 'src/builtinassets/BuiltinAssets';

import Base from 'base/Base';
import Button from 'base/Button';
import Clip from 'base/Clip';
import Frame from 'base/Frame';
import Layer from 'base/Layer';
import Path from 'base/Path';
import Project from 'base/Project';
import Selection from 'base/Selection';
import Tickable from 'base/Tickable';
import Timeline from 'base/Timeline';
import Tween from 'base/Tween';
import WickSound from 'base/WickSound';

import Asset from 'base/asset/Asset';
import ClipAsset from 'base/asset/ClipAsset';
import FileAsset from 'base/asset/FileAsset';
import FontAsset from 'base/asset/FontAsset';
import GIFAsset from 'base/asset/GIFAsset';
import ImageAsset from 'base/asset/ImageAsset';
import SoundAsset from 'base/asset/SoundAsset';
import SVGAsset from 'base/asset/SVGAsset';

import ExportUtils from 'export/ExportUtils';
import AudioTrack from 'export/audio/AudioTrack';
import AutoSave from 'export/autosave/AutoSave';
import WickFile from 'export/wick/WickFile';
import WickObjectFile from 'export/wickobj/WickObjectFile';
import HTMLExport from 'export/html/HTMLExport';
import HTMLPreview from 'export/html/HTMLPreview';
import SvgFile from 'export/svg/SvgFile'; 
import ImageSequence from 'export/image/imageSequence';
import ZIPExport from 'export/zip/ZIPExport';

import Tool from 'tools/Tool';
import Brush from 'tools/Brush';
import Cursor from 'tools/Cursor';
import Ellipse from 'tools/Ellipse';
import Eraser from 'tools/Eraser';
import Eyedropper from 'tools/Eyedropper';
import FillBucket from 'tools/FillBucket';
import Interact from 'tools/Interact';
import Line from 'tools/Line';
import None from 'tools/None';
import Pan from 'tools/Pan';
import PathCursor from 'tools/PathCursor';
import Pencil from 'tools/Pencil';
import Rectangle from 'tools/Rectangle';
import Text from 'tools/Text';
import Zoom from 'tools/Zoom';

import 'view/paper-ext/Layer.erase.js';
import 'view/paper-ext/Paper.hole.js';
import 'view/paper-ext/Paper.OrderingUtils.js';
import 'view/paper-ext/Paper.SelectionBox.js';
import 'view/paper-ext/Paper.SelectionWidget.js';
import 'view/paper-ext/Path.potrace.js';
import 'view/paper-ext/TextItem.edit.js';
import 'view/paper-ext/View.gestures.js';
import 'view/paper-ext/View.pressure.js';
import 'view/paper-ext/View.scrollToZoom.js';

import View from 'view/View';
import ViewProject from 'view/View.Project';
import ViewSelection from 'view/View.Selection';
import ViewClip from 'view/View.Clip';
import ViewButton from 'view/View.Button';
import ViewTimeline from 'view/View.Timeline';
import ViewLayer from 'view/View.Layer';
import ViewFrame from 'view/View.Frame';
import ViewPath from 'view/View.Path';

jQueryMousewheel(jQuery);

View.Project = ViewProject;
View.Selection = ViewSelection;
View.Clip = ViewClip;
View.Button = ViewButton;
View.Timeline = ViewTimeline;
View.Layer = ViewLayer;
View.Frame = ViewFrame;
View.Path = ViewPath;

window.WickSound = WickSound;

/**
 * This object creates a Wick namespace for wick-engine functionality and utilities.
 */
const Wick = {
    Clipboard, Color, FileCache, History, ObjectCache: new WickObjectCache(), Quadtree, ToolSettings, Transformation,
    BuiltinAssets: new BuiltinAssets(),
    Base, Button, Clip, Frame, Layer, Path, Project, Selection, Tickable, Timeline, Tween,
    Asset, ClipAsset, FileAsset, FontAsset, GIFAsset, ImageAsset, SoundAsset, SVGAsset,
    ExportUtils, AudioTrack, AutoSave, HTMLExport, HTMLPreview, ImageSequence, SvgFile, WickFile, WickObjectFile, ZIPExport,
    Tool, Tools: {
        Brush, Cursor, Ellipse, Eraser, Eyedropper, FillBucket, Interact, Line, None, Pan, PathCursor, Pencil, Rectangle, Text, Zoom
    },
    View,

    version: window.WICK_ENGINE_BUILD_VERSION || "dev",
    resourcepath: '../dist/',
    _originals: {}, // Eventually store a single instance of each type of Wick.Base object (see Wick.Base constructor).
    // adding global variable to track finger gestures -H.A.
    gesture: {
        active: false,
        type: null
    }
}
export default Wick;

console.log('Wick Engine version "' + Wick.version + '" is available.');
// Ensure that the Wick namespace is accessible in environments where globals are finicky (react, webpack, etc)
// Note: Rolldown handles this already using the IIFE format, but this is just to be safe
window.Wick = Wick;