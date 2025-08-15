import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip
} from "@mui/material";
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  PersonAddAlt1 as PersonAddAlt1Icon
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import postService from "src/utils/httpService";
import { endpoints } from "src/utils/axios";
import { paths } from "src/routes/paths";
import Storage from "src/utils/local-store";
import { useTheme } from '@mui/material/styles';

export function RoleListView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [roles, setRoles] = useState([]);
  const [count, setCount] = useState(0);
  const [showModel, setShowModel] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const userDatas = Storage.getJson("userData");

  useEffect(() => {
    getRoleList();
  }, [page, searchTerm]);

  const getRoleList = () => {
  const payload = {
    page_size: rowsPerPage,
    page_number: page + 1,
    action: "list",
    search_key: searchTerm,
    org_code: userDatas.organization,
  };
  postService(endpoints.auth.getRolesList, "POST", payload)
    .then((res) => {
      let rolesArr = [];
      let totalCount = 0;
      if (
        res.data &&
        Array.isArray(res.data) &&
        Array.isArray(res.data[0])
      ) {
        rolesArr = res.data[0];
        // Prefer count from metadata if present
        if (res.data[1] && typeof res.data[1].rowCount === 'number') {
          totalCount = res.data[1].rowCount;
        } else {
          totalCount = rolesArr.length;
        }
      }
      setRoles(rolesArr);
      setCount(totalCount);
    })
    .catch((err) => console.error("Error fetching roles:", err));
};

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const handleCreateRole = () => navigate("/role/create");

  const handleConfirmDelete = async () => {
    const payload = { id: deleteId };
    try {
      const res = await postService(endpoints.auth.deleteRole, "POST", payload);
      if (res.status) {
        getRoleList();
      }
    } catch (error) {
      console.error("Error deleting role:", error);
    } finally {
      setShowModel(false);
    }
  };

  const handleCancel = () => setShowModel(false);

  const capitalizeWords = (text) =>
    text.replace(/\b\w/g, (char) => char.toUpperCase());

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">
      Home
    </Link>,
    <Typography key="2" sx={{ color: "text.primary" }}>
      Settings
    </Typography>,
    <Typography key="3" sx={{ color: "text.primary" }}>
      Role
    </Typography>,
  ];

  const rolesDataWithSNo = roles.map((item, index) => ({
    ...item,
    s_no: page * rowsPerPage + index + 1,
  }));

  return (
    <Box sx={{ px: 3, py: 2, minHeight: "100vh" }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>
      <Typography variant="h4" gutterBottom>
        Role
      </Typography>

      <Paper sx={{ boxShadow: 3, p: 1, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <TextField
            label="Search role name"
            size="small"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ width: "30%" }}
          />
          <Tooltip title="Create new role">
          <Button variant="contained" sx={{
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        }
                    }} onClick={handleCreateRole} startIcon={<PersonAddAlt1Icon />}>
            Add Role
          </Button>
          </Tooltip>
        </Box>
      </Paper>

      <Paper sx={{ boxShadow: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>S.No</TableCell>
                <TableCell>Role</TableCell>
                {/* <TableCell>Role Id</TableCell> */}
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rolesDataWithSNo.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.s_no}</TableCell>
                  <TableCell>{capitalizeWords(row.role_name)}</TableCell>
                  {/* <TableCell>{row.role_id}</TableCell> */}
                  <TableCell>{row.description || "--"}</TableCell>
                  <TableCell>
                  <Tooltip title="Edit Role">
                    <IconButton color="primary" onClick={() => navigate(paths.role.edit(row.role_id))}>
                      <EditIcon />
                    </IconButton>
                    </Tooltip>
                    <Tooltip color="info" title="View Role">
                    <IconButton onClick={() => navigate(paths.role.details(row.role_id))}>
                      <VisibilityIcon />
                    </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Role">
                    <IconButton
                      color="error"
                      onClick={() => {
                        setShowModel(true);
                        setDeleteId(row.role_id);
                      }}
                      >
                      <DeleteIcon />
                    </IconButton>
                      </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

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
            {`Showing data ${page * rowsPerPage + 1} to ${Math.min((page + 1) * rowsPerPage, count)} of ${count}`}
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
          <TablePagination
            component="div"
            count={count}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 30, 40]}
          />
          </Box>
        </Box>
      </Paper>

      <Dialog open={showModel} onClose={handleCancel}>
        <DialogTitle>Are you sure you want to delete this role?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action cannot be undone. The role data will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Yes, confirm
          </Button>
          <Button onClick={handleCancel}>No, cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RoleListView;