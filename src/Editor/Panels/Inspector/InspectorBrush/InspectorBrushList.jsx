import ReactTooltip from "react-tooltip";

import PopupMenu from "Editor/Util/PopupMenu/PopupMenu";
import ToolSettingsInput from "Editor/Panels/Toolbox/ToolSettings/ToolSettingsInput/ToolSettingsInput";
import InspectorBrushTileDeleteBadge from "./InspectorBrushTileDeleteBadge";

export default function InspectorBrushList ({
  showNewBrushMenu, toggleNewBrushMenu, closeNewBrushMenu,
  savedBrushes, allShapes,
  selectedBrushIndex, selectBrush, deleteSelectedBrush,
  startNewBrush, importBrush
}) {
  const shapeMap = {};
  allShapes.forEach(s => { shapeMap[s.id] = s; });

  return (
    <div className="inspector-item" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
      <div className="brush-shape-scroll" style={{ overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px', paddingTop: '6px', paddingLeft: '6px', width: '100%' }}>
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
                onClick={() => selectBrush(brush, i)}
                style={{
                  position: 'relative',
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
                {active && savedBrushes.length > 1 && <InspectorBrushTileDeleteBadge onDelete={deleteSelectedBrush}/>}
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
            onClick={toggleNewBrushMenu}
            style={{
              position: 'relative',
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
            {/* <ReactTooltip id="brush-tip-new" type='info' place='bottom' effect='solid' aria-haspopup='true' className="wick-tooltip">
              <span>New Brush</span>
            </ReactTooltip> */}
            +
            <PopupMenu
              isOpen={showNewBrushMenu}
              toggle={closeNewBrushMenu}
              target="brush-tip-new"
              className="more-canvas-actions-popover">
              <div className="brush-modes-widget">
                <div className='actions-container'>
                  <ToolSettingsInput
                    name='Create'
                    icon='add'
                    type='checkbox'
                    value={false}
                    onChange={startNewBrush}
                  />
                  <ToolSettingsInput
                    name='Import'
                    icon='upload'
                    type='checkbox'
                    value={false}
                    onChange={() => { importBrush(); closeNewBrushMenu(); }}
                  />
                </div>
              </div>
            </PopupMenu>
          </div>
        </div>
      </div>
    </div>
  );
}