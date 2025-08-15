import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Breadcrumbs,
  Stack,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';

const CustomerOnboardingDialog = ({
  mode = 'create',
  initialData = null,
  onClose,
  onSave,
  countries = [],
  loadingCountries = false,
}) => {
  const theme = useTheme();
  const isDialog = !!onClose;
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const defaultValues = {
    org_code: '',
    org_name: '',
    address: '',
    support_mail: '',
    contact_no: '',
    industry: '',
    city: '',
    state_name: '',
    country: '',
    zipcode: '',
    region: '',
    status: true,
    customer_type: 'TRIAL', // 'PAID' or 'TRIAL'
    trial_duration_days: 30,
    trial_converted_date: null,
    licenses: [
      {
        org_code: '',
        licence_type: '',
        from_date: dayjs(),
        to_date: dayjs().add(1, 'month'),
        no_of_licences: 1,
        grace_period: 7,
      },
    ],
  };

  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    emp_id: '',
    email: '',
    password: '',
    status: true,
    org_code: '',
    created_by: '',
    licence_type: 'DREAMPRO',
    role: 'RL_NyAd',
    user_active: true,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm({
    defaultValues,
    mode: 'onChange',
    shouldUnregister: false, // Keep registered inputs for better form state management
    shouldFocusError: true,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'licenses',
  });

  const orgCode = watch('org_code');
  const selectedCountry = watch('country');
  const customerType = watch('customer_type');
  const trialDuration = watch('trial_duration_days');

  useEffect(() => {
    if (selectedCountry) {
      const countryData = countries.find((c) => c.country_name === selectedCountry);
      if (countryData && countryData.region) {
        setValue('region', countryData.region);
      } else {
        setValue('region', '');
      }
    } else {
      setValue('region', '');
    }
  }, [selectedCountry, countries, setValue]);

  // Sync licenses org_code with top-level org_code
  useEffect(() => {
    const licenses = getValues('licenses');
    licenses.forEach((_, index) => {
      setValue(`licenses[${index}].org_code`, orgCode);
    });
  }, [orgCode, setValue, getValues]);

  // Handle trial mode changes - automatically adjust license defaults
  useEffect(() => {
    if (customerType === 'TRIAL') {
      // Set trial-specific license defaults
      const trialEndDate = dayjs().add(trialDuration || 30, 'days');
      const currentLicenses = getValues('licenses');
      
      // Update existing licenses to trial defaults
      currentLicenses.forEach((_, index) => {
        setValue(`licenses[${index}].licence_type`, 'DREAMPRO');
        setValue(`licenses[${index}].from_date`, dayjs());
        setValue(`licenses[${index}].to_date`, trialEndDate);
        setValue(`licenses[${index}].no_of_licences`, 5);
        setValue(`licenses[${index}].grace_period`, 7);
      });
    } else if (customerType === 'PAID') {
      // Reset to standard 1-year defaults
      const currentLicenses = getValues('licenses');
      currentLicenses.forEach((_, index) => {
        setValue(`licenses[${index}].from_date`, dayjs());
        setValue(`licenses[${index}].to_date`, dayjs().add(1, 'year'));
        setValue(`licenses[${index}].no_of_licences`, 1);
        setValue(`licenses[${index}].grace_period`, 7);
      });
    }
  }, [customerType, trialDuration, setValue, getValues]);


// Function to prepare the data
const prepareInitialData = (data) => {
  if (!data) return defaultValues;
  
  // Extract license data, handling both licences and licenses fields
  const licenseData = data.licences || data.licenses || [];
  
  const preparedData = {
    // Start with all default values to ensure no fields are missing
    ...defaultValues,
    // Override with actual data
    org_code: data.org_code || '',
    org_name: data.org_name || '',
    industry: data.industry || '',
    address: data.address || '',
    city: data.city || '',
    state_name: data.state_name || '',
    country: data.country || '',
    zipcode: data.zipcode || '',
    region: data.region || '',
    support_mail: data.support_mail || '',
    contact_no: data.contact_no || '',
    status: data.status !== undefined ? data.status : true,
    customer_type: data.customer_type || 'TRIAL',
    trial_duration_days: data.trial_duration_days || 30,
    trial_converted_date: data.trial_converted_date || null,
    licenses: licenseData.map((license) => ({
      org_code: license.org_code || data.org_code || '',
      licence_type: license.licence_type || '',
      from_date: license.licence_from_date || license.from_date 
        ? dayjs(license.licence_from_date || license.from_date) 
        : dayjs(),
      to_date: license.licence_to_date || license.to_date 
        ? dayjs(license.licence_to_date || license.to_date) 
        : dayjs().add(1, 'year'),
      no_of_licences: license.no_of_licences || 1,
      grace_period: license.grace_period || 7,
    }))
  };
  
  // Ensure we have at least one license entry
  if (preparedData.licenses.length === 0) {
    preparedData.licenses = defaultValues.licenses;
  }
  
  return preparedData;
};

// Initialize form with prepared data on component mount
useEffect(() => {
  // Always prepare the data first
  const formData = prepareInitialData(initialData);
  
  // Clear any existing form state
  reset(defaultValues);
  
  // Then set the actual data after a brief delay
  const timer = setTimeout(() => {
    reset(formData, { 
      keepDefaultValues: false,
      keepErrors: false,
      keepDirty: false,
      keepIsSubmitted: false,
      keepTouched: false,
      keepIsValid: false,
      keepSubmitCount: false
    });
    
    // Handle field array separately
    if (formData.licenses && formData.licenses.length > 0) {
      replace(formData.licenses);
    }
  }, 50);
  
  return () => clearTimeout(timer);
}, [initialData, mode]);

  // Additional effect to ensure form values are properly set when in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      const formData = prepareInitialData(initialData);
      
      // Set individual form values to ensure they're properly populated
      Object.keys(formData).forEach(key => {
        if (key !== 'licenses') {
          setValue(key, formData[key]);
        }
      });
    }
  }, [initialData, isEditMode, setValue]);
  const [loading, setLoading] = useState(false);

  const validateNewUser = () => {
    const { first_name, last_name, emp_id, email } = newUser;

    if (!first_name.trim()) return 'First Name is required';
    if (!last_name.trim()) return 'Last Name is required';
    if (!emp_id.trim()) return 'Employee ID is required';
    if (!email.trim()) return 'Email is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Invalid email format';

    return null; // No error
  };

  const onSubmit = async (data) => {
  if (!isEditMode) {
    const userError = validateNewUser();
    if (userError) {
      setSnackbar({ open: true, message: userError, severity: 'error' });
      return;
    }
  }

  // Prepare licenses with formatted dates
  const licensesPayload = data.licenses.map((license) => ({
    ...license,
    org_code: data.org_code,
    from_date: license.from_date
      ? dayjs(license.from_date).format('YYYY-MM-DD')
      : null,
    to_date: license.to_date
      ? dayjs(license.to_date).format('YYYY-MM-DD')
      : null,
  }));

  setLoading(true);

  try {
    if (isEditMode) {
      // ---- EDIT MODE: Update customer ----
      // Extract only the fields needed, avoiding duplicate licenses
      const { licenses: originalLicenses, licences: originalLicences, ...customerData } = data;
      const payload = {
        ...customerData,
        licenses: licensesPayload,
      };
      // Remove admin user fields if any, backend only expects org info + licenses
      const response = await postService(
        endpoints.auth.updateSelectedCustomerLicences,
        'POST',
        payload
      );

      if (!response || response.status === false) {
        throw new Error(response?.message || 'Customer update failed');
      }

      setSnackbar({
        open: true,
        message: 'Customer updated successfully',
        severity: 'success',
      });
      
      // Wait a moment before closing to show the success message
      setTimeout(() => {
        if (isDialog) {
          onClose?.();
          onSave?.();
        }
      }, 1500);
      // Optionally, reset the form here if needed
      // reset(defaultValues);
    } else {
      // ---- CREATE MODE: Create customer + admin user ----
      const customerPayload = {
        ...data,
        licenses: licensesPayload,
      };

      const userPayload = {
        emp_id: newUser.emp_id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        org_code: data.org_code,
        reporting_to: null,
        roles: newUser.role,
        done_by: data.org_code,
        user_active: true,
        region: data.region,
        licence_type: newUser.licence_type
      };

      const customerResponse = await postService(
        endpoints.auth.createNewCustomer,
        'POST',
        customerPayload
      );

      if (!customerResponse || customerResponse.status === false) {
        throw new Error(customerResponse.message || 'Customer creation failed');
      }

      const userResponse = await postService(
        endpoints.auth.insertUser,
        'POST',
        userPayload
      );

      if (!userResponse?.status) {
        throw new Error(userResponse.message || 'User creation failed (customer already created)');
      }

      setSnackbar({
        open: true,
        message: 'Customer and admin user created successfully',
        severity: 'success',
      });

      // Wait a moment before closing to show the success message
      setTimeout(() => {
        if (isDialog) {
          onClose?.();
          onSave?.();
        }
      }, 1500);
      reset(defaultValues);
    }
  } catch (err) {
    setSnackbar({
      open: true,
      message: err.message || 'Unexpected error occurred',
      severity: 'error',
    });
  } finally {
    setLoading(false);
  }
};



  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const renderForm = () => (
    <Box
      sx={{ px: isDialog ? 0 : 2, py: isDialog ? 0 : 2, minHeight: isDialog ? 'auto' : '100vh' }}
    >
      <Paper style={{ backgroundColor: '#fff' }} sx={{ px: 0, mb: 3, boxShadow: isDialog ? 0 : 3 }}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Paper sx={{ mb: 2, boxShadow: 3, p: 2 }} className="br-top">
            <Typography sx={{ pt: 0 }}>Organization Details:</Typography>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={2}>
                <Controller
                  name="org_code"
                  control={control}
                  rules={{ required: 'Organization Code is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Organization Code"
                      fullWidth
                      size="small"
                      error={!!errors.org_code}
                      helperText={errors.org_code?.message}
                      disabled={isViewMode || isEditMode}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="org_name"
                  control={control}
                  rules={{ required: 'Organization name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Organization Name"
                      fullWidth
                      size="small"
                      error={!!errors.org_name}
                      helperText={errors.org_name?.message}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="industry"
                  control={control}
                  rules={{
                    required: 'Industry is required',
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Industry"
                      fullWidth
                      size="small"
                      error={!!errors.industry}
                      helperText={errors.industry?.message}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>

              {/* Customer Type Selection */}
              <Grid item xs={12}>
                <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, backgroundColor: '#f8f9fa' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main' }}>
                    Customer Type
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={4}>
                      <Controller
                        name="customer_type"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            select
                            label="Customer Type"
                            fullWidth
                            size="small"
                            disabled={isViewMode}
                          >
                            <MenuItem value="PAID">Regular Customer (Paid)</MenuItem>
                            <MenuItem value="TRIAL">Trial Customer</MenuItem>
                          </TextField>
                        )}
                      />
                    </Grid>
                    {customerType === 'TRIAL' && (
                      <Grid item xs={3}>
                        <Controller
                          name="trial_duration_days"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              label="Trial Duration (Days)"
                              fullWidth
                              size="small"
                              inputProps={{ min: 7, max: 365 }}
                              disabled={isViewMode}
                            />
                          )}
                        />
                      </Grid>
                    )}
                    <Grid item xs={customerType === 'TRIAL' ? 5 : 8}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={customerType === 'TRIAL' ? `🎯 Trial Mode (${trialDuration || 30} days)` : '💼 Regular Customer'}
                          color={customerType === 'TRIAL' ? 'warning' : 'success'}
                          variant="outlined"
                          size="small"
                        />
                        {customerType === 'TRIAL' && (
                          <Typography variant="caption" color="text.secondary">
                            License settings will auto-adjust for trial period
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  rules={{ required: 'Address is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address"
                      fullWidth
                      multiline
                      rows={1}
                      size="small"
                      error={!!errors.address}
                      helperText={errors.address?.message}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="city"
                  control={control}
                  rules={{
                    required: 'City is required',
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="City"
                      fullWidth
                      size="small"
                      error={!!errors.city}
                      helperText={errors.city?.message}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="state_name"
                  control={control}
                  rules={{
                    required: 'State is required',
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="State"
                      fullWidth
                      size="small"
                      error={!!errors.state_name}
                      helperText={errors.state_name?.message}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="country"
                  control={control}
                  rules={{ required: 'Country is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Country"
                      select
                      fullWidth
                      size="small"
                      error={!!errors.country}
                      helperText={errors.country?.message}
                      disabled={isViewMode || loadingCountries}
                    >
                      <MenuItem value="" disabled>
                        {loadingCountries ? 'Loading...' : 'Select Country'}
                      </MenuItem>
                      {countries.map((country) => (
                        <MenuItem key={country.country_code} value={country.country_name}>
                          {country.country_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="region"
                  control={control}
                  rules={{ required: 'Region is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Region"
                      fullWidth
                      size="small"
                      error={!!errors.region}
                      helperText={errors.region?.message}
                      disabled={isViewMode || !selectedCountry} // Disable if no country selected
                      InputProps={{
                        readOnly: true, // Make region read-only since it's auto-set
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="support_mail"
                  control={control}
                  rules={{
                    required: 'Support email is required',
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Support Email"
                      fullWidth
                      size="small"
                      error={!!errors.support_mail}
                      helperText={errors.support_mail?.message}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="contact_no"
                  control={control}
                  rules={{
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+?[1-9]\d{1,14}$/,
                      message: 'Invalid phone number',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone Number"
                      type="tel"
                      fullWidth
                      size="small"
                      inputProps={{ pattern: '\\+?[0-9]*' }}
                      error={!!errors.contact_no}
                      helperText={errors.contact_no?.message}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ mb: 2, boxShadow: 3, p: 2 }} className="br-top">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ my: 0 }}>License Details:</Typography>
              {customerType === 'TRIAL' && (
                <Chip 
                  label="🎯 Trial Mode - Auto-configured" 
                  color="warning" 
                  variant="outlined" 
                  size="small" 
                />
              )}
            </Box>
            {customerType === 'TRIAL' && (
              <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#fff3cd', borderRadius: 1, border: '1px solid #ffeaa7' }}>
                <Typography variant="body2" sx={{ color: '#856404', mb: 1 }}>
                  <strong>ℹ️ Trial License Configuration:</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#856404', fontSize: '0.875rem' }}>
                  • License settings are automatically configured for trial period<br/>
                  • Trial customers receive 5 DREAMPRO licenses by default<br/>
                  • All licenses expire after {trialDuration || 30} days<br/>
                  • You can still modify these settings if needed
                </Typography>
              </Box>
            )}
            {fields.map((field, index) => (
              <Grid container spacing={2} key={field.id} sx={{ mb: 2 }} alignItems="center">
                <Grid item xs={2.2}>
                  <Controller
                    name={`licenses[${index}].licence_type`}
                    control={control}
                    rules={{
                      required: 'License type is required',
                      validate: (value) => value !== '' || 'Please select a license type',
                    }}
                    render={({ field: controllerField }) => (
                      <TextField
                        {...controllerField}
                        select
                        label="License Type"
                        fullWidth
                        size="small"
                        error={!!errors.licenses?.[index]?.licence_type}
                        helperText={errors.licenses?.[index]?.licence_type?.message}
                        disabled={isViewMode}
                      >
                        <MenuItem value="" disabled>
                          Select Type
                        </MenuItem>
                        <MenuItem value="DREAMPRO">DREAM PRO</MenuItem>
                        <MenuItem value="DREAMLITE">DREAM LITE</MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Grid item xs={2.2}>
                    <Controller
                      name={`licenses[${index}].from_date`}
                      control={control}
                      rules={{
                        required: 'From date is required',
                        validate: (value) => {
                          const toDate = getValues(`licenses[${index}].to_date`);
                          if (toDate && dayjs(value).isAfter(dayjs(toDate))) {
                            return 'From date cannot be after To date';
                          }
                          return true;
                        },
                      }}
                      render={({ field: controllerField }) => (
                        <DatePicker
                          label="From Date"
                          value={controllerField.value}
                          onChange={(date) => controllerField.onChange(date)}
                          format="DD/MM/YYYY"
                          slotProps={{ textField: { size: 'small' } }}
                          disabled={isViewMode}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={2.2}>
                    <Controller
                      name={`licenses[${index}].to_date`}
                      control={control}
                      rules={{
                        required: 'To date is required',
                        validate: (value) => {
                          const fromDate = getValues(`licenses[${index}].from_date`);
                          if (fromDate && dayjs(value).isBefore(dayjs(fromDate))) {
                            return 'To date cannot be before From date';
                          }
                          return true;
                        },
                      }}
                      render={({ field: controllerField }) => (
                        <DatePicker
                          label="To Date"
                          value={controllerField.value}
                          onChange={(date) => controllerField.onChange(date)}
                          format="DD/MM/YYYY"
                          slotProps={{ textField: { size: 'small' } }}
                          disabled={isViewMode}
                        />
                      )}
                    />
                  </Grid>
                </LocalizationProvider>
                <Grid item xs={2.2}>
                  <Controller
                    name={`licenses[${index}].no_of_licences`}
                    control={control}
                    rules={{
                      required: 'Number of licenses is required',
                      min: { value: 1, message: 'At least one license is required' },
                    }}
                    render={({ field: controllerField }) => (
                      <TextField
                        {...controllerField}
                        label="Number of Licenses"
                        type="number"
                        fullWidth
                        size="small"
                        error={!!errors.licenses?.[index]?.no_of_licences}
                        helperText={errors.licenses?.[index]?.no_of_licences?.message}
                        disabled={isViewMode}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={2.2}>
                  <Controller
                    name={`licenses[${index}].grace_period`}
                    control={control}
                    rules={{
                      required: 'Grace period is required',
                      min: { value: 0, message: 'Grace period cannot be negative' },
                    }}
                    render={({ field: controllerField }) => (
                      <TextField
                        {...controllerField}
                        label="Grace Period (days)"
                        type="number"
                        fullWidth
                        size="small"
                        error={!!errors.licenses?.[index]?.grace_period}
                        helperText={errors.licenses?.[index]?.grace_period?.message}
                        disabled={isViewMode}
                      />
                    )}
                  />
                </Grid>
                {index > 0 && !isViewMode && (
                  <Grid item xs={1}>
                    <IconButton
                      color="error"
                      onClick={() => remove(index)}
                      aria-label="Remove license"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                )}
              </Grid>
            ))}

            {!isViewMode && (
              <Box className="flex justify-start">
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() =>
                    append({
                      org_code: orgCode || '', // Auto fill current org_code
                      licence_type: '',
                      from_date: dayjs(),
                      to_date: dayjs().add(1, 'year'),
                      no_of_licences: 1,
                      grace_period: 7,
                    })
                  }
                  sx={{ mb: 2 }}
                  disabled={isViewMode}
                >
                  Add License
                </Button>
              </Box>
            )}
          </Paper>

        {!isEditMode && (
          <Paper sx={{ mb: 2, boxShadow: 3, p: 2 }} className="br-top">
            <Typography variant="paragraph" sx={{ mt: 0 }}>
              Create Admin User:
            </Typography>
            <Grid container spacing={2} sx={{ mb: 0 }}>
              <Grid item xs={3}>
                <TextField
                  label="First Name"
                  size="small"
                  fullWidth
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  disabled={isViewMode}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Last Name"
                  size="small"
                  fullWidth
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  disabled={isViewMode}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Employee ID"
                  size="small"
                  fullWidth
                  value={newUser.emp_id}
                  onChange={(e) => setNewUser({ ...newUser, emp_id: e.target.value })}
                  disabled={isViewMode}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Email"
                  size="small"
                  fullWidth
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={isViewMode}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField label="Role" size="small" fullWidth value={newUser.role} disabled />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="License Type"
                  size="small"
                  fullWidth
                  value={newUser.licence_type}
                  disabled
                />
              </Grid>
            </Grid>
          </Paper>
          )}
          <Box className="flex justify-end">
            {isDialog ? (
              <>
                {!isViewMode && (
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      mt: 2,
                      backgroundColor: theme.palette.primary.main,
                      '&:hover': { backgroundColor: theme.palette.primary.dark },
                    }}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {isEditMode ? 'Update' : 'Create'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={onClose}
                  sx={{ mt: 2, ml: 1 }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                variant="contained"
                sx={{
                  mt: 2,
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': { backgroundColor: theme.palette.primary.dark },
                }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Create
              </Button>
            )}
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );

  return isDialog ? (
    <Dialog open fullWidth maxWidth="lg" key={`dialog-${mode}-${initialData?.org_code || 'new'}`}>
      <DialogTitle style={{ padding: '15px 25px' }}>
        {mode === 'edit' ? 'Edit Customer' : mode === 'view' ? 'View Customer' : 'Create Customer'}
      </DialogTitle>
      <DialogContent>{renderForm()}</DialogContent>
    </Dialog>
  ) : (
    renderForm()
  );
};

export default CustomerOnboardingDialog;
