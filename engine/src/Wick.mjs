/*
 * Copyright 2026 Candlestickers
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

/* Import modules */

// Packages
import Quadtree from 'quadtree-lib';
import { Howl, Howler } from 'howler';
import JSZip from 'jszip';
import lerp from 'lerp';
import TWEEN from '@tweenjs/tween.js'
import hull from 'hull';
import localforage from 'localforage';
import platform from 'platform';
import invert from 'invert-color';
import esprima from 'esprima';
import * as Base64ArrayBuffer from 'base64-arraybuffer';
import 'floodfill';

// Non-npm libraries
import Timestamp from '../lib/timestamp.js';
import convertRange from '../lib/convert-range.js';
import Croquis from '../lib/croquis.js';
import potrace from '../lib/potrace.cjs';
import '../lib/soundcloud-waveform.js';
import '../lib/roundRect.js';
import '../lib/currentTransform.js';

// Engine

// src
import './Clipboard.js';
import './Color.js';
import './Transformation.js';
import './ToolSettings.js';
import './Quadtree.js';
import './ObjectCache.js';
import './History.js';
import './GlobalAPI.js';
import './FileCache.js';
import './WickPM.js';

// paper-ext
import './view/paper-ext/Layer.erase.js';
import './view/paper-ext/Paper.hole.js';
import './view/paper-ext/Paper.OrderingUtils.js';
import './view/paper-ext/Paper.SelectionWidget.js';
import './view/paper-ext/Paper.SelectionBox.js';
import './view/paper-ext/Path.potrace.js';
import './view/paper-ext/OffsetUtils.js';
import './view/paper-ext/Path.flatten.js';
import './view/paper-ext/TextItem.edit.js';
import './view/paper-ext/View.pressure.js';
import './view/paper-ext/View.gestures.js';
import './view/paper-ext/View.scrollToZoom.js';

// GUI
import './gui/GUIElement.js';
import './gui/Ghost.js';
import './gui/Button.js';
import './gui/Icons.js';
import './gui/FramesContainer.js';
import './gui/Layer.js';
import './gui/LayerCreateLabel.js';
import './gui/LayersContainer.js';
import './gui/NumberLine.js';
import './gui/OnionSkinRange.js';
import './gui/Playhead.js';
import './gui/PopupMenu.js';
import './gui/Project.js';
import './gui/Scrollbar.js';
import './gui/ScrollbarGrabber.js';
import './gui/Timeline.js';
import './gui/Tooltip.js';
import './gui/Tween.js';
import './gui/ActionButtonsContainer.js';
import './gui/Breadcrumbs.js';
import './gui/Frame.js';
import './gui/ActionButton.js';
import './gui/BreadcrumbsButton.js';
import './gui/LayerButton.js';
import './gui/FrameEdgeGhost.js';
import './gui/FrameGhost.js';
import './gui/SelectionBox.js';
import './gui/TweenGhost.js';

// Base
import './base/Base.js';
import './base/Tickable.js';
import './base/Clip.js';
import './base/Project.js';
import './base/Layer.js';
import './base/Selection.js';
import './base/Timeline.js';
import './base/Tween.js';
import './base/Path.js';
import './base/Frame.js';
import './base/Button.js';
import './base/WickSound.js';

// Base/asset
import './base/asset/Asset.js';
import './base/asset/FileAsset.js';
import './base/asset/ClipAsset.js';
import './base/asset/FontAsset.js';
import './base/asset/ImageAsset.js';
import './base/asset/SoundAsset.js';
import './base/asset/SVGAsset.js';
import './base/asset/GIFAsset.js';

// Builtin assets
import './builtinassets/BuiltinAssets.js';

// View
import './view/View.js';
import './view/View.Clip.js';
import './view/View.Button.js';
import './view/View.Project.js';
import './view/View.Selection.js';
import './view/View.Timeline.js';
import './view/View.Layer.js';
import './view/View.Frame.js';
import './view/View.Path.js';

// The 'export' folder
import './export/ExportUtils.js';
import './export/audio/AudioTrack.js';
import './export/autosave/AutoSave.js';
import './export/html/HTMLExport.js';
import './export/html/HTMLPreview.js';
import './export/image/imageSequence.js';
import './export/svg/SvgFile.js';
import './export/wickobj/WickObjectFile.js';
import './export/zip/ZIPExport.js';
import './export/wick/WickFile.js';
import './export/wick/WickFile.Alpha.js';

// Tools
import './tools/Tool.js';
import './tools/Zoom.js';
import './tools/Brush.js';
import './tools/Cursor.js';
import './tools/Eraser.js';
import './tools/Eyedropper.js';
import './tools/Ellipse.js';
import './tools/Rectangle.js';
import './tools/FillBucket.js';
import './tools/Interact.js';
import './tools/Line.js';
import './tools/None.js';
import './tools/Pan.js';
import './tools/PathCursor.js';
import './tools/Pencil.js';
import './tools/Text.js';