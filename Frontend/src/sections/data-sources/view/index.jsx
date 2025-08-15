import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TextField,
  IconButton,
  Box,
  Stepper,
  Step,
  Grid,
  StepLabel,
  Card,
  Accordion,
  AccordionActions,
  AccordionSummary,
  AccordionDetails,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { blue, purple } from '@mui/material/colors';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import RemoveIcon from '@mui/icons-material/Remove';
import DragDropGrid from './draganddrop';
import PreViewModel from './preview';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';
import { useRouter } from 'src/routes/hooks';
import WarningIcon from '@mui/icons-material/Warning';
import { Link } from 'react-router-dom';

const steps = ['Select Collection and Keys', 'Map to DREAM'];

const grid = 2;

export function DataSources() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [dropdownValue, setDropdownValue] = useState('');
  const [savedData, setSavedData] = useState([]);
  const [accordionData, setAccordionData] = useState([]);
  const [state, setState] = useState([]);
  const [previewModel, setPreviewModel] = useState(false);
  const userData = Storage.getJson('userData');
  const [alert, setAlert] = useState(null);
  const [formError, setFormError] = useState('');
  const [dropItem, setDropItem] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [preViewHeader, setPreViewHeader] = useState([]);
  const [preViewData, setPreViewData] = useState([]);
  const [searchQueries, setSearchQueries] = useState({});
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [accordionRawData, setAccordionRawData] = useState([]);

  const router = useRouter();

  useEffect(() => {
    getCollectionsKeysList();
  }, []);

  const getCollectionsKeysList = async () => {
    try {
      // Construct the API URL correctly
      const payload = {
        org_code: userData.organization,
      };
      // Assuming postService can handle GET requests
      const result = await postService(endpoints.external_api.collectionsKeysList, 'POST', payload);
      if (result?.status) {
        setAccordionData(result.data);
        setAccordionRawData(result.data);
        setDropItem(result.data);
      } else {
        setAlert({ severity: 'error', message: 'Failed to fetch configuration.' });
      }
    } catch (error) {
      console.error(
        'Error while fetching configuration:',
        error.response?.data?.message || error.message
      );
      setFormError('Failed to fetch configuration. Please try again.');
    }
  };
  // const [state, setState] = useState([getItems(3), getItems(1, 1)]);

  const handleNext = async (next) => {
    if (next === 1) {
      if (!savedData || savedData.length === 0) {
        setAlertMessage('Please select at least one option before saving.');
        // setAlert({ severity: "success", message: res.message });
        setOpenSuccessModal(true);
        setAlert({
          severity: 'error',
          message: 'Please select at least one option before saving.',
        });
        return;
      }
      try {
        // Construct the API URL correctly
        const payload = {
          data: savedData,
          org_code: userData.organization,
          user_id: userData.user_id,
        };
        // Assuming postService can handle GET requests
        const result = await postService(
          endpoints.external_api.storeUserSelections,
          'POST',
          payload
        );
        if (result?.status) {
          setActiveStep((prevStep) => prevStep + 1);
          try {
            // Construct the API URL correctly
            const payloadSelectList = {
              org_code: userData.organization,
              user_id: userData.user_id,
            };
            // Assuming postService can handle GET requests
            const getResult = await postService(
              endpoints.external_api.getUserSelectionList,
              'POST',
              payloadSelectList
            );
            if (getResult?.status) {
              setState(getResult.data);
              // setAccordionData(result.data);
              // setDropItem(result.data);
            } else {
              setAlert({ severity: 'error', message: 'Failed to fetch configuration.' });
            }
          } catch (error) {
            console.error(
              'Error while fetching configuration:',
              error.response?.data?.message || error.message
            );
            setFormError('Failed to fetch configuration. Please try again.');
          }
        } else {
          setAlert({ severity: 'error', message: 'Failed to fetch configuration.' });
        }
      } catch (error) {
        console.error(
          'Error while fetching configuration:',
          error.response?.data?.message || error.message
        );
        setFormError('Failed to fetch configuration. Please try again.');
      }
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
    if (next === 2) {
      //             const flattenedKeys = Object.values(selectedItems)  // gets each category object
      //   .flatMap(category => Object.values(category))     // gets each array of keys per field group
      //   .flat();
      const transformedData = transformSelectedItemsToData(selectedItems);
      if (!transformedData.data || transformedData.data.length === 0) {
        setAlertMessage('Please select at least one item Drag and Drop.');
        // setAlert({ severity: "success", message: res.message });
        setOpenSuccessModal(true);
        return;
      }

      try {
        // Construct the API URL correctly
        const payload = {
          org_code: userData.organization,
          user_id: userData.user_id,
          foreign_keys: selectedItems.foreign_keys,
          data: transformedData.data,
        };
        // Assuming postService can handle GET requests
        const result = await postService(
          endpoints.external_api.buildJoinAndSyncData,
          'POST',
          payload
        );
        if (result?.status) {
          router.push('/set-up');
          // setActiveStep((prevStep) => prevStep + 1);
          console.log('testing', result);
        } else {
          setAlert({ severity: 'error', message: 'Failed to fetch configuration.' });
        }
      } catch (error) {
        console.error(
          'Error while fetching configuration:',
          error.response?.data?.message || error.message
        );
        setFormError('Failed to fetch configuration. Please try again.');
      }
    }
  };

  const transformSelectedItemsToData = (selectedItem) => {
    console.log('selectedItem:', selectedItem);

    const flatKeys = [];
    Object.entries(selectedItem).forEach(([tableName, fieldGroups]) => {
      Object.entries(fieldGroups).forEach(([fieldName, itemsArray]) => {
        if (!Array.isArray(itemsArray)) {
          console.warn(`Skipping ${fieldName}: Expected an array but got`, itemsArray);
          return; // Skip non-array values
        }

        itemsArray.forEach((item) => {
          flatKeys.push({
            field_name: fieldName, // from the inner key (e.g., "order_id")
            table_name: tableName, // from the outer key (e.g., "prod_orders")
            external_api_code: item.external_api_code,
            collection_code: item.collection_code,
            key_code: item.key_code,
            key_label: item.key_label,
            data_type: item.data_type,
          });
        });
      });
    });

    // Group by external_api_code
    const groups = {};
    flatKeys.forEach((item) => {
      const extApi = item.external_api_code;
      if (!groups[extApi]) {
        groups[extApi] = [];
      }
      groups[extApi].push(item);
    });

    // Group by collection_code within each external_api_code
    const data = Object.entries(groups).map(([external_api_code, items]) => {
      const collectionsMap = {};
      items.forEach((item) => {
        const coll = item.collection_code;
        if (!collectionsMap[coll]) {
          collectionsMap[coll] = [];
        }
        collectionsMap[coll].push({
          key_code: item.key_code,
          key_label: item.key_label,
          data_type: item.data_type,
          field_name: item.field_name,
          table_name: item.table_name,
        });
      });

      const collections = Object.entries(collectionsMap).map(([collection_code, keys]) => ({
        collection_code,
        keys,
      }));

      return { external_api_code, collections };
    });

    return { data };
  };

  const handleBack = () => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0));
  };
  const onChangeSelect = (value) => {
    const filteredAccordionData = accordionRawData.filter(
      (item) => item.external_api_code === value
    );
    setAccordionData([...filteredAccordionData]);
    setDropdownValue(value);
  };

  const handleAddClick = (item, section, row) => {
    setSavedData((prevData) => {
      const updatedData = [...prevData];
      const existingItemIndex = updatedData.findIndex(
        (s) => s.api_name === item.api_name && s.external_api_code === item.external_api_code
      );

      if (existingItemIndex > -1) {
        const existingItem = updatedData[existingItemIndex];
        const existingSectionIndex = existingItem.collections.findIndex(
          (sec) => sec.collection_code === section.collection_code
        );

        if (existingSectionIndex > -1) {
          const existingSection = existingItem.collections[existingSectionIndex];
          const keyIndex = existingSection.keys.findIndex((k) => k.key_id === row.key_id);

          if (keyIndex > -1) {
            // ✅ Unselect: Remove the key
            existingSection.keys.splice(keyIndex, 1);
            // Remove section if keys empty
            if (existingSection.keys.length === 0) {
              existingItem.collections.splice(existingSectionIndex, 1);
            }
            // Remove item if no collections
            if (existingItem.collections.length === 0) {
              updatedData.splice(existingItemIndex, 1);
            }
          } else {
            existingSection.keys.push(row);
          }
        } else {
          existingItem.collections.push({
            collection_label: section.collection_label,
            collection_code: section.collection_code,
            keys: [row],
          });
        }
      } else {
        updatedData.push({
          api_name: item.api_name,
          external_api_code: item.external_api_code,
          collections: [
            {
              collection_code: section.collection_code,
              collection_label: section.collection_label,
              keys: [row],
            },
          ],
        });
      }
      return updatedData;
    });
  };

  const [items, setItems] = useState([
    { id: '1', content: 'Item 1' },
    { id: '2', content: 'Item 2' },
    { id: '3', content: 'Item 3' },
    { id: '4', content: 'Item 4' },
  ]);

  const styles = {
    droppableArea: {
      background: '#fff',
      padding: grid,
      margin: `${grid}px 0`,
      borderRadius: '2px',
      border: '1px dashed grey',
    },
  };

  const onSubmitCustom = async () => {
    try {
      // Construct the API URL correctly
      const payloadSelectList = {
        org_code: userData.organization,
        user_id: userData.user_id,
      };
      // Assuming postService can handle GET requests
      const getResult = await postService(
        endpoints.external_api.getUserSelectionList,
        'POST',
        payloadSelectList
      );
      if (getResult?.status) {
        setState(getResult.data);
        console.log('result', getResult);
        // setAccordionData(result.data);
        // setDropItem(result.data);
      } else {
        setAlert({ severity: 'error', message: 'Failed to fetch configuration.' });
      }
    } catch (error) {
      console.error(
        'Error while fetching configuration:',
        error.response?.data?.message || error.message
      );
      setFormError('Failed to fetch configuration. Please try again.');
    }
  };

  const showPreView = async () => {
    // const selectedFields = Object.entries(selectedItems).map(([categoryKey, fields]) => ({
    //     categoryKey,
    //     fields,
    // }));
    const transformedData = transformSelectedItemsToData(selectedItems);

    const flattenedKeys = Object.values(selectedItems) // gets each category object
      .flatMap((category) => Object.values(category)) // gets each array of keys per field group
      .flat(); // flatten in case arrays are nested

    if (!flattenedKeys || flattenedKeys.length === 0) {
      setAlertMessage('Please select at least one item Drag and Drop.');
      // setAlert({ severity: "success", message: res.message });
      setOpenSuccessModal(true);
      return;
    }
    try {
      const payload = {
        org_code: userData.organization,
        user_id: userData.user_id,
        keys: flattenedKeys,
      };
      const result = await postService(endpoints.external_api.showPreview, 'POST', payload);
      if (result.status) {
        setPreviewModel(true);
        setPreViewHeader(result.headers);
        setPreViewData(result.data);
      } else {
        setAlert({ severity: 'error', message: 'Field name already exists.' });
      }
    } catch (error) {
      setAlert({
        severity: 'error',
        message: error.response?.data?.message || 'An error occurred.',
      });
    }
  };

  const breadcrumbs = [
    <Link key="1" to="/home">Home</Link>,
    <Typography key="2" color="text.primary">Data Sources</Typography>,
  ];

  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
      </Stack>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
        Data Sources
      </Typography>

      <Paper sx={{ p: 2, borderRadius: 1, boxShadow: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label, index) => (
            <Step key={index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Dropdown for selecting data source (Only in Step 0) */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 0 }}>
            <FormControl sx={{ width: 200, mb:4 }}>
              <InputLabel>Select Source *</InputLabel>
              <Select value={dropdownValue} onChange={(e) => onChangeSelect(e.target.value)}>
                {dropItem.map((item) => (
                  <MenuItem key={item.external_api_code} value={item.external_api_code}>
                    {item.api_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Accordion Section */}
        <Grid container spacing={5}>
          {dropdownValue !== '' ? (
            activeStep === 0 &&
            accordionData.map((item) =>
              item.collections.map((section, sectionIndex) => {
                // Use section.collection_code if exists; otherwise, fallback to sectionIndex
                const searchKey = section.collection_code || sectionIndex;
                const query = searchQueries[searchKey] || '';

                // Filter keys based on the search query (match key_code or key_label)
                const filteredKeys = section.keys.filter(
                  (row) =>
                    row.key_code.toLowerCase().includes(query.toLowerCase()) ||
                    row.key_label.toLowerCase().includes(query.toLowerCase())
                );

                return (
                  <Grid item xs={12} md={6} key={sectionIndex}>
                    <Accordion
                      sx={{
                        borderRadius: 2,
                        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{section.collection_label}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {/* Search Bar */}
                        <Box
                          display="flex"
                          alignItems="center"
                          mb={2}
                          sx={{ borderBottom: '1px solid #ccc', pb: 1 }}
                        >
                          <SearchIcon color="disabled" />
                          <TextField
                            variant="standard"
                            placeholder="Search..."
                            fullWidth
                            value={query}
                            onChange={(e) =>
                              setSearchQueries({
                                ...searchQueries,
                                [searchKey]: e.target.value,
                              })
                            }
                            InputProps={{ disableUnderline: true }}
                            sx={{ ml: 1 }}
                          />
                        </Box>

                        {/* Table */}
                        <TableContainer
                          component={Paper}
                          sx={{ maxHeight: 400, overflowY: 'auto', borderRadius: 2 }}
                        >
                          <Table stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ background: '#f5f5f5' }}>API KEY</TableCell>
                                <TableCell sx={{ background: '#f5f5f5' }}>DISPLAY LABEL</TableCell>
                                <TableCell sx={{ background: '#f5f5f5', textAlign: 'center' }}>
                                  Actions
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredKeys.map((row, index) => (
                                <TableRow key={index} hover>
                                  <TableCell>
                                    <Box display="flex" alignItems="center">
                                      <Box
                                        sx={{
                                          width: 24,
                                          height: 24,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 14,
                                          fontWeight: 'bold',
                                          borderRadius: '50%',
                                          backgroundColor:
                                            index % 2 === 0 ? purple[200] : blue[200],
                                          color: 'white',
                                          mr: 1,
                                        }}
                                      >
                                        {row.icon}
                                      </Box>
                                      {row.key_code}
                                    </Box>
                                  </TableCell>
                                  <TableCell>{row.key_label}</TableCell>
                                  <TableCell sx={{ textAlign: 'center' }}>
                                    {savedData.some(
                                      (savedItem) =>
                                        savedItem.api_name === item.api_name &&
                                        savedItem.external_api_code === item.external_api_code &&
                                        savedItem.collections.some(
                                          (savedSection) =>
                                            savedSection.collection_label ===
                                              section.collection_label &&
                                            savedSection.collection_code ===
                                              section.collection_code &&
                                            savedSection.keys.some(
                                              (savedRow) => savedRow.key_id === row.key_id
                                            )
                                        )
                                    ) ? (
                                      <IconButton
                                        size="small"
                                        color="success"
                                        title="Unselect"
                                        onClick={() => handleAddClick(item, section, row)}
                                      >
                                        <CheckCircleIcon />
                                      </IconButton>
                                    ) : (
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        title="Select"
                                        onClick={() => handleAddClick(item, section, row)}
                                      >
                                        <AddIcon />
                                      </IconButton>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                );
              })
            )
          ) : (
            ''
          )}
        </Grid>

        {/* Navigation Buttons */}
        {activeStep === 0 && (
          <Box sx={{  mt: 2 }}>
            <Button
               variant="contained" sx={{
                backgroundColor: theme.palette.primary.main,
                '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                }
            }}
              onClick={() => handleNext(1)}
            >
              Next
            </Button>
          </Box>
        )}

        {activeStep === 1 && (
          <>
            <DragDropGrid
              state={state}
              setState={setState}
              onSubmitCustom={onSubmitCustom}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
            />

            <PreViewModel
              open={previewModel}
              onClose={() => setPreviewModel(false)}
              preViewHeader={preViewHeader}
              preViewData={preViewData}
              // onClick={handleSubmit}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 2 }}>
              <Button variant="outlined" sx={{ flex: 1, maxWidth: 150 }} onClick={handleBack}>
                Prev
              </Button>

              <Button
                variant="outlined"
                color="primary"
                sx={{ flex: 1, maxWidth: 150 }}
                // onClick={() => setPreviewModel(true)}
                onClick={showPreView}
              >
                Preview
              </Button>

              <Button
                variant="contained"
                sx={{ flex: 1, maxWidth: 150 }}
                onClick={() => handleNext(2)}
              >
                Submit
              </Button>
            </Box>
          </>
        )}
      </Paper>

      <Dialog open={openSuccessModal} onClose={() => setOpenSuccessModal(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <WarningIcon color="error" sx={{ mr: 1 }} />
            Warning
          </Box>
        </DialogTitle>
        <DialogContent>{alertMessage}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSuccessModal(false)} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
export default DataSources;
