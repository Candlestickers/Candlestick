import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

import WickInput from 'Editor/Util/WickInput/WickInput';
import ToolIcon from 'Editor/Util/ToolIcon/ToolIcon';

import 'Editor/styles/Panels/Toolbox/settingsnumericslider.css';

const classNames = require('classnames');

export default function SettingsNumericSlider (props) {

  const [sliderOn, setSliderOn] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});

  // Calculate position and open the slider popover
  function openSlider() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        zIndex: 100,
      });
    }
    setSliderOn(true);
  }

  // Close when clicking outside both the trigger and the popover
  useEffect(() => {
    if (!sliderOn) return;
    function handleOuterClick(e) {
      const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const inPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!inTrigger && !inPopover) {
        setSliderOn(false);
      }
    }
    document.addEventListener('mousedown', handleOuterClick);
    return () => document.removeEventListener('mousedown', handleOuterClick);
  }, [sliderOn]);

  const editorEl = document.getElementById('editor') || document.body;

  return (
    <div className="settings-numeric-slider">
      <ToolIcon
        name={props.icon}
        className={classNames("settings-numeric-slider-icon", {mobile: props.isMobile})}/>

      <div ref={triggerRef}>
        <WickInput
          type="numeric"
          className={classNames("settings-numeric-input", {"mobile": props.isMobile})}
          onChange={props.onChange}
          onFocus={openSlider}
          onClick={openSlider}
          value={props.value}
          {...props.inputRestrictions}
        />
      </div>

      {sliderOn && ReactDOM.createPortal(
        <div
          ref={popoverRef}
          className="settings-numeric-slider-container"
          style={popoverStyle}
        >
          <WickInput
            type="slider"
            containerclassname="settings-slider-wick-input-container"
            className="settings-numeric-slider"
            onChange={props.onChange}
            value={props.value}
            {...props.inputRestrictions} />
        </div>,
        editorEl
      )}
    </div>
  )
}
