import React, { useState } from "react";
import {
    Grid, Typography, Box, Paper, Button, IconButton, Accordion, AccordionActions, AccordionSummary, AccordionDetails, Dialog,
    DialogTitle,
    DialogContent, MenuItem, Select, InputLabel, FormControl,
    DialogActions
} from "@mui/material";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import CloseIcon from "@mui/icons-material/Close";
import { HTML5Backend } from "react-dnd-html5-backend";
import { red } from "@mui/material/colors";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import JoinFullIcon from '@mui/icons-material/JoinFull';
import AddIcon from '@mui/icons-material/Add';
import CustomFieldDialog from "../../custom-fields/components/CustomFieldDialog";
import PreViewModel from "./preview";
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';
import { useTheme } from '@mui/material/styles';

const ItemType = "ITEM";

const DroppableArea = ({ categoryKey, collectionKey, expectedDataType, onItemUpdate }) => {
    const [selectedFields, setSelectedFields] = useState([]);

    const [, drop] = useDrop({
        accept: ItemType,
        drop: (item) => {
            console.log('Dropped Item:', item); // ✅ Debugging
            console.log('Dropping into categoryKey:', categoryKey);
            console.log('Dropping into collectionKey:', collectionKey);
            if (item.data_type !== expectedDataType) {
                alert(`Error: Only ${expectedDataType} type fields can be dropped here.`);
                return;
            }
            setSelectedFields((prevFields) => {
                const exists = prevFields.some((field) => field.key_id === item.key_id);
                console.log('exists', exists, prevFields);
                if (!exists) {
                    const updatedFields = [...prevFields, item];
                    console.log('Updated Fields:', updatedFields);
                    onItemUpdate(categoryKey, collectionKey, updatedFields); // ✅ Fix: Pass collectionKey
                    return updatedFields;
                }
                return prevFields;
            });
        },
    });

    const handleRemoveItem = (index) => {
        setSelectedFields((prevFields) => {
            const updatedFields = prevFields.filter((_, i) => i !== index);
            console.log('After Removal, Updated Fields:', updatedFields);
            onItemUpdate(categoryKey, collectionKey, updatedFields); // ✅ Fix: Pass collectionKey
            return updatedFields;
        });
    };

    return (
        <Box ref={drop} sx={{ padding: 1, border: "1px dashed grey", minHeight: "35px", borderRadius: "4px", width: 300 }}>
            {selectedFields.map((field, index) => (
                <Button key={field.id} variant="outlined" size="small" sx={{ width: "200px" }}>
                    {field.key_label}
                    <IconButton size="small" onClick={() => handleRemoveItem(index)} sx={{ ml: 1, color: "red" }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Button>
            ))}
        </Box>
    );
};


// const DATA_TYPES =[ {
//     id:"bigint",
//     name: "Integer"},{   // double_precision:"Floting Point",
//     // char:"Character",
//     id:"character varying",
//     name: "String"
//     // text:"Text",
//     // boolean:"Boolean",
//     // timestamp_without_time_zone:"Date"

// }]

const DraggableItem = ({ item }) => {
    
    const [showDroppable, setShowDroppable] = useState(false);
    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item,
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });


    return (
        <div
            ref={drag}
            style={{
                padding: "4px",
                margin: "3px 0",
                backgroundColor: isDragging ? "#ddd" : "#fff",
                cursor: "grab",
                border: "1px solid #ccc",
                borderRadius: "4px",
                // width: 300,
            }}
        >
            {item.icon}  {item.key_label}
        </div>
    );
};

