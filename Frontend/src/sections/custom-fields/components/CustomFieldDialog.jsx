import React, { useState } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, MenuItem, CircularProgress, Typography,
  FormLabel, Snackbar, Alert, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';

const categories   = [ 'Disputes', 'Orders', 'Payments', 'Quota'];
const fieldTypes = ['Text', 'Number', 'Date', 'Select', 'Textarea', 'Boolean'];

const optionsRadio = [
  { label: 'Yes or No', value: '1' },
  { label: 'True or False', value: '2' },
  { label: 'On or Off', value: '3' }
];

const dataTypeMapping = {
  Select: "character_varying",
  Number: "double_precision",
  Text: "character_varying",
  Date: "timestamp_without_time_zone",
  Textarea: "text",
  Boolean: "boolean"
};

const booleanOptionsMapping = {
  "1": ["Yes", "No"],
  "2": ["True", "False"],
  "3": ["On", "Off"]
};

function CustomFieldDialog({ open, onClose, data, onSubmitCustom, slug }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const userData = Storage.getJson("userData");
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const formik = useFormik({
    initialValues: {
      field_type:  data?.field_type   || '',
      fieldName: data?.field_name || '',
      description: data?.field_description || '',
      fieldType: data?.field_element || '',
      placeholder: data?.field_placeholder || '',
      options: data?.field_option?.join(', ') || '',
      optionRadios: data?.optionRadios || '1',
    },
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, resetForm, setErrors }) => {
      const { field_type, fieldName, fieldType, placeholder, description, options, optionRadios } = values;

      if (!field_type || field_type === 'Select') {
        setErrors({ field_type: 'Please choose a field type' });
        return;
      }

      if (!fieldName) {
        setErrors({ fieldName: 'Field name is required' });
        return;
      }
      if (!fieldType) {
        setErrors({ fieldType: 'Field type is required' });
        return;
      }
      
      if (fieldType === 'Select' && !options) {
        setErrors({ options: 'Options are required for Select field' });
        return;
      }
      
      if (fieldType === 'Boolean' && !optionRadios) {
        setErrors({ optionRadios: 'Please select a boolean display option' });
        return;
      }
      
      const fieldData = {
        field_type,
        field_name: fieldName,
        description,
        element: fieldType === "Boolean" ? "Radio" : fieldType,
        data_type: dataTypeMapping[fieldType] || "boolean",
        placeholder,
        options: fieldType === "Select"
          ? options.split(",").map(opt => opt.trim())
          : fieldType === "Boolean"
            ? booleanOptionsMapping[optionRadios] || null
            : null,
        is_required: true,
        org_code: userData.organization,
        user_id: userData.user_id
      };

      try {
        let result;
        if (data?.id) {
          fieldData.id = data.id;
          result = await postService(endpoints.external_api.updateNewFields, "POST", fieldData);
        } else {
          result = await postService(endpoints.external_api.addNewField, "POST", fieldData);
        }

        if (result.status) {
          setSnackbar({ open: true, message: result.message || 'Operation successful', severity: 'success' });
          if (!data?.id && slug === 'data-source') onSubmitCustom();
          resetForm();
          onClose();
        } else {
          setSnackbar({ open: true, message: result.message || 'Operation failed', severity: 'error' });
        }
      } catch (error) {
        setSnackbar({ open: true, message: error.message || 'Something went wrong', severity: 'error' });
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>{data?.id ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>
          <DialogContent>
            <TextField
                margin="dense"
                label="Destination"
                name="field_type"
                select
                fullWidth
                variant="outlined"
                value={formik.values.field_type}
                onChange={formik.handleChange}
                error={!!formik.errors.field_type}
                helperText={formik.errors.field_type}
              >
                {categories.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
            </TextField>

            <TextField
              margin="dense"
              label="Field Name"
              name="fieldName"
              fullWidth
              variant="outlined"
              value={formik.values.fieldName}
              onChange={formik.handleChange}
              error={!!formik.errors.fieldName}
              helperText={formik.errors.fieldName}
            />
            <TextField
              margin="dense"
              label="Description"
              name="description"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={formik.values.description}
              onChange={formik.handleChange}
            />
            <TextField
              margin="dense"
              label="Field Type"
              name="fieldType"
              select
              fullWidth
              disabled={!!data?.id}
              variant="outlined"
              value={formik.values.fieldType}
              onChange={formik.handleChange}
              error={!!formik.errors.fieldType}
              helperText={formik.errors.fieldType}
            >
              {fieldTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
            {formik.values.fieldType === 'Select' && (
              <TextField
                margin="dense"
                label="Options (comma separated)"
                name="options"
                fullWidth
                variant="outlined"
                value={formik.values.options}
                onChange={formik.handleChange}
                error={!!formik.errors.options}
                helperText={formik.errors.options}
              />
            )}
            {formik.values.fieldType === 'Boolean' && (
              <>
                <FormLabel component="legend" sx={{ mt: 2 }}>Valid Value Pair Display</FormLabel>
                <RadioGroup
                  name="optionRadios"
                  value={formik.values.optionRadios}
                  onChange={formik.handleChange}
                  row
                >
                  {optionsRadio.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      label={option.label}
                      disabled={!!data?.id}
                    />
                  ))}
                </RadioGroup>
                {formik.errors.optionRadios && (
                  <Typography color="error" variant="caption">{formik.errors.optionRadios}</Typography>
                )}
              </>
            )}
            <TextField
              margin="dense"
              label="Placeholder"
              name="placeholder"
              fullWidth
              variant="outlined"
              value={formik.values.placeholder}
              onChange={formik.handleChange}
            />
          </DialogContent>
          <DialogActions>
            <Button
              type="submit"
              variant="contained"
              sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? <CircularProgress size={24} /> : data?.id ? 'Update Field' : 'Add Field'}
            </Button>
            <Button onClick={onClose} disabled={formik.isSubmitting}>Cancel</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default CustomFieldDialog;
