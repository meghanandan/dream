import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Stack,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  TablePagination
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';

export default function CsvUploadDialog({ open, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [step, setStep] = useState(0); // 0: Select, 1: Validation, 2: Upload, 3: Done
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [csvColumns, setCsvColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [csvRows, setCsvRows] = useState([]); // preview data rows
  const [duplicateColumns, setDuplicateColumns] = useState([]);

  // Pagination state for preview table
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setStep(0);
      setError('');
      setUploadProgress(0);
      setCsvColumns([]);
      setSelectedColumns([]);
      setCsvRows([]);
      setDuplicateColumns([]);
      setPage(0);
    }
  }, [open]);

  // Simulate upload progress for demo
  const startUpload = () => {
    setStep(2);
    setError('');
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      setUploadProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        setStep(3);
      }
    }, 500);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (file && !file.name.endsWith('.csv')) {
      setError('Please select a CSV file.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columns = results.meta.fields || [];
        // Detect duplicates
        const dups = columns.filter((item, idx) => columns.indexOf(item) !== idx);
        setDuplicateColumns([...new Set(dups)]);
        setCsvColumns(columns);
        setSelectedColumns(columns.filter((c, idx) => columns.indexOf(c) === idx)); // unique only
        setCsvRows(results.data);
        setStep(1);
      },
      error: () => setError('Error parsing CSV. Please try another file.'),
    });
  };

  // Validate file columns (simulate, do real parse on backend)
  const handleValidate = () => {
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }
    // Simulate: always pass validation here
    setStep(2);
    startUpload();
  };

  const handleToggleColumn = (col) => {
    setSelectedColumns((cols) =>
      cols.includes(col) ? cols.filter((c) => c !== col) : [...cols, col]
    );
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Render step details
  const renderContent = () => {
    if (step === 0) {
      // Select file step
      return (
        <Stack alignItems="center" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{ fontWeight: 700, fontSize: 18, px: 4, py: 1.2 }}
          >
            Select CSV File
            <input type="file" accept=".csv" hidden onChange={handleFileChange} />
          </Button>
          <Typography color="text.secondary">
            Please upload a single CSV file. Duplicate columns will be checked before upload.
          </Typography>
          {error && <Typography color="error">{error}</Typography>}
        </Stack>
      );
    }
    if (step === 1) {
      // Column selection & preview step
      return (
        <Box sx={{ display: "flex", minHeight: 380, maxHeight: 480 }}>
          {/* LEFT: Column checkboxes */}
          <Box
            sx={{
              width: "20%",
              minWidth: 160,
              borderRight: "1px solid #eee",
              pr: 2,
              overflowY: "auto"
            }}
          >
            <Typography fontWeight={700} mb={1}>
              Columns
            </Typography>
            {csvColumns.map(col => (
              <FormControlLabel
                key={col}
                control={
                  <Checkbox
                    checked={selectedColumns.includes(col)}
                    onChange={() => handleToggleColumn(col)}
                    disabled={duplicateColumns.includes(col)}
                  />
                }
                label={
                  <span style={duplicateColumns.includes(col) ? { color: "#e53935" } : {}}>
                    {col}
                  </span>
                }
                sx={{ display: "block", mb: 0.5 }}
              />
            ))}
            {duplicateColumns.length > 0 && (
              <Typography color="error" variant="body2" mt={1}>
                Duplicates: {duplicateColumns.join(", ")}
              </Typography>
            )}
          </Box>

          {/* RIGHT: Data preview */}
          <Box sx={{ flex: 1, pl: 3, display: "flex", flexDirection: "column" }}>
            <Typography fontWeight={700} mb={1}>
              Preview
            </Typography>
            <Box sx={{ flex: 1, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {selectedColumns.map(col => (
                      <TableCell key={col}>{col}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvRows
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, idx) => (
                      <TableRow key={idx}>
                        {selectedColumns.map(col => (
                          <TableCell key={col}>{row[col]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={csvRows.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 20, 50]}
            />
            {/* <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleValidate}
                disabled={duplicateColumns.length > 0 || selectedColumns.length === 0}
              >
                Validate and Upload
              </Button>
            </Stack> */}
            {error && <Typography color="error">{error}</Typography>}
          </Box>
        </Box>
      );
    }

    if (step === 2) {
      // Uploading step
      return (
        <Stack alignItems="center" spacing={2} sx={{ mt: 2 }}>
          <Typography>
            Uploading <b>{selectedFile?.name}</b>...
          </Typography>
          <Box sx={{ width: '80%', mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography align="center" sx={{ mt: 1 }}>
              {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        </Stack>
      );
    }
    if (step === 3) {
      // Done step (show preview button in real use case)
      return (
        <Stack alignItems="center" spacing={2} sx={{ mt: 2 }}>
          <Typography color="success.main" variant="h6">
            CSV file uploaded and staged successfully!
          </Typography>
          <Button variant="outlined" onClick={onClose}>
            Done
          </Button>
        </Stack>
      );
    }
    return null;
  };

  // Dialog JSX
  return (
    <Dialog
      open={open}
      // Prevent close on backdrop click or ESC
      onClose={(event, reason) => {
        if (reason && (reason === "backdropClick" || reason === "escapeKeyDown")) return;
        onClose();
      }}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Upload CSV Data</span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 3 }}>
  <Box>
    {step === 1 && (
      <Button
        variant="contained"
        color="warning"
        onClick={handleValidate}
        disabled={duplicateColumns.length > 0 || selectedColumns.length === 0}
        sx={{
          fontWeight: 700,
          px: 3,
          boxShadow: 'none',
          textTransform: 'none',
          background: '#FFA726',
          '&:hover': { background: '#FB8C00' }
        }}
      >
        Validate and Upload
      </Button>
    )}
  </Box>
  <Box>
    {(step === 0 || step === 1) && (
      <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>
        Cancel
      </Button>
    )}
  </Box>
</DialogActions>

    </Dialog>
  );
}
