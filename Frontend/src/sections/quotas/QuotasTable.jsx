// src/sections/quotas/QuotasTable.jsx
 
import React, { useState, useMemo } from 'react';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import { QuotaDialog } from './QuotaDialog';
import {
  Box,
  Drawer,
  Paper,
  Tabs,
  Tab,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  useTheme,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HistoryIcon from '@mui/icons-material/History';
import { DataGrid } from '@mui/x-data-grid';
import Storage from 'src/utils/local-store';
import DownloadIcon from '@mui/icons-material/Download';
import Papa from 'papaparse';
 
const statusColorMap = {
  New: 'info',
  new: 'info',
  Approved: 'success',
  Review: 'warning',
  Rejected: 'error',
  Return: 'error',
  Returned: 'error',
  'In Progress': 'warning',
  Verified: 'success',
};
 
function StatusChip({ value }) {
  const color = statusColorMap[value] || 'default';
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
  return <Chip label={label} color={color} size="small" />;
}
 
export function QuotasTable({
  tabIndex,
  onTabChange,
  rows,
  pendingRows,
  verifiedRows,
  columns,
  selectionModel,
  setSelectionModel,
  selectedUser,
  setSelectedUser,
  selectedStatus,
  setSelectedStatus,
  selectedWorkflow,
  setSelectedWorkflow,
  userOptions,
  statusOptions,
  workflowOptions,
  userLoading,
  workflowLoading,
  runLoading,
  onRunAction,
  onNotify,
  fetchLists,
  systemFields,
  customFields,
  userList,
  roleList,
  saveLoading,
  onUpdateRow,
}) {
  const theme = useTheme();
  const getUserData = Storage.getJson('userData');
  const [selectedRows, setSelectedRows] = useState([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedQuotaRow, setSelectedQuotaRow] = React.useState(null);
  const [formStatus, setFormStatus] = React.useState('');
  const [formComment, setFormComment] = React.useState('');
 
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRowData, setEditRowData] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRowData, setDeleteRowData] = useState(null);
 
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [verifyComment, setVerifyComment] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [verifyCommentError, setVerifyCommentError] = useState('');
  const [returnCommentError, setReturnCommentError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
 
  const [editDialogUserList, setEditDialogUserList] = useState([]);
  const [editDialogRoleList, setEditDialogRoleList] = useState([]);
 
  const [localSaveLoading, setLocalSaveLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);

  const [editComment, setEditComment] = useState('');
 
  const openVerifyDialog = () => {
    setVerifyComment('');
    setVerifyCommentError('');
    setShowVerifyDialog(true);
  };
  const openReturnDialog = () => {
    setReturnComment('');
    setReturnCommentError('');
    setShowReturnDialog(true);
  };
 
  const displayRows = useMemo(() => {
    if (tabIndex === 1) {
      let filtered = pendingRows;
      if (selectedUser) filtered = filtered.filter((r) => r.created_by === selectedUser);
      return filtered;
    }
    if (tabIndex === 2) {
      let filtered = verifiedRows || [];
      if (selectedUser) filtered = filtered.filter((r) => r.created_by === selectedUser);
      return filtered;
    }
    // Default: uploaded tab
    return rows;
  }, [tabIndex, rows, pendingRows, verifiedRows, selectedUser, selectedStatus, selectedWorkflow]);
 
  const fetchEditDialogManagersList = async (empId) => {
    try {
      const res = await postService(endpoints.auth.getUserUpwardReportingTree, 'POST', {
        org_code: getUserData.organization,
        empId,
      });
      const _userList = res.data || [];
      setEditDialogUserList(_userList);
      const _roleList = Array.from(
        new Map(
          _userList.map((u) => [u.role, { role_id: u.role, role_name: u.role_name }])
        ).values()
      );
      setEditDialogRoleList(_roleList);
      return { _userList, _roleList };
    } catch (e) {
      setEditDialogUserList([]);
      setEditDialogRoleList([]);
      return { _userList: [], _roleList: [] };
    }
  };
 
  const handleRun = async () => {
    try {
      await onRunAction();
      await fetchLists();
      onNotify('Run completed', 'success');
    } catch (err) {
      onNotify(err.message || 'Run failed', 'error');
    }
  };
 
  function getVisibleColumns(allColumns, tabKey) {
    const uploadedHidden = ['id', 'quota_id', 'created_by', 'updated_by', 'quotaHistoryFlow'];
    const pendingHidden = [
      'id',
      'quota_id',
      'sub_quota_id',
      'node_id',
      'created_by',
      'updated_by',
      'quotaHistoryFlow',
    ];
    const hidden = tabKey === 0 ? uploadedHidden : pendingHidden;
 
    return allColumns
      .filter((col) => !hidden.includes(col.field))
      .map((col) => {
        if (col.field === 'status') {
          return {
            ...col,
            renderCell: ({ value }) => <StatusChip value={value} />,
            sortable: false,
            minWidth: 110,
          };
        }
        if (col.field === 'quota_name') {
          return {
            ...col,
            renderCell: (params) => {
              const isHovered = hoveredRowId === params.row.id;
              const isUploaded = tabKey === 0;
              const isAdmin = getUserData.role === 'RL_NyAd';
              return (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', width: '100%' }}
                  onMouseEnter={() => setHoveredRowId(params.row.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {isUploaded ? (
                    // Plain text in Uploaded tab
                    <span style={{ flex: 1 }}>{params.value}</span>
                  ) : (
                    // Clickable in other tabs
                    <Button
                      variant="text"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        flex: 1,
                        justifyContent: 'flex-start',
                        color: '#fda92d',
                      }}
                      onClick={() => {
                        setSelectedQuotaRow(params.row);
                        if (
                          params.row.status === 'InProgress' ||
                          params.row.status === 'In Progress'
                        ) {
                          setDrawerOpen(true);
                          setFormStatus('');
                          setFormComment('');
                        }
                      }}
                    >
                      {params.value}
                    </Button>
                  )}
 
                  {isHovered && (
                    <Box sx={{ display: 'flex', ml: 1, backgroundColor: '#fff', p: 1, zIndex: 9 }}>
                      <Tooltip title="View History">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuotaRow(params.row);
                            setShowHistoryDrawer(true);
                          }}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
 
                      {/* Only show Edit/Delete when NOT in Uploaded  */}
                      {!isUploaded &&
                        !isAdmin &&
                        (params.row.status === 'Return' || params.row.status === 'RETURN') && (
                          <>
                            <Tooltip title="Edit & Resubmit">
                              <IconButton
                                size="small"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const empId = (params.row.emp_id || '').trim();
                                  const { _userList } = await fetchEditDialogManagersList(empId);
                                  const emp = _userList.find((u) => u.emp_id === empId);
                                  setEditRowData({
                                    ...params.row,
                                    emp_id: empId,
                                    role_id: (
                                      params.row.role_id ||
                                      params.row.role ||
                                      (emp && emp.role) ||
                                      ''
                                    ).trim(),
                                  });
                                  setEditComment(''); 
                                  setEditDialogOpen(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {/* <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteRowData(params.row);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip> */}
                          </>
                        )}
                    </Box>
                  )}
                </Box>
              );
            },
            minWidth: 180,
            flex: 1,
          };
        }
 
        return col;
      });
  }
 
  const handleSelectionModelChange = (ids) => {
    setSelectionModel(ids);
  };
 
  const isAllNewStatus =
    tabIndex === 1 &&
    displayRows.length > 0 &&
    displayRows.every((r) => r.status?.toLowerCase() === 'new');
  const isAnyRowSelected = selectionModel && selectionModel.length > 0;
 
  const validRows = displayRows.filter((r) => r.quota_name != null /* or r.id != null */);

 const handleDownloadCSV = () => {
  const visibleColumns = getVisibleColumns(columns, 0).map(col => col.field);

  const csvRows = validRows.map(row => {
    const newRow = {};
    visibleColumns.forEach(col => {
      let val = row[col];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      newRow[col] = val;
    });
    return newRow;
  });

  const csv = Papa.unparse(csvRows);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Human-readable timestamp in filename
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  link.setAttribute('download', `uploaded_quotas_${timestamp}.csv`);
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};



 
  return (
    <Paper sx={{ p: 2, mb: 2, position: 'relative', boxShadow: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Tabs value={tabIndex} onChange={onTabChange}>
          <Tab label="Uploaded" />
          <Tab label="Pending" />
          <Tab label="Verified" />
        </Tabs>
          {tabIndex === 0 && (
            <Tooltip title="Download Quota">
              <span>
                <IconButton
                  color="success"
                   onClick={handleDownloadCSV}
                  size="small"
                >
                  <DownloadIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        {((tabIndex === 1 && getUserData.role === 'RL_NyAd') || tabIndex === 2) && (
          <Stack direction="row" spacing={1} alignItems="center">
            {tabIndex === 1 && (
              <>
                {/* VERIFY/RETURN */}
                <Tooltip title="Verify Quota">
                  <span>
                    <IconButton
                      color="success"
                      disabled={!isAnyRowSelected}
                      onClick={openVerifyDialog}
                      size="large"
                    >
                      <VerifiedUserIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Return Quota">
                  <span>
                    <IconButton
                      color="secondary"
                      disabled={!isAnyRowSelected}
                      onClick={openReturnDialog}
                      size="large"
                    >
                      <UndoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
 
            {tabIndex === 2 && (
              <>
                {getUserData.role === 'RL_NyAd' && (
                  <>
                    {/* USER FILTER */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>User</InputLabel>
                      <Select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        disabled={userLoading}
                      >
                        <MenuItem value="">
                          <em>All Users</em>
                        </MenuItem>
                        {userOptions.map((o) => (
                          <MenuItem key={o.id} value={o.id}>
                            {o.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {/* STATUS FILTER */}
                    {/* <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Status</em>
                    </MenuItem>
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl> */}
                    {/* WORKFLOW FILTER */}
 
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Workflow</InputLabel>
                      <Select
                        value={selectedWorkflow}
                        onChange={(e) => setSelectedWorkflow(e.target.value)}
                        disabled={workflowLoading}
                      >
                        <MenuItem value="">
                          <em>All Workflows</em>
                        </MenuItem>
                        {workflowOptions.map((w) => (
                          <MenuItem key={w.id} value={w.id}>
                            {w.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
 
                    <Button
                      variant="contained"
                      onClick={handleRun}
                      disabled={runLoading}
                      sx={{
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': { backgroundColor: theme.palette.primary.dark },
                      }}
                    >
                      {runLoading ? 'Running…' : 'Run'}
                    </Button>
                  </>
                )}
              </>
            )}
          </Stack>
        )}
      </Stack>
 
      {validRows.length > 0 ? (
        <DataGrid
          rows={validRows}
          columns={getVisibleColumns(columns, tabIndex)}
          pageSize={8}
          checkboxSelection={tabIndex === 1 || tabIndex === 2}
          disableRowSelectionOnClick={tabIndex === 1}
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={handleSelectionModelChange}
          getRowId={(row) => row.id ?? row.sub_quota_id}
          autoHeight
        />
      ) : (
        <Typography align="center" py={4}>
          {tabIndex === 0
            ? 'No quota data found.'
            : tabIndex === 1
              ? 'No pending data.'
              : 'No verified data.'}
        </Typography>
      )}
 
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{
          onBackdropClick: (event) => {
            event.stopPropagation();
          },
          disableEscapeKeyDown: true,
        }}
      >
        <Box sx={{ width: 340, p: 3, background: '#fff', height: '100vh', position: 'relative' }}>
          <IconButton
            aria-label="close"
            onClick={() => setDrawerOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" gutterBottom>
            {selectedQuotaRow?.quota_name}
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            >
              <MenuItem value="Approved">Approve</MenuItem>
              <MenuItem value="Return">Return</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Comments"
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={async () => {
              console.log('Submitted Quota:', {
                quota_id: selectedQuotaRow.quota_id,
                node_id: selectedQuotaRow.node_id,
                id: selectedQuotaRow.id,
                status: formStatus,
                comments: formComment,
                user_id: getUserData.user_id,
                organization: getUserData.organization,
              });
              setDrawerOpen(false);
 
              // const quota_id = selectedQuotaRow.map((row) => row.id);
              // const node_id = selectedQuotaRow.map((row) => row.node_id);
 
              const payload = {
                //  quota_id: selectedQuotaRow.quota_id,
                node_id: selectedQuotaRow.node_id,
                id: selectedQuotaRow.id,
                decision: formStatus,
                comments: formComment,
                user_id: getUserData.user_id,
                organization: getUserData.organization,
                user_name: getUserData.name,
                updated_by: selectedQuotaRow.updated_by,
                temp_node_id: selectedQuotaRow.temp_node_id,
                last_node: selectedQuotaRow.last_node,
              };
              console.log('Return payload:', payload);
              try {
                // if(formStatus==='Review'){
                //   const res = await postService(endpoints.auth.resubmitQuotaByUser, 'POST', payload);
                //   await fetchLists();
                //   setSnackbar({ open: true, message: res.message || 'Action done', severity: 'success' });
                // }else{
                const res = await postService(
                  endpoints.auth.updateSelectedQuotaDtls,
                  'POST',
                  payload
                );
                await fetchLists();
                setSnackbar({
                  open: true,
                  message: res.message || 'Action done',
                  severity: 'success',
                });
                setDrawerOpen(false);
                // }
              } catch (err) {
                setSnackbar({
                  open: true,
                  message: err.message || 'Run failed',
                  severity: 'error',
                });
              }
 
              // TODO: call your verification API with `payload`
              setShowVerifyDialog(false);
            }}
            disabled={!formStatus}
            fullWidth
          >
            Submit
          </Button>
        </Box>
      </Drawer>
 
      {/* Edit Dialog */}
      <QuotaDialog
        open={editDialogOpen}
        mode="edit"
        systemFields={systemFields}
        customFields={customFields}
        editComment={editComment}
        onEditCommentChange={setEditComment}
        data={editRowData}
        onChange={(field, value) => setEditRowData((prev) => ({ ...prev, [field]: value }))}
        onSave={async () => {
          // If editing a returned quota, call editAndResubmitQuota
           console.log('User comment:', editComment);
          if (editRowData?.status?.toLowerCase() === 'return') {
            setLocalSaveLoading(true);
            try {
              // console.log({
              //   org_code: getUserData.organization,
              //   quota_id: editRowData.id,
              //   prod_quota: editRowData, // main quota fields (editRowData)
              //   prod_quota_cust: editRowData.customFields || {}, // custom fields if any
              //   user_id: getUserData.user_id,
              //   user_name: getUserData.name,
              //   comment: editRowData.editComment || ''  // or use a comment state field
              // })
              await postService(endpoints.auth.editAndResubmitQuota, 'POST', {
                org_code: getUserData.organization,
                quota_id: editRowData.id,
                prod_quota: editRowData, // main quota fields (editRowData)
                prod_quota_cust: editRowData.customFields || {}, // custom fields if any
                user_id: getUserData.user_id,
                user_name: getUserData.name,
                comment: editComment, // or use a comment state field                
                temp_node_id: editRowData.temp_node_id,
                last_node: editRowData.last_node,
              });
              setEditDialogOpen(false);
              await fetchLists();
              onNotify('Resubmitted successfully!', 'success');
            } catch (err) {
              onNotify(err.message || 'Failed to resubmit', 'error');
            } finally {
              setLocalSaveLoading(false);
            }
          } else {
            setLocalSaveLoading(true);
            try{
            await onUpdateRow(editRowData);
            setEditDialogOpen(false);
            fetchLists();
            }finally {
            setLocalSaveLoading(false);
          }
          }
        }}
        onClose={() => setEditDialogOpen(false)}
        saveLoading={localSaveLoading}
        userList={editDialogUserList}
        roleList={editDialogRoleList}
      />
 
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Quota?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <b>{deleteRowData?.quota_name}</b>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                try {
                  // Replace DELETE_ENDPOINT with your API endpoint
                  await postService(endpoints.auth.deleteQuotaRow, 'POST', {
                    id: deleteRowData.id,
                  });
                  setDeleteDialogOpen(false);
                  await fetchLists(); // reload data
                } catch (err) {
                  // Optionally show snackbar error
                }
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
 
      <Dialog open={showVerifyDialog} onClose={() => setShowVerifyDialog(false)}>
        <DialogTitle>Confirm Verification</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to verify the selected quota
            {isAnyRowSelected && selectionModel.length > 1 ? 's' : ''}?
          </Typography>
          <TextField
            label="Comments (required)"
            value={verifyComment}
            onChange={e => {
              setVerifyComment(e.target.value);
              if (e.target.value.trim()) setVerifyCommentError('');
            }}
            multiline
            minRows={3}
            fullWidth
            error={!!verifyCommentError}
            helperText={verifyCommentError}
            sx={{ my: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVerifyDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={verifyLoading}
            onClick={async () => {
              setVerifyLoading(true);
              try {
                const selectedRowDetails = displayRows.filter((r) => selectionModel.includes(r.id));
              const quota_id = selectedRowDetails.map((r) => r.id);
              const node_id = selectedRowDetails.map((r) => r.node_id);
              const temp_node_id = selectedRowDetails.map((r) => r.temp_node_id);
              const last_node = selectedRowDetails.map((r) => r.last_node);
              const payload = {
                quota_id,
                node_id,
                organization: getUserData.organization,
                user_id: getUserData.user_id,
                user_name: getUserData.name,
                returnComment: verifyComment,
                status: 'Verified',
                temp_node_id,
                last_node,
              };
                const res = await postService(endpoints.auth.quotaVerifiedByAdmin, 'POST', payload);
                await fetchLists();
                onNotify(res.message || 'Verified successfully', 'success');
              } catch (err) {
                onNotify(err.message || 'Verification failed', 'error');
              } finally {
                setVerifyLoading(false);
                setShowVerifyDialog(false);
              }
            }}
          >
            {verifyLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
 
      <Dialog open={showReturnDialog} onClose={() => setShowReturnDialog(false)}>
        <DialogTitle>Return Selected Quota(s)?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to return the selected quota
            {isAnyRowSelected && selectionModel.length > 1 ? 's' : ''}?
          </Typography>
          <TextField
            label="Comments (required)"
            value={returnComment}
            onChange={e => {
              setReturnComment(e.target.value);
              if (e.target.value.trim()) setReturnCommentError('');
            }}
            multiline
            minRows={3}
            fullWidth
            error={!!returnCommentError}
            helperText={returnCommentError}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReturnDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={returnLoading}
            onClick={async () => {
              if (!returnComment.trim()) {
                onNotify('Comment is required', 'error');
                return;
              }
              setReturnLoading(true);
              try {
                const selectedRowDetails = displayRows.filter((r) => selectionModel.includes(r.id));
                const payload = {
                  node_id: selectedRowDetails.map((r) => r.node_id),
                  id: selectedRowDetails.map((r) => r.id),
                  decision: 'Return',
                  comments: returnComment.trim(),
                  user_id: getUserData.user_id,
                  organization: getUserData.organization,
                  user_name: getUserData.name,
                  updated_by: selectedRowDetails.map((r) => r.updated_by),
                  status: selectedRowDetails.map((r) => r.status),
                  created_by: selectedRowDetails.map((r) => r.created_by),
                  temp_node_id : selectedRowDetails.map((r) => r.temp_node_id),
                  last_node : selectedRowDetails.map((r) => r.last_node),
                };
 
                const res = await postService(
                  endpoints.auth.updateSelectedQuotaDtls,
                  'POST',
                  payload
                );
                await fetchLists();
                onNotify(res.message, 'success');
              } catch (err) {
                onNotify(err.message, 'error');
              } finally {
                setReturnLoading(false);
                setShowReturnDialog(false);
              }
            }}
          >
            {returnLoading ? <CircularProgress size={24} color="inherit" /> : 'Return'}
          </Button>
        </DialogActions>
      </Dialog>
 
      <Drawer
        anchor="right"
        open={showHistoryDrawer}
        // custom onClose handler: only allow close if from 'close button' or 'explicit'
        onClose={(event, reason) => {
          // reason === 'backdropClick' || reason === 'escapeKeyDown'
          // block both:
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return; // do nothing
          }
          setShowHistoryDrawer(false); // only close if called programmatically
        }}
        ModalProps={{
          disableEscapeKeyDown: true, // disables Escape key
        }}
      >
        <Box sx={{ width: 400, p: 3, background: '#fafbfc', height: '100vh', overflowY: 'auto', position: 'relative' }}>
          <IconButton
            aria-label="close"
            onClick={() => setShowHistoryDrawer(false)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quota History - {selectedQuotaRow?.quota_name}
          </Typography>
          <Stack spacing={2}>
            {(selectedQuotaRow?.quotaHistoryFlow ?? []).map((h, idx) => (
              <Paper
                key={idx}
                sx={{
                  p: 1,
                  mb: 0,
                  borderRadius: 1,
                  background: '#fff',
                  boxShadow: '0 2px 10px #0001',
                }}
              >
                {/* Status with colored chip */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Chip
                    label={h.status}
                    color={statusColorMap[h.status] || 'default'}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.4 }}
                  />
                  {/* <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{h.status}</Typography> */}
                </Stack>
                <Typography sx={{ fontSize: 13, mb: 0.3 }}>
                  <b>Assigned From:</b> <span style={{ fontWeight: 400 }}>{h.assigned_from}</span>
                </Typography>
                <Typography sx={{ fontSize: 13, mb: 0.3 }}>
                  <b>Assigned To:</b> <span style={{ fontWeight: 400 }}>{h.assigned_to}</span>
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  <b>Date:</b> <span style={{ fontWeight: 400 }}>{h.created_at}</span>
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  <b>Comments:</b> <span style={{ fontWeight: 400 }}>{h.remarks}</span>
                </Typography>
              </Paper>
            ))}
            {(selectedQuotaRow?.quotaHistoryFlow ?? []).length === 0 && (
              <Typography sx={{ fontSize: 13 }}>No history available.</Typography>
            )}
          </Stack>
        </Box>
      </Drawer>
    </Paper>
  );
}
 
 