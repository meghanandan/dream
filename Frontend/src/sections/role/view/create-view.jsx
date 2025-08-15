import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Checkbox, Alert, Stack, Breadcrumbs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Menu, MenuItem,
  ListItemIcon, ListItemText, Drawer, TablePagination, Select, MenuItem as MuiMenuItem
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';
import { z } from 'zod';

const TemplateSchema = z.object({
  name: z.string().min(1, { message: "Role name is required." }).max(50),
  permissions: z.array(
    z.object({
      page_id: z.number(),
      view: z.boolean(),
      add: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
      download: z.boolean(),
    })
  ).nonempty({ message: "Please select at least one permission." }).refine(
    (perms) => perms.some((perm) => perm.view || perm.add || perm.edit || perm.delete || perm.download),
    { message: "At least one permission must be true." }
  ),
});

function ActionsDropdown({ permissions, allowed = {}, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleCheckbox = (key) => (e) => {
    onChange({ [key]: e.target.checked });
  };

  // List of permission actions and labels
  const actions = [
    { key: 'view', label: 'View' },
    { key: 'edit', label: 'Edit' },
    { key: 'add', label: 'Add' },
    { key: 'delete', label: 'Delete' },
    { key: 'download', label: 'Download' }
  ];

  return (
    <>
      <IconButton size="small" onClick={handleMenuOpen}>
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {actions.map(action => (
          <MenuItem key={action.key} dense disableGutters>
            <ListItemIcon>
              <Checkbox
                size="small"
                checked={!!permissions[action.key]}
                onChange={handleCheckbox(action.key)}
                disabled={allowed[action.key] === false}
              />
            </ListItemIcon>
            <ListItemText primary={action.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}


const DREAM_TYPES = ['---select---', 'DREAMPRO', 'DREAMLTE'];

export function CreateRoleView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const userData = Storage.getJson("userData");
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [masterPage, setMasterPage] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [formError, setFormError] = useState('');
  const [alert, setAlert] = useState(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [section, setSection] = useState('');
  // For drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Permissions Table (client-side) controls
  const [permSearch, setPermSearch] = useState('');
  const [permSortAsc, setPermSortAsc] = useState(true);
  const [permPage, setPermPage] = useState(0);
  const [permRowsPerPage, setPermRowsPerPage] = useState(10);

  // Templates Drawer DataGrid (server-side) controls
  const [templateRows, setTemplateRows] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templatePage, setTemplatePage] = useState(0);
  const [templatePageSize, setTemplatePageSize] = useState(10);
  const [templateSortModel, setTemplateSortModel] = useState([
    { field: "name", sort: "asc" },
  ]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateRowCount, setTemplateRowCount] = useState(0);

  // Track per-row dropdown and date edits for DataGrid
  const [templateEdits, setTemplateEdits] = useState({}); // { [rowId]: { dreamType, effectiveDate } }
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [finalSelectedTemplates, setFinalSelectedTemplates] = useState([]);
  const [finalTemplateEdits, setFinalTemplateEdits] = useState({});

  useEffect(() => {
    getMasterPages();
    if (id) {
      const currentUrl = window.location.href;
      const parts = currentUrl.split('/');
      setSection(parts[5]);
      viewRolePermissions(id);
    }
  }, [id]);

  const getMasterPages = async () => {
    try {
      const res = await postService(endpoints.auth.getMasterPages, 'GET');
      if (res.data?.length) setMasterPage(res.data);
    } catch (error) {
      setAlert({ severity: 'error', message: 'Error while fetching master pages' });
    }
  };

  const viewRolePermissions = async (rid) => {
  try {
    const res = await postService(endpoints.auth.viewRolePermissions, 'POST', { role_id: rid });
    if (res.data) {
      console.log(res.data)
      setPermissions(res.data.permissions);
      setRoleName(res.data.role?.role_name || '');
      setDescription(res.data.role?.description || '');
      setRoleTemplates(res.data.templates || []);
      
      // Set initial selections here
      if (res.data.templates?.length > 0) {
        const selected = res.data.templates.map(tpl => tpl.id);
        const edits = {};
        
        res.data.templates.forEach(tpl => {
          edits[tpl.id] = {
            dreamType: tpl.licence_type || '---select---',
            effectiveDate: tpl.effective_from_date ? dayjs(tpl.effective_from_date) : null,
          };
        });
        
        setSelectedTemplates(selected);
        setTemplateEdits(edits);
      }
    }
  } catch (error) {
    setAlert({ severity: 'error', message: 'Error while fetching permissions' });
  }
};
  

  // Recursively flatten masterPage for table rendering
  const flattenPages = (pages, indentLevel = 0) =>
    pages.reduce((acc, page) =>
      acc.concat(
        { ...page, indentLevel },
        page.submenu?.length ? flattenPages(page.submenu, indentLevel + 1) : []
      ), []);

  const flattenedPages = useMemo(() => flattenPages(masterPage), [masterPage]);

  // Permissions Table: Filter, sort, and paginate
  const filteredPages = useMemo(() => {
    let result = flattenedPages;
    if (permSearch.trim()) {
      result = result.filter(row =>
        row.page_name.toLowerCase().includes(permSearch.trim().toLowerCase())
      );
    }
    result = [...result].sort((a, b) =>
      permSortAsc
        ? a.page_name.localeCompare(b.page_name)
        : b.page_name.localeCompare(a.page_name)
    );
    return result;
  }, [flattenedPages, permSearch, permSortAsc]);

  const paginatedPages = useMemo(() => {
    const start = permPage * permRowsPerPage;
    return filteredPages.slice(start, start + permRowsPerPage);
  }, [filteredPages, permPage, permRowsPerPage]);

  // Get permissions for a specific page
  const getPagePermissions = (page_id) =>
    permissions.find((item) => item.page_id === page_id) || {
      page_id,
      view: false,
      edit: false,
      add: false,
      delete: false,
      download: false,
    };

  // Set permission for a specific page
  const setPagePermissions = (page_id, changes) => {
    setPermissions((prev) => {
      let found = false;
      const updated = prev.map((item) => {
        if (item.page_id === page_id) {
          found = true;
          return { ...item, ...changes };
        }
        return item;
      });
      if (!found) {
        updated.push({ page_id, ...getPagePermissions(page_id), ...changes });
      }
      return updated;
    });
  };

  // Render Page Name: make "Templates" clickable
  const renderPageName = (record) =>
    record.page_name === 'Templates' ? (
      <Typography
        component="span"
        sx={{
          cursor: 'pointer',
          color: theme.palette.primary.main,
          textDecoration: 'underline',
          fontWeight: 600,
        }}
        onClick={() => setDrawerOpen(true)}
      >
        {record.page_name}
      </Typography>
    ) : (
      <Box sx={{ pl: record.indentLevel * 2 }}>{record.page_name}</Box>
    );

  // Actions column logic
  const handleActionDropdown = (page_id, actionObj) => {
    if ('view' in actionObj && 'edit' in actionObj && 'add' in actionObj) {
      setPagePermissions(page_id, {
        view: actionObj.view,
        edit: actionObj.edit,
        add: actionObj.add,
      });
    } else {
      setPagePermissions(page_id, actionObj);
    }
  };

  const fetchTemplates = useCallback(async () => {
  setTemplateLoading(true);
  try {
    const res = await postService(
      endpoints.auth.getAll,
      "POST",
      {
        search_key: templateSearch,
        page_number: templatePage + 1,
        page_size: templatePageSize,
        org_code: userData?.organization || "vyva",
        sort_field: templateSortModel[0]?.field || "name",
        sort_order: templateSortModel[0]?.sort || "asc"
      }
    );
    setTemplateRows(res.data || []);
    setTemplateRowCount(Number(res.count) || 0);
  } catch {
    setTemplateRows([]);
    setTemplateRowCount(0);
  }
  setTemplateLoading(false);
}, [
  templateSearch,
  templatePage,
  templatePageSize,
  templateSortModel,
  userData
]);

// Fetch on drawer open (initial)
useEffect(() => {
  if (drawerOpen) {
    fetchTemplates();
  }
  // eslint-disable-next-line
}, [drawerOpen]);

// Fetch on search, pagination, sort (but only while open)
useEffect(() => {
  if (drawerOpen) {
    fetchTemplates();
  }
  // eslint-disable-next-line
}, [templatePage, templatePageSize, templateSearch, templateSortModel]);

// useEffect(() => {
//   if (roleTemplates.length > 0 && templateRows.length > 0 && selectedTemplates.length === 0) {
//     // Only set initial selections if selectedTemplates is empty
//     const selected = [];
//     const edits = {};

//     roleTemplates.forEach(tpl => {
//       const match = templateRows.find(r => r.id === tpl.id);
//       if (match) {
//         selected.push(tpl.id);
//         edits[tpl.id] = {
//           dreamType: tpl.licence_type === "DREAMPRO" ? "DREAMPRO"
//                    : tpl.licence_type === "DREAMLTE" ? "DREAMLTE"
//                    : "---select---",
//           effectiveDate: tpl.effective_from_date ? dayjs(tpl.effective_from_date) : null,
//         };
//       }
//     });

//     setSelectedTemplates(selected);
//     setTemplateEdits(edits);
//   }
// }, [roleTemplates, templateRows, selectedTemplates.length]);

  // Handlers for template DataGrid per-row edits
  const handleDropdownChange = (rowId, value) => {
    setTemplateEdits(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        dreamType: value
      }
    }));
  };

  const handleDateChange = (rowId, value) => {
    setTemplateEdits(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        effectiveDate: value
      }
    }));
  };

  const handleSave = (rowId) => {
    const rowData = templateEdits[rowId];
    // TODO: Save rowData (rowId, dreamType, effectiveDate) to backend or wherever needed
    alert(`Saving for row ${rowId}: ${JSON.stringify(rowData)}`);
  };

  const handleSubmit = async () => {
    const formattedPermissions = permissions.map((perm) => ({
      page_id: perm.page_id,
      view: !!perm.view,
      add: !!perm.add,
      edit: !!perm.edit,
      delete: !!perm.delete,
      download: !!perm.download,
    }));
    const roleData = {
      name: roleName,
      permissions: formattedPermissions,
    };
    const validation = TemplateSchema.safeParse(roleData);
    if (!validation.success) {
      setFormError(validation.error.issues.map(i => i.message).join(', '));
      return;
    }
    try {
        const templatesPayload = selectedTemplates.map(rowId => {
          const edit = finalTemplateEdits[rowId] || {};
          const templateInfo = templateRows.find(r => r.id === rowId) || 
                          roleTemplates.find(rt => rt.id === rowId) || {};
          return {
            id: rowId,
            template_id: rowId,
            work_flow_id: templateInfo.work_flow_id || null,
            licence_type: edit.dreamType || '---select---',
            effective_from_date: edit.effectiveDate?.format('YYYY-MM-DD') || null,
            dreamType: edit.dreamType || '---select---',
            effectiveDate: edit.effectiveDate?.format('YYYY-MM-DD') || null
          };
        });

      const payload = {
        role_id: id, 
        role_name: roleName,
        description,
        done_by: userData?.user_id,
        org_code: userData?.organization,
        permissions: formattedPermissions,
        templates: templatesPayload,
      };

       console.log("Submitting role payload:", payload);

      if (id) {
        const result = await postService(endpoints.auth.selectedRoleUpdatedDetails, "POST", { ...payload, role_id: id });
        if (result.status) {
          setAlert(null);
          // await postService(endpoints.auth.updateRole, "POST", {
          //   role_id: id,
          //   permissions: roleData,
          //   created_by: userData?.user_id
          // });
          setAlertMessage(result.message);
          setModelOpen(true);
        } else setAlert({ severity: 'error', message: 'Role Name already exists.' });
      } else {
        // const result = await postService(endpoints.auth.insertRoleName, "POST", payload);
        const result = await postService(endpoints.auth.createNewRole, "POST", payload);
        if (result.status) {
          setAlert(null);
          // await postService(endpoints.auth.createRole, "POST", {
          //   role_id: result.role_id,
          //   permissions: roleData,
          //   created_by: userData?.name
          // });
          setAlertMessage(result.message);
          setModelOpen(true);
        } else setAlert({ severity: 'error', message: 'Role Name already exists.' });
      }
    } catch {
      setFormError('Failed to save role. Please try again.');
    }
  };

  const breadcrumbs = [
    <RouterLink to="/home" key="home">Home</RouterLink>,
    <RouterLink to="/role" key="role">Role</RouterLink>,
    <Typography key="current">{section === 'details' ? 'View Role Permissions' : section === 'edit' ? 'Edit Role Permissions' : 'Add Role Permissions'}</Typography>,
  ];

  // Datagrid columns for template drawer, with S.No, dropdown, date, actions
  const templateColumns = [
  {
    field: 'select',
    headerName: '',
    width: 50,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
<Checkbox
  checked={selectedTemplates.includes(params.id)}
  onChange={e => {
    console.log(`Checkbox ${params.id} changed to:`, e.target.checked);
    
    if (e.target.checked) {
      // Add to selection
      setSelectedTemplates(prev => [...prev, params.id]);
      
      // Initialize template edits if not exists
      if (!templateEdits[params.id]) {
        setTemplateEdits(prev => ({
          ...prev,
          [params.id]: {
            dreamType: '---select---',
            effectiveDate: null
          }
        }));
      }
    } else {
      // Remove from selection  
      setSelectedTemplates(prev => prev.filter(rowId => rowId !== params.id));
      
      // IMPORTANT: Remove template edits too
      setTemplateEdits(prev => {
        const updated = { ...prev };
        delete updated[params.id];
        return updated;
      });
    }
  }}
/>
    )
  },
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'template_name', headerName: 'Template Name', flex: 1 },
  { field: 'work_flow_name', headerName: 'Workflow Name', flex: 1 },
  {
    field: 'dreamType',
    headerName: 'Type',
    width: 140,
    sortable: false,
    filterable: false,
    renderCell: (params) => {
      // Allow only one DREAM LTE selection
      const someoneHasLTE = Object.entries(templateEdits)
        .some(([rowId, edit]) =>
          edit.dreamType === 'DREAMLTE' && rowId !== params.id
        );
      return (
        <Select
          size="small"
          value={templateEdits[params.id]?.dreamType || DREAM_TYPES[0]}
          onChange={e => handleDropdownChange(params.id, e.target.value)}
          displayEmpty
          sx={{ minWidth: 110 }}
        >
          {DREAM_TYPES.map(option => (
            <MuiMenuItem
              key={option}
              value={option}
              disabled={
                option === 'DREAM LTE' &&
                someoneHasLTE &&
                templateEdits[params.id]?.dreamType !== 'DREAM LTE'
              }
            >
              {option}
            </MuiMenuItem>
          ))}
        </Select>
      );
    }
  },
  {
    field: 'effectiveDate',
    headerName: 'Effective Date',
    width: 180,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          value={templateEdits[params.id]?.effectiveDate || null}
          onChange={date => handleDateChange(params.id, date)}
          format="DD/MM/YYYY"
          slotProps={{
            textField: { size: 'small', variant: 'outlined' }
          }}
        />
      </LocalizationProvider>
    )
  }
];

  // For DataGrid rows (ensure unique `id`)
  const gridRows = templateRows.map((row, idx) => ({
    ...row,
     id: row.id ?? `row-${idx}`,
  }));


  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Breadcrumbs separator="›" aria-label="breadcrumb">
        {breadcrumbs}
      </Breadcrumbs>

      <Typography variant="h4" sx={{ mb: 2 }}>
        {section === 'details' ? 'View Role Permissions' : section === 'edit' ? 'Edit Role Permissions' : 'Add Role Permissions'}
      </Typography>

      {alert && (
        <Alert severity={alert.severity} onClose={() => setAlert(null)}>{alert.message}</Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            label="Role Name *"
            size="small"
            sx={{ minWidth: 250 }}
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            disabled={section === 'details'}
          />
          <TextField
            label="Description"
            size="small"
            sx={{ minWidth: 300 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={section === 'details'}
          />
          <TextField
            size="small"
            placeholder="Search Page Name"
            value={permSearch}
            onChange={e => {
              setPermPage(0);
              setPermSearch(e.target.value);
            }}
            sx={{ minWidth: 220 }}
          />
          <Button
            variant="text"
            onClick={() => setPermSortAsc((asc) => !asc)}
            sx={{ textTransform: 'none' }}
          >
            Sort: {permSortAsc ? 'A-Z' : 'Z-A'}
          </Button>
          {section !== 'details' && (
            <Button
              variant="contained"
              sx={{
                backgroundColor: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.dark }
              }}
              onClick={handleSubmit}
            >
              {id ? 'Update Role' : 'Save Role'}
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => navigate('/role')}
            sx={{ whiteSpace: 'nowrap', minWidth: 100 }}
          >
            Back
          </Button>
        </Stack>
        {formError && <Typography color="error" sx={{ mb: 1 }}>{formError}</Typography>}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Page Name</TableCell>
                <TableCell align="center">Permissions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPages.map((record, index) => {
                const perms = getPagePermissions(record.page_id);
                return (
                  <TableRow key={`${record.page_id}_${record.indentLevel}_${index}`}>
                    <TableCell>{renderPageName(record)}</TableCell>
                    <TableCell align="center">
                      <ActionsDropdown
                        permissions={perms}
                        onChange={(changeObj) => handleActionDropdown(record.page_id, changeObj)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredPages.length}
            page={permPage}
            onPageChange={(e, newPage) => setPermPage(newPage)}
            rowsPerPage={permRowsPerPage}
            onRowsPerPageChange={e => {
              setPermRowsPerPage(parseInt(e.target.value, 10));
              setPermPage(0);
            }}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </TableContainer>
      </Paper>

      <Dialog open={modelOpen} onClose={() => { setModelOpen(false); navigate('/role') }}>
        <DialogTitle>Success</DialogTitle>
        <DialogContent>{alertMessage}</DialogContent>
        <DialogActions>
          <Button onClick={() => { setModelOpen(false); navigate('/role') }}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Templates Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: '50vw', p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Templates</Typography>
          <TextField
            size="small"
            placeholder="Search templates"
            fullWidth
            value={templateSearch}
            onChange={e => {
              setTemplatePage(0);
              setTemplateSearch(e.target.value);
            }}
            sx={{ mb: 1 }}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DataGrid
              autoHeight
              rows={templateRows}
              getRowId={(row) => row.id}
              columns={templateColumns}
              loading={templateLoading}
              rowCount={templateRowCount}
              pagination
              paginationMode="server"
              page={templatePage}
              onPageChange={(newPage) => setTemplatePage(newPage)}
              pageSize={templatePageSize}
              onPageSizeChange={setTemplatePageSize}
              rowsPerPageOptions={[5, 10, 20, 50]}
              sortingMode="server"
              sortModel={templateSortModel}
              onSortModelChange={setTemplateSortModel}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-columnHeaders': { background: theme.palette.grey[200] },
                minHeight: 400
              }}
            />
          </LocalizationProvider>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="contained"
              onClick={() => {
                // Save the current selections
                setFinalSelectedTemplates([...selectedTemplates]);
                setFinalTemplateEdits({...templateEdits});
                setDrawerOpen(false);
                
                console.log("SAVED SELECTIONS:", selectedTemplates);
                console.log("SAVED EDITS:", templateEdits);
                
                setAlert({
                  severity: 'success',
                  message: `${selectedTemplates.length} template(s) saved. Click Update Role to submit.`
                });
              }}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

export default CreateRoleView;
