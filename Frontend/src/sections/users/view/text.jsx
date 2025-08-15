// Settings.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Alert,
  TablePagination,
  IconButton,
} from '@mui/material';
import { Edit, Delete, Visibility, Add } from '@mui/icons-material';
import { getFieldTemplates } from 'src/actions/SettingAction';
import EditFieldDialog from 'src/sections/custom-fields/components/EditFieldDialog';
import ViewFieldDialog from 'src/sections/custom-fields/components/ViewFieldDialog';
import DeleteFieldDialog from 'src/sections/custom-fields/components/DeleteFieldDialog';
import CustomFieldDialog from 'src/sections/custom-fields/components/CustomFieldDialog';
// import ThirdPartyDialog from '../components/ThirdPartyDialog';
import ThirdPartyDialog from 'src/sections/custom-fields/components/ThirdPartyDialog';
// C:\DReaM ui\DReaM\frontend\src\sections\settings\components\ThirdPartyDialog.jsx

export function Users() {
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedField, setSelectedField] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [openCustomField, setOpenCustomField] = useState(false);
  const [openThirdParty, setOpenThirdParty] = useState(false);

  const handleOpenCustomField = () => {
    setOpenCustomField(true);
  };

  const handleCloseCustomField = () => {
    setOpenCustomField(false);
  };

  const handleOpenThirdParty = () => {
    setOpenThirdParty(true);
  };

  const handleCloseThirdParty = () => {
    setOpenThirdParty(false);
  };


  const fetchCustomFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFieldTemplates();
      setCustomFields(response);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      setError('Failed to load custom fields.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomFields();
  }, [fetchCustomFields]);

  const handleOpenEdit = (field) => {
    setSelectedField(field);
    setOpenEdit(true);
  };

  const handleOpenView = (field) => {
    setSelectedField(field);
    setOpenView(true);
  };

  const handleOpenDelete = (field) => {
    setSelectedField(field);
    setOpenDelete(true);
  };

  const handleAddField = () => {
    setSelectedField({}); // Open empty form for new field
    setOpenEdit(true);
  };

  const handleDeleteField = () => {
    console.log(`Deleting field with ID: ${selectedField.id}`);
    setOpenDelete(false);
    fetchCustomFields();
  };

  const handleSaveField = () => {
    console.log('Saving field:', selectedField);
    setOpenEdit(false);
    fetchCustomFields();
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredCustomFields = useMemo(
    () =>
      customFields.filter((field) =>
        Object.values(field).some((value) =>
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      ),
    [searchTerm, customFields]
  );

  const paginatedFields = filteredCustomFields.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {/* Custom Fields Section */}
            <Grid item xs={12}>
              <Paper sx={{ padding: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Custom Fields
                </Typography>
                <Button variant="contained" sx={{ marginTop: 2 }} onClick={handleOpenCustomField}>
                  Add Custom Field
                </Button>
              </Paper>
            </Grid>

            {/* API Connections Section */}
            <Grid item xs={12}>
              <Paper sx={{ padding: 2 }}>
                <Typography variant="h6" gutterBottom>
                  API Connections
                </Typography>
                <Button variant="contained" sx={{ marginTop: 2 }} onClick={handleOpenThirdParty}>
                  Connect Third-Party System
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* Custom Field Dialog */}
          <CustomFieldDialog open={openCustomField} onClose={handleCloseCustomField} />

          {/* Third-Party System Dialog */}
          <ThirdPartyDialog open={openThirdParty} onClose={handleCloseThirdParty} />

          <TextField
            fullWidth
            label="Search Custom Fields"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ marginBottom: 2 }}
          />

          {loading ? (
            <CircularProgress sx={{ display: 'block', margin: 'auto' }} />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Placeholder</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>{field.order}</TableCell>
                      <TableCell>{field.fieldName}</TableCell>
                      <TableCell>{field.label}</TableCell>
                      <TableCell>{field.fieldType}</TableCell>
                      <TableCell>{field.placeholder}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpenView(field)}>
                          <Visibility />
                        </IconButton>
                        <IconButton onClick={() => handleOpenEdit(field)}>
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleOpenDelete(field)}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={filteredCustomFields.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </TableContainer>
          )}
        </Grid>
      </Grid>

      <EditFieldDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        data={selectedField}
        onChange={(e) =>
          setSelectedField({ ...selectedField, [e.target.name]: e.target.value })
        }
        onSave={handleSaveField}
      />

      <ViewFieldDialog
        open={openView}
        onClose={() => setOpenView(false)}
        data={selectedField}
      />

      <DeleteFieldDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        onDelete={handleDeleteField}
        fieldName={selectedField.fieldName}
      />
    </Box>
  );
}

export default Users;