const DragDropGrid = ({ state, onSubmitCustom, selectedItems, setSelectedItems }) => {
    const theme = useTheme();
    const [visibleDroppableAreas, setVisibleDroppableAreas] = useState({});
    // const [selectedItems, setSelectedItems] = useState([]);
    const [openCustomField, setOpenCustomField] = useState(false);
    const [previewModel, setPreviewModel] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectValue, setSelectValue] = useState('');
    const [selectall,setSelectall]=useState([])


    const handleJoinClick = (collectionKey, key) => {
        setVisibleDroppableAreas((prev) => {
            // Ensure collectionKey exists in previous state, otherwise initialize it
            const updatedCollection = prev[collectionKey] ? { ...prev[collectionKey] } : {};


            // Toggle the specific key inside the collectionKey
            updatedCollection[key] = !prev[collectionKey]?.[key];
            setOpen(updatedCollection.order_id);
            console.log('updatedCollection', updatedCollection);
            return {
                ...prev,  // Preserve existing state
                [collectionKey]: updatedCollection,  // Update the specific collection
            };
        });
        ;
        // setVisibleDroppableAreas(true);
    };




    // Store selected items in state
    const handleItemUpdate = (categoryKey, collectionKey, items, foreign_keys) => {
        console.log('categoryKey:', categoryKey);
        console.log('collectionKey:', collectionKey);
        console.log('items:', items);
        console.log('foreign_keys', foreign_keys)
        if (collectionKey === 'foreign_keys') {
            if (!Array.isArray(items)) {
                console.error('Error: items is not an array!', items);
                return;
            }

            setSelectedItems((prev) => {
                // Get existing items under collectionKey and categoryKey
                const existingItems = (prev[collectionKey] || []);
console.log('testing',items);
                // Merge old & new items
                // const updatedItems = [...existingItems, ...items];
                return {
                    ...prev,
                    [collectionKey]: {items}
                };
            });
        } else {
            if (!Array.isArray(items)) {
                console.error('Error: items is not an array!', items);
                return;
            }

            setSelectedItems((prev) => {
                // Get existing items under collectionKey and categoryKey
                const existingItems = (prev[collectionKey]?.[categoryKey] || []);

                // Merge old & new items
                // const updatedItems = [...existingItems, ...items];
                return {
                    ...prev,
                    [collectionKey]: {
                        ...(prev[collectionKey] || {}), // Preserve existing data in collectionKey
                        [categoryKey]: items, // Update only the specific categoryKey
                    },
                };
            });
        }

    };





    const handleSubmit = () => {
        const selectedFields = Object.entries(selectedItems).map(([categoryKey, fields]) => ({
            categoryKey,
            fields,
        }));

        console.log('testing', selectedFields);
        // alert(JSON.stringify(selectedFields, null, 2)) // Show in alert for testing
    };
    const onClose = () => {
        setOpen(false);
    }
    const handleBlur=()=>{
                    const payload = {
                        "name":"foreign_key_data_types"
                    }
                    try {
                        postService(endpoints.external_api.dropDownApi, 'POST', payload).then((res) => {
                            if (res.data.length > 0) { // Fixed typo: 'lengt' -> 'length'
                                // Use updatedPages as needed
                                setSelectall([...res.data]);
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
        <DndProvider backend={HTML5Backend} >
            <div className={open ? "blur-background" : ""}>
            <Grid container spacing={2} sx={{ mt: 4, overflowX: "auto", flexWrap: "nowrap", display: "flex" }} >
                {state.map((group, groupIndex) => (
                    <Grid item key={groupIndex} xs={6} sm={4} md={state.length === 2 ? 4 : 4} sx={{ boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)" }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>{group.api_name}</Typography>
                        {group.collections.map((category, categoryIndex) => (
                            <Box key={categoryIndex} sx={{ mb: 2 }}>
                                {category.keys.length !== 0 && <Typography variant="h6" sx={{ mb: 1 }}>{category.collection_label}</Typography>}
                                <Paper sx={{ padding: "4px" }}>
                                    {/* If category.row is empty, render rowKeys */}
                                    {category.keys.length === 0 ? (
                                        <>
                                            <Typography>{category.collection_label}</Typography>
                                            {category.rows.map((rowKeys) => (
                                                <Box key={rowKeys.key}>
                                                    <Typography>{rowKeys.key_label}</Typography>

                                                    <Grid sx={{ display: "flex", mb: 2 }}>
                                                        {/* Main Droppable Area */}
                                                        <DroppableArea
                                                            categoryKey={rowKeys.key_code}
                                                            collectionKey={rowKeys.collection_code}
                                                            expectedDataType={rowKeys.data_type}

                                                            onItemUpdate={handleItemUpdate}
                                                        />

                                                        {/* Join Button - Only for 'ID' */}
                                                        {rowKeys.key_code === 'order_id' && (
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                sx={{ ml: 2, mr: 2, width: "20px", color: '#fda92d', minHeight: "35px" }}
                                                                onClick={() => handleJoinClick(category.collection_code, rowKeys.key_code)}
                                                                startIcon={<JoinFullIcon />}
                                                            >
                                                                Join
                                                            </Button>
                                                        )}
                                                    </Grid>

                                                    {/* Conditionally render DroppableArea based on `visibleDroppableAreas` */}
                                                    {visibleDroppableAreas?.[category.collection_code]?.[rowKeys.key_code] && (
                                                        <DroppableArea
                                                            categoryKey={rowKeys.key_code}
                                                            collectionKey='foreign_keys'
                                                            // collectionKey={category.collection_code}
                                                            expectedDataType={selectValue}
                                                            foreign_keys='foreign_keys'
                                                            onDrop={() => { }}
                                                            onItemUpdate={handleItemUpdate}
                                                        />
                                                    )}
                                                    {/* {visibleDroppableAreas&& (
                                                        <DroppableArea
                                                        categoryKey={rowKeys.key_code}
                                                        collectionKey='foreign_keys'
                                                        expectedDataType={rowKeys.data_type}
                                                        foreign_keys='foreign_keys'
                                                            onDrop={() => { }}
                                                            onItemUpdate={handleItemUpdate}
                                                        />
                                                    )} */}
                                                </Box>
                                            ))}

                                            <Button
                                               variant="contained" sx={{ml: 2, mt: 2,
                                                backgroundColor: theme.palette.primary.main,
                                                '&:hover': {
                                                backgroundColor: theme.palette.primary.dark,
                                                }
                                            }}
                                                size="small"
                                                startIcon={<AddIcon />} onClick={() => setOpenCustomField(true)}
                                            >  Add Custom Field
                                            </Button>


                                        </>
                                    ) : (
                                        /* If category.row is not empty, render draggable items */
                                        category.keys.map((item) => <DraggableItem key={item.id} item={item} />)
                                    )}
                                </Paper>

                                <CustomFieldDialog
                                    open={openCustomField}
                                    data={[]}
                                    onClose={() => setOpenCustomField(false)} onSubmitCustom={onSubmitCustom}
                                    slug='data-source'
                                />

                                {/* <CustomFieldDialog
                                    open={openCustomField}
                                    onClose={() => setOpenCustomField(false)} onSubmitCustom={onSubmitCustom}
                                /> */}



                            </Box>
                        ))}
                    </Grid>
                ))}
            </Grid>
            {/* <Button variant="contained" color="primary" sx={{ mt: 4 }} onClick={handleSubmit}>
                Submit
            </Button> */}

            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>Choose the Data Type</DialogTitle>
                <DialogContent dividers>
                    <Grid item xs={12} md={6} sx={{ pt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel id="demo-simple-select-label">Data Type</InputLabel>
                            <Select
                                size="small"
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={selectValue}
                                onFocus={() => handleBlur()}
                                onChange={(e) => setSelectValue(e.target.value)}

                            >
                                {selectall.map((option) => (
                                    <MenuItem value={option.id}>{option.name}</MenuItem>
                                ))}

                            </Select>
                        </FormControl>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={onClose} variant="outlined" color="error" >
                        Cancel
                    </Button>
                    <Button onClick={onClose} variant="contained"  >
                        Save
                    </Button>

                </DialogActions>
            </Dialog>
            </div>
        </DndProvider>
    );
};



export default DragDropGrid;
