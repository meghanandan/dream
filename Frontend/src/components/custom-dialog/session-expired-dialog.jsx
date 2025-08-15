import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

export function SessionExpiredDialog({ open, onClose, onSignIn }) {
  return (
    <Dialog 
      fullWidth 
      maxWidth="xs" 
      open={open} 
      onClose={onClose}
      disableEscapeKeyDown
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2, 
        display: 'flex', 
        alignItems: 'center',
        color: 'warning.main'
      }}>
        <Iconify 
          icon="material-symbols:lock-clock" 
          sx={{ mr: 1, fontSize: 24 }} 
        />
        Session Expired
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <DialogContentText sx={{ typography: 'body2', color: 'text.secondary' }}>
          Your session has expired for security reasons. Please sign in again to continue using the application.
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={onSignIn}
          startIcon={<Iconify icon="material-symbols:login" />}
          fullWidth
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Sign In Again
        </Button>
      </DialogActions>
    </Dialog>
  );
}
