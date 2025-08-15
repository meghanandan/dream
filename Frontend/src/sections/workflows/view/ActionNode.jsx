import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

const handleStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: '#28a745',
  border: '2px solid #fff',
  zIndex: 10,
  pointerEvents: 'all',
};

export default function ActionNode({ data, selected }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'visible',
        background: '#fff',
        border: '2px solid #28a745',
        borderLeft: '8px solid #28a745',
        borderRadius: 18,
        padding: '0 16px',
        minWidth: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected
          ? '0 0 8px rgba(40,167,69,0.5)'
          : '0 2px 5px rgba(0,0,0,0.1)',
        fontWeight: 600,
        fontSize: 14,
        userSelect: 'none',
      }}
    >
      {/* inbound from decision (top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        style={{
          ...handleStyle,
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* inbound from decision (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in-left"
        style={{
          ...handleStyle,
          left: -6,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* inbound from decision (bottom) */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="in-bottom"
        style={{
          ...handleStyle,
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* outbound to next node */}
      <Handle
        type="source"
        position={Position.Right}
        id="out-right"
        style={{
          ...handleStyle,
          right: -6,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.label || 'Action'}
      </span>
    </div>
  );
}
