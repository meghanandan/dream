import React, { useState, useEffect } from 'react';
import {
  Box,
  Link as MuiLink,
  Typography,
  IconButton,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Menu,
  MenuItem as MuiMenuItem,
  Breadcrumbs,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { MoreVert as MoreOutlined } from '@mui/icons-material';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';

import StepperModal from './stepperModel';
import DisputesModel from './disputeModel';
import DedicatedModal from './dedicatedModal';
import DisputeDetailsDrawer from './DisputeDetailsDrawer';

const { RangePicker } = DatePicker;

const VISIBLE_COLUMNS = [
  's_no',
  'dispute_id',
  'licence_type',
  'template_name',
  'work_flow_name',
  'created_by_name',
  'pending_at',
  'dispute_status',
  'action',
];

const PENDING_COLUMNS = [
  { key: 's_no', label: 'S.No' },
  { key: 'dispute_id', label: 'ID' },
  { key: 'created_by_id', label: 'Created By (ID)' },
  { key: 'created_by_name', label: 'Created By' },
  { key: 'dispute_date', label: 'Date' },
  { key: 'template_name', label: 'Template' },
  { key: 'work_flow_name', label: 'Workflow' },
  { key: 'licence_type', label: 'License' },
  { key: 'priority', label: 'Priority' },
  { key: 'severity', label: 'Severity' },
  { key: 'description', label: 'Description' },
  { key: 'pending_at', label: 'Pending At' },
  { key: 'action', label: 'Actions' },
];

export function Dispute() {
  const userData = Storage.getJson('userData');

  // Tabs
  const [tab, setTab] = useState(0);

  // All/Raised disputes
  const [orders, setOrders] = useState([]); // full list
  const [columnFilters, setColumnFilters] = useState({}); // e.g. { template_name: 'foo' }
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Pending disputes (client‐side as well)
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(10);

  // Table headers (static for this example)
  const allHeaders = [
    { key: 'dispute_id', label: 'Dispute Id' },
    { key: 'licence_type', label: 'Licence Type' },
    { key: 'template_name', label: 'Template Name' },
    { key: 'work_flow_name', label: 'Work Flow Name' },
    { key: 'created_by_name', label: 'Created By' },
    { key: 'pending_at', label: 'Pending At' },
    { key: 'dispute_status', label: 'Status' },
    { key: 'action', label: 'Action' },
  ];

  // Drawer & menu state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRowData, setDrawerRowData] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openDedicatedModal, setOpenDedicatedModal] = useState(false);
  const [disputID, setDisputID] = useState(null);
  const [workflowID, setWorkflowID] = useState(null);
  const [nodeID, setNodeID] = useState(null);

  const [selectedDispute, setSelectedDispute] = useState(null);

  // Fetch the full "raised" list once per dateRange or tab
  useEffect(() => {
    if (tab !== 0) return;
    const payload = {
      user_id: userData.user_id,
      org_code: userData.organization,
      type: 1,
      from: dateRange[0].format('YYYY-MM-DD'),
      to: dateRange[1].format('YYYY-MM-DD'),
      role_id: userData.role,
    };
    postService(endpoints.auth.getDisputeList, 'POST', payload)
      .then((res) => {
        if (res.status) {
          setOrders(res.data || []);
        }
      })
      .catch(() => {
        setOrders([]);
      });
  }, [tab, dateRange]);

  // Fetch pending list once per tab switch
  useEffect(() => {
    if (tab !== 1) return;
    const payload = {
      user_id: userData.user_id,
      org_code: userData.organization,
    };
    postService(endpoints.auth.getPendingDisputesList, 'POST', payload)
      .then((res) => {
        setPendingOrders(res.data || []);
      })
      .catch(() => {
        setPendingOrders([]);
      });
  }, [tab]);


const fetchPendingDisputes = async () => {
  const payload = {
    user_id: userData.user_id,
    org_code: userData.organization,
  };
  try {
    const res = await postService(endpoints.auth.getPendingDisputesList, 'POST', payload);
    setPendingOrders(res.data || []);
    // no more setPendingTotal here
  } catch (err) {
    setPendingOrders([]);
    // no more setPendingTotal here
  }
};


  const handleTabChange = (_, v) => {
    setTab(v);
    // reset pagination
    setPage(0);
    setPendingPage(0);
  };

  // Column filters + date range filter
  const filteredOrders = orders.filter((row) =>
    Object.entries(columnFilters).every(
      ([k, v]) => !v || (row[k] || '').toString().toLowerCase().includes(v.toLowerCase())
    )
  );

  // Drawer & menu handlers
  const openDrawer = (row) => {
    setDrawerRowData(row);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerRowData(null);
    setDrawerOpen(false);
  };
  const openMenu = (e, row) => {
    setMenuAnchor(e.currentTarget);
    setMenuRow(row);
    setDisputID(row.dispute_id);
    setWorkflowID(row.work_flow_id);
    setNodeID(row.node_id);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };
  const onMenuAction = (action) => {
    if (!menuRow) return;
    if (action === 'view') {setSelectedDispute(menuRow); setDetailsOpen(true)};
    if (action === 'resolve') setIsModalOpen(true);
    if (action === 'dedicate') setOpenDedicatedModal(true);
    closeMenu();
  };

  // Pagination event handlers
  const handlePageChange = (_, newPage) => setPage(newPage);
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };
  const handlePendingPageChange = (_, newPage) => setPendingPage(newPage);
  const handlePendingRowsPerPageChange = (e) => {
    setPendingRowsPerPage(+e.target.value);
    setPendingPage(0);
  };

  // Date picker
  const handleDateChange = (range) => {
    if (range && range[0] && range[1]) {
      setDateRange([dayjs(range[0]), dayjs(range[1])]);
    }
  };

  // Utility for chip colors
  const getChipColor = (key, value) => {
    if (key === 'priority') {
      return value === 'high' ? 'error' : value === 'medium' ? 'warning' : 'info';
    }
    if (key === 'severity') {
      return value === 'major' || value === 'critical' ? 'error' : 'info';
    }
    if (key === 'dispute_status') {
      const s = (value || '').toLowerCase();
      if (s === 'raised') return 'warning';
      if (s === 'resolved' || s === 'approved') return 'success';
      if (s === 'rejected') return 'error';
      return 'default';
    }
    return 'default';
  };

  // Table renderer
  const renderTable = ({
    data,
    columns: cols,
    page: p,
    rowsPerPage: rpp,
    onPageChange,
    onRowsPerPageChange,
    isPending = false,
  }) => {
    const showCols = isPending ? cols : cols.filter((c) => VISIBLE_COLUMNS.includes(c.key));
    const rows = isPending
      ? data.slice(p * rpp, p * rpp + rpp)
      : filteredOrders.slice(p * rpp, p * rpp + rpp);

    return (
      <Paper sx={{ mt: 2, boxShadow: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {showCols.map((col) => (
                  <TableCell key={col.key}>
                    {!isPending &&
                    ['template_name', 'work_flow_name', 'licence_type'].includes(col.key) ? (
                      <TextField
                        placeholder={`Filter ${col.label}`}
                        variant="standard"
                        fullWidth
                        onChange={(e) =>
                          setColumnFilters((f) => ({
                            ...f,
                            [col.key]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.dispute_id ?? idx}>
                  {showCols.map((col) => (
                    <TableCell key={col.key}>
                      {col.key === 's_no' ? (
                        p * rpp + idx + 1
                      ) : col.key === 'action' ? (
                        <IconButton onClick={(e) => openMenu(e, row)}>
                          <MoreOutlined />
                        </IconButton>
                      ) : col.key === 'dispute_id' ? (
                        <MuiLink
                          component="button"
                          underline="hover"
                          color="primary"
                          onClick={() => openDrawer(row)}
                        >
                          <strong>{row.dispute_id}</strong>
                        </MuiLink>
                      ) : ['priority', 'severity', 'dispute_status'].includes(col.key) ? (
                        (() => {
                          const val = row[col.key];
                          return val ? (
                            <Chip
                              label={val}
                              color={getChipColor(col.key, val)}
                              size="small"
                              sx={{ textTransform: 'capitalize', fontWeight: 600, color: '#fff' }}
                            />
                          ) : (
                            '--'
                          );
                        })()
                      ) : (
                        (row[col.key] ?? '--')
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box display="flex" justifyContent="space-between" alignItems="center" p={1}>
          <Typography variant="body2">
            {data.length > 0
              ? `Showing ${p * rpp + 1}–${Math.min((p + 1) * rpp, data.length)} of ${data.length}`
              : 'No records found'}
          </Typography>
          <TablePagination
            component="div"
            count={data.length}
            page={p}
            rowsPerPage={rpp}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={[10, 20, 30, 40]}
          />
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›">
          <Link to="/home">Home</Link>
          <Typography color="text.primary">Disputes</Typography>
        </Breadcrumbs>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="All/Raised Disputes" />
          <Tab label="Pending Disputes" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <>
          <Paper sx={{ mt: 2, p: 2, boxShadow: 3 }}>
            <RangePicker value={dateRange} onChange={handleDateChange} />
          </Paper>
          {renderTable({
            data: filteredOrders,
            columns: allHeaders,
            page,
            rowsPerPage,
            onPageChange: handlePageChange,
            onRowsPerPageChange: handleRowsPerPageChange,
          })}
        </>
      )}

      {tab === 1 &&
        renderTable({
          data: pendingOrders,
          columns: PENDING_COLUMNS,
          page: pendingPage,
          rowsPerPage: pendingRowsPerPage,
          onPageChange: handlePendingPageChange,
          onRowsPerPageChange: handlePendingRowsPerPageChange,
          isPending: true,
        })}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        {tab === 0 && <MuiMenuItem onClick={() => onMenuAction('view')}>View Dispute</MuiMenuItem>}
        {tab === 1 && (
          <>
            <MuiMenuItem onClick={() => onMenuAction('resolve')}>Resolve Dispute</MuiMenuItem>
            <MuiMenuItem onClick={() => onMenuAction('dedicate')}>Delegation</MuiMenuItem>
          </>
        )}
      </Menu>

      <StepperModal open={detailsOpen} onClose={() => setDetailsOpen(false)} history={selectedDispute?.history || []} rowData={selectedDispute} />
      <DisputesModel
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {setIsModalOpen(false); fetchPendingDisputes();}}
        getDisputID={disputID}
        getWorkFlowID={workflowID}
        getNodeID={nodeID}
        rowData={selectedDispute}
      />
      <DedicatedModal
        open={openDedicatedModal}
        onClose={() => setOpenDedicatedModal(false)}
        onSave={() => {setOpenDedicatedModal(false); fetchPendingDisputes();}}
        users={[]}
        selectedRows={[]}
        rowData={{}}
      />
      <DisputeDetailsDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        drawerRowData={drawerRowData}
        columns={allHeaders}
      />
    </Box>
  );
}

export default Dispute;
