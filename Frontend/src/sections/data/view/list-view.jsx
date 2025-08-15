import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  CircularProgress,
  Stack,
  Breadcrumbs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import { DatePicker } from 'antd';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import dayjs from 'dayjs';

import DisputeForm from './disputeForm';
import DetailsForm from './detailsForm';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { Link } from 'react-router-dom';

const { RangePicker } = DatePicker;

export function OrdersAndDisputes() {
  const theme = useTheme();
  const userData = Storage.getJson('userData');

  const [orders, setOrders] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [disputeAdjustmentList, setDisputeAdjustmentList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [selectedTemplateType, setSelectedTemplateType] = useState('');

  useEffect(() => {
    fetchDisputeAdjustments();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [search, selectedMonth, page, rowsPerPage]);

  const fetchDisputeAdjustments = useCallback(async () => {
    try { 
      const orgCode = JSON.parse(localStorage.getItem('userData'))
      const licencePROList = JSON.parse(localStorage.getItem('licencePROList'))       
      const templateIds = licencePROList.map(item => item.template_id);
      const res = await postService(endpoints.auth.getDisputeorAdjustmentDropDown, 'POST', {
        search_key: '',
        type: null,
        org_code: orgCode.organization ,
        template_ids: templateIds, 
      });
      if (Array.isArray(res.data)) {
        setDisputeAdjustmentList(res.data);
      }
    } catch (error) {
      console.error('Error fetching dispute adjustments:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = {
        org_code: userData.organization,
        user_id: userData.user_id,
        type: 1,
        search_key: search,
        from: selectedMonth[0]?.format('YYYY-MM-DD'),
        to: selectedMonth[1]?.format('YYYY-MM-DD'),
        page_size: rowsPerPage,
        page_number: page,
      };
  
      const res = await postService(endpoints.external_api.getOrdersData, 'POST', payload);
  
      if (res.status && Array.isArray(res.rows)) {
        const rowsWithSNo = res.rows.map((item, index) => {
          const formatDate = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
              .getDate()
              .toString()
              .padStart(2, '0')}/${date.getFullYear()}`;
          };
  
          return {
            ...item,
            s_no: (page - 1) * rowsPerPage + index + 1,
            date: formatDate(item.date),
            incentive_date: formatDate(item.incentive_date),
          };
        });
        setOrders(rowsWithSNo);
        setTotalOrders(res.count);
  
        const headers = Array.isArray(res.headers) ? [...res.headers] : [];
        const updatedHeaders = [
          { key: 's_no', label: 'S.No' },
          ...headers,
          { key: 'action', label: 'Action' },
        ];
        setColumns(updatedHeaders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedMonth, page, rowsPerPage, userData]);

  const handlePopoverOpen = (event, id) => {
    console.log(event)
    console.log(id)
    setSelectedOrderId(id);
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => setAnchorEl(null);

  const handleOptionSelect = (templateId, workflowId, templateType) => () => {
    setSelectedTemplateId(templateId);
    setSelectedWorkflowId(workflowId);
    setSelectedTemplateType(templateType);
    setIsDetailsOpen(true);
    setAnchorEl(null);
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
      Data
    </Typography>,
  ];

  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>
      <Typography variant="h4" gutterBottom>
        Data
      </Typography>

      <Paper sx={{ mb: 1, boxShadow: 3, p: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <TextField
            label="Search"
            size="small"
            value={search}
            onChange={handleSearchChange}
            sx={{ width: '30%' }}
          />
          <RangePicker value={selectedMonth} onChange={handleMonthChange} />
        </Box>
      </Paper>

      <Paper sx={{ boxShadow: 3 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100px">
            <CircularProgress />
          </Box>
        ) : (
          <Box>
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
                            <IconButton
                              onClick={(event) => handlePopoverOpen(event, row.prod_orders_row_id)}
                              aria-label="open actions"
                            >
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



          </Box>
        )}
      </Paper>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <List>
          {disputeAdjustmentList.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                onClick={handleOptionSelect(item.id, item.work_flow_id, item.template_type)}
                dense
              >
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Popover>

      <DetailsForm
        open={isDetailsOpen}
        workFlowId={selectedWorkflowId}
        templateId={selectedTemplateId}
        orderId={selectedOrderId}
        onClose={() => setIsDetailsOpen(false)}
        templateType={selectedTemplateType}
      />
    </Box>
  );
}

export default OrdersAndDisputes;