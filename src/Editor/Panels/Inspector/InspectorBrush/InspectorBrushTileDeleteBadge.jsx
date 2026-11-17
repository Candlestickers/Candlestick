export default function InspectorBrushTileDeleteBadge ({ onDelete }) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete"
        style={{
          position: 'absolute',
          top: '-5px',
          left: '-5px',
          width: '14px',
          height: '14px',
          borderRadius: '100%',
          background: '#4a4a4a',
          border: '1px solid rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          lineHeight: 1,
          color: 'white',
          cursor: 'pointer',
          zIndex: 2,
        }}> 
        {/* draing the X symbol for deleting brush preset/ shape :P -H.A. */}
        &times;
      </div>
    );
  }