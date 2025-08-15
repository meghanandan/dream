import React from "react";
import { Handle, Position } from "react-flow-renderer";

const StartEndNode = ({ data, selected, onDelete }) => {
  // Determine if this is a start or end node from the label
  const label = data.label || "";
  const isStart = label.toLowerCase() === "start";
  // For end nodes, we accept any label that isn't "start" - this makes it more flexible
  const isEnd = !isStart;
  
  const color = isStart ? "#1976d2" : "#757575";
  const nodeText = label;

  return (
    <div
      style={{
        background: color,
        color: "#fff",
        borderRadius: "50%",
        width: 56,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 12,
        boxShadow: selected
          ? `0 0 16px 2px ${color}50`
          : "0 2px 8px 0 rgba(0,0,0,0.10)",
        border: selected ? `2.5px solid #222` : "2px solid #fff",
        position: "relative",
        outline: selected ? "2px solid #1976d2" : "none",
        userSelect: "none",
        textAlign: "center",
        lineHeight: "1.1",
        padding: "2px",
      }}
    >
      {/* Target handle (input) - only for END nodes */}
      {isEnd && (
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{
            background: color,
            border: "2px solid #fff",
            width: 10,
            height: 10,
            borderRadius: "50%",
            left: -5,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      )}
      
      {/* Source handle (output) - only for START nodes */}
      {isStart && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{
            background: color,
            border: "2px solid #fff",
            width: 10,
            height: 10,
            borderRadius: "50%",
            right: -5,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      )}
      
      {nodeText}
    </div>
  );
};

export default StartEndNode;
