import { useTheme } from '@mui/material/styles';
import {
  Box,
  Grid,
  Typography,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TableSortLabel,
  Stack,
  Breadcrumbs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import { Add, Delete } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { paths } from 'src/routes/paths';
import { fetchTemplates } from 'src/store/templateSlice';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';

export function Templates() {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { templates, loading, error } = useSelector((state) => state.templates);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [count, setCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchtemplate, setSearchtemplate] = useState('');
  const userData = Storage.getJson("userData");
  
  // Delete confirmation dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  
  // Sorting state
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      getTemplates();
    }, 500); // wait 500ms after typing
  
    return () => clearTimeout(delayDebounce); // cleanup
  }, [searchtemplate, page, rowsPerPage, order, orderBy]);
  

  const getTemplates = () => {
    const payload = { 
      search_key: searchtemplate,
      page_number: page + 1,
      page_size: rowsPerPage,
      org_code: userData.organization,
      sort_field: orderBy,
      sort_order: order
    }
    try {
      postService(endpoints.auth.getAll, 'POST', payload).then((res) => {
        if (res.status) {
          setFilteredTemplates(res.data);
          // If your API returns total count for pagination
          // setCount(res.totalCount || res.data.length);
        } else {
          console.log('No data found.');
        }
      }).catch((erro) => {
        console.error('Error while fetching master pages:', erro);
      });
    }
    catch (err) {
      console.error("Error while adding cluster:", err.response?.data?.message);
    }
  }

  const handleCreateTemplate = () => {
    navigate('/template/create');
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (templateId) => {
    setTemplateToDelete(templateId);
    setOpenDeleteDialog(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTemplateToDelete(null);
  };

  // Confirm and delete template
  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      const payload = { id: templateToDelete }
      try {
        postService(endpoints.auth.deleteTemplate, 'POST', payload).then((res) => {
          if (res.status) {
            getTemplates();
          } else {
            console.log('No data found.');
          }
        }).catch((erro) => {
          console.error('Error while deleting template:', erro);
        });
      }
      catch (err) {
        console.error("Error while deleting template:", err.response?.data?.message);
      }
    }
    handleCloseDeleteDialog();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sorting functions
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const createSortHandler = (property) => (event) => {
    handleRequestSort(property);
  };

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">
      Home
    </Link>,
    <Typography key="3" sx={{ color: 'text.primary' }}>
      Templates
    </Typography>,
  ];

  return (
    <Box sx={{ px:3, py:2, minHeight: '100vh' }}>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this template? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={confirmDeleteTemplate} color="error" autoFocus>
            Delete
          </Button>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>
      <Typography variant="h4" gutterBottom>
        Templates
      </Typography>

      <Paper >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p:1, mb: 2,boxShadow: 3 }}>
        <TextField size="small"
          label="Search Templates"
          variant="outlined"
          value={searchtemplate}
          onChange={(e) => setSearchtemplate(e.target.value)}
          sx={{ width: '60%' }}
        />
        <Tooltip title="Template Library">
        <Button 
          variant="contained"  size="small"
        
          sx={{mr: 1,
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            }
          }}
        >
          Library
        </Button>
        <Button 
          variant="contained"  size="small"
          onClick={handleCreateTemplate} 
          sx={{
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            }
          }}
        >
          Create Template
        </Button>
        </Tooltip>
      </Box>
      </Paper>
      
      {/* Loading and Error States */}
      {loading && <Typography variant="body1">Loading templates...</Typography>}

      {/* No Templates State */}
      {!loading && !error && filteredTemplates.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40vh',
            textAlign: 'center',
            color: 'text.secondary',
            gap: 2,
          }}
        >
          <AddCircleOutlineIcon sx={{ fontSize: 60, color: 'primary.main' }} />
          <Typography variant="h6" gutterBottom>
            No Templates Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            It looks like there are no templates available yet. Start by creating a new one!
          </Typography>
          <Tooltip title="Create a new template">
            <Button variant="contained" c  sx={{
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            }
          }} onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </Tooltip>
        </Box>
      )}

      {/* Data Table */}
      {!loading && filteredTemplates.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden', mb: 2, boxShadow: 4 }}>
          <TableContainer>
            <Table stickyHeader aria-label="templates table" >
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={createSortHandler('name')}
                      sx={{ color: 'inherit !important' }}
                    >
                      Template Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === 'template_name'}
                      direction={orderBy === 'template_name' ? order : 'asc'}
                      onClick={createSortHandler('template_name')}
                      sx={{ color: 'inherit !important' }}
                    >
                      Type
                    </TableSortLabel>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === 'work_flow_name'}
                      direction={orderBy === 'work_flow_name' ? order : 'asc'}
                      onClick={createSortHandler('work_flow_name')}
                      sx={{ color: 'inherit !important' }}
                    >
                      Workflow
                    </TableSortLabel>
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow hover key={template.id}>
                    <TableCell component="th" scope="row">
                      {template.name.charAt(0).toUpperCase() + template.name.slice(1).toLowerCase()}
                    </TableCell>
                    <TableCell>{template.template_name}</TableCell>
                    <TableCell>{template.work_flow_name}</TableCell>
                    <TableCell align="right">
                    <Tooltip title="Edit Template">
                      <IconButton 
                        size="small" 
                        title="Edit" 
                        onClick={() => { navigate(paths.template.edit(template.id)); }}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Template">
                      <IconButton 
                        size="small" 
                        title="Delete" 
                        onClick={() => { handleOpenDeleteDialog(template.id) }}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={count || filteredTemplates.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
    </Box>
  );
}

export default Templates;