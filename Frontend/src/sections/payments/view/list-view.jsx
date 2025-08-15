import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  IconButton,
  Popover,
  TextField,
  Stack,
  Breadcrumbs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material';
import { DatePicker } from 'antd';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import dayjs from 'dayjs';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';
import DisputeForm from './disputeForm';
import DetailsForm from './detailsForm';
import { Link } from 'react-router-dom';

export function Payments() {
  const { RangePicker } = DatePicker;
  const theme = useTheme();
  const userData = Storage.getJson('userData');

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [columns, setColumns] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [disputeAdjustmentDropDown, setDisputeAdjustmentDropDown] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [orderId, setOrderId] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [workFlowId, setWorkFlowId] = useState('');
  const [templateId, setTemplateID] = useState('');
  const [templateType, setTemplateType] = useState('');

  useEffect(() => {
    getOrders();
    fetchDisputeAdjustments();
  }, [search, selectedMonth, page, rowsPerPage]);

  const getOrders = () => {
    const payload = {
      type: '2',
      org_code: userData.organization,
      user_id: userData.user_id,
      search_key: search,
      from: selectedMonth[0]?.format('YYYY-MM-DD'),
      to: selectedMonth[1]?.format('YYYY-MM-DD'),
      page_size: rowsPerPage,
      page_number: page,
    };

    postService(endpoints.external_api.getOrdersData, 'POST', payload)
      .then((res) => {
        if (res.status) {
          const rowsWithSNo = res.rows.map((item, index) => ({
            ...item,
            s_no: (page - 1) * rowsPerPage + index + 1,
          }));
          setOrders(rowsWithSNo);
          setTotalOrders(res.count);

          const headers = res.headers.map((col) => ({ key: col.key, label: col.label }));
          const updatedHeaders = [
            { key: 's_no', label: 'S.No' },
            ...headers,
            { key: 'action', label: 'Action' },
          ];
          setColumns(updatedHeaders);
        }
      })
      .catch((error) => console.error('Error fetching orders:', error));
  };

  const fetchDisputeAdjustments = () => {
    postService(endpoints.auth.getDisputeorAdjustmentDropDown, 'POST', { search_key: '', type: null })
      .then((res) => {
        if (res.data.length > 0) setDisputeAdjustmentDropDown(res.data);
      })
      .catch((error) => console.error('Error fetching dispute adjustments:', error));
  };

  const handlePopoverOpen = (event, id) => {
    setOrderId(id);
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => setAnchorEl(null);

  const handleSelection = (id, work_flow_id, template_type) => {
    setTemplateID(id);
    setWorkFlowId(work_flow_id);
    setTemplateType(template_type);
    setDetailsOpen(true);
    handlePopoverClose();
  };

  const handleMonthChange = (range) => setSelectedMonth(range);
  const handleSearchChange = (e) => setSearch(e.target.value);
  const handlePageChange = (event, newPage) => setPage(newPage + 1);
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">
      Home
    </Link>,
    <Typography key="3" sx={{ color: 'text.primary' }}>
      Payments
    </Typography>,
  ];

  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>

      <Typography variant="h4" gutterBottom>Payments</Typography>

      <Paper sx={{ boxShadow: 3, p: 1, mb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <TextField
            label="Search"
            size="small"
            variant="outlined"
            value={search}
            onChange={handleSearchChange}
            sx={{ width: '30%' }}
          />
          <RangePicker value={selectedMonth} onChange={handleMonthChange} />
        </Box>
      </Paper>

      <Paper sx={{ boxShadow: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key} sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((row) => (
                <TableRow key={row.prod_orders_row_id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.key === 'action' ? (
                        <IconButton onClick={(event) => handlePopoverOpen(event, row.prod_orders_row_id)}>
                          <TouchAppIcon />
                        </IconButton>
                      ) : row[col.key] !== null && row[col.key] !== undefined ? (
                        row[col.key]
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

          <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={1}
              sx={{
                flexWrap: 'wrap', // allow wrapping only if truly necessary
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  flex: 1,
                }}
              >
                {`Showing data ${(page - 1) * rowsPerPage + 1} to ${Math.min(page * rowsPerPage, totalOrders)} of ${totalOrders}`}
              </Typography>
              <Box sx={{ flexShrink: 0 }}>
                <TablePagination
                  component="div"
                  count={totalOrders}
                  page={page - 1}
                  onPageChange={handlePageChange}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  rowsPerPageOptions={[10, 20, 30, 40]}
                />
              </Box>
            </Box>
      </Paper>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <List>
          {disputeAdjustmentDropDown.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton onClick={() => handleSelection(item.id, item.work_flow_id, item.template_type)} dense>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Popover>

      <DetailsForm
        open={detailsOpen}
        workFlowId={workFlowId}
        templateId={templateId}
        orderId={orderId}
        onClose={() => setDetailsOpen(false)}
        templateType={templateType}
      />
    </Box>
  );
}

export default Payments;
