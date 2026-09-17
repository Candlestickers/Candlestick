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

import React, { Component, useRef, useEffect } from 'react';

import { useDrop } from 'react-dnd';
import DragDropTypes from 'Editor/DragDropTypes.js';

import './_timeline.scss';
import 'bootstrap/dist/css/bootstrap.min.css';

import iconLock from 'resources/timeline-icons/locked.png';
import iconUnlock from 'resources/timeline-icons/unlocked.png';
import iconHidden from 'resources/timeline-icons/hidden.png';
import iconShown from 'resources/timeline-icons/shown.png';
import iconCopyForward from 'resources/timeline-icons/copyForward.png';
import iconSplit from 'resources/timeline-icons/cut_frame.png';
import iconLayerTween from 'resources/timeline-icons/layerTween.png';
import iconDelete from 'resources/timeline-icons/delete.png';
import iconSmallFrames from 'resources/timeline-icons/framesSmall.png';
import iconNormalFrames from 'resources/timeline-icons/framesNormal.png';
import iconLargeFrames from 'resources/timeline-icons/framesLarge.png';
import iconFrameSizeMenu from 'resources/timeline-icons/frameSizeMenu.png';
import iconGapFillMenuBlankFrames from 'resources/timeline-icons/gapFillMenuBlankFrames.png';
import iconGapFillMenuExtendFrames from 'resources/timeline-icons/gapFillMenuExtendFrames.png';
import iconGapFillBlankFrames from 'resources/timeline-icons/gapFillBlankFrames.png';
import iconGapFillExtendFrames from 'resources/timeline-icons/gapFillExtendFrames.png';

class Timeline extends Component {
  constructor (props) {
    super(props);

    this.canvasContainer = React.createRef();
  }

  componentDidMount () {
    let canvasContainerElem = this.canvasContainer.current;
    this.props.project.guiElement.canvasContainer = canvasContainerElem;
    this.props.project.guiElement.draw();
    canvasContainerElem.addEventListener('wickFrameSizeScroll', this._onFrameSizeScroll);
  }

  componentWillUnmount () {
    if (this.canvasContainer.current) {
      this.canvasContainer.current.removeEventListener('wickFrameSizeScroll', this._onFrameSizeScroll);
    }
  }

  _onFrameSizeScroll = (e) => {
    const step = e.detail.delta > 0 ? 3 : -3;
    const current = parseInt(localStorage.getItem('wickEditorFrameSizeValue') || '100');
    const v = Math.max(0, Math.min(150, current + step));
    localStorage.setItem('wickEditorFrameSizeValue', v);
    if (window.Wick && window.Wick.GUIElement) {
      const G = window.Wick.GUIElement;
      const XSW = 8, XSH = 16;
      let w, h;
      if (v <= 50) {
        const t = v / 50;
        w = Math.round(XSW + t * (G.GRID_SMALL_CELL_WIDTH - XSW));
        h = Math.round(XSH + t * (G.GRID_SMALL_CELL_HEIGHT - XSH));
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
    this.props.project.guiElement.draw();
  }

  componentDidUpdate () {
    var project = this.props.project;

    if(project !== this.currentAttachedProject) {
      // Import icons into the timeline GUI.
      let Icons = window.Wick.GUIElement.Icons;
      Icons.loadIcon('hide_layer', iconShown);
      Icons.loadIcon('show_layer', iconHidden);
      Icons.loadIcon('lock_layer', iconUnlock);
      Icons.loadIcon('unlock_layer', iconLock);
      Icons.loadIcon('copy_frame_forward', iconCopyForward);
      Icons.loadIcon('cut_frame', iconSplit);
      Icons.loadIcon('delete_frame', iconDelete);
      Icons.loadIcon('add_tween', iconLayerTween);
      Icons.loadIcon('small_frames', iconSmallFrames);
      Icons.loadIcon('normal_frames', iconNormalFrames);
      Icons.loadIcon('large_frames', iconLargeFrames);
      Icons.loadIcon('frame_size_menu', iconFrameSizeMenu);
      Icons.loadIcon('gap_fill_menu_blank_frames', iconGapFillMenuBlankFrames);
      Icons.loadIcon('gap_fill_menu_extend_frames', iconGapFillMenuExtendFrames);
      Icons.loadIcon('gap_fill_empty_frames', iconGapFillBlankFrames);
      Icons.loadIcon('gap_fill_extend_frames', iconGapFillExtendFrames);

      if(this.currentAttachedProject) {
        this.currentAttachedProject.guiElement.onProjectModified = () => {};
        this.currentAttachedProject.guiElement.onProjectSoftModified = () => {};
      }

      this.currentAttachedProject = project;
      project.guiElement.onProjectModified(this.onProjectModified);
      project.guiElement.onProjectSoftModified(this.onProjectSoftModified);

      let canvasContainerElem = this.canvasContainer.current;
      this.props.project.guiElement.canvasContainer = canvasContainerElem;
      project.guiElement.draw();
    }

    project.guiElement.canvasContainer = this.canvasContainer.current;
  }

  render() {
    const { dropRef, isOver } = this.props;

    return (
      <div id="animation-timeline-container" aria-label="Timeline" ref={dropRef}>
        { isOver && <div className="drag-drop-overlay" /> }
        <div id="animation-timeline" ref={this.canvasContainer} />
      </div>
    );
  }

  onProjectModified = () => {
      this.props.projectDidChange({ actionName: "Timeline Action" });
  }

  onProjectSoftModified = () => {
      this.props.project.view.render();
  }
}

function TimelineDrop(props) {
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; });

  const [{ isOver }, drop] = useDrop(() => ({
    accept: DragDropTypes.TIMELINE,
    drop(item, monitor) {
      const p = propsRef.current;
      const dropLocation = monitor.getClientOffset();
      p.dragSoundOntoTimeline(item.uuid, dropLocation.x, dropLocation.y, true);
    },
    hover(item, monitor) {
      const p = propsRef.current;
      const dropLocation = monitor.getClientOffset();
      p.dragSoundOntoTimeline(item.uuid, dropLocation.x, dropLocation.y, false);
    },
    collect: monitor => ({ isOver: monitor.isOver() }),
  }));

  return <Timeline {...props} isOver={isOver} dropRef={drop} />;
}

export default TimelineDrop;
