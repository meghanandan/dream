import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, Grid, Button, Select, FormControl,
  InputLabel, Card, CardContent, FormHelperText, Stack, Breadcrumbs,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, Alert,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams, Link } from 'react-router-dom';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { getAddUserSchema } from 'src/schema/user';
import { endpoints } from 'src/utils/axios';
import { z } from 'zod';

const userSchema = z.object({
  first_name: z.string().min(1, 'First Name is required').max(50).regex(/^[A-Za-z\s]+$/, 'Only letters'),
  last_name: z.string().min(1, 'Last Name is required').max(50).regex(/^[A-Za-z\s]+$/, 'Only letters'),
  emp_id: z.string().min(1, 'Employee ID is required').max(20),
  email: z.string().email().max(100),
  roles: z.string().min(1).max(30),
  reporting_to: z.string().max(50).optional(),
  license_type: z.string().optional(),
 //  region: z.string().min(1, 'Region is required'),
 // sub_region: z.string().min(1, 'Sub Region is required'),
 // department: z.string().min(1, 'Department is required'),
});

export function CreateUserView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const userData = Storage.getJson('userData');

  // Form and dropdown states
  const [formSchema, setFormSchema] = useState([...getAddUserSchema.feilds]);
  const [formErrors, setFormErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);

  // Master dropdowns
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [subregions, setSubregions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [licenseOptions, setLicenseOptions] = useState([]);

  // Selected state for composite dropdowns
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSubregion, setSelectedSubregion] = useState('');
  const [department, setDepartment] = useState('');

  // License stats table
  const [remainingLicences, setRemainingLicences] = useState([]);

  // --- Master Data Load ---
  useEffect(() => {
    // 1. Load all master dropdown data (countries, roles, users)
  async function loadMasterData() {
    try {
      const [countryRes, roleRes, userRes] = await Promise.all([
        postService(endpoints.auth.getCountriesList, 'POST'),
        postService(endpoints.auth.getRolesList, 'POST', { org_code: userData.organization, search_key: '' }),
        postService(endpoints.auth.getRoleBaseOnUsers, 'POST', { org_code: userData.organization }),
      ]);
      setCountries(countryRes.data || []);
      setRegions(Array.from(new Set((countryRes.data || []).map(c => c.region).filter(Boolean))));
      // Make sure to use correct path to roles
      setRoles((roleRes.data && Array.isArray(roleRes.data[0]) ? roleRes.data[0] : []) || []);
      setUserOptions(userRes.data || []);
    } catch (err) {
      setCountries([]); setRegions([]); setRoles([]); setUserOptions([]);
    }
  }

    // 2. Load License Stats
    const getRemainingLicences = () => {
      postService(endpoints.auth.getOrganizationWiseRemainingLicences, 'POST', { org_code: userData.organization })
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            const mapped = res.data.map((item) => ({
              type: item.licence_type,
              total: Number(item.total_licences),
              used: Number(item.used_licences),
              available: Number(item.available_licences),
              assignedTo: [],
            }));
            setRemainingLicences(mapped);
            
            // Populate license options from the available license types
            const options = mapped.map(item => ({
              id: item.type,
              name: item.type,
              available: item.available
            }));
            setLicenseOptions(options);
          } else {
            setRemainingLicences([]);
            setLicenseOptions([]);
          }
        }).catch(() => {
          setRemainingLicences([]);
          setLicenseOptions([]);
        });
    };

    loadMasterData();
    getRemainingLicences();

    if (!id) {
      // Fresh create: reset all states
      const fresh = getAddUserSchema.feilds.map(field => ({
        ...field, value: null, visable: true, disable: field.name === 'emp_id' ? false : field.disable,
      }));
      setFormSchema(fresh);
      setSelectedRegion(''); setSelectedSubregion(''); setDepartment('');
    } else {
      // On edit/view, set breadcrumbs section
      const currentUrl = window.location.href;
      const parts = currentUrl.split('/');
      setSection(parts[5]);
    }
    // eslint-disable-next-line
  }, []);

  // --- Fetch user data only when all masters loaded ---
