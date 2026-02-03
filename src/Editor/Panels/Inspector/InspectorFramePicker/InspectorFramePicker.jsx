import React, {useState} from 'react';

import './_inspectorframepicker.scss';

import WickInput from 'Editor/Util/WickInput/WickInput';
import InspectorFrameButton from './InspectorFrameButton/InspectorFrameButton';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';

function InspectorFramePicker (props) {
    const [open, setOpen] = useState(false);
    const [layoutIsList, setLayoutIsList] = useState(true);

    function renderFrameButtons () {
        if (!props.selectedObject) return;
        let clipImages = props.selectedObject.view.fetchSVGs();
        return clipImages.map(item => {
            return (
                <InspectorFrameButton
                    image={item.image}
                    label={`${item.index}${item.name !== item.index ? (" " + item.name) : ""}`}
                    key={`frame-${item.index}`}
                    onClick={() => props.onChange(item.index)}
                    isActive={props.getActiveFrame() === item.index} />
            );
        });
    }

    const layoutClass = layoutIsList ? 'wick-frame-picker-list' : 'wick-frame-picker-grid';
    return (
        <div className="wick-frame-picker">
            <WickInput className="wick-frame-picker-switch"
                type="button"
                onClick={() => setOpen(!open)}>
                Use Frame Picker
            </WickInput>
            {open &&
            <>
                <div className="wick-frame-picker-layout-buttons">
                    <div className="wick-frame-picker-action-button">
                        <ActionButton
                            color="tool"
                            id="wick-frame-picker-grid-button"
                            tooltip="Grid"
                            action={() => {setLayoutIsList(false)}}
                            isActive={() => !layoutIsList}
                            icon="framePickerGrid" />
                    </div>
                    <div className="wick-frame-picker-action-button">
                        <ActionButton
                            color="tool"
                            id="wick-frame-picker-list-button"
                            tooltip="List"
                            action={() => {setLayoutIsList(true)}}
                            isActive={() => layoutIsList}
                            icon="framePickerList" />
                    </div>
                </div>
                <div className={`wick-frame-picker-button-container ${layoutClass}`}>
                    {renderFrameButtons()}
                    {!props.isSingleFrame &&
                    <div className="wick-frame-picker-disabled">
                        Requires Animation set to "Single Frame"
                    </div>
                    }
                </div>
            </>
            }
        </div>
    );
}

export default InspectorFramePicker