import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  Table,
  Button,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableContainer,
  Typography,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Alert,
  Grid,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LibraryBooks as LibraryBooksIcon,
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import { toast } from 'src/components/snackbar';
import Storage from 'src/utils/local-store';
import { Scrollbar } from 'src/components/scrollbar';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function AdminTemplatesView() {
  const router = useRouter();
  const userData = Storage.getJson('userData');
  
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  
  // Fetch all templates and approved workflows
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch templates
      const templatesPayload = { 
        org_code: userData.organization 
      };
      const templatesRes = await postService(endpoints.auth.getTemplateList, 'POST', templatesPayload);
      
      // Fetch workflows
      const workflowsPayload = { 
        search_key: "",
        page_number: 1,
        page_size: 1000,
        org_code: userData.organization
      };
      const workflowsRes = await postService(endpoints.auth.getWorkFlowList, 'POST', workflowsPayload);
      
      setTemplates(templatesRes.data || []);
      
      // Filter only approved workflows that are not already templates
      const approvedWorkflows = workflowsRes.data?.filter(
        workflow => workflow.approve === 'approved' && !workflow.is_template
      ) || [];
      
      setWorkflows(approvedWorkflows);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [userData.organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsTemplate = async (workflowId) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;
      
      setSelectedTemplate(workflow);
      setTemplateDescription(workflow.description || '');
      setTemplateCategory('General');
      setEditModalOpen(true);
    } catch (error) {
      console.error('Error preparing template:', error);
      toast.error('Failed to prepare template');
    }
  };

  const handleConfirmMarkAsTemplate = async () => {
    try {
      if (!selectedTemplate || !templateDescription.trim()) return;

      setLoading(true);
      const payload = {
        workflowId: selectedTemplate.id,
        description: templateDescription,
        category: templateCategory,
        org_code: userData.organization,
      };
      
      const res = await postService(endpoints.auth.markAsTemplate, 'POST', payload);

      toast.success('Workflow marked as template successfully!');
      setEditModalOpen(false);
      setSelectedTemplate(null);
      setTemplateDescription('');
      setTemplateCategory('');
      await fetchData();
    } catch (error) {
      console.error('Error marking as template:', error);
      toast.error(error.response?.data?.message || 'Failed to mark as template');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateDescription(template.template_description || '');
    setTemplateCategory(template.template_category || 'General');
    setEditModalOpen(true);
  };

  const handleUpdateTemplate = async () => {
    try {
      if (!selectedTemplate || !templateDescription.trim()) return;

      setLoading(true);
      const payload = {
        id: selectedTemplate.id,
        template_description: templateDescription,
        template_category: templateCategory,
        org_code: userData.organization,
      };
      
      const res = await postService(endpoints.auth.updateWorkflow, 'POST', payload);

      toast.success('Template updated successfully!');
      setEditModalOpen(false);
      setSelectedTemplate(null);
      setTemplateDescription('');
      setTemplateCategory('');
      await fetchData();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTemplate = async (templateId) => {
    setTemplateToDelete(templateId);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (!templateToDelete) return;

      setLoading(true);
      const payload = {
        id: templateToDelete,
        is_template: false,
        template_description: null,
        template_category: null,
        org_code: userData.organization,
      };
      
      const res = await postService(endpoints.auth.updateWorkflow, 'POST', payload);

      toast.success('Template removed successfully!');
      setConfirmDeleteOpen(false);
      setTemplateToDelete(null);
      await fetchData();
    } catch (error) {
      console.error('Error removing template:', error);
      toast.error('Failed to remove template');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setTemplateToDelete(null);
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSelectedTemplate(null);
    setTemplateDescription('');
    setTemplateCategory('');
  };

  const getCategoryColor = (category) => {
    const colors = {
      'HR': 'primary',
      'Finance': 'success',
      'IT': 'info',
      'Operations': 'warning',
      'Sales': 'error',
      'Marketing': 'secondary',
      'General': 'default',
    };
    return colors[category] || 'default';
  };

  if (loading && templates.length === 0 && workflows.length === 0) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Workflow Templates Administration"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Workflows', href: paths.workflows.root },
          { name: 'Templates Admin' },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(paths.workflows.root)}
          >
            Back to Workflows
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        {/* Existing Templates Section */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LibraryBooksIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Existing Templates ({templates.length})
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage existing workflow templates that are available to users.
              </Typography>

              {templates.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No templates have been created yet. Mark approved workflows as templates to get started.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Scrollbar>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Template Name</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Created By</TableCell>
                          <TableCell>Created Date</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow key={template.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AssignmentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2">
                                  {template.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={template.template_category || 'General'} 
                                size="small" 
                                color={getCategoryColor(template.template_category)}
                                variant="outlined" 
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                {template.template_description || template.description || 'No description'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {template.created_by_name || 'Unknown'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ScheduleIcon sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {new Date(template.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="View Template">
                                  <IconButton 
                                    size="small"
                                    onClick={() => router.push(paths.workflows.details(template.id))}
                                  >
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Template">
                                  <IconButton 
                                    size="small" 
                                    color="primary"
                                    onClick={() => handleEditTemplate(template)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove Template">
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => handleRemoveTemplate(template.id)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </TableContainer>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Available Workflows Section */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CategoryIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">
                  Available Workflows ({workflows.length})
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Approved workflows that can be converted into templates for user access.
              </Typography>

              {workflows.length === 0 ? (
                <Alert severity="info">
                  No approved workflows available to convert to templates. 
                  Create and approve workflows first to make them available as templates.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Scrollbar>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Workflow Name</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Created By</TableCell>
                          <TableCell>Created Date</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workflows.map((workflow) => (
                          <TableRow key={workflow.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2">
                                {workflow.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                {workflow.description || 'No description'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {workflow.created_by_name || 'Unknown'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ScheduleIcon sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {new Date(workflow.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="View Workflow">
                                  <IconButton 
                                    size="small"
                                    onClick={() => router.push(paths.workflows.details(workflow.id))}
                                  >
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Mark as Template">
                                  <Button 
                                    size="small" 
                                    variant="contained" 
                                    color="success"
                                    startIcon={<AssignmentIcon />}
                                    onClick={() => handleMarkAsTemplate(workflow.id)}
                                  >
                                    Make Template
                                  </Button>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </TableContainer>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Template Modal */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseModal}
        aria-labelledby="template-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="template-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
            {selectedTemplate?.is_template ? 'Edit Template' : 'Create Template'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            {selectedTemplate?.is_template 
              ? 'Update the template information to help users understand its purpose.'
              : 'Convert this approved workflow into a template that can be used by other users.'
            }
          </Typography>
          
          <TextField
            autoFocus
            fullWidth
            label="Template Description"
            variant="outlined"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Describe what this template does and when to use it..."
            multiline
            rows={3}
            sx={{ mb: 2 }}
            helperText="This description will help users understand when to use this template"
            required
          />
          
          <TextField
            fullWidth
            label="Category"
            variant="outlined"
            value={templateCategory}
            onChange={(e) => setTemplateCategory(e.target.value)}
            select
            sx={{ mb: 2 }}
            helperText="Choose a category to help organize templates"
            required
          >
            <MenuItem value="HR">HR</MenuItem>
            <MenuItem value="Finance">Finance</MenuItem>
            <MenuItem value="IT">IT</MenuItem>
            <MenuItem value="Operations">Operations</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="General">General</MenuItem>
          </TextField>
          
          {selectedTemplate && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Workflow:</strong> {selectedTemplate.name}
              <br />
              <strong>Created:</strong> {new Date(selectedTemplate.createdAt).toLocaleDateString()}
              <br />
              <strong>Author:</strong> {selectedTemplate.created_by_name || 'Unknown'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={selectedTemplate?.is_template ? handleUpdateTemplate : handleConfirmMarkAsTemplate} 
            color="primary" 
            variant="contained" 
            disabled={loading || !templateDescription.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <AssignmentIcon />}
          >
            {selectedTemplate?.is_template ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Template Removal */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCancelDelete}
        aria-labelledby="confirm-delete-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="confirm-delete-title">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DeleteIcon sx={{ mr: 1, color: 'error.main' }} />
            Confirm Template Removal
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to remove this template?
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> Users will no longer be able to create workflows from this template. 
              This action cannot be undone, but you can mark the workflow as a template again later if needed.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            Remove Template
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
