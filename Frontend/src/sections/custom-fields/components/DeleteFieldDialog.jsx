// components/DeleteFieldDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from '@mui/material';

const DeleteFieldDialog = ({ open, onClose, onDelete, fieldName }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Confirm Delete</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to delete?
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onDelete} color="error">Delete</Button>
    </DialogActions>
  </Dialog>
);

export default DeleteFieldDialog;
