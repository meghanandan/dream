import React from 'react';
import {
  Box,
  Typography,
  Modal,
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { fDateTimeFromUTC } from '../../../utils/format-time';

const StepperModal = ({ open, onClose, history = [] }) => (
  <Modal open={open} onClose={onClose}>
    <Box
      sx={{
        p: 4,
        bgcolor: 'white',
        width: '90%',
        maxWidth: 500,
        mx: 'auto',
        mt: 10,
        borderRadius: 2,
        boxShadow: 3,
        position: 'relative',
        color: 'black',
      }}
    >
      <IconButton
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'black',
        }}
        onClick={onClose}
      >
        <CloseIcon />
      </IconButton>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>
        Dispute Status
      </Typography>
      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
      {history.length > 0 ? (
        <Stepper orientation="vertical">
          {history.map((step, index) => (
            <Step
              key={index}
              active={index === history.length - 1}
              completed={!!step.done_by}
            >
              <StepLabel>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 'bold', color: '#1976D2' }}
                >
                  {`Step ${step.step_no || index + 1}: ${
                    index === 0 
                      ? 'Dispute Created'
                      : step.action === 'Created'
                        ? `Assigned to ${step.assigned_to_name || 'Unknown'}`
                        : step.action === 'Assigned' || step.action === 'transition'
                          ? `Assigned to ${step.assigned_to_name || 'Unknown'}`
                          : step.action || 'Processing'
                  }`}
                </Typography>
                <Typography sx={{ fontSize: '14px' }}>
                  <strong>{index === 0 ? 'Created by' : 'User'}:</strong> {step.created_by || step.done_by_name || "Unknown"}
                </Typography>
                {index !== 0 && (
                  <Typography sx={{ fontSize: '14px' }}>
                    <strong>Assigned To:</strong> {step.present_at || step.assigned_to_name || "N/A"}
                  </Typography>
                )}
                <Typography sx={{ fontSize: '14px' }}>
                  <strong>Date:</strong> {fDateTimeFromUTC(step.submitted_time)}
                </Typography>
                {/* Show action for steps 2+ but with better logic */}
                {index !== 0 && step.action && !['Assigned', 'transition', 'Created'].includes(step.action) && (
                  <Typography sx={{ fontSize: '14px' }}>
                    <strong>Action:</strong> {step.action}
                  </Typography>
                )}
                {/* Show comments if they exist and are meaningful */}
                {step.comments && step.comments.trim() && !step.comments.includes('auto-approved') && (
                  <Typography sx={{ fontSize: '14px' }}>
                    <strong>Comments:</strong> {step.comments}
                  </Typography>
                )}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      ) : (
        <Typography sx={{ textAlign: 'center', mt: 2, color: 'gray' }}>
          No history available.
        </Typography>
      )}
    </Box>
    </Box>
  </Modal>
);

export default StepperModal;
