// src/sections/quotas/CsvToolbar.jsx
import React from 'react';
import {
  Stack,
  Button,
  IconButton,
  LinearProgress,
  Typography,
  Tooltip,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export function CsvToolbar({
  onAdd,
  onDownload,
  onUpload,
  uploading,
  uploadProgress,
  // snackbar,
  setSnackbar,
  permissions,
}) {
  const theme = useTheme();
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h4" component="h1">
          Quotas
        </Typography>
        <Stack direction="row" spacing={2}>
          {permissions.add && (
            <Tooltip title="Add Quota Manually" placement="top">
              <IconButton
                color="primary"
                onClick={onAdd}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': { backgroundColor: theme.palette.primary.dark },
                  color: '#fff',
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
          {permissions.download && (
            <Tooltip title="Download CSV Template" placement="top">
              <IconButton
                color="primary"
                onClick={onDownload}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': { backgroundColor: theme.palette.primary.dark },
                  color: '#fff',
                }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          {permissions.add && (
            <Tooltip title="Upload CSV" placement="top">
              <IconButton
                color="primary"
                component="label"
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': { backgroundColor: theme.palette.primary.dark },
                  color: '#fff',
                }}
              >
                <UploadFileIcon />
                <input type="file" accept=".csv" hidden onChange={onUpload} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {uploading && (
        <Stack spacing={1} mb={2}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption">Uploading… {uploadProgress}%</Typography>
        </Stack>
      )}

      {/* <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar> */}
    </>
  );
}
