import React, { useState, useEffect, useCallback } from 'react';
import 'antd/dist/reset.css';
import { Tree } from 'antd';
import {
  Box, Typography, TextField, Stack, Breadcrumbs, Paper, Tooltip,
  Button, IconButton, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, CircularProgress, TableContainer,
  Table, TableHead, TableRow, TableCell, TableBody, Link as MuiLink,
  Pagination, Chip, Drawer as MuiDrawer
} from '@mui/material';
import {
  Edit, Visibility, Delete, UploadFile, Download, PersonAdd
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';
import UploadUserAccounts from './upload';
import { paths } from 'src/routes/paths';
import { useTheme } from '@mui/material/styles';


function listToTreeNodes(list) {
  const map = {};
  list.forEach(item => {
    map[item.emp_id] = {
      key: item.emp_id,
      title: (
        <div style={{ lineHeight: 1.2 }}>
          <strong>
            {item.emp_name || ''}
          </strong>
          <br />
          <span style={{ fontSize: 12, color: '#888' }}>
            {item.role_name || '—'}
          </span>
        </div>
      ),
      children: []
    };
  });


  list.forEach(item => {
    const parentId = item.reporting_to;
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[item.emp_id]);
    }
  });

  return list
    .filter(item => !item.reporting_to || !map[item.reporting_to])
    .map(item => map[item.emp_id]);
}

function OrgChartDrawer({ open, onClose, empId, firstName, lastName }) {
  const org = Storage.getJson('userData')?.organization;
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empId) return;
    setLoading(true);
    postService(endpoints.auth.getUserReportingTree, 'POST', {
      orgCode: org,
      empId,
    })
      .then(res => setTreeData(listToTreeNodes(res.data || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [empId, org]);

  return (
    <MuiDrawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 360, p: 2, bgcolor: 'background.default', height: '100%', overflowY: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Hierarchy Chart for {firstName && lastName? `${firstName} ${lastName}`: (empId)}
        </Typography>

        {loading ? (
          <CircularProgress size={24} />
        ) : treeData.length ? (
          <div className="tree-div">
          <Tree
            treeData={treeData}
            defaultExpandAll
            showLine
            blockNode
          />
          </div>
        ) : (
          <Typography>No reporting data</Typography>
        )}

        <Box textAlign="right" mt={2}>
          <Button onClick={onClose}>Close</Button>
        </Box>
      </Box>
    </MuiDrawer>
  );
}

export function UserListView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const userDatas = Storage.getJson('userData');

  const [searchUser, setSearchUser] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [userData, setUserData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const getUserList = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count: total } = await postService(
        endpoints.auth.getUsers,
        'POST',
        {
          search_key: searchUser,
          org_code: userDatas.organization,
          page_number: page,
          page_size: rowsPerPage,
          export: 0,
        }
      );
      setUserData(data || []);
      setTotalCount(total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchUser, page, rowsPerPage, userDatas.organization]);

  useEffect(() => {
    getUserList();
  }, [getUserList]);

  const onDeleteConfirm = useCallback(async () => {
    try {
      await postService(endpoints.auth.deleteUser, 'POST', { id: deleteId });
      setConfirmOpen(false);
      getUserList();
    } catch (err) {
      console.error(err);
    }
  }, [deleteId, getUserList]);

  const onDownloadCSV = useCallback(async () => {
    try {
      const { data } = await postService(
        endpoints.auth.getUsers,
        'POST',
        {
          search_key: searchUser,
          org_code: userDatas.organization,
          page_number: 1,
          page_size: 1000,
          export: 1,
        }
      );
      if (!data.length) return;
      const headers = ['S.No','Employee ID','Name','Role','Email','Reporting User','Status'];
      const csvRows = [ headers.join(',') ];
      data.forEach((row, idx) => {
        csvRows.push([
          idx + 1,
          row.emp_id,
          `${row.first_name} ${row.last_name}`,
          row.role_name,
          row.email,
          row.reporting_to || '--',
          row.user_active ? 'Active' : 'Inactive'
        ].join(','));
      });
      saveAs(new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' }), 'users.csv');
    } catch (err) {
      console.error(err);
    }
  }, [searchUser, userDatas.organization]);

  const onEmpClick = useCallback(user => {
    setSelectedUser(user);
    setDrawerOpen(true);
  }, []);

  const breadcrumbs = [
    <Link key="1" to="/home">Home</Link>,
    <Typography key="2" color="text.primary">Users</Typography>
  ];

  return (
    <Box sx={{ px:3, py:2, minHeight:'100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
      </Stack>

      <Typography variant="h4" gutterBottom>Users</Typography>

      <Paper sx={{ p:1, mb:2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <TextField
            label="Search user name"
            size="small"
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            sx={{ width:'30%' }}
          />
          <Stack direction="row" spacing={2}>
            <Tooltip title="Download Users">
              <IconButton color="primary" onClick={onDownloadCSV}><Download/></IconButton>
            </Tooltip>
            <Tooltip title="Upload Users">
              <IconButton color="primary" onClick={()=>setUploadOpen(true)}><UploadFile/></IconButton>
            </Tooltip>
            <Tooltip title="Add new user">
              <Button  variant="contained"
                sx={{
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        }
                    }}
                startIcon={<PersonAdd/>}
                onClick={()=>navigate(paths.users.create)}
              >
                Add User
              </Button>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>

      {loading ? (
        <Box textAlign="center" mt={5}><CircularProgress/></Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['S.No','Employee ID','Name','Role','Email','Reporting','Status','Actions']
                    .map(header => <TableCell key={header}>{header}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {userData.map((user, idx) => (
                  <TableRow key={user.id}>
                    <TableCell>{(page-1)*rowsPerPage + idx +1}</TableCell>
                    <TableCell>
                       <MuiLink
                        component="button"
                        underline="hover"
                        color="primary"
                        onClick={()=>onEmpClick(user)}
                      >
                        <strong>{user.emp_id}</strong>
                      </MuiLink>            
                    </TableCell>
                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.role_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.reporting_to||'--'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.user_active ? 'Active':'Inactive'}
                        color={user.user_active ? 'success':'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton color="primary" onClick={()=>navigate(paths.users.edit(user.id))}><Edit/></IconButton>
                      </Tooltip>
                      <Tooltip  title="View">
                        <IconButton color="info" onClick={()=>navigate(paths.users.details(user.id))}><Visibility/></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={()=>{ setDeleteId(user.id); setConfirmOpen(true); }}>
                          <Delete/>
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
            <Typography variant="body2">
              Showing {(page-1)*rowsPerPage +1} to {Math.min(page*rowsPerPage, totalCount)} of {totalCount}
            </Typography>
            <Pagination
              count={Math.ceil(totalCount/rowsPerPage)}
              page={page}
              onChange={(_,v)=>setPage(v)}
              color="primary"
            />
          </Box>
        </Paper>
      )}

      <UploadUserAccounts
        visible={uploadOpen}
        onClose={()=>setUploadOpen(false)}
        getUserList={getUserList}
      />

      <Dialog open={confirmOpen} onClose={()=>setConfirmOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={onDeleteConfirm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <OrgChartDrawer
        open={drawerOpen}
        onClose={()=>setDrawerOpen(false)}
        empId={selectedUser?.emp_id}
        firstName={selectedUser?.first_name}
        lastName={selectedUser?.last_name}
      />
    </Box>
  );
}

export default UserListView;
