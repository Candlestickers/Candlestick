import InspectorBrushTileDeleteBadge from "./InspectorBrushTileDeleteBadge";

export default function InspectorBrushShapePicker (
  { currentShape, setShape, availableDefaultShapes, svgCustomShapes, deleteSelectedShape }
) {
  const allShapes = [
    ...availableDefaultShapes,
    ...svgCustomShapes,
  ];
  return (
    <div className="inspector-item" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
      <div className="brush-shape-scroll" style={{ overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px', paddingTop: '6px', paddingLeft: '6px', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
          {allShapes.map(shape => {
            const active = currentShape === shape.id;
            return (
              <div
                key={shape.id}
                onClick={() => setShape(shape.id)}
                title={shape.name}
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
                {active && allShapes.length > 1 && <InspectorBrushTileDeleteBadge onDelete={deleteSelectedShape} />}
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