import React, { useState, useEffect } from 'react';
import {
  Box, Breadcrumbs, Typography, TextField, Paper, Stack,
  TableContainer, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Button, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Pagination, Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';
import CustomFieldDialog from '../components/CustomFieldDialog';
import { useTheme } from '@mui/material/styles';

export function CustomField() {
   const theme = useTheme();
  const [tableData, setTableData] = useState([]);
  const [tableCount, setTableCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openCustomField, setOpenCustomField] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const userData = Storage.getJson('userData');

  useEffect(() => {
    fetchCustomFields();
  }, [currentPage, pageSize, searchTerm]);

  const fetchCustomFields = async () => {
    setLoading(true);
    const payload = {
      org_code: userData.organization,
      user_id: userData.user_id,
      page_size: pageSize,
      page_number: currentPage,
      search_key: searchTerm,
    };
    try {
      const res = await postService(endpoints.external_api.getCustomFieldsList, 'POST', payload);
      if (res.status) {
        setTableData(res.data);
        setTableCount(res.total);
      } else {
        setTableData([]);
        setTableCount(0);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const payload = { id: selectedField.id };
    try {
      await postService(endpoints.external_api.deleteCustomFields, 'POST', payload);
      setOpenDelete(false);
      fetchCustomFields();
    } catch (error) {
      console.error('Error deleting custom field:', error);
    }
  };

  const breadcrumbs = [
    <Link key="1" to="/home">Home</Link>,
    <Typography key="2" color="text.primary">Settings</Typography>,
    <Typography key="3" color="text.primary">Custom Fields</Typography>,
  ];

  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
      </Stack>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
        Custom Fields
      </Typography>

      <Paper sx={{ p: 1, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <TextField
            label="Search Custom Fields"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: '30%' }}
          />
          <Tooltip title="Add Custom Field">
            <Button
              variant="contained" sx={{
                backgroundColor: theme.palette.primary.main,
                '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                }
            }}
              startIcon={<AddIcon />}
              onClick={() => {
                setOpenCustomField(true);
                setSelectedField(null);
              }}
            >
              Add Custom Field
            </Button>
          </Tooltip>
        </Box>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{row.field_name}</TableCell>
                  <TableCell>{row.field_label}</TableCell>
                  <TableCell>{row.field_element || '--'}</TableCell>
                  <TableCell>{row.field_description || '--'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        color="warning"
                        onClick={() => {
                          setOpenCustomField(true);
                          setSelectedField(row);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => {
                          setOpenDelete(true);
                          setSelectedField(row);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!tableData.length && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={2}>
          <Typography variant="body2">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, tableCount)} of {tableCount}
          </Typography>
          <Pagination
            count={Math.ceil(tableCount / pageSize)}
            page={currentPage}
            onChange={(e, value) => setCurrentPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      <CustomFieldDialog
        open={openCustomField}
        data={selectedField}
        onClose={() => {
          setOpenCustomField(false);
          fetchCustomFields();
        }}
        slug="custom-field"
      />

      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
      >
        <DialogTitle>Delete Custom Field</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this custom field? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='contained' onClick={handleDelete} color="error">Delete</Button>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomField;
