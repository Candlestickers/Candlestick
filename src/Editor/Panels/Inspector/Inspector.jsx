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

import ToolSettingsInput from 'Editor/Panels/Toolbox/ToolSettings/ToolSettingsInput/ToolSettingsInput';
import PopupMenu from 'Editor/Util/PopupMenu/PopupMenu';
import ReactTooltip from 'react-tooltip';
import localForage from 'localforage';
import { toast } from 'react-toastify';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';

import { Console, Hook, Unhook } from 'console-feed';
// import { useEffect, useState } from 'react';

window.EditorGradientColorSwapState = false;

// Default brushes — structured like a parsed .cbrush JSON for easy migration later.
// Each field matches the keys stored/loaded by saveBrush / applyBrush.
const DEFAULT_BRUSHES = [
  {
    name: 'Basic',
    shape: 'circle',
    brushSize: 10,
    brushResolution: 0.75,
    brushSpacing: 0.2,
    brushScatterEnabled: false,
    brushScatterAmount: 0.3,
    brushRandomRotation: false,
    brushStabilizerWeight: 20,
    fillColorRgba: '#000000',
  },
];

const BRUSH_SHAPES = [
  { id: 'circle',     name: 'Circle',
    svg: <circle cx="14" cy="14" r="12"/> },
  { id: 'square',     name: 'Square',
    svg: <rect x="2" y="2" width="24" height="24"/> },
  { id: 'rect',       name: 'Flat',
    svg: <rect x="2" y="9" width="24" height="10"/> },
  { id: 'chisel',     name: 'Chisel',
    svg: <ellipse cx="14" cy="14" rx="12" ry="3" transform="rotate(45 14 14)"/> },
  { id: 'diamond',    name: 'Diamond',
    svg: <polygon points="14,2 26,14 14,26 2,14"/> },
  { id: 'triangle',   name: 'Triangle',
    svg: <polygon points="14,2 26,26 2,26"/> },
  { id: 'star',       name: 'Star',
    svg: <polygon points="14,2 16.9,10 25.4,10.3 18.8,15.5 21.1,23.7 14,19 6.9,23.7 9.2,15.5 2.6,10.3 11.1,10"/> },
  { id: 'sparkle',    name: 'Sparkle',
    svg: <polygon points="14,1 15.4,12.6 27,14 15.4,15.4 14,27 12.6,15.4 1,14 12.6,12.6"/> },
  { id: 'leaf',       name: 'Leaf',
    svg: <path d="M14,2 Q26,14 14,26 Q2,14 14,2 Z"/> },
  { id: 'rough',      name: 'Rough',
    svg: <path d="M14,2 Q18,0 23,5 Q28,9 26,15 Q28,20 23,24 Q18,29 12,26 Q6,28 3,22 Q-1,17 3,11 Q5,5 10,2 Q12,1 14,2 Z"/> },
  { id: 'scatter',    name: 'Scatter',
    svg: <><circle cx="14" cy="14" r="4"/><circle cx="7" cy="8" r="3"/><circle cx="21" cy="8" r="2.5"/><circle cx="7" cy="20" r="3"/><circle cx="21" cy="20" r="2.5"/></> },
  { id: 'cross',      name: 'Cross',
    svg: <><rect x="12" y="2" width="4" height="24"/><rect x="2" y="12" width="24" height="4"/></> },
  { id: 'crescent',   name: 'Crescent',
    svg: <path d="M14,2 C6,5 2,10 2,14 C2,18 6,23 14,26 C12,22 10,18 10,14 C10,10 12,6 14,2 Z"/> },
  { id: 'hexagon',    name: 'Hexagon',
    svg: <polygon points="14,2 24.4,8 24.4,20 14,26 3.6,20 3.6,8"/> },
];

class Inspector extends Component {
  constructor (props) {
    super(props);

    this.state = {
      logs: [],
      showBrushModes: false,
      isEditingBrush: false,
      savedBrushes: DEFAULT_BRUSHES,
      selectedBrushIndex: null,
      customShapes: [],
      removedShapes: [],
    };

    this.handleConsoleLog = (log) => {
      this.setState((state) => ({
        logs: [...state.logs, log]
      }));
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
      "fontasset": this.renderAsset,
      "clipasset": this.renderAsset,
      "multiassetmixed": this.renderAsset,
      "multisoundasset": this.renderAsset,
      "multiimageasset": this.renderAsset,
    }

    /**
     * Which actions should be shown for which selection types.
     */
    this.actionRules = {
      'breakApart': ["clip", "button",],
      'convertSelectionToButton': ["path", "text", "image", "multipath", "multiclip", "multicanvas"],
      'convertSelectionToClip': ["path", "text", "image", "multipath", "multiclip", "multicanvas"],
      'editTimeline': ["clip", "button"],
      'addAssetToCanvas': ["imageasset", "clipasset"],
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
      "fontasset": "Font Asset",
      "clipasset": "Clip Asset",
      "multiassetmixed": "Multi-Asset",
      "multisoundasset": "Multi-Asset Sound",
      "multiimageasset": "Multi-Asset Image",
      "unknown": "", // <-- note to self, this is the state when nothing is selected
    }
  }

  brushPreviewRef = React.createRef();

