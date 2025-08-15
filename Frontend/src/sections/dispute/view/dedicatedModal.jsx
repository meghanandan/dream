import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Button,
    Modal, Stepper, Step, StepLabel, IconButton, FormControl, Select, InputLabel, Grid, MenuItem, 
    TextField,DialogTitle,DialogContent,DialogActions,Dialog
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import Storage from "src/utils/local-store";

const steps = ['Initiated', 'Under Review', 'Resolved'];

const DedicatedModal = ({ open, onClose, onSave, users,selectedRows,rowData,userId  }) => {
     const [openSuccessModal, setOpenSuccessModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [selectUsers,setSelectUsers]=useState('');
    const userData = Storage.getJson("userData");

    const saveWorkFlow = () => {

        const payload = {
                "dispute_ids":selectedRows,
                "done_by":userData.user_id,
                "assigned_to" :selectUsers,
                "assigned_from":userId
             }
        try {
            postService(endpoints.auth.performDelegation, 'POST', payload).then((res) => {
                if (res.status) { // Fixed typo: 'lengt' -> 'length'
                    setSelectUsers('');
                    setAlertMessage(res.message);
                    setOpenSuccessModal(true);
                    onSave?.();
                    // Use updatedPages as needed
                } else {
                    console.log('No data found.');
                }
            }).catch((erro) => {
                console.error('Error while fetching master pages:', erro);
            });

            // setLoading(false);
        }
        catch (err) {
            console.error("Error while adding cluster:", err.response.data.message);
            // setLoading(false);
        }
    }

    return (
        <>
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    p: 4,
                    bgcolor: 'white', // Ensures background is white
                    width: 500,
                    mx: 'auto',
                    mt: 10,
                    borderRadius: 2,
                    boxShadow: 3,
                    position: 'relative',
                    color: 'black' // Ensures text and icons are visible
                }}
            >
                <IconButton
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'black', // Ensures the icon is visible
                    }}
                    onClick={onClose}
                >
                    <Close />
                </IconButton>
                {/* Centered Title */}
                <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>
                Delegation 
                </Typography>

                {/* Stepper */}

                {/* Status Dropdown */}
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Select Users </InputLabel>
                            <Select
                                value={selectUsers}
                                onChange={(e) => setSelectUsers(e.target.value)}
                            >
                                {/* <MenuItem value="1">Pending</MenuItem> */}
                                {users.map((item)=>(
                                     <MenuItem value={item.id}>{item.name}</MenuItem>
                                ))}
                              
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Buttons - Aligned Side by Side */}
                    <Grid item xs={12} display="flex" justifyContent="space-between">
                        <Button
                            variant="contained"
                            startIcon={<Save />}
                            sx={{ flex: 1, mr: 1 }}
                            onClick={saveWorkFlow}
                        >
                            Save
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Close />}
                            sx={{ flex: 1 }}
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                    </Grid>
                </Grid>

                {/* Buttons: Next & Cancel */}
            </Box>
        </Modal>

<Dialog
open={openSuccessModal}
onClose={() => setOpenSuccessModal(false)}
>
<DialogTitle>Success</DialogTitle>
<DialogContent>{alertMessage}</DialogContent>
<DialogActions>
  <Button onClick={() =>{ setOpenSuccessModal(false);  onClose();}} color="primary">
    OK
  </Button>
</DialogActions>
</Dialog>
</>

    );
};

export default DedicatedModal;
