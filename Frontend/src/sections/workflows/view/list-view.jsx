import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Modal,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  IconButton,
  Paper,
  Tooltip,
  Stack,
  Breadcrumbs,
  Chip,
  Snackbar,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import { Edit, Delete, Save, Close, Add, Search, ContentCopy, CheckCircle, Info, Warning, LibraryBooks, Assignment } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useRouter } from 'src/routes/hooks';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import { paths } from 'src/routes/paths';
import Storage from 'src/utils/local-store';

export function Workflows() {
  const theme = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
  const [searchWorkflow, setSearchWorkflow] = useState(''); // debounced value actually used for fetch
  const [searchInput, setSearchInput] = useState(''); // immediate input binding
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [count, setCount] = useState(0);
  const [workflowsdata, setWorkflowsdata] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [statusWorkflow, setStatusWorkflow] = useState('');
  const [idWork, setIdWork] = useState(null);
  const userData = Storage.getJson('userData');
  const role_Permissions = Storage.getJson('role_Permissions');
  const [approvePermission, setApprovePermission] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Copy state
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyId, setCopyId] = useState(null);
  const [copyName, setCopyName] = useState('');
  
  // Library/Template states
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTemplatesOnly, setShowTemplatesOnly] = useState(false);

  useEffect(() => {
    fetchWorkflows();
    // eslint-disable-next-line
  }, [page, searchWorkflow, rowsPerPage, showTemplatesOnly]);

  // Debounce search input -> searchWorkflow
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0); // reset page on new search
      setSearchWorkflow(searchInput.trim());
    }, 450);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [searchInput]);

  useEffect(() => {
    if (role_Permissions) {
      const permission = getWorkflowApprovePermission(role_Permissions);
      setApprovePermission(permission);
      
      // Check if user is admin (you may need to adjust this logic based on your role system)
      const adminPermission = userData.role === 'admin' || userData.role === 'superadmin' || permission;
      setIsAdmin(adminPermission);
    }
  }, [role_Permissions, userData]);

  const getWorkflowApprovePermission = (pages) => {
    const workflowPage = pages.find((pageR) => pageR.page_id === 3);
    return workflowPage?.permissions?.approve || false;
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 2,
    p: 3,
  };

  const fetchWorkflows = async () => {
    setLoading(true);
    const payload = {
      search_key: searchWorkflow,
      page_number: page + 1,
      page_size: rowsPerPage,
      org_code: userData.organization,
      // Add filter for templates if viewing library
      is_template: showTemplatesOnly ? true : undefined,
    };
    try {
      const res = await postService(endpoints.auth.getWorkFlowList, 'POST', payload);
      if (res.data && res.data.length > 0) {
        let filteredData = res.data;
        
        // Additional frontend filtering if backend doesn't support is_template filter
        if (showTemplatesOnly) {
          filteredData = res.data.filter(workflow => workflow.is_template === true);
        }
        
        setWorkflowsdata(filteredData);
        // Use filtered count for templates, otherwise use total records
        setCount(showTemplatesOnly ? filteredData.length : Number(res.totalRecords) || 0);
      } else {
        setWorkflowsdata([]);
        setCount(0);
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to fetch workflows', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (route) => navigate(route);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  const handleOpen = (status, id) => {
    setStatusWorkflow(status);
    setIdWork(id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setStatusWorkflow('');
    setIdWork(null);
  };

  const saveWorkFlow = async () => {
    const payload = {
      id: idWork,
      status: statusWorkflow,
      created_by: userData.user_id,
    };
    try {
      setLoading(true);
      const res = await postService(endpoints.auth.getWorkStatus, 'POST', payload);
      if (res.data) {
        fetchWorkflows();
        handleClose();
        setSnackbar({ open: true, message: 'Workflow status updated', severity: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (id, status) => {
    const payload = {
      id,
      status,
      slug: 'workflow',
    };
    try {
      setLoading(true);
      const res = await postService(endpoints.auth.changeStatus, 'POST', payload);
      if (res.status) fetchWorkflows();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to change status', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOpen = (id) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteModalOpen(false);
    setDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    const payload = { id: deleteId };
    try {
      setLoading(true);
      const res = await postService(endpoints.auth.deleteWorkflow, 'POST', payload);
      if (res.status) {
        fetchWorkflows();
        handleDeleteClose();
        setSnackbar({ open: true, message: 'Workflow deleted', severity: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete workflow', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Copy workflow handlers
  const handleCopyOpen = (id, name) => {
    setCopyId(id);
    setCopyName(`${name} - Copy`);
    setCopyModalOpen(true);
  };

  const handleCopyClose = () => {
    setCopyModalOpen(false);
    setCopyId(null);
    setCopyName('');
  };

  const handleConfirmCopy = async () => {
    if (!copyName.trim()) {
      setSnackbar({ open: true, message: 'Please enter a name for the copied workflow', severity: 'error' });
      return;
    }

    const payload = {
      originalId: copyId,
      newName: copyName.trim(),
      created_by: userData.user_id,
      org_code: userData.organization,
    };
    
    try {
      setLoading(true);
      // Add copyWorkflow endpoint - you'll need to implement this in the backend
      const res = await postService(endpoints.auth.copyWorkflow, 'POST', payload);
      if (res.status) {
        fetchWorkflows();
        handleCopyClose();
        setSnackbar({ open: true, message: 'Workflow copied successfully', severity: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to copy workflow', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Library/Template handlers
  const handleLibraryOpen = async () => {
    setLibraryModalOpen(true);
    await fetchTemplates();
  };

  // Handle Library button click - now consistent for both admin and regular users
  const handleLibraryClick = () => {
    // For both admin and regular users, toggle template view within the same page
    setShowTemplatesOnly(!showTemplatesOnly);
    setSearchWorkflow('');
    setSearchInput('');
    setPage(0);
  };

  const handleLibraryClose = () => {
    setLibraryModalOpen(false);
    setSelectedTemplate(null);
    setTemplateName('');
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const payload = { org_code: userData.organization };
      const res = await postService(endpoints.auth.getTemplateList, 'POST', payload);
      
      if (res.status && res.data) {
        setTemplates(res.data);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setSnackbar({ open: true, message: 'Failed to fetch templates', severity: 'error' });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !templateName.trim()) {
      setSnackbar({ open: true, message: 'Please select a template and enter a workflow name', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        templateId: selectedTemplate.id,
        newName: templateName.trim(),
        created_by: userData.user_id,
        org_code: userData.organization,
      };
      
      const res = await postService(endpoints.auth.createFromTemplate, 'POST', payload);
      
      if (res.status) {
        handleLibraryClose();
        setSnackbar({ open: true, message: 'Workflow created from template successfully!', severity: 'success' });
        fetchWorkflows(); // Refresh the list
      } else {
        setSnackbar({ open: true, message: res.message || 'Failed to create workflow from template', severity: 'error' });
      }
      
    } catch (err) {
      console.error('Error creating from template:', err);
      setSnackbar({ open: true, message: 'Failed to create workflow from template', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Remove template status handler
  const handleRemoveTemplate = async (workflowId) => {
    if (!window.confirm('Are you sure you want to remove template status? Users will no longer be able to create workflows from this template.')) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        id: workflowId,
        is_template: false,
        template_description: null,
        template_category: null,
        org_code: userData.organization,
      };
      
      const res = await postService(endpoints.auth.updateWorkflow, 'POST', payload);

      if (res.status) {
        setSnackbar({ 
          open: true, 
          message: 'Template status removed successfully!', 
          severity: 'success' 
        });
        fetchWorkflows(); // Refresh the list
      } else {
        setSnackbar({ 
          open: true, 
          message: res.message || 'Failed to remove template status', 
          severity: 'error' 
        });
      }
      
    } catch (err) {
      console.error('Error removing template status:', err);
      setSnackbar({ 
        open: true, 
        message: 'Failed to remove template status', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">
      Home
    </Link>,
    <Typography key="3" sx={{ color: 'text.primary' }}>
      Workflows
    </Typography>,
  ];

  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>

      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showTemplatesOnly ? (
          <>
            <LibraryBooks sx={{ color: 'primary.main' }} />
            WorkFlows Library
          </>
        ) : (
          'Workflow Management'
        )}
      </Typography>
      
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Info sx={{ mr: 1, color: 'primary.main', fontSize: '1.2rem' }} />
          <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 600 }}>
            About This Page
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.875rem' }}>
          {showTemplatesOnly ? (
            <>
              Manage workflow library items that users can utilize to create new workflows. 
              Library items are pre-approved workflows with descriptions and categories. 
              You can remove library status from existing items.
            </>
          ) : (
            <>
              Manage your organization&apos;s workflows from this central hub. You can create new workflows, 
              edit existing ones, copy workflows to create templates, and control workflow approval stages. 
              Use the search function to quickly find specific workflows by name.
            </>
          )}
        </Typography>
      </Box>

      <Paper sx={{ mb: 1, boxShadow: 3, p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            label="Search Workflow Name"
            size="small"
            variant="outlined"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Type to search..."
            sx={{ width: { xs: '100%', sm: '50%', md: '30%' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Create Workflow">
              <Button
                variant="contained"
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': { backgroundColor: theme.palette.primary.dark },
                }}
                startIcon={<Add />}
                onClick={() => handleNavigation('/workflows/create')}
              >
                Create Workflow
              </Button>
            </Tooltip>
            <Tooltip title={showTemplatesOnly ? "Show All Workflows" : "Show Library Only"}>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: showTemplatesOnly ? theme.palette.success.main : theme.palette.info.main,
                  '&:hover': { 
                    backgroundColor: showTemplatesOnly ? theme.palette.success.dark : theme.palette.info.dark 
                  },
                }}
                startIcon={<LibraryBooks />}
                onClick={handleLibraryClick}
              >
                {showTemplatesOnly ? 'Show All' : 'Library'}
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ boxShadow: 3, position: 'relative' }}>
        {loading && (
          <LinearProgress sx={{ position: 'absolute', left: 0, top: 0, width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
        )}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>S.No</strong></TableCell>
                <TableCell><strong>Workflow Name</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                {showTemplatesOnly && (
                  <>
                    <TableCell><strong>Library Category</strong></TableCell>
                    <TableCell><strong>Library Description</strong></TableCell>
                  </>
                )}
                <TableCell><strong>Approval Status</strong></TableCell>
                <TableCell><strong>Active</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && workflowsdata.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showTemplatesOnly ? 8 : 6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={26} />
                    <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                      Loading workflows...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : workflowsdata.length > 0 ? (
                workflowsdata.map((row, index) => (
                  <TableRow 
                    key={row.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                        cursor: 'pointer',
                        transform: 'translateY(-1px)',
                        boxShadow: `0 2px 8px ${theme.palette.action.selected}`,
                        transition: 'all 0.2s ease-in-out',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {row.name
                            ? row.name.charAt(0).toUpperCase() + row.name.slice(1).toLowerCase()
                            : '--'}
                        </Typography>
                        {row.is_template && (
                          <Chip 
                            label="Template" 
                            size="small" 
                            color="info" 
                            variant="filled"
                            icon={<Assignment />}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {row.type
                        ? row.type.charAt(0).toUpperCase() + row.type.slice(1).toLowerCase()
                        : '--'}
                    </TableCell>
                    {showTemplatesOnly && (
                      <>
                        <TableCell>
                          {row.template_category ? (
                            <Chip 
                              label={row.template_category} 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                            />
                          ) : '--'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                            {row.template_description || row.description || '--'}
                          </Typography>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={
                            row.work_flow_status === '1'
                              ? 'Pending Review'
                              : row.work_flow_status === '2'
                              ? 'Approved'
                              : 'Rejected'
                          }
                          color={
                            row.work_flow_status === '1'
                              ? 'warning'
                              : row.work_flow_status === '2'
                              ? 'success'
                              : 'error'
                          }
                          size="small"
                          variant="outlined"
                        />
                        {approvePermission && (
                          <Tooltip title="Change Approval Status">
                            <IconButton
                              sx={{ 
                                color: row.work_flow_status === '2' ? 'success.main' : 'warning.main'
                              }}
                              onClick={() => handleOpen(row.work_flow_status, row.id)}
                            >
                              {row.work_flow_status === '2' ? <CheckCircle /> : <Warning />}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={row.status ? "Workflow is active" : "Workflow is inactive"}>
                        <Switch
                          checked={row.status}
                          onChange={(e) => changeStatus(row.id, e.target.checked)}
                          disabled={loading}
                          color="success"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="Edit Workflow Content">
                          <IconButton
                            onClick={() => navigate(paths.workflows.edit(row.id))}
                            disabled={loading}
                            color="primary"
                            size="small"
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy Workflow">
                          <IconButton
                            onClick={() => handleCopyOpen(row.id, row.name)}
                            disabled={loading}
                            color="secondary"
                            size="small"
                          >
                            <ContentCopy />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && row.is_template && (
                          <Tooltip title="Remove Template Status">
                            <IconButton
                              onClick={() => handleRemoveTemplate(row.id)}
                              disabled={loading}
                              color="warning"
                              size="small"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete Workflow">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteOpen(row.id)}
                            disabled={loading}
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={showTemplatesOnly ? 8 : 6} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {showTemplatesOnly ? 'No workflows in library' : 'No workflows found'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {showTemplatesOnly 
                        ? 'Create workflows first, then mark approved ones as workflows for the library.'
                        : searchWorkflow
                        ? 'Try adjusting your search keywords.'
                        : 'Get started by creating a new workflow.'}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => handleNavigation('/workflows/create')}
                      disabled={loading}
                    >
                      Create Workflow
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          p={1}
          sx={{
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              flex: 1,
            }}
          >
            {`Showing ${page * rowsPerPage + 1} to ${Math.min(
              (page + 1) * rowsPerPage,
              count
            )} of ${count} entries`}
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
            <TablePagination
              component="div"
              count={count}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 20, 30, 40]}
              labelDisplayedRows={({ from, to, count: c }) => `${from}–${to} of ${c !== -1 ? c : `more than ${to}`}`}
              showFirstButton
              showLastButton
            />
          </Box>
        </Box>
      </Paper>

      {/* Status Update Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-status-title"
        aria-describedby="modal-status-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-status-title" variant="h5" fontWeight="bold" gutterBottom>
            Change Approval Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update the approval status for this workflow. This controls whether the workflow is pending review, approved for use, or rejected.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="status-select-label">Approval Status *</InputLabel>
            <Select
              labelId="status-select-label"
              value={statusWorkflow}
              label="Approval Status *"
              onChange={(e) => setStatusWorkflow(e.target.value)}
            >
              <MenuItem value="1">Pending Review</MenuItem>
              <MenuItem value="2">Approved</MenuItem>
              <MenuItem value="0">Rejected</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              fullWidth
              onClick={saveWorkFlow}
              disabled={loading}
              sx={{
                backgroundColor: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.dark },
              }}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              startIcon={<Close />}
              fullWidth
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteModalOpen}
        onClose={handleDeleteClose}
        aria-labelledby="delete-dialog-title"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title">Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this workflow? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={loading} startIcon={<Close />}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={loading} startIcon={<Delete />}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Copy Workflow Dialog */}
      <Dialog
        open={copyModalOpen}
        onClose={handleCopyClose}
        aria-labelledby="copy-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="copy-dialog-title">Copy Workflow</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter a name for the copied workflow:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Workflow Name"
            variant="outlined"
            value={copyName}
            onChange={(e) => setCopyName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyClose} disabled={loading} startIcon={<Close />}>Cancel</Button>
          <Button onClick={handleConfirmCopy} color="primary" variant="contained" disabled={loading} startIcon={<ContentCopy />}>Copy</Button>
        </DialogActions>
      </Dialog>

      {/* Workflow Library Dialog - Commented out as it makes no sense in current context */}
      {/* 
      <Dialog
        open={libraryModalOpen}
        onClose={handleLibraryClose}
        aria-labelledby="library-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="library-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LibraryBooks sx={{ mr: 1, color: 'primary.main' }} />
            Workflow Template Library
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Select a workflow template to create a new workflow. Templates are pre-built workflows 
            created by administrators that you can customize for your needs.
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>Available Templates:</Typography>
              <Box sx={{ mb: 3, maxHeight: 300, overflowY: 'auto' }}>
                {templates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No templates available. Contact your administrator to create workflow templates.
                  </Typography>
                ) : (
                  templates.map((template) => (
                    <Paper
                      key={template.id}
                      sx={{
                        p: 2,
                        mb: 2,
                        border: selectedTemplate?.id === template.id ? 2 : 1,
                        borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ mb: 1 }}>
                            {template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {template.description || template.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip 
                              label={template.category || template.type || 'General'} 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                            />
                            {template.created_by_name && (
                              <Typography variant="caption" color="text.secondary">
                                by {template.created_by_name}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {selectedTemplate?.id === template.id && (
                          <CheckCircle sx={{ color: 'primary.main', ml: 2 }} />
                        )}
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
              
              {selectedTemplate && (
                <>
                  <Typography variant="h6" sx={{ mb: 2 }}>Create New Workflow:</Typography>
                  <TextField
                    fullWidth
                    label="New Workflow Name"
                    variant="outlined"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={`My ${selectedTemplate.name}`}
                    sx={{ mb: 2 }}
                  />
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLibraryClose} disabled={loading} startIcon={<Close />}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFromTemplate} 
            color="primary" 
            variant="contained" 
            disabled={loading || !selectedTemplate || !templateName.trim()}
            startIcon={<Add />}
          >
            Create Workflow
          </Button>
        </DialogActions>
      </Dialog>
      */}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      />
    </Box>
  );
}

export default Workflows