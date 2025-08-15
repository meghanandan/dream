import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
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
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import CustomFieldDialog from '../../custom-fields/components/CustomFieldDialog';
import ThirdPartyDialog from '../../custom-fields/components/ThirdPartyDialog';
import EditFieldDialog from '../../custom-fields/components/EditFieldDialog';
import DeleteFieldDialog from '../../custom-fields/components/DeleteFieldDialog';
import {
  fetchCustomFields,
  deleteCustomField,
} from 'src/store/settingCustomFieldSlice';

// Tab panel component
function TabPanel({ children, value, index }) {
  return value === index && <Box sx={{ mt: 2 }}>{children}</Box>;
}

export function Settings() {
  const dispatch = useDispatch();

  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openCustomField, setOpenCustomField] = useState(false);
  const [openThirdParty, setOpenThirdParty] = useState(false);
  const [selectedField, setSelectedField] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [tabValue, setTabValue] = useState(0); // Tab value

  const { fields, loading, error } = useSelector(
    (state) => state.settingCustomField
  );

  // Fetch custom fields on component mount
  useEffect(() => {
    dispatch(fetchCustomFields());
  }, [dispatch]);

  const filteredCustomFields = useMemo(
    () =>
      fields.filter((field) =>
        [field.fieldName, field.fieldType, field.label, field.placeholder]
          .some((attr) => attr?.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [searchTerm, fields]
  );

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteField = async () => {
    await dispatch(deleteCustomField(selectedField.id));
    setOpenDelete(false);
  };

  const handleTabChange = (_, newValue) => setTabValue(newValue);

  const renderCustomFieldTable = () => {
    if (loading) {
      return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 2 }} />;
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    const paginatedFields = filteredCustomFields.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    return (
      <>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
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
                    <IconButton onClick={() => setOpenEdit(true)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => setOpenDelete(true)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No matching fields found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredCustomFields.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </>
    );
  };
// dropdown -> disputes, orders, payments, quota
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Custom Fields" />
        <Tab label="API Configuration" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCustomField(true)}
          sx={{ mt: 2 }}
        >
          Add Custom Field
        </Button>
        <TextField
          fullWidth
          label="Search Custom Fields"
          variant="outlined"
          sx={{ mt: 2 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {renderCustomFieldTable()}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          API Connections
        </Typography>
        <Button
          variant="contained"
          onClick={() => setOpenThirdParty(true)}
        >
          Connect Third-Party System
        </Button>
      </TabPanel>

      {/* Dialogs */}
      <CustomFieldDialog
        open={openCustomField}
        onClose={() => setOpenCustomField(false)}
      />
      <ThirdPartyDialog
        open={openThirdParty}
        onClose={() => setOpenThirdParty(false)}
      />
      <EditFieldDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        data={selectedField}
      />
      <DeleteFieldDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        onDelete={handleDeleteField}
      />
    </Box>
  );
}

export default Settings;
