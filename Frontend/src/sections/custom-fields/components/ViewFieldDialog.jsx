// components/ViewFieldDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Grid,
  Box,
  Typography,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ViewFieldDialog = ({ open, onClose, data }) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      style: { borderRadius: 16, padding: '16px' },
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <DialogTitle>View Field</DialogTitle>
      <IconButton onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </Box>
    <Divider />
    <DialogContent sx={{ padding: '24px' }}>
      <Grid container spacing={2}>
        {[
          { label: 'Name', value: data.fieldName },
          { label: 'Label', value: data.label },
          { label: 'Type', value: data.fieldType },
          { label: 'Placeholder', value: data.placeholder },
        ].map(({ label, value }, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Typography variant="subtitle2" color="textSecondary">
              {label}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 'bold', marginTop: '4px' }}
            >
              {value || 'N/A'}
            </Typography>
          </Grid>
        ))}
      </Grid>
    </DialogContent>
    <Divider />
    <DialogActions sx={{ padding: '16px' }}>
      <Button
        onClick={onClose}
        variant="contained"
        color="primary"
        sx={{ borderRadius: '8px' }}
      >
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default ViewFieldDialog;
