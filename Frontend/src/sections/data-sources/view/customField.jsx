import React, { useState,useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  MenuItem,
  Typography,
} from '@mui/material';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import { z } from 'zod';
import Storage from 'src/utils/local-store';

const fieldTypes = [
  { id: "bigint", name: "Integer" },
  { id: "double_precision", name: "Floating Point" },
  { id: "char", name: "Character" },
  { id: "varchar", name: "String" },
  { id: "timestamp_without_time_zone", name: "Date" }
];

const validationSchema = z.object({
  field_name: z.string().min(1, 'Field name is required')
  .regex(/^[a-zA-Z0-9_]+$/, 'Only alphabets and numbers are allowed (No spaces or special characters)'),
  data_type: z.string().min(1, 'Field type is required'),
});

function CustomFieldDialog({ open, onClose, onSubmitCustom }) {
  const [alert, setAlert] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [typeDropDown,setTypeDropDown]=useState([]);
  const userData = Storage.getJson("userData");

    useEffect(() => {
          getTypeDropDow();
      }, [])

      const getTypeDropDow= async ()=>{
        try {
          const payload={
            "name":"data_types"
          }
          const result = await postService(endpoints.external_api.dropDownApi, "POST", payload);
          if (result.status) {
            console.log('tttt',result);
            setTypeDropDown(result.data);
          } else {
            setAlert({ severity: 'error', message: 'Field name already exists.' });
           
          }
        } catch (error) {
          setAlert({ severity: 'error', message: error.response?.data?.message || "An error occurred." });
        }
      }

  const onSubmitForm = async () => {
    const payload = { field_name:name, data_type:type, org_code: userData.organization,
      user_id: userData.user_id };
    const validation = validationSchema.safeParse(payload);

    if (!validation.success) {
      setAlert({ severity: 'error', message: validation.error.issues[0].message });
      return;
    }

    try {
      const result = await postService(endpoints.external_api.addNewField, "POST", payload);
      if (result.status) {
        setAlert({ severity: 'success', message: 'Field added successfully!' });
        onClose(); // Close the dialog on success
        setName('');
        setType('')
        onSubmitCustom();
      } else {
        setAlert({ severity: 'error', message: 'Field name already exists.' });
        setName('');
        setType('');
        onSubmitCustom();
      }
    } catch (error) {
      setAlert({ severity: 'error', message: error.response?.data?.message || "An error occurred." });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Custom Field</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Field Name"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter the field name"
        />

        <TextField
          margin="dense"
          label="Field Type"
          select
          fullWidth
          variant="outlined"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {typeDropDown.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>

        {alert && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {alert.message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="button" variant="contained" onClick={onSubmitForm}>
          Add Field
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CustomFieldDialog;
