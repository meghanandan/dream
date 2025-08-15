import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Button, Typography, CircularProgress, useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

// Memoized fields
const MemoTextField = React.memo((props) => <TextField {...props} />);
const MemoSelectField = React.memo(({ label, name, value, onChange, options, getOptionLabel }) => (
  <FormControl fullWidth size="small" margin="dense">
    <InputLabel>{label}</InputLabel>
    <Select name={name} label={label} value={value || ''} onChange={onChange}>
      <MenuItem value="">Select...</MenuItem>
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {getOptionLabel(opt)}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
));

// Helper to get type for rendering
function getInputType(dataType, column) {
  if (column === 'emp_id' || column === 'role_id') return 'select';
  if (dataType && dataType.toLowerCase().includes('date')) return 'date';
  if (dataType && (
    dataType.toLowerCase().includes('int') ||
    dataType === 'numeric' ||
    dataType.toLowerCase().includes('float')
  )) return 'number';
  return 'text';
}
const hiddenFields = ['work_flow_id', 'updated_by'];
export function QuotaDialog({
  open,
  mode,
  systemFields = [],
  customFields = [],
  data,
  onChange,
  onSave,
  onClose,
  saveLoading,
  userList = [],
  roleList = [],
  editComment,
  onEditCommentChange
}) {
  const theme = useTheme();
const safeData = data || {};

  // Renders each field by data_type and column name
  const renderInput = (field) => {
    // Field can be a string (legacy) or {column, data_type} (current)
    const column = typeof field === 'string' ? field : field.column;
    const val    = safeData[column] ?? '';
    const data_type = typeof field === 'string' ? undefined : field.data_type;
    const label = column.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const type = getInputType(data_type, column);
    if (column === 'emp_id') {
      return (
        <MemoSelectField
          key="emp_id"
          label="Employee"
          name="emp_id"
          value={safeData.emp_id}
          onChange={e => {
            const empId = e.target.value;
            onChange('emp_id', empId);
            // Auto-set role on employee select
            const emp = userList.find(u => u.emp_id === empId);
            if (emp && emp.role) {
              onChange('role_id', emp.role);
            }
          }}
          options={userList.map(u => ({
            value: u.emp_id,
            // label: `${u.emp_id} - ${u.first_name} ${u.last_name}`,
            label: `${u.emp_id} - ${u.emp_name}`,
          }))}
          getOptionLabel={opt => opt.label}
        />
      );
    }
    if (column === 'role_id') {
      return (
        <MemoSelectField
          key="role_id"
          label="Role"
          name="role_id"
          value={safeData.role_id}
          onChange={e => onChange('role_id', e.target.value)}
          options={roleList.map(r => ({
            value: r.role_id,
            label: r.role_name,
          }))}
          getOptionLabel={opt => opt.label}
        />
      );
    }
      if (column === 'effective_from_date' || column === 'effective_to_date') {
    return (
      <DatePicker
        key={column}
        label={label}
        value={safeData[column] ? dayjs(safeData[column], ['MM/DD/YYYY', 'YYYY-MM-DD']) : null}
        onChange={newDate  => {
          const formatted = newDate  ? newDate .format('MM/DD/YYYY') : '';
          onChange(column, formatted);
        }}
        slotProps={{ textField: { fullWidth: true, size: 'small', margin: 'dense' } }}
        format="MM/DD/YYYY"
      />
    );
  }
  
    if (type === 'date') {
      return (
        <DatePicker
          key={column}
          label={label}
          value={safeData[column] ? dayjs(safeData[column], ['MM/DD/YYYY', 'YYYY-MM-DD']) : null}
          onChange={newDate  => {
            // Always format as MM/DD/YYYY, or pass empty string if cleared
            const formatted = newDate  ? newDate .format('MM/DD/YYYY') : '';
            onChange(column, formatted);
          }}
          slotProps={{ textField: { fullWidth: true, size: 'small', margin: 'dense' } }}
          format="MM/DD/YYYY"
        />
      );
    }
    if (type === 'number') {
      return (
        <MemoTextField
          key={column}
          label={label}
          name={column}
          value={val}
          onChange={e => onChange(column, e.target.value)}
          type="number"
          size="small"
          margin="dense"
          fullWidth
        />
      );
    }
    // Default: text field
    return (
      <MemoTextField
        key={column}
        label={label}
        name={column}
        value={val}
        onChange={e => onChange(column, e.target.value)}
        size="small"
        margin="dense"
        fullWidth
      />
    );
  };

//   console.log('---Role dropdown debug---');
// console.log('Current role_id:', safeData.role_id, '| Current role:', safeData.role);
// console.log('RoleList:', roleList);
// console.log('RoleList ids:', roleList.map(r => r.role_id));


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'add' ? 'Add New Quota Row' : 'Edit Quota Row'}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
          System Fields
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          {systemFields.filter(
              field => !hiddenFields.includes(typeof field === 'string' ? field : field.column)
          ).map(renderInput)}
        </Box>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
          Custom Fields
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          {customFields.map(renderInput)}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        {/* LEFT: Comment Box (Edit mode only) */}
        {mode === 'edit' && (
          <Box sx={{ flex: 1, mr: 2 }}>
            <TextField
              label="Comment"
              value={editComment}
              onChange={(e) => onEditCommentChange(e.target.value)}
              multiline
              minRows={1}
              maxRows={4}
              size="small"
              fullWidth
            />
          </Box>
        )}
        {/* RIGHT: Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              // If you want to push comment to parent, do:
              onSave();
            }}
            disabled={saveLoading}
            sx={{
              backgroundColor: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.primary.dark },
            }}
          >
            {saveLoading ? <CircularProgress size={24} color="inherit" /> : 'Save'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
