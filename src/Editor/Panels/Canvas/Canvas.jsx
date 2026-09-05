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

import './_canvas.scss';

class Canvas extends Component {
  constructor (props) {
    super(props);

    this.canvasContainer = React.createRef();
  }

  componentDidMount() {
    this.attachProjectToComponent(this.props.project);

    this.updateCanvas(this.props.project);

    this.props.onRef(this);
  }

  componentDidUpdate () {
    this.updateCanvas(this.props.project);
  }

  attachProjectToComponent = (project) => {
    if(this.currentAttachedProject === project) return;

    // Unsubscribe from the old project's view events before switching.
    // Wick.View has no off(), so we filter _eventHandlers directly.
    if(this.currentAttachedProject) {
      const handlers = this.currentAttachedProject.view._eventHandlers;
      if(handlers) {
        ['canvasModified', 'eyedropperPickedColor'].forEach(event => {
          if(handlers[event]) {
            handlers[event] = handlers[event].filter(
              fn => fn !== this._onCanvasModified && fn !== this._onEyedropperPickedColor
            );
          }
        });
      }
    }

    this.currentAttachedProject = project;

    project.view.canvasBGColor = "#6A6A6A";
    project.view.canvasContainer = this.canvasContainer.current;
    project.view.resize();

    project.view.on('canvasModified', this._onCanvasModified);
    project.view.on('eyedropperPickedColor', this._onEyedropperPickedColor);
  }

  _onCanvasModified = (e, actionName) => {
    this.props.projectDidChange({ actionName: `Canvas Modified ${actionName}` });
  }

  _onEyedropperPickedColor = (e) => {
    this.props.onEyedropperPickedColor(e);
  }

  updateCanvas = (project) => {
    this.attachProjectToComponent(project);
  }

  render() {
    const { dropRef, isOver } = this.props;

    return (
      <div id="canvas-container-wrapper" style={{width:"100%", height:"100%"}} aria-label="Canvas" ref={dropRef}>
        { isOver && <div className="drag-drop-overlay" /> }
        <div id="wick-canvas-container" ref={this.canvasContainer}></div>
      </div>
    );
  }
}

function CanvasDrop(props) {
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; });

  const [{ isOver }, drop] = useDrop(() => ({
    accept: DragDropTypes.CANVAS,
    drop(item, monitor) {
      const p = propsRef.current;
      const dropLocation = monitor.getClientOffset();
      if (item.files && item.files.length > 0) {
        // Dropped a file from native filesystem
        var file = item.files[0];
        var name = file.name;
        if (name.endsWith('.wick')) {
          // Wick Project (.wick file)
          p.importProjectAsWickFile(file);
        } else if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|3gp|ogv|m4v|wmv)$/i.test(name) ||
                   file.type === 'application/pdf' || name.endsWith('.pdf')) {
          // MP4/PDF → open as new project
          p.openProjectFile(file);
        } else {
          // Assets (images, sounds, etc)
          p.createAssets(item.files, [], {create: true, location: dropLocation});
        }
      } else {
        // Dropped an asset from the asset library
        p.createImageFromAsset(item.uuid, dropLocation.x, dropLocation.y);
      }
    },
    collect: monitor => ({ isOver: monitor.isOver() }),
  }));

  return <Canvas {...props} isOver={isOver} dropRef={drop} />;
}

export default CanvasDrop;
