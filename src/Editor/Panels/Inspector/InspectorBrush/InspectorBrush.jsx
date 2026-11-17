import ToolSettingsInput from "Editor/Panels/Toolbox/ToolSettings/ToolSettingsInput/ToolSettingsInput";
import InspectorNumericSlider from "../InspectorRow/InspectorRowTypes/InspectorNumericSlider";
import InspectorSelector from "../InspectorRow/InspectorRowTypes/InspectorSelector";
import InspectorTextInput from "../InspectorRow/InspectorRowTypes/InspectorTextInput";
import InspectorBrushList from "./InspectorBrushList";
import InspectorBrushShapePicker from "./InspectorBrushShapePicker";
import PopupMenu from "Editor/Util/PopupMenu/PopupMenu";
import InspectorActionButton from "../InspectorActionButton/InspectorActionButton";

// Default brushes — structured like a parsed .cbrush JSON for easy migration later.
// Each field matches the keys stored/loaded by saveBrush / applyBrush.
export const DEFAULT_BRUSH_PROPS = {
  shape: 'circle',
  brushSize: 10,
  brushResolution: 1,
  brushSpacing: 0.2,
  brushScatterAmount: 0,
  brushRotationMode: 'fixed',
  brushRotationOffset: 0,
  brushStabilizerWeight: 20,
  fillColorRgba: '#000000',
};
export const DEFAULT_BRUSHES = [
  { name: 'Basic', ...DEFAULT_BRUSH_PROPS },
];

export const BRUSH_SHAPES = [
  { id: 'circle',     name: 'Circle',
    svg: <circle cx="14" cy="14" r="12"/> },
  { id: 'square',     name: 'Square',
    svg: <rect x="2" y="2" width="24" height="24"/> },
  { id: 'sparkle',    name: 'Sparkle',
    svg: <polygon points="14,1 15.4,12.6 27,14 15.4,15.4 14,27 12.6,15.4 1,14 12.6,12.6"/> },
  { id: 'leaf',       name: 'Leaf',
    svg: <path d="M14,2 Q26,14 14,26 Q2,14 14,2 Z"/> },
  { id: 'scatter',    name: 'Scatter',
    svg: <><circle cx="14" cy="14" r="4"/><circle cx="7" cy="8" r="3"/><circle cx="21" cy="8" r="2.5"/><circle cx="7" cy="20" r="3"/><circle cx="21" cy="20" r="2.5"/></> },
];

export const ROTATION_MODE_OPTIONS = [
  { label: 'Fixed',  value: 'fixed' },
  { label: 'Path',   value: 'path' },
  { label: 'Random', value: 'random' },
];

