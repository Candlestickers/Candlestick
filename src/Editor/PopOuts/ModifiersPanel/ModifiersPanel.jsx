/*
 * Copyright 2026 Candlestickers
 *
 * This file is part of Candlestick.
 *
 * Candlestick is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Candlestick is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Candlestick.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Rnd } from 'react-rnd';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';

import 'Editor/styles/PopOuts/_wickcodeeditor.css';

// TODO: make it testable
/*
What we must do to intercept mouseclicks etc:
1 - Intercept.
2 - Stop propagation.
3 - do: e = new MouseEvent('mouseup', {...e, ctrlKey: this.ctrl, shiftKey: this.shift, altKey: this.alt, metaKey: this.meta});
4 - Let it continue to the editor.
*/

export default function ModifiersPanel(props) {

    /**
     * To be called when the modifiers popout is repositioned.
     */
    function onDragHandler(_e, d) {
        props.updateModifiersPanelWindowProperties({
            x: d.x,
            y: d.y,
        });
    }

    /**
     * To be called when the modifiers popout is resized.
     */
    function onResizeHandler(_e, _dir, ref, _delta, _position) {
        props.updateModifiersPanelWindowProperties({
            width: ref.style.width,
            height: ref.style.height,
        });
    }

    if (props.renderSize === 'small') {
        return (
            <Rnd
                id="cs-modifiers-panel-resizeable-small"
                bounds="window"
                dragHandleClassName="cs-modifiers-panel-drag-handle"
                width={window.innerWidth}
                onResizeStop={onResizeHandler}
                onDragStop={onDragHandler}
                default={props.modifiersPanelWindowProperties}
            >
                <div className="cs-modifiers-panel-small">
                    <div className="cs-modifiers-drag-handle small">
                        <div className="cs-modifiers-panel-title small">
                            Modifier Keys
                        </div>
                        <ActionButton
                            className="we-modifiers-close-button"
                            color="tool"
                            icon="cancel-white"
                            action={props.toggleModifiersPanel} />
                    </div>
                </div>
            </Rnd>)
    }
    else return (
        <Rnd
            id="cs-modifiers-panel-resizeable"
            bounds="window"
            dragHandleClassName="cs-modifiers-panel-drag-handle"
            minWidth={props.modifiersPanelWindowProperties.minWidth}
            minHeight={props.modifiersPanelWindowProperties.minHeight}
            onResizeStop={onResizeHandler}
            onDragStop={onDragHandler}
            default={props.modifiersPanelWindowProperties}>

            <div className="cs-modifiers-panel-drag-handle">
                <div className="cs-modifiers-panel-icon">{"</>"}</div>
                <div className="cs-modifiers-panel-title">Modifiers Panel</div>
                <ActionButton
                    className="cs-modifiers-close-button"
                    color="tool"
                    icon="cancel-white"
                    action={props.toggleModifiersPanel} />
            </div>
        </Rnd>
    )
}