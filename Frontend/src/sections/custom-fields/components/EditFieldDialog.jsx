import React, { useEffect,useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  CircularProgress,
  MenuItem,
  Box,FormLabel
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { updateCustomField } from 'src/store/settingCustomFieldSlice';
import { useDispatch } from 'react-redux';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import { Flex, Radio } from 'antd';
import Storage from 'src/utils/local-store';

// List of available field types
const fieldTypes = ['Text', 'Number', 'Date', 'Select', 'Textarea','Boolean'];
 

const optionsRadio = [
  {
    label: 'Yes or No',
    value: '1',
  },
  {
    label: 'True or False',
    value: '2',
  },
  {
    label: 'On or Off',
    value: '3',
  },
];

const dataTypeMapping = {
  Select: "varchar",
  Number: "double_precision",
  Text: "varchar",
  Date: "timestamp_without_time_zone",
  Textarea: "text",
  Boolean: "boolean",
};

const booleanOptionsMapping = {
  "1": ["Yes", "No"],
  "2": ["True", "False"],
  "3": ["On", "Off"],
};

// Validation schema using Yup
const validationSchema = Yup.object({
  fieldName: Yup.string().required('Field name is required'),
  label: Yup.string().required('Label is required'),
  fieldType: Yup.string().required('Field type is required'),
  placeholder: Yup.string().required('Placeholder is required'),
});

const EditFieldDialog = ({ open, onClose, data = {}, onSave }) => {
  const dispatch = useDispatch();
   const [alert, setAlert] = useState(null);
  const userData = Storage.getJson("userData");

  const formik = useFormik({
  enableReinitialize: true, // Reinitialize form values when `data` changes
  initialValues: {
    fieldName: data.field_name || '',
    fieldType: data.field_element || '',
    placeholder: data.field_placeholder || '',
    description: data.field_description || '',
    options: data.field_option || '',
    optionRadios: '', // Ensure it's defined
    id: data.id
  },
  validationSchema,
  onSubmit: async (values, { setSubmitting, setErrors, resetForm }) => {
    try {
      const { fieldName, description, fieldType, placeholder, options, optionRadios, id } = values;
      const fieldData = {
        field_name: fieldName,
        description,
        element: fieldType === "Boolean" ? "Radio" : fieldType,
        data_type: dataTypeMapping?.[fieldType] ?? "boolean",
        placeholder,
        options:
          fieldType === "Select" && options
            ? options.split(",").map((opt) => opt.trim())
            : fieldType === "Boolean" && optionRadios
            ? booleanOptionsMapping[optionRadios] || null
            : null,
        is_required: true,
        org_code: userData.organization,
        user_id: userData.user_id,
        id
      };

      console.log('test', fieldData);
      const result = await postService(endpoints.external_api.updateNewFields, "POST", fieldData);
      if (result.status) {
        setAlert({ severity: 'success', message: result.message });
      } else {
        setAlert({ severity: 'error', message: result.message });
      }

      resetForm(); // Reset form on success
      onClose(); // Close dialog
    } catch (error) {
      console.error("Error while adding cluster:", error?.response?.data?.message || error);
      setErrors({ api: 'Failed to update field. Please try again.' });
    } finally {
      setSubmitting(false); // Reset submitting state
    }
  },
});


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={formik.handleSubmit} noValidate>
        <DialogTitle>Edit Field</DialogTitle>
        <DialogContent>
          {/* Field Name Input */}
          <TextField
            margin="dense"
            label="Field Name"
            name="fieldName"
            fullWidth
            value={formik.values.fieldName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.fieldName && Boolean(formik.errors.fieldName)}
            helperText={formik.touched.fieldName && formik.errors.fieldName}
            placeholder="Enter the field name"
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
                      onBlur={formik.handleBlur}
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                      placeholder="Enter the Description"
                    />

          {/* Field Label Input */}

          {/* Field Type Dropdown */}
          <TextField
            margin="dense"
            label="Field Type"
            name="fieldType"
            select
            fullWidth
            value={formik.values.fieldType}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.fieldType && Boolean(formik.errors.fieldType)}
            helperText={formik.touched.fieldType && formik.errors.fieldType}
          >
            {fieldTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
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
              onBlur={formik.handleBlur}
              error={formik.touched.options && Boolean(formik.errors.options)}
              helperText={formik.touched.options && formik.errors.options}
              placeholder="Enter options separated by commas"
            />
          )}
          {formik.values.fieldType === 'Boolean' && (<>
            <FormLabel component="legend">Valid Value Pair Display</FormLabel>
            <Radio.Group sx={{mt:2,color: "#FDA92D"}} block options={optionsRadio} 
           margin="dense"
          label="Valid Value Pair Display"
           name="optionRadios"
           fullWidth
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.optionRadios}
          error={formik.touched.optionRadios && Boolean(formik.errors.optionRadios)}
          helperText={formik.touched.optionRadios && formik.errors.optionRadios}
          defaultValue="1" />
          </>
         
          )}

          {/* Placeholder Input */}
          <TextField
            margin="dense"
            label="Placeholder"
            name="placeholder"
            fullWidth
            value={formik.values.placeholder}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.placeholder && Boolean(formik.errors.placeholder)}
            helperText={formik.touched.placeholder && formik.errors.placeholder}
            placeholder="Enter the placeholder text"
          />

          {/* API Error Display */}
          {formik.errors.api && (
            <Box sx={{ color: 'red', mt: 2 }}>{formik.errors.api}</Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditFieldDialog;
