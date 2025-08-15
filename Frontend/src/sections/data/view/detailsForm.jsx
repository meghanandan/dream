import React, { useEffect, useState, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Typography,
  Box,
  Snackbar,
  Alert,
  InputLabel,
} from '@mui/material';
import { Table, DatePicker } from 'antd';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';

const DetailsForm = ({ open, onClose, workFlowId, templateId, orderId, templateType }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [disputeTemplates, setDisputeTemplates] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [dataAPI, setDataAPI] = useState([]);
  const [alert, setAlert] = useState(null);
  const userData = Storage.getJson('userData');
  const [submitted, setSubmitted] = useState(false);
  
  // **NEW: Store the complete raiseDispute response for metadata**
  const [originalDisputeData, setOriginalDisputeData] = useState(null);

  // Dropdown values
  const [disputeType, setDisputeType] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [severity, setSeverity] = useState('');

  // **NEW: State for dropdown options**
  const [dropdownOptions, setDropdownOptions] = useState({
    disputeType: [],
    disputeReason: [],
    priority: [],
    severity: [],
  });

  // Fetch dropdown options on dialog open
  useEffect(() => {
    if (open) {
      getDropdownOptions();
    }
  }, [open]);

  // **NEW: Fetch dropdown options**
  const getDropdownOptions = async () => {
  try {
    const res = await postService(endpoints.auth.getQuickCodeListForDisputes, 'GET');
    console.log('Dropdown API response:', res); // <--- now this works
    if (res) {
      setDropdownOptions({
        disputeType: res.disputeType || [],
        disputeReason: res.disputeReason || [],
        priority: res.priority || [],
        severity: res.severity || [],
      });
    }
  } catch (err) {
    setDropdownOptions({
      disputeType: [],
      disputeReason: [],
      priority: [],
      severity: [],
    });
    setAlert({ severity: 'error', message: 'Failed to load dropdown options.' });
  }
};


  // Fetch dispute templates when orderId or templateId changes
  useEffect(() => {
    if (orderId && templateId) {
      getDisputeTemplates();
    }
  }, [orderId, templateId]);

  const getDisputeTemplates = async () => {
    try {
      const payload = {
        order_id: orderId,
        template_id: templateId,
        org_code: userData.organization,
        user_id: userData.user_id,
        type: '0',
      };

      const res = await postService(endpoints.auth.raiseDispute, 'POST', payload);

      if (res?.data?.fields) {
        // **NEW: Store the complete response for metadata extraction**
        setOriginalDisputeData(res.data);
        
        const data = res.data.fields.map((item) => ({
          ...item,
          is_negative: false,
          value:
            item.required && (item.value === null || item.value === '')
              ? 'UNKNOWN'
              : item.value || '',
        }));

        const fieldMap = data.reduce((acc, field) => {
          const key = field.name;
          if (!acc.has(key) && !field.viewonly) {
            acc.set(key, {
              id: field.id,
              name: field.name,
              label: field.label,
              viewonly: field.viewonly,
              element: field.element,
              oldValue: field.value || '',
              newValue: field.value || '',
              required: field.required,
              disable: field.disable,
            });
          } else if (acc.has(key) && !field.viewonly) {
            const existing = acc.get(key);
            if (field.disable) {
              existing.oldValue = field.value || '';
            } else {
              existing.newValue = field.value || '';
            }
          }
          return acc;
        }, new Map());

        const processedData = [...fieldMap.values()];

        setDisputeTemplates(data);
        setTableData(processedData);
        setDataAPI(data);
      } else {
        setDisputeTemplates([]);
        setTableData([]);
        setDataAPI([]);
        setAlert({ severity: 'warning', message: 'No dispute templates found.' });
      }
    } catch (error) {
      console.error('Error fetching dispute templates:', error);
      setAlert({ severity: 'error', message: 'Failed to fetch dispute templates.' });
    }
  };

  // Handle field value changes for Amount only
  const handleChange = (fieldName, value) => {
    const updatedTemplates = disputeTemplates.map((field) => {
      if (field.name === fieldName && field.label === 'Amount' && !field.disable) {
        return { ...field, value, is_negative: false };
      }
      return field;
    });

    const updatedTableData = tableData.map((item) => {
      if (item.name === fieldName && item.label === 'Amount') {
        return { ...item, newValue: value };
      }
      return item;
    });

    setDisputeTemplates(updatedTemplates);
    setTableData(updatedTableData);
  };

  // Compare and flag changed fields
  const compareAndAddNegativeFlag = (apiData) =>
    apiData
      .filter((apiObj) => {
        const changedObj = disputeTemplates.find(
          (changeObj) => changeObj.id === apiObj.id && apiObj.field_id === undefined
        );
        return changedObj && apiObj.value !== changedObj.value;
      })
      .map((apiObj) => {
        const changedObj = disputeTemplates.find(
          (changeObj) => changeObj.id === apiObj.id && apiObj.field_id === undefined
        );
        return {
          ...apiObj,
          is_negative: apiObj.value < changedObj.value,
          visible: false,
        };
      });

  // Handle form submission
  const handleSubmit = async () => {
    setSubmitted(true);
    try {
      if (!disputeType || !description || !priority || !severity) {
        setAlert({
          severity: 'error',
          message: 'Please select all dispute dropdowns before submitting.',
        });
        return;
      }
      // Validate Amount field if required
      const amountField = disputeTemplates.find(
        (field) => field.label === 'Amount' && field.required
      );
      if (amountField && (amountField.value === null || amountField.value === '')) {
        setAlert({
          severity: 'error',
          message: 'Please fill in the required Amount field.',
        });
        return;
      }

      // Prepare data for submission
      const updatedData = compareAndAddNegativeFlag(dataAPI);
      const submitData = [...disputeTemplates, ...updatedData];
      const getAmount = amountField.value;
      
      // **NEW: Extract missing fields from originalDisputeData**
      const extractLicenceType = () => {
        // Try userData first, then originalDisputeData, then fields array
        if (userData.licence_type) return userData.licence_type;
        if (originalDisputeData?.licence_type) return originalDisputeData.licence_type;
        
        const licenceField = submitData.find(f => f.name === 'licence_type' || f.name === 'license_type');
        return licenceField?.value || null;
      };
      
      const extractSourceData = () => {
        // Check if originalDisputeData has source data
        if (originalDisputeData?.dream_lite_source_data) return originalDisputeData.dream_lite_source_data;
        if (originalDisputeData?.source_data) return originalDisputeData.source_data;
        
        // Check if it's in fields array
        const sourceField = submitData.find(f => f.name === 'dream_lite_source_data' || f.name === 'source_data');
        return sourceField?.value || originalDisputeData || null;
      };
      
      const extractModifiedData = () => {
        // The modified data should be the current form state
        if (originalDisputeData?.dream_lite_modified_data) return originalDisputeData.dream_lite_modified_data;
        
        // Use the current submitData as modified data
        return submitData.length > 0 ? submitData : null;
      };
      
      const payload = {
        org_code: userData.organization,
        work_flow_id: workFlowId,
        template_id: templateId,
        template_type: 1,
        created_by: userData.user_id,
        fields: submitData,
        dispute_type: disputeType,
        description, 
        priority,
        severity,
        getAmount,
        // **UPDATED: Use extracted fields instead of hardcoded null values**
        licence_type: extractLicenceType(),
        dream_lite_source_data: extractSourceData(),
        dream_lite_modified_data: extractModifiedData(),
      };

      // **DEBUG: Log the extracted values**
      console.log('🔍 Extracted dispute data:', {
        licence_type: extractLicenceType(),
        dream_lite_source_data: extractSourceData() ? 'Present' : 'Null',
        dream_lite_modified_data: extractModifiedData() ? 'Present' : 'Null',
        originalDisputeData: originalDisputeData ? 'Available' : 'Not Available'
      });

      const res = await postService(endpoints.auth.createDispute, 'POST', payload);

      if (res.status) {
        setAlert({ severity: 'success', message: 'Dispute created successfully.' });
        navigate('/disputes');
        setDisputeTemplates([]);
        setTableData([]);
        setDataAPI([]);
        onClose();
      } else {
        setAlert({
          severity: 'error',
          message: res.message || 'Failed to create dispute.',
        });
      }
    } catch (error) {
      console.error('Error creating dispute:', error);
      setAlert({ severity: 'error', message: 'An unexpected error occurred.' });
    }
  };

  // Table columns
  const columns = useMemo(
    () => [
      {
        title: 'Existing Value',
        dataIndex: 'oldValue',
        key: 'oldValue',
        render: (_, record) => {
          if (
            (record.element === 'input' ||
              record.element === 'text' ||
              record.element === 'number') &&
            !record.viewonly
          ) {
            return (
              <TextField
                fullWidth
                size="small"
                label={record.label}
                value={record.oldValue}
                disabled
              />
            );
          }
          if (record.element === 'select' && !record.viewonly) {
            return (
              <FormControl fullWidth>
                <Select size="small" value={record.oldValue} disabled>
                  {record.options?.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          if (record.element === 'date' && !record.viewonly) {
            return <DatePicker size="small" value={dayjs(record.oldValue)} disabled />;
          }
          return record.oldValue || '-';
        },
      },
      {
        title: 'New Value',
        dataIndex: 'newValue',
        key: 'newValue',
        render: (_, record) => {
          const isAmount = record.label === 'Amount';
          if (
            (record.element === 'input' ||
              record.element === 'text' ||
              record.element === 'number') &&
            !record.viewonly
          ) {
            return (
              <TextField
                fullWidth
                size="small"
                label={record.label}
                value={record.newValue}
                onChange={(e) => handleChange(record.name, e.target.value)}
                disabled={!isAmount || record.disable}
              />
            );
          }
          if (record.element === 'select' && !record.viewonly) {
            return (
              <FormControl fullWidth>
                <Select
                  size="small"
                  value={record.newValue}
                  onChange={(e) => handleChange(record.name, e.target.value)}
                  disabled={!isAmount}
                >
                  {record.options?.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          if (record.element === 'date' && !record.viewonly) {
            return (
              <DatePicker
                size="small"
                value={dayjs(record.newValue)}
                onChange={(newDate) => handleChange(record.name, newDate?.format('YYYY-MM-DD'))}
                disabled={!isAmount}
              />
            );
          }
          return record.newValue || '-';
        },
      },
    ],
    [handleChange]
  );

  // Prepare table data with serial numbers
  const filteredData = tableData.filter((item) => !item.viewonly);
  const dataSno = filteredData.map((item, index) => ({
    ...item,
    s_no: index + 1,
  }));

  return (
    <Dialog open={open} fullWidth maxWidth="md">
      <DialogTitle>Sales Commission Dispute Form</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 0 }}>
          Please review the pre-filled information and edit the Amount field as needed.
        </Typography>
        <Box component="form" sx={{ mx: 'auto', mt: 1 }}>
          <Table
            columns={columns}
            dataSource={dataSno}
            rowKey="id"
            pagination={false}
            rowClassName={(record, index) =>
              index % 2 === 0 ? 'table-row-white' : 'table-row-gray'
            }
            className="custom-table"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* LEFT: Dropdowns */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box>
              <InputLabel shrink sx={{ mb: 0 }}>
                Dispute Type
              </InputLabel>
              <FormControl size="small" sx={{ minWidth: 140 }} error={submitted && !disputeType}>
                <Select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    -- Select --
                  </MenuItem>
                  {dropdownOptions.disputeType.map((option) => (
                    <MenuItem key={option.quick_code_type} value={option.quick_code_type}>
                      {option.quick_code_desc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <InputLabel shrink sx={{ mb: 0 }}>
                Dispute Reason
              </InputLabel>
              <FormControl size="small" sx={{ minWidth: 170 }} error={submitted && !description}>
                <Select
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    -- Select --
                  </MenuItem>
                  {dropdownOptions.disputeReason.map((option) => (
                    <MenuItem key={option.quick_code_type} value={option.quick_code_type}>
                      {option.quick_code_desc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <InputLabel shrink sx={{ mb: 0 }}>
                Priority
              </InputLabel>
              <FormControl size="small" sx={{ minWidth: 120 }} error={submitted && !priority}>
                <Select value={priority} onChange={(e) => setPriority(e.target.value)} displayEmpty>
                  <MenuItem value="" disabled>
                    -- Select --
                  </MenuItem>
                  {dropdownOptions.priority.map((option) => (
                    <MenuItem key={option.quick_code_type} value={option.quick_code_type}>
                      {option.quick_code_desc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <InputLabel shrink sx={{ mb: 0 }}>
                Severity
              </InputLabel>
              <FormControl size="small" sx={{ minWidth: 120 }} error={submitted && !severity}>
                <Select value={severity} onChange={(e) => setSeverity(e.target.value)} displayEmpty>
                  <MenuItem value="" disabled>
                    -- Select --
                  </MenuItem>
                  {dropdownOptions.severity.map((option) => (
                    <MenuItem key={option.quick_code_type} value={option.quick_code_type}>
                      {option.quick_code_desc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* RIGHT: Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{
                backgroundColor: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.dark },
              }}
            >
              Create
            </Button>
            <Button onClick={onClose} variant="outlined" >
              Cancel
            </Button>
          </Box>
        </Box>
      </DialogActions>

      <Snackbar open={!!alert} autoHideDuration={6000} onClose={() => setAlert(null)}>
        <Alert severity={alert?.severity} onClose={() => setAlert(null)}>
          {alert?.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default DetailsForm;
