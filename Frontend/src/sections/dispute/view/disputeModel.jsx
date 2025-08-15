import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Modal,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  FormControl,
  Select,
  InputLabel,
  Grid,
  MenuItem,
  TextField,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dialog,
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { z } from 'zod';

const steps = ['Initiated', 'Under Review', 'Resolved'];

const userSchema = z.object({
  comments: z.string().min(1, 'Comments is required'),
  decision: z.string().min(1, 'Dispute Status is required'),
});

const DisputesModel = ({
  open,
  onClose,
  onSave,
  getDisputID,
  getWorkFlowID,
  getNodeID,
  rowData,
  selectedRows,
}) => {
  const [statusWorkflow, setStatusWorkflow] = useState('');
  const [comment, setComment] = useState('');
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [formError, setFormError] = useState('');
  const userData = Storage.getJson('userData');
const theme = useTheme();
  const saveWorkFlow = () => {
    const payload = {
      dispute_id: getDisputID,
      work_flow_id: getWorkFlowID,
      done_by: userData.user_id,
      org_code: userData.organization,
      decision: statusWorkflow,
      comments: comment,
      nodeId: getNodeID,
    };
    const validation = userSchema.safeParse(payload);

    if (!validation.success) {
      setFormError(validation.error.issues[0].message);
      return;
    }
    try {
      postService(endpoints.auth.updateDispute, 'POST', payload)
        .then((res) => {
          if (res.status) {
            // Fixed typo: 'lengt' -> 'length'
            setStatusWorkflow('');
            setComment('');
            setAlertMessage(res.message);
            setOpenSuccessModal(true);
             onSave?.();
            // Use updatedPages as needed
          } else {
            console.log('No data found.');
          }
        })
        .catch((erro) => {
          console.error('Error while fetching master pages:', erro);
        });

      // setLoading(false);
    } catch (err) {
      console.error('Error while adding cluster:', err.response.data.message);
      // setLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            p: 4,
            bgcolor: 'white', // Ensures background is white
            width: 500,
            mx: 'auto',
            mt: 10,
            borderRadius: 2,
            boxShadow: 3,
            position: 'relative',
            color: 'black', // Ensures text and icons are visible
          }}
        >
          <IconButton
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'black', // Ensures the icon is visible
            }}
            onClick={onClose}
          >
            <Close />
          </IconButton>
          {/* Centered Title */}
          <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>
            Dispute Status
          </Typography>

          {/* Stepper */}

          {formError && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {formError}
            </Typography>
          )}

          {/* Status Dropdown */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {
                <FormControl fullWidth>
                  <InputLabel>Select Status </InputLabel>
                  <Select
                    value={statusWorkflow}
                    onChange={(e) => setStatusWorkflow(e.target.value)}
                  >
                    {/* <MenuItem value="1">Pending</MenuItem> */}
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              }
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <TextField
                  aria-label="minimum height"
                  minRows={3}
                  placeholder="Enter comments"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </FormControl>
            </Grid>

            {/* Buttons - Aligned Side by Side */}
            <Grid item xs={12} display="flex" justifyContent="space-between">
              <Button
                variant="contained"
                startIcon={<Save />}
                
                onClick={saveWorkFlow}
                sx={{flex: 1, mr: 1,
                backgroundColor: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.dark },
              }}
              >
                Save
              </Button>
              <Button variant="outlined" startIcon={<Close />} sx={{ flex: 1 }} onClick={onClose}>
                Cancel
              </Button>
            </Grid>
          </Grid>

          {/* Buttons: Next & Cancel */}
        </Box>
      </Modal>

      <Dialog open={openSuccessModal} onClose={() => setOpenSuccessModal(false)}>
        <DialogTitle>Success</DialogTitle>
        <DialogContent>{alertMessage}</DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenSuccessModal(false);
              onClose();
            }}
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DisputesModel;