// Wraps a degree value into [-180, 180] instead of clamping, so e.g. 200 becomes
// -160 (the same angle) rather than getting truncated to the 180 boundary.
const _normalizeAngle = (deg) => {
  let a = ((deg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  // 180 and -180 are the same angle; keep whichever sign was actually typed
  // instead of always snapping to +180, so e.g. -180 doesn't jump to 180.
  if (a === 180 && deg < 0) a = -180;
  return a;
}

export default function InspectorBrush ({
  getToolSetting, getToolSettingRestrictions, setToolSetting,
  brushPreviewRef,
  isEditingBrush, editBrush, saveEditingBrush, cancelEditingBrush,
  savedBrushes, selectedBrushIndex, selectBrush, renameSelectedBrush, deleteSelectedBrush,
  showNewBrushMenu, toggleNewBrushMenu, closeNewBrushMenu, startNewBrush, importBrush,
  showBrushModes, toggleBrushModes, closeBrushModes,
  removedShapes, customShapes, deleteSelectedShape,
  downloadBrush,
  brushFileInputRef, handleBrushFileImport
}) {

  let brushModeIcon = 'brushmodenone';
  let brushMode = getToolSetting('brushMode');
  if (brushMode === 'inside') brushModeIcon = 'brushmodeinside';
  else if (brushMode === 'outside') brushModeIcon = 'brushmodeoutside';
  const rotationMode = getToolSetting('brushRotationMode');

  const canEdit = selectedBrushIndex !== null || isEditingBrush;

  const availableDefaultShapes = BRUSH_SHAPES.filter(s => !removedShapes.includes(s.id));
  const svgCustomShapes = customShapes.map(cs => ({
    id: cs.id,
    name: cs.name,
    svg: <g transform={`translate(${cs.tx}, ${cs.ty}) scale(${cs.scale})`}><path d={cs.pathD} /></g>,
  }));
  const allShapes = [...BRUSH_SHAPES, ...svgCustomShapes];
  const availableShapes = [...availableDefaultShapes, ...svgCustomShapes];

  return (
    <div>
      {/* Brush name input — only in edit mode */}
      {isEditingBrush && (
        <div className="inspector-item">
          <InspectorTextInput
            tooltip="Name"
            val={selectedBrushIndex !== null ? (savedBrushes[selectedBrushIndex]?.name || '') : ''}
            onChange={renameSelectedBrush}
            placeholder="Brush"
            id="inspector-brush-name"
          />
        </div>
      )}
      {/* Brush stroke preview */}
      <div style={{ margin: '6px 8px 2px', borderRadius: '3px', overflow: 'hidden', border: '1px solid #333' }}>
        <canvas
          ref={brushPreviewRef}
          width={220}
          height={100}
          style={{ display: 'block', width: '100%' }}
        />
      </div>
      {/* Saved brush list */}
      {/* Brush list — hidden while editing */}
      {!isEditingBrush && (
        <InspectorBrushList
          showNewBrushMenu={showNewBrushMenu}
          toggleNewBrushMenu={toggleNewBrushMenu}
          closeNewBrushMenu={closeNewBrushMenu}
          savedBrushes={savedBrushes}
          allShapes={allShapes}
          selectedBrushIndex={selectedBrushIndex}
          selectBrush={selectBrush}
          deleteSelectedBrush={deleteSelectedBrush}
          startNewBrush={startNewBrush}
          importBrush={importBrush}
        />
      )}
      {/* Sliders always visible */}
      <div className="inspector-item">
        {!isEditingBrush && (<>
          <InspectorNumericSlider
            tooltip="Brush Size"
            icon="brushsize"
            label="Size"
            val={getToolSetting('brushSize')}
            onChange={(val) => setToolSetting('brushSize', val)}
            inputProps={getToolSettingRestrictions('brushSize')}
            onReset={() => setToolSetting('brushSize', 10)}
          />
          <InspectorNumericSlider
            tooltip="Smoothing"
            icon="brushsmoothness"
            label="Lead"
            val={getToolSetting('brushStabilizerWeight')}
            onChange={(val) => setToolSetting('brushStabilizerWeight', val)}
            inputProps={getToolSettingRestrictions('brushStabilizerWeight')}
            onReset={() => setToolSetting('brushStabilizerWeight', 20)}
          />
        </>)}
        {/* Edit-only sliders */}
        {isEditingBrush && (<>
          <InspectorNumericSlider
            tooltip="Resolution"
            icon="brushresolution"
            label="Quality"
            val={getToolSetting('brushResolution')}
            onChange={(val) => setToolSetting('brushResolution', val)}
            inputProps={getToolSettingRestrictions('brushResolution')}
            onReset={() => setToolSetting('brushResolution', 0.75)}
          />
          <InspectorNumericSlider
            tooltip="Spacing"
            icon="brushspacing"
            label="Link"
            val={getToolSetting('brushSpacing')}
            onChange={(val) => setToolSetting('brushSpacing', val)}
            inputProps={getToolSettingRestrictions('brushSpacing')}
            onReset={() => setToolSetting('brushSpacing', 0.2)}
          />
          <InspectorNumericSlider
            tooltip="Scatter Amount"
            icon="brushscatter"
            label="Spread"
            val={getToolSetting('brushScatterAmount')}
            onChange={(val) => setToolSetting('brushScatterAmount', val)}
            inputProps={getToolSettingRestrictions('brushScatterAmount')}
            onReset={() => setToolSetting('brushScatterAmount', 0)}
          />
        </>)}
      </div>
      {/* Edit-only: rotation mode + offset -H.A */}
      {isEditingBrush && (
        <div className="inspector-item">
          <InspectorSelector
            tooltip="Rotation"
            type="select"
            isSearchable={true}
            value={rotationMode}
            options={ROTATION_MODE_OPTIONS}
            onChange={(val) => setToolSetting('brushRotationMode', val.value)} />
          {rotationMode !== 'random' && (
            <InspectorNumericSlider
              tooltip="Rotation Offset"
              icon="brushrandomrotation"
              label=""
              val={getToolSetting('brushRotationOffset')}
              onChange={(val) => setToolSetting('brushRotationOffset', _normalizeAngle(val))}
              inputProps={getToolSettingRestrictions('brushRotationOffset')}
              // onReset={() => setToolSetting('brushRotationOffset', 0)}
            />
          )}
        </div>
      )}
      {/* Edit-only: shape picker */}
      {isEditingBrush && (
        <InspectorBrushShapePicker
          availableShapes={availableShapes}
          currentShape={getToolSetting('brushShape')}
          setShape={shape => setToolSetting('brushShape', shape)}
          deleteSelectedShape={deleteSelectedShape}
        />
      )}
      {/* Toggles — browse mode only (edit mode has nothing to show here) */}
      {!isEditingBrush && (
        <div className='settings-input-container' style={{ marginTop: '8px' }}>
          <ToolSettingsInput
            name='Enable Pressure'
            icon='brushpressure'
            type='checkbox'
            value={getToolSetting('pressureEnabled')}
            onChange={() => setToolSetting('pressureEnabled', !getToolSetting('pressureEnabled'))}
          />
          <ToolSettingsInput
            name='Relative Brush Size'
            icon='brushrelativesize'
            type='checkbox'
            value={getToolSetting('relativeBrushSize')}
            onChange={() => setToolSetting('relativeBrushSize', !getToolSetting('relativeBrushSize'))}
          />
          <div id="inspector-brush-modes-popover-button">
            <ToolSettingsInput
              name='Brush Modes'
              icon={brushModeIcon}
              type='checkbox'
              value={brushMode !== 'none'}
              onChange={toggleBrushModes}
            />
            <PopupMenu
              isOpen={showBrushModes}
              toggle={closeBrushModes}
              target="inspector-brush-modes-popover-button"
              className="more-canvas-actions-popover">
              <div className="brush-modes-widget">
                <div className='actions-container'>
                  <ToolSettingsInput
                    name='None'
                    icon='brushmodenone'
                    type='checkbox'
                    value={brushMode === 'none'}
                    onChange={() => { setToolSetting('brushMode', 'none'); closeBrushModes(); }}
                  />
                  <ToolSettingsInput
                    name='Inside'
                    icon='brushmodeinside'
                    type='checkbox'
                    value={brushMode === 'inside'}
                    onChange={() => { setToolSetting('brushMode', 'inside'); closeBrushModes(); }}
                  />
                  <ToolSettingsInput
                    name='Outside'
                    icon='brushmodeoutside'
                    type='checkbox'
                    value={brushMode === 'outside'}
                    onChange={() => { setToolSetting('brushMode', 'outside'); closeBrushModes(); }}
                  />
                </div>
              </div>
            </PopupMenu>
          </div>
        </div>
      )}
      {/* Edit Brush button, or Cancel + Save Brush side by side while editing */}
      {canEdit && (
        <div className="inspector-item">
          {isEditingBrush ? (
            <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <InspectorActionButton action={{
                  id: 'brush-cancel-edit',
                  icon: 'cancel-black',
                  tooltip: 'Cancel',
                  color: 'red',
                  action: cancelEditingBrush,
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <InspectorActionButton action={{
                  id: 'brush-edit-save',
                  icon: 'check-black',
                  tooltip: 'Save',
                  color: 'inspector',
                  action: saveEditingBrush,
                }} />
              </div>
            </div>
          ) : (
            <InspectorActionButton action={{
              id: 'brush-edit-save',
              icon: 'pencil-black',
              tooltip: 'Edit Brush',
              color: 'inspector',
              action: editBrush,
            }} />
          )}
        </div>
      )}
      {/* Download Brush button — edit mode only */}
      {isEditingBrush && (
        <div className="inspector-item" style={{ marginTop: '4px' }}>
          <InspectorActionButton action={{
            id: 'brush-download',
            icon: 'brush-black',
            tooltip: 'Download Brush',
            color: 'inspector',
            action: downloadBrush,
          }} />
        </div>
      )}
      {/* Hidden file input for importing .cbrush files */}
      <input
        type="file"
        accept=".cbrush,.json"
        ref={brushFileInputRef}
        style={{ display: 'none' }}
        onChange={handleBrushFileImport}
      />
    </div>
  );
}