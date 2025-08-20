import {
  Drawer,
  Box,
  Typography,
  Divider,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Link as MuiLink,
  Paper,
  Stack,
} from '@mui/material';

// --- Helpers ---

const getLabel = (headers, key) => {
  const found = headers?.find((h) => h.key === key);
  if (found && found.label) return found.label;
  // fallback: Capitalize and prettify
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const UPLOAD_BASE_URL = 'https://dream.uniflo.ai/api/auth/uploads/';

// Converts a Windows file path to /uploads/filename.ext
const getUploadUrl = (filePath) => {
  if (!filePath) return '';
  // Always grab the filename (after last slash or backslash)
  const parts = filePath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  return `${UPLOAD_BASE_URL}${filename}`;
};

// Parse Dream Lite Data
const getSourceData = (row) => {
  try {
    if (Array.isArray(row.dream_lite_source_data)) return row.dream_lite_source_data;
    if (typeof row.dream_lite_source_data === 'string')
      return JSON.parse(row.dream_lite_source_data);
    return [];
  } catch {
    return [];
  }
};
const getModifiedData = (row) =>
  Array.isArray(row.dream_lite_modified_data) ? row.dream_lite_modified_data : [];

const buildLabelValueMap = (arr) =>
  arr.reduce((map, item) => {
    map[item.label] = item.value;
    return map;
  }, {});

// --- Drawer Component Block ---

const DisputeDetailsDrawer = ({ open, onClose, drawerRowData, columns }) => {
  // Only display these fields (except special ones)
  const displayFields = ['dispute_date'];

  const getChipColor = (key, value) => {
    const v = (value || '').toLowerCase();
    if (key === 'priority') {
      if (v === 'high') return 'error';
      if (v === 'medium') return 'warning';
      return 'info'; // low or anything else
    }
    if (key === 'severity') {
      if (v === 'major' || v === 'critical') return 'error';
      return 'info'; // minor or anything else
    }
    if (key === 'dispute_status') {
      if (v === 'raised') return 'warning';
      if (v === 'resolved' || v === 'approved') return 'success';
      if (v === 'rejected') return 'error';
      return 'default';
    }
    return 'default';
  };

  console.log(drawerRowData);
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 450, p: 3, bgcolor: '#f7fafc', height: '100vh', overflowY: 'auto' }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          Dispute Details for dispute id:
          <Chip
            label={drawerRowData?.dispute_id}
            color="primary"
            size="small"
            sx={{ fontWeight: 600, fontSize: 16, height: 28, color: '#fff' }}
          />
        </Typography>

        <Divider sx={{ mb: 1 }} />
        {drawerRowData && (
          <>
            {/* Main info fields */}
            {displayFields.map(
              (key) =>
                drawerRowData[key] && (
                  <Box key={key} sx={{ mb: 0 }}>
                    <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {getLabel(columns, key)}:
                    </Typography>

                    <Typography component="span" sx={{ ml: 0.5 , fontSize: '0.85rem'}}>
                      {drawerRowData[key]}
                    </Typography>
                  </Box>
                )
            )}

            <Stack direction="row" spacing={2} sx={{ my: 1 }}>
              {['description', 'priority', 'severity', 'dispute_status'].map((key) =>
                drawerRowData[key] && (
                  <Box key={key} sx={{ minWidth: 80 }}>
                    <Typography sx={{ fontWeight: 400, textAlign: 'center', fontSize: '0.85rem', mb: 0 }}>
                      {getLabel(columns, key)}
                    </Typography>
                    <Chip
                      label={drawerRowData[key]}
                      color={
                        key === 'description'
                          ? 'default'
                          : getChipColor(key, drawerRowData[key])
                      }
                      size="small"
                      sx={{
                        textTransform: 'capitalize',
                        fontWeight: 600,
                        background:
                          key === 'description'
                            ? '#23272a'
                            : undefined,
                        color:
                          key === 'description'
                            ? '#fff'
                            : undefined,
                        minWidth: 100,
                        justifyContent: 'center',
                        fontSize: 10,
                        borderRadius: '10px'
                      }}
                    />
                  </Box>
                )
              )}
            </Stack>


            {/* Source & Modified Data Table */}
            {drawerRowData.licence_type === 'DREAMLTE' && (
              <>
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    Dream Lite Source & Modified Data
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: '50vh',
                      overflowY: 'auto',
                      border: '1px solid #eee',
                      borderRadius: 2,
                      background: '#fff',
                      boxShadow: 4,
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                            Label
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                            Source Value
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                            Modified Value
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const sourceArr = getSourceData(drawerRowData);
                          const modArr = getModifiedData(drawerRowData);
                          const labels = [
                            ...new Set([
                              ...sourceArr.map((i) => i.label),
                              ...modArr.map((i) => i.label),
                            ]),
                          ];
                          const sourceMap = buildLabelValueMap(sourceArr);
                          const modMap = buildLabelValueMap(modArr);

                          return labels.map((label) => (
                            <TableRow key={label}>
                              <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                              <TableCell>
                                {sourceMap[label] ?? <i style={{ color: '#bbb' }}>—</i>}
                              </TableCell>
                              <TableCell>
                                {modMap[label] ?? <i style={{ color: '#bbb' }}>—</i>}
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>

                {/* Screenshot Image */}
                <Box sx={{ mt: 3 }}>
                  {getUploadUrl(drawerRowData.capture_image) ? (
                    <Box>
                      {/* Row: Label + Link */}
                      <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>Capture Image</Typography>
                        <MuiLink
                          href={getUploadUrl(drawerRowData.capture_image)}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          sx={{ fontWeight: 500, fontSize: 15 }}
                        >
                          Open Full Image
                        </MuiLink>
                      </Box>
                      {/* Image Preview */}
                      {/* <Box
                    component="img"
                    src={getUploadUrl(drawerRowData.capture_image)}
                    alt="Screenshot"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 180,
                      borderRadius: 2,
                      border: '1px solid #e0e0e0',
                      boxShadow: 1,
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(getUploadUrl(drawerRowData.capture_image), '_blank')}
                    onError={e => { e.target.style.display = 'none'; }}
                  /> */}
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#bbb', fontWeight: 600 }}>
                      Capture Image: <span style={{ fontWeight: 400 }}>No image</span>
                    </Typography>
                  )}
                </Box>
              </>
            )}

            {/* Misc Fields */}
            <Box sx={{ mt: 2 }}>
              {drawerRowData.remarks && (
                <>
                  <Typography>
                    <b>Remarks:</b>{' '}
                  </Typography>
                  <Paper
                    sx={{ boxShadow: 3, padding: 1 }}
                    style={{ maxHeight: '80px', overflowY: 'auto' }}
                  >
                    {drawerRowData.remarks}
                  </Paper>
                </>
              )}
            </Box>
          </>
        )}
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 3, fontWeight: 600, letterSpacing: 1 }}
          onClick={onClose}
        >
          Close
        </Button>
      </Box>
    </Drawer>
  );
};

export default DisputeDetailsDrawer;
