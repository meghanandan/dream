import React, { useEffect, useState } from "react";
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
    Grid,
    InputLabel,
    FormControl,
    Typography
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import postService from "src/utils/httpService";
import Storage from "src/utils/local-store";
import { endpoints } from "src/utils/axios";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import { useNavigate, useParams } from 'react-router';

// ✅ Form Validation Schema (Yup)
const disputeSchema = yup.object().shape({
    disputeType: yup.string().required("Select dispute type"),
    disputeTemplate: yup.string().required("Select dispute template"),
});

const DetailsForm = ({ open, onClose, workFlowId, templateId, orderId,templateType }) => {
      const theme = useTheme();
    const navigate = useNavigate();
    const [disputeTemplates, setDisputeTemplates] = useState([]);
    const [dataAPI,setDataAPI]=useState([]);
    const [alert, setAlert] = useState(null);
        const userData = Storage.getJson("userData");


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
            };

            const res = await postService(endpoints.auth.raiseDispute, "POST", payload);

            if (res?.data) {
                setDisputeTemplates(res.data.fields);
                setDataAPI(res.data.fields);
            } else {
                setDisputeTemplates([]);
                console.warn("No dispute templates found.");
            }
        } catch (error) {
            console.error("Error fetching dispute templates:", error);
        }
    };

    function compareAndAddNegativeFlag(data, apiData) {
        // Find the object where id is 4
        const originalItem = apiData.find(apiItem => apiItem.id === 4);
    
        console.log(originalItem); // Debugging output
    
        return originalItem; // Return the specific object
    }
    

  

    // function compareAndAddNegativeFlag(data, apiData) {
    //     return data.map(item => {
    //         const originalItem = apiData.find(apiItem => apiItem.name === item.name);
    //         if (!originalItem) return item; // Return as is if no matching API data.
    
    //         const originalValue = isNumeric(originalItem.value) ? parseFloat(originalItem.value) : originalItem.value;
    //         const updatedValue = isNumeric(item.value) ? parseFloat(item.value) : item.value;
    
    //         console.log(`Checking ${item.name}: Original = ${originalValue}, Updated = ${updatedValue}`);
    
    //         if (
    //             typeof originalValue === "number" &&
    //             typeof updatedValue === "number" &&
    //             !Number.isNaN(originalValue) &&
    //             !Number.isNaN(updatedValue) &&
    //             originalValue !== updatedValue
    //         ) {
    //             return {
    //                 ...item,
    //                 is_negative: updatedValue < originalValue,  // Flag if value decreases
    //                 ...originalItem  // Store original value
    //             };
    //         }
    
    //         return { ...item }; // Return unchanged if no numeric change
    //     });
    // }
    
    // Helper function to check if a value is numeric
    function isNumeric(value) {
        return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
    }
    
    const handleSubmit = async() => {
       
    const data=disputeTemplates;
        // Generate the updated data with the negative flag
        const updatedData = compareAndAddNegativeFlag(data, dataAPI);
    updatedData.is_negative=true;
    updatedData.visible=false;
    data.push(updatedData);
        // Ensure all objects have is_negative (default to false if missing)
       
    const payload={
        org_code:userData.organization,
        work_flow_id:workFlowId,
        template_id:templateId,
        template_type:2,
       created_by:userData.user_id,
       fields:data
    }
    const res = await postService(endpoints.auth.createDispute, "POST", payload);
    if (res.status) {
        setAlert({ severity: 'succes', message: '' })
        if(templateId===1){
            navigate('/disputes');
            setDisputeTemplates([]);
            setDataAPI([]);
            onClose();
        }else{
            navigate('/disputes');
            setDisputeTemplates([]);
            setDataAPI([]);
            onClose();
        }
    } else {
        setAlert({ severity: 'error', message: 'Role Name already exists.' })
    }
       
    };
    
    
    
    
    
    const handleChangeSelect = (fie, value) => {
        const updatedTemplates = disputeTemplates.map((field) => {
            if (field.name === fie.name) {
                if (field.element === "date") {
                    return { 
                        ...field, 
                        value: value ? dayjs(value).format("YYYY-MM-DD") : "", 
                        is_negative: false 
                    };
                }
    
                const isNegative = !field.disable && field.field_id === undefined;
                return { ...field, value, is_negative: false };
            }
            return field;
        });
    
        setDisputeTemplates(updatedTemplates);
    };
    

    return (
        <Dialog open={open} fullWidth maxWidth="md">
            <DialogTitle>Sales Commission Dispute Form</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Please review the pre-filled information and complete the dispute details.
                </Typography>
                    <Grid container spacing={2}>
                        {/* 🔹 Select Dispute Type */}
                        {disputeTemplates && disputeTemplates.map((item, key) => (
                            item.element === 'input' && item.visible ? (
                                <Grid item xs={12} md={4} key={key}>
                                    <TextField
                                        fullWidth
                                        label={item.label}
                                        value={item.value}
                                        onChange={(e) => handleChangeSelect(item, e.target.value)}
                                        disabled={item.disable}
                                    // disabled={section === 'details' ? section === 'details' : item.disable}
                                    />
                                </Grid>
                            )
                                : item.element === 'text' && item.visible ? (
                                    <Grid item xs={12} md={4} key={key}>
                                        <TextField
                                            fullWidth
                                            label={item.label}
                                            value={item.value}
                                            onChange={(e) => handleChangeSelect(item, e.target.value)}
                                            disabled={item.disable}
                                        // disabled={section === 'details' ? section === 'details' : item.disable}
                                        />
                                    </Grid>

                                ) : item.element === 'number' && item.visible ? (
                                    <Grid item xs={12} md={4} key={key}>
                                        <TextField
                                            fullWidth
                                            label={item.label}
                                            value={item.value}
                                            onChange={(e) => handleChangeSelect(item, e.target.value)}
                                            disabled={item.disable}
                                        // disabled={section === 'details' ? section === 'details' : item.disable}
                                        />
                                    </Grid>

                                ) : item.element === 'date' && item.visible ? (
                                    <Grid item xs={12} md={4} key={key}>
                                        <DatePicker
                                         label={item.label}
                                            // value={new Date()}
                                            onChange={(newDate) => handleChangeSelect(item, newDate)}
                                            // onChange={console.log}
                                            // renderInput={(props) => (
                                            //     <TextField {...props} helperText="valid mask" />
                                            // )}
                                        />
                                    </Grid>) :
                                    (<Grid item xs={12} md={4} key={key}>
                                        <FormControl fullWidth>
                                            <InputLabel id="demo-simple-select-label">{item.label}</InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={item.value}
                                            // onFocus={() => handleBlur(item)}
                                            // onKeyDown={(e) => {
                                            //     e.stopPropagation(); // Prevents event bubbling
                                            //     handleKeyDown(item, e); // Custom handler
                                            // }}
                                            onChange={(e) => handleChangeSelect(item, e.target.value)}
                                            // disabled={section === 'details'}
                                            >
                                                {/* {userOptions.map((option) => (
                                                <MenuItem value={option.id}>{option.name}</MenuItem>
                                            ))} */}

                                            </Select>
                                        </FormControl>
                                    </Grid>)
                        ))}


                        {/* 🔹 Select Dispute Template */}

                    </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleSubmit} variant="contained" sx={{
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        }
                    }}>
                    Create
                </Button>
                <Button onClick={onClose} variant="outlined" color="secondary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DetailsForm;
