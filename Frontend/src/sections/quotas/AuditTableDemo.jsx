// src/pages/AuditTrailPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  Stack,
  useTheme,
  Link,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort(array, comparator) {
  return array
    .map((el, idx) => [el, idx])
    .sort((a, b) => {
      const cmp = comparator(a[0], b[0]);
      return cmp !== 0 ? cmp : a[1] - b[1];
    })
    .map((el) => el[0]);
}

export default function AuditTrailPage() {
  const theme = useTheme();
  const userTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );
 
  const userData = Storage.getJson('userData');
  const org_code = userData?.organization || userData?.org_code;

  // Global state
  const [objectType, setObjectType] = useState('prod_quota'); // default
  const [objectId, setObjectId] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detail‐dialog state
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [detailFilter, setDetailFilter] = useState('');
  const [orderBy, setOrderBy] = useState('field');
  const [order, setOrder] = useState('asc');
  const [detailPage, setDetailPage] = useState(0);
  const [detailRowsPerPage, setDetailRowsPerPage] = useState(5);

  // State for login audit details dialog
  const [loginDetail, setLoginDetail] = useState(null);
  const [loginDetailOpen, setLoginDetailOpen] = useState(false);

  // Fetch data
  const fetchData = useCallback(() => {
    if (!org_code) return;
    setLoading(true);
    setError('');
    const payload = {
      org_code, // ← comes from Storage.getJson('userData')
      page: page + 1,
      pageSize: rowsPerPage,
      search,
      startDate: fromDate?.toISOString(),
      timeZone: userTimeZone,
      endDate: toDate?.toISOString(),
      ...(objectType === 'prod_quota' && {
        object_type: objectType,
        object_id: objectId || undefined,
      }),
    };

    let call;
    if (objectType === 'login_audit') {
      call = postService(endpoints.auth.getLoginAudit, 'POST', payload);
    } else {
      payload.object_type = objectType;
      payload.object_id = objectId || undefined;
      call = postService(endpoints.auth.getAuditLogs, 'POST', payload);
    }

    call
      .then((resp) => {
        if (!resp.status) throw new Error(resp.message);
        setRows(resp.data);
        setTotal(resp.total);
      })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [org_code, objectType, objectId, page, rowsPerPage, search, fromDate, toDate]);

  // Debounce
  const debouncedFetch = useMemo(() => debounce(fetchData, 300), [fetchData]);
  useEffect(() => {
    debouncedFetch();
    return () => debouncedFetch.cancel();
  }, [debouncedFetch, objectType]);

  // Use the fields exactly as they come from the audit log
  const fieldOrder = useMemo(() => {
    const sampleRecord = rows.find(r => r.old_values || r.new_values);
    if (!sampleRecord) return [];
    
    // Get fields in their natural order from the record
    const fields = Object.keys(sampleRecord.old_values || sampleRecord.new_values || {});
    
    return fields;
  }, [rows]);

  // Detail table rows
  const detailRows = useMemo(() => {
    if (!selected) return [];
    
    // Get all fields from both old and new values
    const allFields = new Set([
      ...fieldOrder,
      ...Object.keys({ ...selected.old_values, ...selected.new_values })
    ]);

    return Array.from(allFields)
      // Sort according to fieldOrder, putting unknown fields at the end
      .sort((a, b) => {
        const indexA = fieldOrder.indexOf(a);
        const indexB = fieldOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map((field) => ({
        field,
        oldVal: selected.old_values?.[field] ?? '',
        newVal: selected.new_values?.[field] ?? '',
      }))
      .filter(
        (r) =>
          r.field.includes(detailFilter) ||
          String(r.oldVal).includes(detailFilter) ||
          String(r.newVal).includes(detailFilter)
      );
  }, [selected, detailFilter]);

  const renderChangedFields = (row) => {
    if (!row.old_values || !row.new_values) return <span style={{ color: '#888' }}>N/A</span>;
    const fields = Object.keys(row.old_values).filter(
      (k) => row.old_values[k] !== row.new_values[k]
    );
    return fields.length ? fields.join(', ') : <span style={{ color: '#888' }}>–</span>;
  };

  // Breadcrumbs
  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" href="/">
      Home
    </Link>,
    <Typography key="2" color="text.primary">
      Audit Trail
    </Typography>,
  ];

  return (
    <Box sx={{ p: 2, bgcolor: '#f7f8fa', minHeight: '100vh' }}>
      <Breadcrumbs separator="›" aria-label="breadcrumb">
        {breadcrumbs}
      </Breadcrumbs>
      <Typography variant="h4" mt={1} mb={1}>
        Audit Trail
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 1, mb: 1, boxShadow: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Search"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <TextField
            label="Object Type"
            size="small"
            select
            SelectProps={{ native: true }}
            value={objectType}
            onChange={(e) => {
              setObjectType(e.target.value);
              setPage(0);
            }}
          >
            <option value="prod_quota">Quota Audit</option>
            <option value="login_audit">Login Audit</option>
          </TextField>
          {objectType === 'prod_quota' && (
            <TextField
              label="Object ID"
              size="small"
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
            />
          )}
          <DatePicker
            label="From"
            inputFormat="MM/dd/yyyy"
            value={fromDate}
            size="small"
            onChange={setFromDate}
            renderInput={(params) => <TextField size="small" {...params} />}
          />
          <DatePicker
            label="To"
            inputFormat="MM/dd/yyyy"
            value={toDate}
            size="small"
            onChange={setToDate}
            renderInput={(params) => <TextField size="small" {...params} />}
          />
          <Button variant="contained" onClick={fetchData}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Main Table */}
      {objectType === 'login_audit' ? (
        <LoginAuditTable
          rows={rows}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          onViewDetails={(row) => {
            setLoginDetail(row);
            setLoginDetailOpen(true);
          }}
        />
      ) : (
        <QuotaAuditTable
          rows={rows}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          renderChangedFields={renderChangedFields}
          onViewDetails={(r) => {
            setSelected(r);
            setOpen(true);
          }}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
        />
      )}

      {/* Detail Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          Details
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Stack direction="row" spacing={4} mb={2}>
                <Typography>
                  <b>By:</b> {selected.user_name}
                </Typography>
                <Typography>
                  <b>Action:</b> {selected.action}
                </Typography>
                <Typography>
                  <b>At:</b> {new Date(selected.changed_at).toLocaleString()}
                </Typography>
              </Stack>
              <TextField
                label="Filter rows"
                size="small"
                value={detailFilter}
                onChange={(e) => {
                  setDetailFilter(e.target.value);
                  setDetailPage(0);
                }}
                fullWidth
                sx={{ mb: 2 }}
              />

              <TableContainer sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {['Field', 'Old Value', 'New Value'].map((h, idx) => (
                        <TableCell key={idx}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stableSort(detailRows, getComparator(order, orderBy))
                      .slice(
                        detailPage * detailRowsPerPage,
                        detailPage * detailRowsPerPage + detailRowsPerPage
                      )
                      .map((r) => (
                        <TableRow key={r.field}>
                          <TableCell>{r.field}</TableCell>
                          <TableCell>{String(r.oldVal)}</TableCell>
                          <TableCell>{String(r.newVal)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={detailRows.length}
                page={detailPage}
                rowsPerPage={detailRowsPerPage}
                onPageChange={(_, p) => setDetailPage(p)}
                onRowsPerPageChange={(e) => {
                  setDetailRowsPerPage(+e.target.value);
                  setDetailPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20]}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={loginDetailOpen}
        onClose={() => setLoginDetailOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Login Audit Details
          <IconButton
            onClick={() => setLoginDetailOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2}}>
          {loginDetail && (
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {Object.entries({
                    User: loginDetail.user_name,
                    Email: loginDetail.email,
                    Action: loginDetail.action,
                    When: loginDetail.created_at,
                    'IP Address': loginDetail.ip_address,
                    Agent: loginDetail.user_agent,
                    'City/Country': `${loginDetail.city || ''} / ${loginDetail.country || ''}`,
                    Browser: `${loginDetail.browser_name || ''} ${loginDetail.browser_version || ''}`,
                    OS: `${loginDetail.os_name || ''} ${loginDetail.os_version || ''}`,
                    Device: loginDetail.device_type,
                    'Auth Method': loginDetail.auth_method,
                    'MFA Used': loginDetail.mfa_used ? 'Yes' : 'No',
                    'Session ID': loginDetail.session_id,
                    'IP Reputation': loginDetail.ip_reputation,
                    'Correlation ID': loginDetail.correlation_id,
                    'Response Time (ms)': loginDetail.response_time_ms,
                    'OK?': loginDetail.success ? '✅' : '❌',
                    Details: loginDetail.details,
                  }).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                        {key}
                      </TableCell>
                      <TableCell>{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// -------------------------
// Sub-components for the two tables:

function LoginAuditTable({
  rows,
  loading,
  page,
  rowsPerPage,
  total,
  onPageChange,
  onRowsPerPageChange,
  onViewDetails,
}) {
  return (
    <Paper sx={{ boxShadow: 3 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['S.No', 'User', 'Action', 'IP', 'Agent', 'When', 'OK?', 'Details', ''].map(
                (h) => (
                  <TableCell key={h}>{h}</TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No records
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                  <TableCell>{r.user_name}</TableCell>
                  <TableCell>{r.action}</TableCell>
                  <TableCell>{r.ip_address}</TableCell>
                  <TableCell>{r.user_agent}</TableCell>
                  <TableCell>{r.created_at}</TableCell>
                  <TableCell>{r.success ? '✅' : '❌'}</TableCell>
                  <TableCell>{r.details}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => onViewDetails(r)}>
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 20, 50]}
      />
    </Paper>
  );
}

function QuotaAuditTable({
  rows,
  loading,
  page,
  rowsPerPage,
  total,
  renderChangedFields,
  onViewDetails,
  onPageChange,
  onRowsPerPageChange,
}) {
  const theme = useTheme();
  return (
    <Paper sx={{ boxShadow: 3 }}>
      <TableContainer>
        <Table size="small">
          <TableHead sx={{ background: '#f5f7fa' }}>
            <TableRow>
              {['S.No', 'Quota Name', 'Changed At', 'By', 'Action', 'Fields', ''].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No records
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                  <TableCell>{r.new_values?.quota_name || r.old_values?.quota_name || '—'}</TableCell>
                  <TableCell>{new Date(r.changed_at).toLocaleString()}</TableCell>
                  <TableCell>{r.user_name || r.changed_by}</TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.3,
                        borderRadius: 1,
                        bgcolor:
                          r.action === 'UPDATE'
                            ? theme.palette.info.light
                            : r.action === 'DELETE'
                              ? theme.palette.error.light
                              : theme.palette.success.light,
                        color:
                          r.action === 'UPDATE'
                            ? theme.palette.info.dark
                            : r.action === 'DELETE'
                              ? theme.palette.error.dark
                              : theme.palette.success.dark,
                      }}
                    >
                      {r.action}
                    </Typography>
                  </TableCell>
                  <TableCell>{renderChangedFields(r)}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => onViewDetails(r)}>
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 20, 50]}
      />
    </Paper>
  );
}