  componentDidMount() {
    Hook(window.console, this.handleConsoleLog, false);
    if (this.props.activeTool === 'brush') this.drawBrushPreview();
    localForage.getItem('WICK.CUSTOM_SHAPES').then(shapes => {
      if (shapes && Array.isArray(shapes)) {
        this.setState({ customShapes: shapes });
        // Register with engine so _buildBrushTipCanvas can find them
        window.wickCustomBrushShapes = window.wickCustomBrushShapes || {};
        shapes.forEach(cs => { window.wickCustomBrushShapes[cs.id] = cs; });
      }
    });
    localForage.getItem('WICK.REMOVED_SHAPES').then(removed => {
      if (removed && Array.isArray(removed)) {
        this.setState({ removedShapes: removed });
      }
    });
    localForage.getItem('WICK.BRUSHPRESETS').then(saved => {
      const brushes = (saved && Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_BRUSHES;
      localForage.getItem('WICK.BRUSHPRESETS.selectedIndex').then(idx => {
        const validIdx = (typeof idx === 'number' && idx >= 0 && idx < brushes.length) ? idx : null;
        // Restore visual selection only — ToolSettings already restores each
        // individual setting (brushSize, brushResolution, etc.) from its own
        // localforage keys, so calling applyBrush here would race and overwrite them.
        this.setState({ savedBrushes: brushes, selectedBrushIndex: validIdx });
      });
    });
  }
  componentWillUnmount() {
    Unhook(window.console);
  }

  componentDidUpdate(prevProps,prevState) { // no need to pass in prevProps, react automatically inputs it

    if(window.project.playing && this.consoleEndRef.current) {
      this.consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    if (this.props.activeTool === 'brush') {
      const justSwitchedToBrush = prevProps.activeTool !== 'brush';
      if (justSwitchedToBrush) this._lastPreviewSettings = null;
      const keys = [
        'brushResolution', 'brushSpacing', 'brushScatterAmount',
        'brushScatterEnabled', 'brushRandomRotation', 'brushShape'
      ];
      const last = this._lastPreviewSettings;
      const currColor = this.props.getToolSetting('fillColor');
      const colorChanged = !last || (currColor && currColor.rgba) !== last.fillColorRgba;
      const settingChanged = !last || keys.some(k => this.props.getToolSetting(k) !== last[k]);
      if (colorChanged || settingChanged) this.drawBrushPreview();
    }

  }

  // BRUSH PREVIEW— we're literally drawing a brush stroke here -H.A.
  drawBrushPreview = () => {
    const canvas = this.brushPreviewRef.current;
    if (!canvas) return;
    // Size the canvas buffer to physical pixels so it's sharp on Retina/HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth  || 220;
    const cssH = canvas.clientHeight || 80;
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Background — use project background color
    let bgColor = '#1c1c1c';
    try {
      const bg = window.project && window.project.backgroundColor;
      if (bg) bgColor = bg.rgba;
    } catch(e) {}
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // Brush color — use current fill color
    let brushColor = '#5a9fd4';
    try {
      const fc = this.props.getToolSetting('fillColor');
      if (fc) brushColor = fc.rgba;
    } catch(e) {}

    const shape = this.props.getToolSetting('brushShape') || 'circle';
    const spacing = Math.max(0.05, this.props.getToolSetting('brushSpacing') || 0.2);
    const scatterEnabled = this.props.getToolSetting('brushScatterEnabled');
    const scatterAmount= this.props.getToolSetting('brushScatterAmount') || 0.3;
    const randomRotation = this.props.getToolSetting('brushRandomRotation');
    const resT=this.props.getToolSetting('brushResolution') ?? 0.75;

    // Snapshot current settings so componentDidUpdate can detect future changes
    this._lastPreviewSettings = { brushResolution: resT, brushSpacing: spacing,
      brushScatterAmount: scatterAmount, brushScatterEnabled: scatterEnabled,
      brushRandomRotation: randomRotation, brushShape: shape,
      fillColorRgba: brushColor };

    // Resolution: same smoothnessFactor formula as the engine
    const smoothness = 0.05 + (Math.pow(resT, 5) + 0.1 * resT * (1 - resT)) * 0.95;

    const stampSize = 13;
    const stepDist  = Math.max(2, stampSize * spacing * 1.5);

    let _seed = 12345;
    const rand = () => { _seed = (_seed * 1664525 + 1013904223) & 0xffffffff; return (_seed >>> 0) / 0xffffffff; };

    const margin= stampSize + 4;
    const amplitude = (H - stampSize * 2) / 2.5;
    const pathW = W - margin * 2;
    const numSteps = Math.ceil(pathW / stepDist) + 1;

    // Rasterize stamps onto a TRANSPARENT offscreen canvas.
    // potrace.createFromImage classifies pixels by alpha (alpha > 155 = foreground).
    // So we must NOT fill a white background — transparent = background, opaque stamp = foreground.
    // If you don't get it uhhhh… just trust me bro
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = W;
    stampCanvas.height = H;
    const sCtx = stampCanvas.getContext('2d');

    for (let i = 0; i < numSteps; i++) {
      const t = numSteps > 1 ? i / (numSteps - 1) : 0;

      const sz = stampSize;

      let x = margin + t * pathW;
      let y = H / 2 + Math.sin(t * Math.PI * 2.5) * amplitude;

      rand(); rand(); // consume position-jitter slots (not applied; potrace handles jaggedness via scale)
      const rotation = randomRotation ? rand() * Math.PI * 2 : (rand(), 0);
      const r4 = rand(), r5 = rand();
      if (scatterEnabled) {
        const sc = sz * scatterAmount;
        x += (r4 - 0.5) * sc * 2;
        y += (r5 - 0.5) * sc * 2;
      }

      // Always draw at 24 segs — jaggedness comes from potrace on a smaller canvas below
      this._drawBrushStamp(sCtx, x, y, sz, shape, rotation, '#000000', 24);
    }

    // Scale down to simulate low resolution: fewer pixels → potrace produces angular shapes.
    // imageScaleFactor range mirrors the engine: ~0.25 at Reso=0, 1.0 at Reso=1.
    const imageScaleFactor = 0.25 + smoothness * 0.75;
    const smallW = Math.max(30, Math.round(W * imageScaleFactor));
    const smallH = Math.max(15, Math.round(H * imageScaleFactor));
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = smallW;
    smallCanvas.height = smallH;
    const smallCtx = smallCanvas.getContext('2d');
    smallCtx.imageSmoothingEnabled = true;
    smallCtx.drawImage(stampCanvas, 0, 0, smallW, smallH);

    // Run potrace — same step as the engine does after the croquis rasterization
    const pt = window.potrace;
    if (pt) {
      try {
        let svgStr = pt.fromImage(smallCanvas).toSVG(1);
        // Replace the traced fill color with the actual brush color
        svgStr = svgStr.replace(/fill="[^"]*"/g, `fill="${brushColor}"`);
        // Render via Image so the browser handles SVG fill-rule correctly
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url  = URL.createObjectURL(blob);
        const img  = new Image();
        img.onload = () => {
          // Draw background again in case a previous (slower) load fires late
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, W, H);
          // Scale SVG back up to full preview size — low-res SVG drawn large = jagged edges visible
          ctx.drawImage(img, 0, 0, W, H);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      } catch(e) {
        this._brushPreviewFallback(ctx, W, H, bgColor, brushColor, shape, spacing, scatterEnabled,
          scatterAmount, randomRotation, smoothness, stampSize, stepDist,
          margin, amplitude, pathW, numSteps);
      }
    } else {
      this._brushPreviewFallback(ctx, W, H, bgColor, brushColor, shape, spacing, scatterEnabled,
        scatterAmount, randomRotation, smoothness, stampSize, stepDist,
        margin, amplitude, pathW, numSteps);
    }
  }

  // Polygon-approximation fallback when potrace is unavailable
  _brushPreviewFallback = (ctx, W, H, bgColor, brushColor, shape, spacing, scatterEnabled,
    scatterAmount, randomRotation, smoothness, stampSize, stepDist,
    margin, amplitude, pathW, numSteps) => {
    const curveSegs = Math.max(3, Math.round(smoothness * 24));
    const jitterAmt = (1 - smoothness) * 4;
    let _seed = 12345;
    const rand = () => { _seed = (_seed * 1664525 + 1013904223) & 0xffffffff; return (_seed >>> 0) / 0xffffffff; };
    for (let i = 0; i < numSteps; i++) {
      const t = numSteps > 1 ? i / (numSteps - 1) : 0;
      const sz = stampSize;
      let x = margin + t * pathW;
      let y = H / 2 + Math.sin(t * Math.PI * 2.5) * amplitude;
      if (jitterAmt > 0) { x += (rand() - 0.5) * jitterAmt; y += (rand() - 0.5) * jitterAmt; } else { rand(); rand(); }
      const rotation = randomRotation ? rand() * Math.PI * 2 : (rand(), 0);
      const r4 = rand(), r5 = rand();
      if (scatterEnabled) { const sc = sz * scatterAmount; x += (r4 - 0.5) * sc * 2; y += (r5 - 0.5) * sc * 2; }
      this._drawBrushStamp(ctx, x, y, sz, shape, rotation, brushColor, curveSegs);
    }
  }

  _drawBrushStamp = (ctx, x, y, size, shape, rotation, color, curveSegs = 24) => {
    const r = size / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color || '#5a9fd4';

    // Helper: draw a circle/ellipse as a polygon with curveSegs sides.
    // rx, ry = radii; pre-rotate by startAngle.
    const polyArc = (rx, ry, startAngle = 0) => {
      for (let i = 0; i <= curveSegs; i++) {
        const a = startAngle + (i / curveSegs) * Math.PI * 2;
        const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    if (shape === 'chisel') {
      // Ellipse rotated 45°, approximated with curveSegs points
      ctx.beginPath();
      for (let i = 0; i <= curveSegs; i++) {
        const a  = (i / curveSegs) * Math.PI * 2;
        const ex = Math.cos(a) * r, ey = Math.sin(a) * r * 0.25;
        const rx = ex * Math.cos(Math.PI/4) - ey * Math.sin(Math.PI/4);
        const ry = ex * Math.sin(Math.PI/4) + ey * Math.cos(Math.PI/4);
        i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore(); return;
    }
    if (shape === 'softcircle') {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      const c0 = color || 'rgba(90,159,212,1)';
      const toAlpha = (rgba, a) => rgba.replace(/[\d.]+\)$/, `${a})`);
      g.addColorStop(0,   toAlpha(c0, 1));
      g.addColorStop(0.5, toAlpha(c0, 0.55));
      g.addColorStop(1,   toAlpha(c0, 0));
      ctx.beginPath(); polyArc(r, r);
      ctx.fillStyle = g; ctx.fill();
      ctx.restore(); return;
    }
    if (shape === 'scatter') {
      [[0,0,0.4],[-0.6,-0.5,0.3],[0.6,-0.5,0.25],[-0.6,0.5,0.3],[0.6,0.5,0.25]].forEach(([px,py,pr]) => {
        ctx.beginPath(); ctx.arc(px*r, py*r, pr*r, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore(); return;
    }
    if (shape === 'cross') {
      ctx.fillRect(-r*0.28, -r, r*0.56, size);
      ctx.fillRect(-r, -r*0.28, size, r*0.56);
      ctx.restore(); return;
    }

    // Custom shapes in preview mode
    if (shape && shape.startsWith('custom_')) {
      const customData = window.wickCustomBrushShapes && window.wickCustomBrushShapes[shape];
      if (customData && customData.pathD) {
        ctx.save();
        ctx.translate(-size / 2, -size / 2); // center the 28×28 box at origin
        const toLocal = size / 28;
        ctx.scale(toLocal, toLocal);
        ctx.translate(customData.tx, customData.ty);
        ctx.scale(customData.scale, customData.scale);
        ctx.fill(new Path2D(customData.pathD));
        ctx.restore();
      } else {
        // fallback circle in case something's wrong with the shapes ;-;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore(); return;
    }

    // Standard path shapes
    ctx.beginPath();
    switch (shape) {
      case 'circle':    polyArc(r, r); break;
      case 'square':    ctx.rect(-r, -r, size, size); break;
      case 'rect':      ctx.rect(-r, -r*0.35, size, size*0.35); break;
      case 'diamond':
        ctx.moveTo(0,-r); ctx.lineTo(r,0); ctx.lineTo(0,r); ctx.lineTo(-r,0); ctx.closePath(); break;
      case 'triangle':
        ctx.moveTo(0,-r); ctx.lineTo(r,r); ctx.lineTo(-r,r); ctx.closePath(); break;
      case 'star':
        for (let i=0;i<10;i++){const a=(i*Math.PI)/5-Math.PI/2,rad=i%2?r*0.4:r;i?ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
        ctx.closePath(); break;
      case 'sparkle':
        for (let i=0;i<8;i++){const a=(i*Math.PI)/4-Math.PI/4,rad=i%2?r*0.2:r;i?ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
        ctx.closePath(); break;
      case 'leaf':
        ctx.moveTo(0,-r); ctx.quadraticCurveTo(r*1.2,0,0,r); ctx.quadraticCurveTo(-r*1.2,0,0,-r); break;
      case 'rough':
        ctx.moveTo(0,-r);
        ctx.bezierCurveTo(r*0.7,-r*1.2, r*1.4,r*0.2, r*0.8,r*0.7);
        ctx.bezierCurveTo(r*0.3,r*1.2, -r*0.8,r*1.1, -r*0.9,r*0.5);
        ctx.bezierCurveTo(-r*1.3,-r*0.1, -r*0.6,-r*1.1, 0,-r); break;
      case 'crescent':
        ctx.arc(0,0,r,Math.PI*0.8,Math.PI*2.2);
        ctx.arc(r*0.35,0,r*0.72,Math.PI*2.2,Math.PI*0.8,true); break;
      case 'hexagon':
        for (let i=0;i<6;i++){const a=(i*Math.PI)/3-Math.PI/6;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
        ctx.closePath(); break;
      default: // circle fallback
        polyArc(r, r);
    }
    ctx.fill();
    ctx.restore();
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
    let color = this.getSelectionAttribute('fillColor');
    if (color instanceof window.paper.Color && color.gradient) {
      let maxOpacity = color.gradient.stops.reduce((total, stop) => stop.color.alpha > total ? stop.color.alpha : total, 0);
      return maxOpacity;
    }
    return color.alpha;
  }

  /**
   * Sets the value of the selection fillColor opacity.
   * @param  {string} attribute Selection attribute to retrieve.
   */
  setSelectionFillColorOpacity = (value) => {
    var color = this.getSelectionAttribute('fillColor');
    if (color instanceof window.paper.Color && color.gradient) {
      let maxOpacity = color.gradient.stops.reduce((total, stop) => stop.color.alpha > total ? stop.color.alpha : total, 0);
      if (maxOpacity === 0) {
        color.gradient.stops.forEach(stop => {
          stop.color.alpha = value;
        });
      }
      else {
        let changeFactor = value / maxOpacity;
        color.gradient.stops.forEach(stop => {
          stop.color.alpha *= changeFactor;
        });
      }

    }
    else {
      color.alpha = value;
      this.setSelectionAttribute('fillColor', color);
    }
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

  /**
   * Updates the value of a selection attribute without adding to the undo stack.
   * @param {string} attribute Name of the attribute to update.
   * @param {string|number} newValue  New value of the attribute to update.
   */
  setSelectionAttributeIntermediate = (attribute, newValue) => {
    if (attribute === 'fillColorOpacity') {
      return this.setSelectionFillColorOpacity(newValue);
    }
    this.props.project.selection[attribute] = newValue;
    this.props.project.view.render();
    this.props.project.guiElement.draw();
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
          val1={this.getSelectionAttribute('fillColor')}
          onChange1={(col) => this.setSelectionAttribute('fillColor', col)}
          onChangeIntermediate1={(col) => this.setSelectionAttributeIntermediate('fillColor', col)}
          enableGradient={true}
          selectionProps={{
            getSelection: () => this.props.project.selection,
            renderSelection: () => this.props.project.view.render(),
            targetCanvas: this.props.project.view._svgCanvas
          }}
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

          val1={this.getSelectionAttribute('strokeColor')}
          onChange1={(col) => this.setSelectionAttribute('strokeColor', col)}
          onChangeIntermediate1={(col) => this.setSelectionAttributeIntermediate('strokeColor', col)}
          enableGradient={true}
          selectionProps={{
            getSelection: () => this.props.project.selection,
            renderSelection: () => this.props.project.view.render(),
            targetCanvas: this.props.project.view._svgCanvas
          }}
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
        {this.renderOpacity()}
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

  toggleBrushModes = () => {
    this.setState({ showBrushModes: !this.state.showBrushModes });
  }

  closeBrushModes = () => {
    this.setState({ showBrushModes: false });
  }

  deleteSelectedShape = () => {
    const shape = this.props.getToolSetting('brushShape');
    if (!shape) return;
    // Block deletion if any saved preset uses this shape
    const inUse = this.state.savedBrushes.some(b => b.shape === shape);
    if (inUse) {
      toast.warning('Cannot delete shape; being used by another preset', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'warning-toast-background',
        bodyClassName: 'warning-toast-body',
        progressClassName: 'warning-toast-progress',
      });
      return;
    }
    const { customShapes, removedShapes } = this.state;
    // Build the current available shape list to find the next one to select
    const allAvailable = [
      ...BRUSH_SHAPES.filter(s => !removedShapes.includes(s.id)),
      ...customShapes,
    ];
    if (allAvailable.length <= 1) return; // never delete the last shape
    const currentIdx = allAvailable.findIndex(s => s.id === shape);
    const nextIdx = currentIdx > 0 ? currentIdx - 1 : 1;
    const nextShape = allAvailable[nextIdx] || allAvailable[0];

    if (shape.startsWith('custom_')) {
      // Remove from customShapes
      const updatedCustomShapes = customShapes.filter(cs => cs.id !== shape);
      if (window.wickCustomBrushShapes) delete window.wickCustomBrushShapes[shape];
      this.setState({ customShapes: updatedCustomShapes });
      localForage.setItem('WICK.CUSTOM_SHAPES', updatedCustomShapes);
    } else {
      // Add to removedShapes (built-in shapes are hidden, not truly deleted)
      const updatedRemoved = [...removedShapes, shape];
      this.setState({ removedShapes: updatedRemoved });
      localForage.setItem('WICK.REMOVED_SHAPES', updatedRemoved);
    }
    // Select and apply the next shape
    this.props.setToolSetting('brushShape', nextShape.id);
  }

  deleteSelectedBrush = () => {
    const { savedBrushes, selectedBrushIndex } = this.state;
    if (selectedBrushIndex === null) return;
    if (savedBrushes.length <= 1) return; // keep at least one preset
    const updated = savedBrushes.filter((_, i) => i !== selectedBrushIndex);
    const newIndex = Math.min(selectedBrushIndex, updated.length - 1);
    this.setState({ savedBrushes: updated, selectedBrushIndex: newIndex });
    localForage.setItem('WICK.BRUSHPRESETS', updated);
    localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', newIndex);
    // Apply the newly selected brush
    this.applyBrush(updated[newIndex]);
  }

  saveBrush = () => {
    const { savedBrushes, selectedBrushIndex } = this.state;
    const brushData = {
      name: selectedBrushIndex !== null ? savedBrushes[selectedBrushIndex].name : `Brush ${savedBrushes.length + 1}`,
      shape:             this.props.getToolSetting('brushShape'),
      brushSize:         this.props.getToolSetting('brushSize'),
      brushResolution:   this.props.getToolSetting('brushResolution'),
      brushSpacing:      this.props.getToolSetting('brushSpacing'),
      brushScatterEnabled:  this.props.getToolSetting('brushScatterEnabled'),
      brushScatterAmount:   this.props.getToolSetting('brushScatterAmount'),
      brushRandomRotation:  this.props.getToolSetting('brushRandomRotation'),
      brushStabilizerWeight: this.props.getToolSetting('brushStabilizerWeight'),
      fillColorRgba: (() => { try { return this.props.getToolSetting('fillColor').rgba; } catch(e) { return '#000000'; } })(),
    };
    if (selectedBrushIndex !== null) {
      const updated = [...savedBrushes];
      updated[selectedBrushIndex] = brushData;
      this.setState({ savedBrushes: updated, isEditingBrush: false });
      localForage.setItem('WICK.BRUSHPRESETS', updated);
      localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', selectedBrushIndex);
    } else {
      const newIndex = savedBrushes.length;
      const updated = [...savedBrushes, brushData];
      this.setState({ savedBrushes: updated, selectedBrushIndex: newIndex, isEditingBrush: false });
      localForage.setItem('WICK.BRUSHPRESETS', updated);
      localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', newIndex);
    }
  }

  applyBrush = (brush) => {
    this.props.setToolSetting('brushShape', brush.shape);
    this.props.setToolSetting('brushSize', brush.brushSize);
    this.props.setToolSetting('brushResolution', brush.brushResolution);
    this.props.setToolSetting('brushSpacing', brush.brushSpacing);
    this.props.setToolSetting('brushScatterEnabled', brush.brushScatterEnabled);
    this.props.setToolSetting('brushScatterAmount', brush.brushScatterAmount);
    this.props.setToolSetting('brushRandomRotation', brush.brushRandomRotation);
    this.props.setToolSetting('brushStabilizerWeight', brush.brushStabilizerWeight);
  }

  createBrushFromPath = () => {
    const objs = this.props.project.selection.getSelectedObjects();
    if (!objs || objs.length !== 1) return;
    const wickPath = objs[0];
    if (!wickPath.view || !wickPath.view.item) return;

    const item = wickPath.view.item;
    const svgEl = item.exportSVG();
    const d = svgEl.getAttribute('d');
    if (!d) return;

    const b = item.bounds;
    const size = Math.max(b.width, b.height) || 1;
    const scale = 24 / size;
    const tx = 2 + (24 - b.width * scale) / 2 - b.x * scale;
    const ty = 2 + (24 - b.height * scale) / 2 - b.y * scale;

    const id = 'custom_' + Date.now();
    const newShape = { id, name: 'Custom', pathD: d, tx, ty, scale };
    const updatedCustomShapes = [...this.state.customShapes, newShape];

    // Register with engine immediately so brush can draw it right away
    window.wickCustomBrushShapes = window.wickCustomBrushShapes || {};
    window.wickCustomBrushShapes[id] = newShape;

    this.setState({ customShapes: updatedCustomShapes, isEditingBrush: true, selectedBrushIndex: null });
    localForage.setItem('WICK.CUSTOM_SHAPES', updatedCustomShapes);

    this.props.setActiveTool('brush');
    this.props.setToolSetting('brushShape', id);
  }

  renderBrushList = () => {
    const { savedBrushes, selectedBrushIndex, customShapes } = this.state;
    const shapeMap = {};
    BRUSH_SHAPES.forEach(s => { shapeMap[s.id] = s; });
    customShapes.forEach(cs => {
      shapeMap[cs.id] = { id: cs.id, name: cs.name,
        svg: <g transform={`translate(${cs.tx}, ${cs.ty}) scale(${cs.scale})`}><path d={cs.pathD} /></g> };
    });

    return (
      <div className="inspector-item" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        <div className="brush-shape-scroll" style={{ overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
            {savedBrushes.map((brush, i) => {
              const active = selectedBrushIndex === i;
              const shape = shapeMap[brush.shape] || shapeMap['circle'];
              const tipId = `brush-tip-${i}`;
              return (
                <div
                  key={i}
                  id={tipId}
                  data-tip
                  data-for={tipId}
                  onClick={() => {
                    this.setState({ selectedBrushIndex: i, isEditingBrush: false });
                    this.applyBrush(brush);
                    localForage.setItem('WICK.BRUSHPRESETS.selectedIndex', i);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: '6px 2px',
                    borderRadius: '5px',
                    background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
                  }}>
                  <ReactTooltip id={tipId} type='info' place='bottom' effect='solid' aria-haspopup='true' className="wick-tooltip">
                    <span>{brush.name || 'Brush'}</span>
                  </ReactTooltip>
                  <svg width="22" height="22" viewBox="0 0 28 28" style={{ display: 'block' }}>
                    <g fill="white">{shape.svg}</g>
                  </svg>
                </div>
              );
            })}
            {/* "+" add new brush cell */}
            <div
              id="brush-tip-new"
              data-tip
              data-for="brush-tip-new"
              onClick={() => this.setState({ selectedBrushIndex: null, isEditingBrush: true })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '6px 2px',
                borderRadius: '5px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.2)',
                fontSize: '18px',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1,
              }}>
              <ReactTooltip id="brush-tip-new" type='info' place='bottom' effect='solid' aria-haspopup='true' className="wick-tooltip">
                <span>New Brush</span>
              </ReactTooltip>
              +
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderBrushShapePicker = () => {
    const currentShape = this.props.getToolSetting('brushShape');
    const { customShapes, removedShapes } = this.state;
    const allShapes = [
      ...BRUSH_SHAPES.filter(s => !removedShapes.includes(s.id)),
      ...customShapes.map(cs => ({
        id: cs.id,
        name: cs.name,
        svg: <g transform={`translate(${cs.tx}, ${cs.ty}) scale(${cs.scale})`}><path d={cs.pathD} /></g>,
      })),
    ];
    return (
      <div className="inspector-item" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        <div className="brush-shape-scroll" style={{ overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
            {allShapes.map(shape => {
              const active = currentShape === shape.id;
              return (
                <div
                  key={shape.id}
                  onClick={() => this.props.setToolSetting('brushShape', shape.id)}
                  title={shape.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: '6px 2px',
                    borderRadius: '5px',
                    background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
                  }}>
                  <svg width="22" height="22" viewBox="0 0 28 28" style={{ display: 'block' }}>
                    <g fill="white">{shape.svg}</g>
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  renderBrushSettings = () => {
    let brushModeIcon = 'brushmodenone';
    let brushMode = this.props.getToolSetting('brushMode');
    if (brushMode === 'inside') brushModeIcon = 'brushmodeinside';
    else if (brushMode === 'outside') brushModeIcon = 'brushmodeoutside';

    const { isEditingBrush, selectedBrushIndex } = this.state;
    const canEdit = selectedBrushIndex !== null || isEditingBrush;

    return (
      <div>
        {/* Brush name input — only in edit mode */}
        {isEditingBrush && (
          <div className="inspector-item">
            <InspectorTextInput
              tooltip="Name"
              val={selectedBrushIndex !== null ? (this.state.savedBrushes[selectedBrushIndex]?.name || '') : ''}
              onChange={(val) => {
                if (selectedBrushIndex === null) return;
                const updated = [...this.state.savedBrushes];
                updated[selectedBrushIndex] = { ...updated[selectedBrushIndex], name: val };
                this.setState({ savedBrushes: updated });
              }}
              placeholder="Brush"
              id="inspector-brush-name"
            />
          </div>
        )}
        {/* Brush stroke preview */}
        <div style={{ margin: '6px 8px 2px', borderRadius: '3px', overflow: 'hidden', border: '1px solid #333' }}>
          <canvas
            ref={this.brushPreviewRef}
            width={220}
            height={100}
            style={{ display: 'block', width: '100%' }}
          />
        </div>
        {/* Saved brush list */}
        {/* Brush list — hidden while editing */}
        {!isEditingBrush && this.renderBrushList()}
        {/* Sliders always visible */}
        <div className="inspector-item">
          <InspectorNumericSlider
            tooltip="Brush Size"
            icon="brushsize"
            label="Size"
            val={this.props.getToolSetting('brushSize')}
            onChange={(val) => this.props.setToolSetting('brushSize', val)}
            inputProps={this.props.getToolSettingRestrictions('brushSize')}
            onReset={() => this.props.setToolSetting('brushSize', 10)}
          />
          <InspectorNumericSlider
            tooltip="Smoothing"
            icon="brushsmoothness"
            label="Lead"
            val={this.props.getToolSetting('brushStabilizerWeight')}
            onChange={(val) => this.props.setToolSetting('brushStabilizerWeight', val)}
            inputProps={this.props.getToolSettingRestrictions('brushStabilizerWeight')}
            onReset={() => this.props.setToolSetting('brushStabilizerWeight', 20)}
          />
          {/* Edit-only sliders */}
          {isEditingBrush && (<>
            <InspectorNumericSlider
              tooltip="Resolution"
              icon="brushresolution"
              label="Reso"
              val={this.props.getToolSetting('brushResolution')}
              onChange={(val) => this.props.setToolSetting('brushResolution', val)}
              inputProps={this.props.getToolSettingRestrictions('brushResolution')}
              onReset={() => this.props.setToolSetting('brushResolution', 0.75)}
            />
            <InspectorNumericSlider
              tooltip="Spacing"
              icon="brushspacing"
              label="Link"
              val={this.props.getToolSetting('brushSpacing')}
              onChange={(val) => this.props.setToolSetting('brushSpacing', val)}
              inputProps={this.props.getToolSettingRestrictions('brushSpacing')}
              onReset={() => this.props.setToolSetting('brushSpacing', 0.2)}
            />
            {this.props.getToolSetting('brushScatterEnabled') && (
              <InspectorNumericSlider
                tooltip="Scatter Amount"
                icon="brushscatter"
                label="Spread"
                val={this.props.getToolSetting('brushScatterAmount')}
                onChange={(val) => this.props.setToolSetting('brushScatterAmount', val)}
                inputProps={this.props.getToolSettingRestrictions('brushScatterAmount')}
                onReset={() => this.props.setToolSetting('brushScatterAmount', 0.3)}
              />
            )}
          </>)}
        </div>
        {/* Edit-only: shape picker */}
        {isEditingBrush && this.renderBrushShapePicker()}
        {/* Toggles — all in one row; scatter/rotation only when editing */}
        <div className='settings-input-container' style={{ marginTop: '8px' }}>
          <ToolSettingsInput
            name='Enable Pressure'
            icon='brushpressure'
            type='checkbox'
            value={this.props.getToolSetting('pressureEnabled')}
            onChange={() => this.props.setToolSetting('pressureEnabled', !this.props.getToolSetting('pressureEnabled'))}
          />
          <ToolSettingsInput
            name='Relative Brush Size'
            icon='brushrelativesize'
            type='checkbox'
            value={this.props.getToolSetting('relativeBrushSize')}
            onChange={() => this.props.setToolSetting('relativeBrushSize', !this.props.getToolSetting('relativeBrushSize'))}
          />
          <div id="inspector-brush-modes-popover-button">
            <ToolSettingsInput
              name='Brush Modes'
              icon={brushModeIcon}
              type='checkbox'
              value={brushMode !== 'none'}
              onChange={this.toggleBrushModes}
            />
            <PopupMenu
              isOpen={this.state.showBrushModes}
              toggle={this.closeBrushModes}
              target="inspector-brush-modes-popover-button"
              className="more-canvas-actions-popover">
              <div className="brush-modes-widget">
                <div className='actions-container'>
                  <ToolSettingsInput
                    name='None'
                    icon='brushmodenone'
                    type='checkbox'
                    value={brushMode === 'none'}
                    onChange={() => { this.props.setToolSetting('brushMode', 'none'); this.closeBrushModes(); }}
                  />
                  <ToolSettingsInput
                    name='Inside'
                    icon='brushmodeinside'
                    type='checkbox'
                    value={brushMode === 'inside'}
                    onChange={() => { this.props.setToolSetting('brushMode', 'inside'); this.closeBrushModes(); }}
                  />
                  <ToolSettingsInput
                    name='Outside'
                    icon='brushmodeoutside'
                    type='checkbox'
                    value={brushMode === 'outside'}
                    onChange={() => { this.props.setToolSetting('brushMode', 'outside'); this.closeBrushModes(); }}
                  />
                </div>
              </div>
            </PopupMenu>
          </div>
          {isEditingBrush && (<>
            <ToolSettingsInput
              name='Random Scatter'
              icon='brushscatter'
              type='checkbox'
              value={this.props.getToolSetting('brushScatterEnabled')}
              onChange={() => this.props.setToolSetting('brushScatterEnabled', !this.props.getToolSetting('brushScatterEnabled'))}
            />
            <ToolSettingsInput
              name='Random Rotation'
              icon='brushrandomrotation'
              type='checkbox'
              value={this.props.getToolSetting('brushRandomRotation')}
              onChange={() => this.props.setToolSetting('brushRandomRotation', !this.props.getToolSetting('brushRandomRotation'))}
            />
          </>)}
          {/* Trash — delete custom shape (edit mode) or delete preset (browse mode) */}
          {(() => {
            const currentShape = this.props.getToolSetting('brushShape');
            const availableShapeCount = BRUSH_SHAPES.filter(s => !this.state.removedShapes.includes(s.id)).length + this.state.customShapes.length;
            const canDeleteShape = isEditingBrush && !!currentShape && availableShapeCount > 1;
            const canDeleteBrush = !isEditingBrush && selectedBrushIndex !== null && this.state.savedBrushes.length > 1;
            const deleteAction = canDeleteShape ? this.deleteSelectedShape : canDeleteBrush ? this.deleteSelectedBrush : () => {};
            const deleteTooltip = canDeleteShape ? 'Delete Shape' : canDeleteBrush ? 'Delete Brush' : 'Delete';
            return (
              <div className="settings-checkbox-input">
                <ActionButton
                  icon='delete'
                  color='checkbox'
                  id='settings-input-id-delete-brush'
                  tooltip={deleteTooltip}
                  action={deleteAction}
                  iconClassName='toolbox-input-icon'
                />
              </div>
            );
          })()}
        </div>
        {/* Edit Brush / Save Brush button */}
        {canEdit && (
          <div className="inspector-item" style={{ marginTop: '6px' }}>
            <InspectorActionButton action={{
              id: 'brush-edit-save',
              icon: isEditingBrush ? 'check-black' : 'pencil-black',
              tooltip: isEditingBrush ? 'Save Brush' : 'Edit Brush',
              color: 'inspector',
              action: isEditingBrush
                ? this.saveBrush
                : () => this.setState({ isEditingBrush: true }),
            }} />
          </div>
        )}
      </div>
    );
  }

  /**
   * Renders a default selection view with no properties.
   */
  renderUnknown = () => {
    // if(!window.project.playing)
      // this.state.logs = []; // <-- note: mutate state directly, DO NOT USE setState()
    const logsForRender = window.project.playing ? this.state.logs : [];
    // scroll reference
    this.consoleEndRef = React.createRef();

    return (
      <div>
        <div className="inspector-content">
          {/* Code for displaying console - H.A. */}
          {window.project.playing && (
        <div style={{ width: '110%', height: 'auto', overflowY: 'scroll', backgroundColor: '#242424' }}>
          <Console logs={logsForRender} variant="dark" />
          <div ref={this.consoleEndRef} />
        </div>
      )}
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
        if (actionList.indexOf(selectionType) > -1) actions.push(action);
    });

    return(
      <div className="inspector-content">
        {actions.map((action, i) => {
            return this.renderActionButton(this.props.editorActions[action], i);
          })}
        {selectionType === 'path' && (
          <div className="inspector-item">
            <InspectorActionButton action={{
              id: 'create-brush',
              icon: 'brush-black',
              tooltip: 'Create Brush',
              color: 'inspector',
              action: this.createBrushFromPath,
            }} />
          </div>
        )}
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

    if (this.props.activeTool === 'brush') {
      return (
        <div className="docked-pane inspector" aria-label="Inspector Panel">
          <div className="inspector-title-container">
            <InspectorTitle type="" title="Brush Tools" />
          </div>
          <div className="inspector-body">
            {this.renderBrushSettings()}
          </div>
        </div>
      );
    }

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
