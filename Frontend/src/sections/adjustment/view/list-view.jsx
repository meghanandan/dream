import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Checkbox,
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
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import { DatePicker } from "antd";
import { MoreVert as MoreOutlined } from "@mui/icons-material";
import postService from "src/utils/httpService";
import { endpoints } from "src/utils/axios";
import Storage from "src/utils/local-store";
import { Link } from "react-router-dom";

const { RangePicker } = DatePicker;

const columnData = [
  { key: "order_code", title: "Order ID" },
  { key: "customer_name", title: "Customer Name" },
  { key: "dispute_reason", title: "Dispute Reason" },
  { key: "dispute_status", title: "Dispute Status" },
  { key: "credit_amount", title: "Dispute Amount" },
  { key: "order_incentive_date", title: "Dispute Date" },
  { key: "action", title: "Action" }
];

export function Adjustments() {
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState(columnData);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [disputeAdjustmentDropDown, setDisputeAjustmentDropDown] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const userData = Storage.getJson("userData");

  useEffect(() => {
    getOrders();
    fetchDropdownData();
  }, [page, rowsPerPage]);

  const getOrders = () => {
    const payload = {
      user_id: userData.user_id,
      org_code: userData.organization,
      type: 2,
      page_size: rowsPerPage,
      page_number: page + 1,
    };

    postService(endpoints.auth.getDisputeList, "POST", payload)
      .then((res) => {
        if (res?.data?.length < 0) {
          setColumns([...(res.headers || []), { key: "action", title: "Action" }]);
          setTableData(res.data);
          setTotalOrders(res.count);
        } else {
          setTableData([]);
          setTotalOrders(0);
        }
      })
      .catch((err) => console.error("Error while fetching orders:", err));
  };

  const fetchDropdownData = () => {
    const payload = { search_key: "", type: null };

    postService(endpoints.auth.getDisputeorAdjustmentDropDown, "POST", payload)
      .then((res) => {
        if (res?.data?.length > 0) {
          setDisputeAjustmentDropDown(res.data);
        }
      })
      .catch((err) => console.error("Error while fetching dropdown data:", err));
  };

  const handlePopoverOpen = (event, id) => {
    setSelectedOrderId(id);
    setAnchorEl(event.currentTarget);
    setPopoverOpen(true);
  };

  const handlePopoverClose = () => {
    setPopoverOpen(false);
    setAnchorEl(null);
  };

  const handleToggle = (id) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">
      Home
    </Link>,
    <Typography key="3" sx={{ color: 'text.primary' }}>
      Adjustments
    </Typography>,
  ];

  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>
      <Typography variant="h4" gutterBottom>
        Adjustments
      </Typography>

      <Paper sx={{ boxShadow: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.title}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow key={row.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.key === 'action' ? (
                        <IconButton onClick={(e) => handlePopoverOpen(e, row.id)}>
                          <MoreOutlined />
                        </IconButton>
                      ) : (
                        row[col.key] || '--'
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Popover
          open={popoverOpen}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <List>
            {disputeAdjustmentDropDown.map((item) => (
              <ListItem key={item.id} dense>
                <Checkbox
                  checked={checkedItems.includes(item.id)}
                  onChange={() => handleToggle(item.id)}
                />
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
          </List>
        </Popover>

        <Box display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={1}
              sx={{
                flexWrap: 'wrap', 
                gap: 1,
              }}>
          <Typography variant="body2"
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                flex: 1,
              }}>
            {`Showing data ${page * rowsPerPage + 1} to ${Math.min((page + 1) * rowsPerPage, totalOrders)} of ${totalOrders}`}
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
          <TablePagination
            component="div"
            count={totalOrders}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 30, 40]}
          />
        </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default Adjustments;
