// src/sections/quotas/QuotasCRUDGrid.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Breadcrumbs, Typography, Stack, Link, Snackbar, Alert } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import Storage from 'src/utils/local-store';
import postService from 'src/utils/httpService';
import postUploadService from 'src/utils/postUploadService';
import { endpoints } from 'src/utils/axios';

import { CsvToolbar } from './CsvToolbar';
import { QuotasTable } from './QuotasTable';
import { QuotaDialog } from './QuotaDialog';
import { z } from 'zod';

function toTitleCase(str) {
  return str
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

// 1. Update your parseApiErrorResponse function
function parseApiErrorResponse(data) {
  const message = data?.message || 'Save failed';
  const details = [];

  if (Array.isArray(data?.typeErrors)) {
    data.typeErrors.forEach(item => {
      details.push(`Row ${item.row}: Field "${item.field}" has invalid value "${item.value}" (expected: ${item.expected})`);
    });
  }
  if (Array.isArray(data?.empIdNotFound)) {
    data.empIdNotFound.forEach(item => {
      if (!item.emp_id) {
        details.push(`Row ${item.row}: emp_id is missing`);
      } else {
        details.push(`Row ${item.row}: emp_id "${item.emp_id}" not found`);
      }
    });
  }
  if (Array.isArray(data?.alreadyExist)) {
    const existMsgs = data.alreadyExist.map(item => {
      const period = item.quota_period || item.quota_name || item.department || 'undefined';
      return `Row ${item.row}: emp_id "${item.emp_id}" with quota_period "${period}" already exists`;
    });
    Array.from(new Set(existMsgs)).forEach(msg => details.push(msg));
  }

  return [message, ...details];
}



export function QuotasCRUDGrid() {
  const userData = Storage.getJson('userData');
  const orgCode = userData.organization;
  const userId = userData.user_id;
  const userName = userData.name;
  const [userOptions, setUserOptions] = useState([]);
  const [workflowOptions, setWorkflowOptions] = useState([]);

  // ─── Data lists ─────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [formCols, setFormCols] = useState([]);

  // ─── Dialog & Snackbar ───────────────────────────────────────────────────────
  const [openDlg, setOpenDlg] = useState(false);
  const [dlgMode, setDlgMode] = useState('add');
  const [current, setCurrent] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [saveLoading, setSaveLoading] = useState(false);
  // ─── Upload state ────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ─── Pending-tab filters & selection ────────────────────────────────────────
  const [tabIndex, setTabIndex] = useState(0);
  const [selectionModel, setSelectionModel] = useState([]);
  const [runLoading, setRunLoading] = useState(false);
  const [selUser, setSelUser] = useState('');
  const [selStatus, setSelStatus] = useState('');
  const [selWorkflow, setSelWorkflow] = useState('');
  const statusOptions = ['Approve', 'Review', 'Reject'];

  const [systemFields, setSystemFields] = useState([]);
  const [customFields, setCustomFields] = useState([]);

  const [quotaPermissions, setQuotaPermissions] = useState({});

  const [userList, setUserList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [verifiedRows, setVerifiedRows] = useState([]);

useEffect(() => {
  if (openDlg) {
    postService(endpoints.auth.getUserUpwardReportingTree, 'POST', {
      org_code: orgCode,
      empId: userId
    }).then((res) => {
      let users = res.data || [];

      // 👇 Exclude self only if adding
      if (dlgMode === 'add') {
        users = users.filter(u => u.emp_id !== userId);
      }

      setUserList(users);

      // Unique roles as before
      const uniqueRoles = Array.from(
        new Map(users.map((u) => [u.role, { role_id: u.role, role_name: u.role_name }])).values()
      );
      setRoleList(uniqueRoles);
    });
  }
}, [openDlg, dlgMode, orgCode, userId]);


  // Load permissions
  useEffect(() => {
    async function loadPermissions() {
      try {
        // Adjust endpoint as needed
        const res = await postService('/api/auth/getRolePermissions', 'POST', {
          org_code: orgCode,
          user_id: userId,
          role_id: userData.role,
        });
        // Find the quotas page (slug might be "quotas")
        const quotasPerm = (res.data || []).find((p) => p.slug === 'quotas')?.permissions || {};
        setQuotaPermissions(quotasPerm);
      } catch (err) {
        setQuotaPermissions({});
      }
    }
    loadPermissions();
  }, [orgCode, userId, userData.role]);

  useEffect(() => {
    async function loadManagers() {
      try {
        const res = await postService(endpoints.auth.getManagersList, 'POST', {
          org_code: orgCode,
          search_key: '',
          page_number: 1,
          page_size: 50,
        });
        if (res.status && Array.isArray(res.data)) {
          const opts = res.data.map((u) => ({
            id: u.emp_id,
            name: u.emp_name.trim(),
          }));
          setUserOptions(opts);

          // ← only select if you're actually in that list:
          if (opts.some((o) => o.id === userId)) {
            setSelUser(userId);
          }
        }
      } catch (err) {
        console.error('failed to load managers', err);
      }
    }
    loadManagers();
  }, [orgCode, userId]);

  // ─── Initial fetch of both lists + form-cols ────────────────────────────────
  const fetchLists = useCallback(async () => {
    const payload = { org_code: orgCode, user_id: userId, role_id: userData.role };
    try {
      // uploaded
      const r1 = await postService(endpoints.auth.getQuotaList, 'POST', payload);
      const data = r1.data || [];
      setRows(data);
      // if (data.length) {
      //   const flds = Object.keys(data[0]).filter((f) => f !== 'id');
      //   setColumns(
      //     flds.map((f) => ({
      //       field: f,
      //       headerName: toTitleCase(f),
      //       flex: 1,
      //       minWidth: 120,
      //     }))
      //   );
      // }

      // pending
      const r2 = await postService(endpoints.auth.getPendingQuotaList, 'POST', payload);
      setPendingRows(r2.data || []);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to load data', severity: 'error' });
    }
  }, [orgCode, userId, userData.role]);


  
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await postService(endpoints.auth.getWorkFlowList, 'POST', {
          org_code: orgCode,
          search_key: '',
          page_number: 1,
          page_size: 50,
        });
        if (res.status && Array.isArray(res.data)) {
          setWorkflowOptions(
            res.data.map((wf) => ({
              id: wf.id,
              name: wf.name,
            }))
          );
        } else {
          setWorkflowOptions([]);
        }
      } catch (err) {
        setWorkflowOptions([]);
      }
    }
    fetchWorkflows();
  }, [orgCode]);

  const fetchFormCols = useCallback(async () => {
    try {
      const r = await postService(endpoints.auth.getQuotaColumns, 'POST', { org_code: orgCode });
      setSystemFields(r.prod_quota || []); // [{column, data_type}]
      setCustomFields(r.prod_quota_cust || []); // [{column, data_type}]
      setFormCols([...(r.prod_quota || []), ...(r.prod_quota_cust || [])]);
    } catch {
      setSystemFields([]);
      setCustomFields([]);
      setFormCols([]);
    }
  }, [orgCode]);

  useEffect(() => {
    fetchLists();
    fetchFormCols();
  }, [fetchLists, fetchFormCols]);


  useEffect(() => {
    const data = tabIndex === 0 ? rows : pendingRows;
    if (data.length) {
      const flds = Object.keys(data[0]).filter((f) => f !== 'idu');
      setColumns(
        flds.map((f) => ({
          field: f,
          headerName: toTitleCase(f),
          flex: 1,
          minWidth: 120,
        }))
      );
    } else {
      setColumns([]);
    }
  }, [tabIndex, rows, pendingRows]);

  const fetchVerifiedRows = useCallback(async () => {
    try {
      const payload = { org_code: orgCode, user_id: userId, role_id: userData.role };
      const res = await postService(endpoints.auth.getVerifiedQuotaList, 'POST', payload);

      setVerifiedRows(res.data || []);
    } catch {
      setVerifiedRows([]);
    }
  }, [orgCode, userId, userData.role]);
  
  const handleTabChange = useCallback((_, newIndex) => {
    setTabIndex(newIndex);
    if (newIndex === 2) {
      // verified
      fetchVerifiedRows();
    } else {
      // uploaded or pending
      fetchLists();
    }
  }, [fetchLists, fetchVerifiedRows]);

  // ─── Toolbar handlers ───────────────────────────────────────────────────────
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const result = await postService(
        endpoints.auth.downloadQuotaTemplate,
        'POST',
        { org_code: orgCode },
        { responseType: 'arraybuffer' }
      );
      const buffer = result.data ?? result;
      const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quota-template-${orgCode}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Download failed', severity: 'error' });
    }
  }, [orgCode]);

  const handleUploadCSV = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setUploadProgress(0);

      const form = new FormData();
      form.append('file', file);
      form.append('org_code', orgCode);
      form.append('created_by', userId);
      form.append('emp_name', userName);

      try {
        const res = await postUploadService(endpoints.auth.uploadUsersFiles, form, {
          onUploadProgress: (ev) => {
            if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
          },
        });

        setSnackbar({
          open: true,
          message: res.message || 'Upload successful',
          severity: 'success',
        });
        fetchLists();
      } catch (err) {
        const data = err?.response?.data;
        let message = data?.message || 'Upload failed';
        const details = [];

        // Type errors
        if (Array.isArray(data?.typeErrors)) {
          data.typeErrors.forEach((item) => {
            details.push(
              `Row ${item.row}: Field "${item.field}" has invalid value "${item.value}" (expected: ${item.expected})`
            );
          });
        }
        // emp_id not found
        if (Array.isArray(data?.empIdNotFound)) {
          data.empIdNotFound.forEach((item) => {
            details.push(`Row ${item.row}: emp_id "${item.emp_id}" not found`);
          });
        }
        // already exists (deduped)
        if (Array.isArray(data?.alreadyExist)) {
          const existMsgs = data.alreadyExist.map((item) => {
            // Priority: quota_period -> quota_name -> department -> 'undefined'
            const period = item.department || item.quota_period || item.quota_name || 'undefined';
            return `Row ${item.row}: emp_id "${item.emp_id}" with quota_period "${period}" already exists`;
          });
          Array.from(new Set(existMsgs)).forEach((msg) => details.push(msg));
        }

        if (details.length) {
          message += `. ${details.join('; ')}`;
          // Or multiline: message += `:\n${details.join('\n')}`;
        }

        setSnackbar({
          open: true,
          message,
          severity: 'error',
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (e?.target) e.target.value = null;
      }
    },
    [orgCode, userId, fetchLists]
  );

  const handleToolbarAdd = useCallback(() => {
    // Prefill values from userData if available
    const empty = Object.fromEntries(formCols.map((c) => [c, '']));
    // Example: Prefill emp_id and department if they exist in userData
    // if (userData?.user_id) empty.emp_id = userData.user_id;
    // if (userData?.department) empty.department = userData.department;
    // if (userData?.region) empty.region = userData.region;

    setCurrent(empty);
    setDlgMode('add');
    setOpenDlg(true);
  }, [formCols, userData]);

  // ─── Dialog save ───────────────────────────────────────────────────────────
 const handleDialogSave = useCallback(async () => {
  // For amount columns, adjust as per your app
  const isAmountField = (col) =>
    [
      'yearly', 'qtr_1', 'qtr_2', 'qtr_3', 'qtr_4', 'half_yearly_one', 'half_yearly_two',
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
      'september', 'october', 'november', 'december'
    ].includes(col);

  // Combine all column keys
  const allColumns = [
    ...systemFields.map(f => (typeof f === 'string' ? f : f.column)),
    ...customFields.map(f => (typeof f === 'string' ? f : f.column))
  ];

  // 1️⃣ Check: if *all* fields are empty
  const anyValueEntered = allColumns.some(col => {
    const val = current[col];
    return val !== undefined && val !== null && val.toString().trim() !== '';
  });

  if (!anyValueEntered) {
    setSnackbar({
      open: true,
      message: 'Please enter at least one value.',
      severity: 'error'
    });
    return;
  }

  // 2️⃣ Build prod_quota and prod_quota_cust with proper defaults
 const buildFieldsObj = (fields) => {
  const obj = {};
  fields.forEach(f => {
    const col = typeof f === 'string' ? f : f.column;
    const type = typeof f === 'string' ? '' : (f.data_type || '');
    const val = current[col];

    if (type.includes('character')) {
      obj[col] = val ?? '';
    } else if (type === 'date') {
      // Check for specific columns (by your actual DB field names)
      if (col === 'effective_from_date') {
        obj[col] = val && val.trim() ? val : '01/01/1900';
      } else if (col === 'effective_to_date') {
        obj[col] = val && val.trim() ? val : '12/31/2999';
      } else {
        obj[col] = val ?? '';
      }
    } else if (type === 'numeric') {
      if (isAmountField(col)) {
        obj[col] = val === undefined || val === '' ? '0.00' : val;
      } else {
        obj[col] = val === undefined || val === '' ? 0 : val;
      }
    } else {
      obj[col] = val ?? '';
    }
  });
  return obj;
};


  const prod_quota = buildFieldsObj(systemFields);
  const prod_quota_cust = buildFieldsObj(customFields);

  // 3️⃣ Save as usual
  const payload = {
    org_code: orgCode,
    prod_quota,
    prod_quota_cust,    
    user_name : userName,    
    quotaHistory: {
      quota_id: current.quota_id || '',
      status: 'New',
      assigned_to: userId,
      created_by: userId,
      created_at: new Date().toISOString(),
    },
  };

  setSaveLoading(true);
    try {
    const res = await postService(endpoints.auth.saveManualQuotaDetails, 'POST', payload);
    if (!res.status) {
      setSnackbar({ open: true, message: res.message, severity: 'error' });
      return;
    }
    setOpenDlg(false);
    setSnackbar({ open: true, message: res.message || "Saved successfully", severity: "success" });
    fetchLists();
  } catch (err) {
    setSnackbar({ open: true, message: (err), severity: 'error' });
}
 finally {
    setSaveLoading(false);
  }
}, [dlgMode, current, systemFields, customFields, orgCode, userId, fetchLists, setSnackbar]);

  const handleDialogChange = useCallback((key, val) => {
    setCurrent((c) => ({ ...c, [key]: val }));
  }, []);

  const handleUpdateRow = async (updatedRow) => {
    try {
      console.log(updatedRow)
      // you might show a success snackbar here
    } catch (e) {
      // handle error
    }
  };

  // ─── Run action (Pending tab) ───────────────────────────────────────────────
  const handleRunAction = useCallback(async () => {
    if (!selectionModel.length) {
      setSnackbar({ open: true, message: 'Select at least one row', severity: 'error' });
      return;
    }
    setRunLoading(true);
    if (!selWorkflow) {
      setSnackbar({ open: true, message: 'Please select a Workflow', severity: 'error' });
      setRunLoading(true);
      return;
    }
    // if (!selStatus) {
    //   setSnackbar({ open: true, message: 'Please select a Status', severity: 'error' });
    //   return;
    // }

   const sourceRows = tabIndex === 2 ? verifiedRows : pendingRows;
   const selectedDetails = sourceRows.filter(r => selectionModel.includes(r.id));
  // e.g. extract quota_id and node_id arrays
  const quotaIds  = selectedDetails.map(r => r.quota_id);
  const nodeIds   = selectedDetails.map(r => r.node_id);
  const tempNodeIds   = selectedDetails.map(r => r.temp_node_id);

    const payload = {
      list_checkbox_ids: selectionModel,
      work_flow_id: selWorkflow,
      user_id: userId,
      org_code: orgCode,
      status: selStatus,
       quota_ids: quotaIds,
    node_ids:  nodeIds,
    temp_node_ids : tempNodeIds,
    user_name : userName,
    };
    console.log(payload)
 
    try {
      const res = await postService(endpoints.auth.quotaApproveOrReturnByAdmin, 'POST', payload);
      setSnackbar({ open: true, message: res.message, severity: 'success' });
      if(tabIndex===2){
        await fetchVerifiedRows();
      }else{
        await fetchLists();
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }finally{
      setRunLoading(true);
    }
  }, [selectionModel, selWorkflow, selStatus, userId, orgCode , fetchLists, tabIndex, pendingRows, verifiedRows]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack direction="row" justifyContent="space-between" mb={0}>
        <Breadcrumbs separator="›">
          <Link component={RouterLink} to="/home" color="inherit">
            Home
          </Link>
          <Typography color="text.primary">Quotas</Typography>
        </Breadcrumbs>
      </Stack>

      <CsvToolbar
        onAdd={handleToolbarAdd}
        onDownload={handleDownloadTemplate}
        onUpload={handleUploadCSV}
        uploading={uploading}
        uploadProgress={uploadProgress}
        // snackbar={snackbar}
        setSnackbar={setSnackbar}
        permissions={quotaPermissions}
      />

      <QuotasTable
        tabIndex={tabIndex}
        onTabChange={handleTabChange}
        rows={rows}
        pendingRows={pendingRows}
        verifiedRows={verifiedRows} 
        columns={columns}
        selectionModel={selectionModel}
        setSelectionModel={setSelectionModel}
        selectedUser={selUser}
        setSelectedUser={setSelUser}
        selectedStatus={selStatus}
        setSelectedStatus={setSelStatus}
        selectedWorkflow={selWorkflow}
        setSelectedWorkflow={setSelWorkflow}
        userOptions={userOptions}
        statusOptions={statusOptions}
        workflowOptions={workflowOptions}
        userLoading={false} // wire these up if you fetch them
        workflowLoading={false}
        runLoading={false}
        onRunAction={handleRunAction}
        onNotify={(message, severity) =>
           setSnackbar({ open: true, message, severity })
        }
        fetchLists={fetchLists}
        systemFields={systemFields}
        customFields={customFields}
        userList={userList}
        roleList={roleList}
        saveLoading={saveLoading}
        onUpdateRow={handleUpdateRow} 
      />

      <QuotaDialog
        open={openDlg}
        mode={dlgMode}
        systemFields={systemFields}
        customFields={customFields}
        userList={userList}
        roleList={roleList}
        data={current}
        onChange={handleDialogChange}
        onSave={handleDialogSave}
        onClose={() => setOpenDlg(false)}
        statusOptions={statusOptions}
        saveLoading={saveLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))} 
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
         <Alert severity={snackbar.severity}>
          {snackbar.message || 'Something happened'}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default QuotasCRUDGrid;