useEffect(() => {
  if (id && countries.length && roles.length && userOptions.length) {
    postService(endpoints.auth.getUserIdDetails, 'POST', { id }).then(res => {
      if (res.data && res.data.length > 0) {
        const user = res.data[0];
        setSelectedRegion(user.region || '');
        const subs = Array.from(new Set(countries.filter((c) => c.region === user.region).map((c) => c.country_name)));
        setSubregions(subs);
        setSelectedSubregion(user.sub_region || '');
        setDepartment(user.department || '');
        setFormSchema(prev => prev.map(item => {
          if (item.name === 'first_name') return { ...item, value: user.first_name ?? '' };
          if (item.name === 'last_name') return { ...item, value: user.last_name ?? '' };
          if (item.name === 'emp_id') return { ...item, value: user.emp_id ?? '', disable: true };
          if (item.name === 'email') return { ...item, value: user.email ?? '' };
          if (item.name === 'roles') return { ...item, value: user.role ?? '' };
          if (item.name === 'reporting_to') return { ...item, value: user.reporting_to ?? '' };
          if (item.name === 'user_active') return { ...item, value: user.user_active ?? false };
          if (item.name === 'region') return { ...item, value: user.region ?? '' };
          if (item.name === 'license_type') return { ...item, value: user.licence_type ?? '' };
          return item;
        }));
      }
    });
  }
}, [id, countries, roles, userOptions]);


  // --- Handlers ---
  const handleChangeSelect = (fie, value) => {
    setFormSchema(formSchema.map((field) => (
      field.name === fie.name ? { ...field, value } : field
    )));
  };

  // For dropdowns with local state
  const handleRegionChange = (e) => {
    const r = e.target.value;
    setSelectedRegion(r);
    const subs = Array.from(new Set(countries.filter((c) => c.region === r).map((c) => c.country_name)));
    setSubregions(subs);
    setSelectedSubregion('');
  };

  // --- Submit handler ---
  const handleSubmit = async () => {
    const payload = {};
    formSchema.forEach(item => { payload[item.name] = item.value ?? ''; });
    payload.region = selectedRegion;
    payload.sub_region = selectedSubregion;
    payload.department = department;

    // Validate
    const validation = userSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.issues.forEach(issue => { fieldErrors[issue.path[0]] = issue.message; });
      setFormErrors(fieldErrors);
      return;
    }
    
    // Additional validation for license availability
    if (payload.license_type) {
      const selectedLicense = licenseOptions.find(opt => opt.id === payload.license_type);
      if (selectedLicense && selectedLicense.available <= 0 && (!id || formSchema.find(i => i.name === 'license_type')?.value !== payload.license_type)) {
        setAlert({ 
          severity: 'error', 
          message: `No licenses available for ${selectedLicense.name}. Please select a different license type.` 
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (id) {
        payload.done_by = userData.user_id || null;
        payload.id = id;
        payload.org_code = userData.organization;
        const result = await postService(endpoints.auth.updateUser, 'POST', payload);
        
        if (result.status) {
          // User update was successful, but check license status
          if (result.licence_status === false) {
            // License assignment failed
            setAlert({
              severity: 'warning',
              message: `User updated successfully, but license assignment failed: ${result.licence_message || 'License not available'}`
            });
            // Still navigate back after a delay
            // setTimeout(() => { navigate('/users'); }, 4000);
            // Refresh license data after update
            postService(endpoints.auth.getOrganizationWiseRemainingLicences, 'POST', { org_code: userData.organization })
              .then(res => {
                if (res.data && Array.isArray(res.data)) {
                  const mapped = res.data.map((item) => ({
                    type: item.licence_type,
                    total: Number(item.total_licences),
                    used: Number(item.used_licences),
                    available: Number(item.available_licences),
                    assignedTo: [],
                  }));
                  setRemainingLicences(mapped);
                  setLicenseOptions(mapped.map(item => ({
                    id: item.type,
                    name: item.type,
                    available: item.available
                  })));
                }
              });
          } else if (result.licence_status === true) {
            // License assignment was successful or already assigned
            setAlert(null);
            if (result.licence_message === "License already assigned") {
              setAlertMessage(`${result.message}. License was already properly assigned.`);
            } else {
              setAlertMessage(`${result.message} with license assignment successful`);
            }
            setModelOpen(true);
            // setTimeout(() => { navigate('/users'); }, 2000);
          } else {
            // No license change was attempted
            setAlert(null);
            setAlertMessage(result.message);
            setModelOpen(true);
            // setTimeout(() => { navigate('/users'); }, 2000);
          }
        } else {
          setAlert({ severity: 'error', message: result.message || 'Failed to update user.' });
        }
      } else {
        payload.done_by = userData.user_id || null;
        payload.org_code = userData.organization;
        const result = await postService(endpoints.auth.insertUser, 'POST', payload);
        
        if (result.status) {
          // User creation was successful, but check license status
          if (result.licence_status === false) {
            // License assignment failed
            setAlert({
              severity: 'warning',
              message: `User created successfully, but license assignment failed: ${result.licence_message || 'License not available'}`
            });
            // Still navigate back after a delay
            // setTimeout(() => { navigate('/users'); }, 4000);
          } else if (result.licence_status === true) {
            // License assignment was successful or already assigned
            setAlert(null);
            if (result.licence_message === "License already assigned") {
              setAlertMessage(`${result.message}. License was already properly assigned.`);
            } else {
              setAlertMessage(`${result.message} with license assignment successful`);
            }
            setModelOpen(true);
            // setTimeout(() => { navigate('/users'); }, 2000);
          } else {
            // No license was requested
            setAlert(null);
            setAlertMessage(result.message);
            setModelOpen(true);
            // setTimeout(() => { navigate('/users'); }, 2000);
          }
        } else {
          setAlert({ severity: 'error', message: result.message || 'Failed to create user.' });
        }
      }
    } catch (error) {
      console.error("Error during user operation:", error);
      setAlert({ 
        severity: 'error', 
        message: error.response?.data?.message || error.message || 'Server error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Breadcrumbs ---
  const breadcrumbs = [
    <Link key="1" to="/home">Home</Link>,
    <Link key="2" to="/users">User</Link>,
    <Typography key="3" color="text.primary">
      {id ? (section === 'details' ? 'View User' : 'Edit User') : 'Create New User'}
    </Typography>,
  ];

  // --- JSX ---
  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
      </Stack>
      <Typography variant="h4" gutterBottom>
        {id ? (section === 'details' ? 'View User' : 'Edit User') : 'Create New User'}
      </Typography>
      <Box>
        {alert && (
          <Alert severity={alert.severity} onClose={() => setAlert(null)} sx={{ mt: 2 }}>
            {alert.message}
          </Alert>
        )}
        <Grid>
          <Card>
            <CardContent>
              <Grid container spacing={4} alignItems="center">
                {/* Text Inputs */}
                {formSchema
                  .filter(item =>
                    item.element === 'input' && item.visable &&
                    ['first_name', 'last_name', 'emp_id', 'email'].includes(item.name)
                  ).map(item => (
                    <Grid item xs={12} md={6} key={item.name}>
                      <TextField
                        size="small"
                        fullWidth
                        label={<span>{item.label}{item.required && <span style={{ color: 'red' }}> *</span>}</span>}
                        value={item.value ?? ''}
                        onChange={e => handleChangeSelect(item, e.target.value)}
                        disabled={section === 'details' || item.disable}
                        error={!!formErrors[item.name]}
                        helperText={formErrors[item.name] || ''}
                      />
                    </Grid>
                  ))}

                {/* Role dropdown */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" error={!!formErrors.roles}>
  <InputLabel>Role</InputLabel>
  <Select
    value={formSchema.find(i => i.name === 'roles')?.value || ''}
    label="Role"
    onChange={e => handleChangeSelect({ name: 'roles' }, e.target.value)}
    disabled={section === 'details'}
  >
    {roles.length === 0 ? (
      <MenuItem value="">No roles found</MenuItem>
    ) : (
      roles.map(opt =>
        <MenuItem key={opt.role_id} value={opt.role_id}>{opt.role_name}</MenuItem>
      )
    )}
  </Select>
  {!!formErrors.roles && <FormHelperText>{formErrors.roles}</FormHelperText>}
</FormControl>

                </Grid>

                {/* Region/Subregion/Department */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" error={!!formErrors.region}>
                    <InputLabel>Region</InputLabel>
                    <Select
                      value={selectedRegion}
                      label="Region"
                      onChange={handleRegionChange}
                      disabled={section === 'details'}
                    >
                      {regions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                    {!!formErrors.region && <FormHelperText>{formErrors.region}</FormHelperText>}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" error={!!formErrors.sub_region}>
                    <InputLabel>Sub-region</InputLabel>
                    <Select
                      value={selectedSubregion}
                      label="Sub-region"
                      onChange={e => setSelectedSubregion(e.target.value)}
                      disabled={!selectedRegion || section === 'details'}
                    >
                      {subregions.map(sr => <MenuItem key={sr} value={sr}>{sr}</MenuItem>)}
                    </Select>
                    {!!formErrors.sub_region && <FormHelperText>{formErrors.sub_region}</FormHelperText>}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Department"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    disabled={section === 'details'}
                    error={!!formErrors.department}
                    helperText={formErrors.department || ''}
                  />
                </Grid>

                {/* Reporting User */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" error={!!formErrors.reporting_to}>
  <InputLabel>Reporting User</InputLabel>
  <Select
    value={formSchema.find(i => i.name === 'reporting_to')?.value || ''}
    label="Reporting User"
    onChange={e => handleChangeSelect({ name: 'reporting_to' }, e.target.value)}
    disabled={section === 'details'}
  >
    {userOptions.length === 0 ? (
      <MenuItem value="">No users found</MenuItem>
    ) : (
      userOptions.map(u =>
        <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
      )
    )}
  </Select>
  {!!formErrors.reporting_to && <FormHelperText>{formErrors.reporting_to}</FormHelperText>}
</FormControl>

                </Grid>

                {/* License Type */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" error={!!formErrors.license_type}>
                    <InputLabel>License Type</InputLabel>
                    <Select
                      value={formSchema.find(i => i.name === 'license_type')?.value || ''}
                      label="License Type"
                      onChange={e => handleChangeSelect({ name: 'license_type' }, e.target.value)}
                      disabled={section === 'details'}
                    >
                      {licenseOptions.length === 0 ? (
                        <MenuItem value="" disabled>No license types available</MenuItem>
                      ) : (
                        licenseOptions.map(opt => (
                          <MenuItem 
                            key={opt.id} 
                            value={opt.id}
                            disabled={opt.available <= 0 && formSchema.find(i => i.name === 'license_type')?.value !== opt.id}
                          >
                            {opt.name} {opt.available > 0 ? `(${opt.available} available)` : '(none available)'}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {!!formErrors.license_type && <FormHelperText>{formErrors.license_type}</FormHelperText>}
                    {!formErrors.license_type && 
                      <FormHelperText>
                        {licenseOptions.length === 0 ? 'No licenses configured for this organization' : 'Select a license with available count'}
                      </FormHelperText>
                    }
                  </FormControl>
                </Grid>

                {/* Active User Switch */}
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!formSchema.find(i => i.name === 'user_active')?.value}
                        onChange={e => handleChangeSelect({ name: 'user_active' }, e.target.checked)}
                        disabled={section === 'details'}
                      />
                    }
                    label="Active User"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                {section !== 'details' && (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{
                      backgroundColor: theme.palette.primary.main,
                      '&:hover': { backgroundColor: theme.palette.primary.dark },
                    }}
                  >
                    {loading ? 'Saving...' : id ? 'Update User' : 'Save User'}
                  </Button>
                )}
                <Button variant="outlined" onClick={() => navigate('/users')}>
                  Back
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Box>

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>License Usage Summary</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>License Type</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Used</TableCell>
                  <TableCell>Available</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {remainingLicences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}><em>No license data available.</em></TableCell>
                  </TableRow>
                ) : (
                  remainingLicences.map(row => (
                    <TableRow key={row.type}>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.used}</TableCell>
                      <TableCell>{row.available}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={modelOpen}
        onClose={() => { setModelOpen(false); navigate('/users'); }}
      >
        <DialogTitle>Success</DialogTitle>
        <DialogContent>{alertMessage}</DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setModelOpen(false); navigate('/users'); }}
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CreateUserView