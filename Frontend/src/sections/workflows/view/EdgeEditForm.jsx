import React from 'react';
import {
  Typography,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button
} from '@mui/material';

const EdgeEditForm = ({
  selectedEdge,
  edgeDetails = {},
  onDelete = {},
  setEdgeDetails,
  updateEdge,
  nodes = []
}) => {
  if (!selectedEdge) return null;

  // Defensive: always fallback to '' for label
  const labelValue = edgeDetails.label ?? '';

const updateEditDetails = (key, value) => {
    const updates = {
      ...edgeDetails,
      [key]: value,
      labelStyle: { fontSize: '10px' }
    };

    if (key === 'label') {
      if (value === 'Yes') {
        updates.direction = 'yes';
      } else if (value === 'No') {
        updates.direction = 'no';
      } else {
        updates.direction = value.toLowerCase(); // for other labels like 'forward'
      }
    }

    setEdgeDetails(updates);
  };

  // Fallback: fromNode is needed for decision logic
  const fromNode = nodes.find((n) => n.id === selectedEdge.source);

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Edit Edge: {labelValue || 'Unnamed'}
      </Typography>

      <Tooltip title="Set the label for this edge" placement="top">
        {fromNode?.typenode === 'decision' ? (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Decision Label</InputLabel>
            <Select
              value={labelValue}
              onChange={(e) => updateEditDetails('label', e.target.value)}
              label="Select Decision Label"
              displayEmpty
            >
              <MenuItem value="">Select</MenuItem>
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <TextField
            label="Edge Label"
            fullWidth
            multiline
            value={labelValue}
            placeholder="Enter Edge Name"
            sx={{ mb: 2 }}
            onChange={(e) => updateEditDetails('label', e.target.value)}
          />
        )}
      </Tooltip>

      <Tooltip title="Apply changes to the edge" placement="top">
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mb: 2 }}
          onClick={updateEdge}
        >
          Update Edge
        </Button>
      </Tooltip>

      <Button
        size="small"
        variant="contained"
        color="error"
        fullWidth
        onClick={() => onDelete(selectedEdge.id)}
      >
        Delete Edge
      </Button>

    </div>
  );
};

export default EdgeEditForm;
