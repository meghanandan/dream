import React from "react";
import { Handle, Position } from "react-flow-renderer";
import { Box, Typography } from "@mui/material";

const handleStyle = {
  background: "#ffab00",
  border: "2px solid #fff",
  width: 10,
  height: 10,
  borderRadius: "50%",
  zIndex: 10,
};

export default function DecisionNode({ data, selected }) {
  const raw = data.label?.trim() || "Decision";
  const label = raw.length > 12 ? `${raw.slice(0, 10)}…` : raw;

  return (
    <Box
      sx={{
        position: "relative",
        width: 70,
        height: 70,
        overflow: "visible",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* top */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ ...handleStyle, top: -15, left: "50%", transform: "translateX(-50%)" }}
      />
      {/* left */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ ...handleStyle, left: -15, top: "50%", transform: "translateY(-50%)" }}
      />
      {/* right */}
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        style={{ ...handleStyle, right: -15, top: "50%", transform: "translateY(-50%)" }}
      />
      {/* bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ ...handleStyle, bottom: -15, left: "50%", transform: "translateX(-50%)" }}
      />
      {/* diamond */}
      <Box
        sx={{
          width: 70,
          height: 70,
          background: "#fffbe8",
          border: "3px solid #ffab00",
          transform: "rotate(45deg)",
          borderRadius: 2,
          boxShadow: selected
            ? "0 0 10px rgba(0,0,0,0.3)"
            : "0 2px 5px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          sx={{
            transform: "rotate(-45deg)",
            fontSize: 11,
            color: "#b47300",
            textAlign: "center",
            width: 55,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.description
    ? data.description.length > 12
      ? `${data.description.slice(0, 10)}…`
      : data.description
    : label}
        </Typography>
      </Box>
    </Box>
  );
}
