import React, { Component } from 'react';

import ActionButton from 'Editor/Util/ActionButton/ActionButton';
import PopupMenu from 'Editor/Util/PopupMenu/PopupMenu';
import './_canvasactions.scss';

import classNames from 'classnames';

class CanvasActions extends Component {
  renderActionButton(action) {
    return (
      <ActionButton
        color="tool"
        id={"canvas-action-button-" + action.icon}
        tooltip={action.tooltip}
        action={action.action}
        tooltipPlace={"bottom"}
        icon={action.icon}
        className="canvas-action-button" />
      );
    }

  renderActions = () => {
    return (
      <div className={classNames('actions-container', this.props.renderSize === "small" && "vertical")}>
        {this.renderActionButton(this.props.editorActions.flipHorizontal)}
        {this.renderActionButton(this.props.editorActions.flipVertical)}
        {/* -H.A. */}
      </div>
    );
  }

  renderBooleanActions = () => {
    return (
      <div className={classNames('actions-container', this.props.renderSize === "small" && "vertical")}>
        {this.renderActionButton(this.props.editorActions.booleanUnite)}
        {this.renderActionButton(this.props.editorActions.booleanSubtract)}
        {this.renderActionButton(this.props.editorActions.booleanIntersect)}
        {/* -H.A. */}
      </div>
    );
  }

  renderLayersActions = () => {
    return (
      <div className={classNames('actions-container', this.props.renderSize === "small" && "vertical")}>
        {this.renderActionButton(this.props.editorActions.sendToBack)}
        {this.renderActionButton(this.props.editorActions.sendBackward)}
        {this.renderActionButton(this.props.editorActions.sendForward)}
        {this.renderActionButton(this.props.editorActions.sendToFront)}
        {/* -H.A. */}
      </div>
    );
  }

  renderAlignmentActions = () => {
    return (
      <div className={classNames('actions-container', this.props.renderSize === "small" && "vertical")}>
        {this.renderActionButton(this.props.editorActions.alignRight)}
        {this.renderActionButton(this.props.editorActions.alignLeft)}
        {this.renderActionButton(this.props.editorActions.alignTop)}
        {this.renderActionButton(this.props.editorActions.alignBottom)}
        {this.renderActionButton(this.props.editorActions.alignX)}
        {this.renderActionButton(this.props.editorActions.alignY)}
        {/* <ToolboxBreak vertical={this.props.renderSize === "small"}/> */}
        {/* -H.A. */}
      </div>
    );
  }

  render () {
    return (
      <div>
        {/* ALL MENU */}
        <PopupMenu
          mobile={this.props.renderSize === "small"}
          isOpen={this.props.showCanvasActions}
          toggle={this.props.toggleCanvasActions}
          target="more-canvas-actions-popover-button"
          className={"more-canvas-actions-popover"}
        >
          <div className={classNames("canvas-actions-widget", this.props.renderSize === "small" && "vertical")}>
            {!this.props.previewPlaying && this.renderActions()}
          </div>
        </PopupMenu>

        {/* ALL MENU */}
        <PopupMenu
          mobile={this.props.renderSize === "small"}
          isOpen={this.props.showBooleanCanvasActions}
          toggle={this.props.toggleBooleanCanvasActions}
          target="boolean-canvas-actions-popover-button"
          className={"more-canvas-actions-popover"}
        >
          <div className={classNames("canvas-actions-widget", this.props.renderSize === "small" && "vertical")}>
            {!this.props.previewPlaying && this.renderBooleanActions()}
          </div>
        </PopupMenu>

        {/* ALL MENU */}
        <PopupMenu
          mobile={this.props.renderSize === "small"}
          isOpen={this.props.showLayersCanvasActions}
          toggle={this.props.toggleLayersCanvasActions}
          target="layers-canvas-actions-popover-button"
          className={"more-canvas-actions-popover"}
        >
          <div className={classNames("canvas-actions-widget", this.props.renderSize === "small" && "vertical")}>
            {!this.props.previewPlaying && this.renderLayersActions()}
          </div>
        </PopupMenu>

        {/* ALL MENU */}
        <PopupMenu
          mobile={this.props.renderSize === "small"}
          isOpen={this.props.showAlignmentCanvasActions}
          toggle={this.props.toggleAlignmentCanvasActions}
          target="alignment-canvas-actions-popover-button"
          className={"more-canvas-actions-popover"}
        >
          <div className={classNames("canvas-actions-widget", this.props.renderSize === "small" && "vertical")}>
            {!this.props.previewPlaying && this.renderAlignmentActions()}
          </div>
        </PopupMenu>


      </div>
    )
  }
}

export default CanvasActions
