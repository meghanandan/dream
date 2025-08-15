import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Breadcrumbs, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CustomerOnboardingDialog from './CustomerOnboardingDialog';
import { Link } from 'react-router-dom';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';

const ListView = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dialogMode, setDialogMode] = useState('create');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const userData = Storage.getJson('userData');

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await postService(endpoints.auth.getCountriesList, 'POST');
        console.log('API response:', res);
        if (res && Array.isArray(res.data)) {
          setCountries(res.data);
        } else {
          console.warn('Invalid data shape:', res);
        }
      } catch (err) {
        console.error('Failed to fetch countries list:', err);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    getCustomers();
  }, []);

  const payload = {
    org_code: userData.organization,
  };

  const getCustomers = async () => {
    setLoading(true);
    try {
      const res = await postService(endpoints.auth.getCustomersList, 'POST');
      if (res.status) {
        // Normalize API data to match expected structure
        const normalizedData = res.data.map((customer) => ({
          id: customer.org_code, // Use org_code as unique ID
          org_code: customer.org_code,
          org_name: customer.org_name,
          industry: customer.industry,
          address: customer.address,
          city: customer.city,
          state_name: customer.state_name,
          country: customer.country,
          zipcode: customer.zipcode,
          region: customer.region,
          support_mail: customer.support_mail,
          contact_no: customer.contact_no,

          licenses: customer.licences.map((licence) => ({
            licence_type: licence.licence_type,
            from_date: licence.licence_from_date,
            to_date: licence.licence_to_date,
            no_of_licences: licence.no_of_licences,
            grace_period: licence.grace_period,
          })),
        }));
        setCustomers(normalizedData);
      } else {
        setError('No data found.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch customers.';
      setError(errorMessage);
      console.error('Error while fetching customers:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setDialogMode('create');
    setOpenDialog(true);
  };

  const handleEdit = (customer) => {
    // Ensure proper data structure for editing
    const customerData = {
      ...customer,
      licences: customer.licenses || customer.licences || []
    };
    setSelectedCustomer(customerData);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setDialogMode('view');
    setOpenDialog(true);
  };
  

  const columns = [
    { field: 'org_code', headerName: 'Org Code', flex: 1 },
    { field: 'org_name', headerName: 'Org Name', flex: 1 },
    { field: 'support_mail', headerName: 'Support Email', flex: 1 },
    { field: 'contact_no', headerName: 'Phone', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleEdit(params.row)} color="warning">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleView(params.row)} color="info">
            <VisibilityIcon />
          </IconButton>
        </Box>
      ),
      sortable: false,
      flex: 1,
    },
  ];

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">
      Home
    </Link>,
    <Typography key="3" sx={{ color: 'text.primary' }}>
      Customer On Boarding
    </Typography>,
  ];

  return (
    <Box sx={{ px: 2, py: 1, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>

      <Paper sx={{boxShadow: 3, mb: 3}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, p: 1 }}>
          <Typography style={{ fontSize: '0.9rem', padding: '0.3rem 0 0 0' }}>
            Customers List
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{
              mr: 1,
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
            onClick={handleCreate}
          >
            Create Customer
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        )}

        <DataGrid
          sx={{ boxShadow: 0 }}
          rows={customers}
          columns={columns}
          autoHeight
          pageSizeOptions={[5, 10]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          loading={loading}
          disableSelectionOnClick
        />

      </Paper>

      {openDialog && (
        <CustomerOnboardingDialog
          key={`${dialogMode}-${selectedCustomer?.org_code || 'new'}-${Date.now()}`} // Force re-render
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          mode={dialogMode}
          initialData={selectedCustomer}
          onSave={() => {
            setOpenDialog(false);
            getCustomers();
          }} // Refresh list after save
          countries={countries}
          loadingCountries={loadingCountries}
        />
      )}
    </Box>
  );
};

export default ListView;
