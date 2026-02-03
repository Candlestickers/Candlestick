import React from 'react';

import './_inspectorframebutton.scss';

import WickInput from 'Editor/Util/WickInput/WickInput';

function InspectorFrameButton (props) {
    let className = "wick-frame-picker-button" + (props.isActive ? " wick-frame-picker-button-active" : "");
    return (
        <WickInput className={className} type="button" onClick={props.onClick}>
            <div className="wick-frame-picker-button-image">
                <img src={props.image} alt="Frame SVG" />
            </div>
            <div className="wick-frame-picker-button-text" title={props.label}>{props.label}</div>
        </WickInput>
    );
}

export default InspectorFrameButton