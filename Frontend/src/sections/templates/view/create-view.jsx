import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Button,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Stack,
  Breadcrumbs,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DashboardContent } from 'src/layouts/dashboard';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import { Add, Cancel, DragIndicator } from '@mui/icons-material';
import Storage from 'src/utils/local-store';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Link } from 'react-router-dom';

const TemplateSchema = z.object({
  name: z.string().min(1, { message: 'Template name is required!' }),
  template_type: z.number().min(1, { message: 'Template type is required!' }),
});

const grid = 2;

const getItems = (count, offset = 0) =>
  Array.from({ length: count }, (v, k) => k).map((k) => ({
    id: `${k + offset}-${new Date().getTime()}`,
    content: `${k + offset}`,
  }));

const reasonDropdown = [
  { id: 1, name: 'Reason1' },
  { id: 2, name: 'Reason2' },
  { id: 3, name: 'Reason3' },
];

export function CreateTemplates() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();

  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [formError, setFormError] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [alert, setAlert] = useState(null);
  const [getFields, SetGetFields] = useState([]);
  const [workFlowDrop, setWorkFlowDrop] = useState([]);
  const [workFlowDropValue, setWorkFlowDropValue] = useState('');
  const [templateTypeDrop, setTemplateTypeDrop] = useState([]);
  const [state, setState] = useState([[], []]);
  const [selectedValues, setSelectedValues] = useState({});
  const userData = Storage.getJson('userData');

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        if (id) {
          postService(endpoints.auth.getById, 'POST', { id })
            .then((res) => {
              if (res.data) {
                const template = res.data;
                const dragData = res.drag_data;
                const mid = Math.floor(dragData.length / 2);
                const drag1 = dragData.slice(0, mid);
                const drag2 = dragData.slice(mid);
                setState([drag1, drag2]);
                const formattedValues = Object.fromEntries(
                  dragData.map((item) => [item.id, item.value])
                );
                setSelectedValues(formattedValues);
                setTemplateName(template.name);
                setTemplateType(template.template_type);
                setWorkFlowDropValue(template.work_flow_id);
                handleBlur('template_type');
                handleBlur('work_flows');
                handleBlur('custom_fields');
                setReasonCode(template.reason_code);
              }
            })
            .catch((errors) => {
              console.error('Error while fetching master pages:', errors);
            });
        }
      } catch (err) {
        console.error('Error fetching template data:', err);
      }
    };
    loadTemplate();
  }, [id]);

  const handleSubmit = async () => {
    const orderedIds = state.flat().map((item) => item.id);
    const orderedCards = orderedIds.map((itemId) => ({
      id: itemId,
      value: selectedValues[itemId] || null,
    }));

    const templateData = {
      name: templateName,
      template_type: templateType,
      work_flow_id: workFlowDropValue,
      created_by: userData.user_id,
      org_code: userData.organization,
      reason_code: reasonCode,
      drag_data: orderedCards,
      id,
    };

    const validation = TemplateSchema.safeParse(templateData);
    if (!validation.success) {
      setFormError(validation.error.issues[0].message);
      return;
    }

    try {
      const endpoint = id ? endpoints.auth.update : endpoints.auth.create;
      const result = await postService(endpoint, 'POST', templateData);
      if (result.status) {
        navigate('/template');
      } else {
        setAlert({ severity: 'error', message: 'Role Name already exists.' });
      }
    } catch (error) {
      setFormError('Failed to save template. Please try again.');
    }
  };

  const handleBlur = (item) => {
    if (item === 'custom_fields') {
      const payload = {
        search_key: '',
        org_code: userData.organization,
      };
      postService(endpoints.auth.getAllCustomFields, 'POST', payload)
        .then((res) => {
          if (res.data.length > 0) {
            SetGetFields([...res.data]);
          }
        })
        .catch((erro) => {
          console.error('Error while fetching master pages:', erro);
        });
    }
    if (item === 'work_flows') {
      postService(endpoints.auth.getWorkDropDown, 'POST', { search_key: '' })
        .then((res) => {
          if (res.data.length > 0) {
            setWorkFlowDrop([...res.data]);
          }
        })
        .catch((erro) => {
          console.error('Error while fetching master pages:', erro);
        });
    }
    if (item === 'template_type') {
      postService(endpoints.auth.getTemplateTypeDropDown, 'POST', { search_key: '' })
        .then((res) => {
          if (res.data.length > 0) {
            setTemplateTypeDrop([...res.data]);
          }
        })
        .catch((erro) => {
          console.error('Error while fetching master pages:', erro);
        });
    }
  };

  const move = (source, destination, droppableSource, droppableDestination) => {
    const sourceClone = Array.from(source);
    const destClone = Array.from(destination);
    const [removed] = sourceClone.splice(droppableSource.index, 1);
    destClone.splice(droppableDestination.index, 0, removed);
    const result = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;
    return result;
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sInd = +source.droppableId;
    const dInd = +destination.droppableId;
    const newState = [...state];

    if (sInd === dInd) {
      const items = reorder(state[sInd], source.index, destination.index);
      newState[sInd] = items;
    } else {
      const movedItems = move(state[sInd], state[dInd] || [], source, destination);
      newState[sInd] = movedItems[sInd];
      newState[dInd] = movedItems[dInd] || [];
    }
    setState(newState);
  };

  const reorder = (list, startIndex, endIndex) => {
    const result = [...list];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const getItemStyle = (isDragging, draggableStyle) => ({
    userSelect: 'none',
    padding: grid * 2,
    margin: `0 0 ${grid}px 0`,
    borderRadius: '8px',
    background: isDragging ? '#F67000' : '#FFF',
    boxShadow: isDragging ? '0 4px 10px rgba(0, 0, 0, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.2s, box-shadow 0.2s',
    border: '1px solid #e0e0e0',
    ...draggableStyle,
  });

  const getListStyle = (isDraggingOver) => ({
    background: isDraggingOver ? '#f3f3f3' : '#f3f3f3',
    width: 450,
    padding: '10px',
    borderRadius: '8px',
    border: '2px dashed #ddd',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.2s',
    marginRight: '10px',
  });

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">
      Home
    </Link>,
    <Link underline="hover" key="1" color="inherit" to="/template">
      Template
    </Link>,
    <Typography key="3" sx={{ color: 'text.primary' }}>
      {id ? 'Edit Template' : 'Create New Template'}
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
        {id ? 'Edit Template' : 'Create New Template'}
      </Typography>
      <Grid container spacing={0}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {formError && (
                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                  {formError}
                </Typography>
              )}

              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Template Name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={3}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Template Type</InputLabel>
                    <Select
                      value={templateType}
                      onFocus={() => handleBlur('template_type')}
                      onChange={(e) => setTemplateType(e.target.value)}
                    >
                      {templateTypeDrop.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={3}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>WorkFlows</InputLabel>
                    <Select
                      value={workFlowDropValue}
                      onFocus={() => handleBlur('work_flows')}
                      onChange={(e) => setWorkFlowDropValue(e.target.value)}
                    >
                      {workFlowDrop.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={3}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Reason</InputLabel>
                    <Select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                      {reasonDropdown.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid item xs={12} sx={{ mt: 0 }}>
                <Grid xs={12} sx={{ mb: 2 }} display="flex" justifyContent="flex-start">
                  <Button
                    variant="contained"
                    sx={{
                      backgroundColor: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                      },
                    }}
                    onClick={() => setState([...state, getItems(1)])}
                    startIcon={<Add />}
                  >
                    Add Custom Field
                  </Button>
                </Grid>
                
                <Grid container display="flex" xs={12}>
                  {state.length > 0 && (
                    <DragDropContext onDragEnd={onDragEnd}>
                      {state.map(
                        (el, ind) =>
                          el.length > 0 && (
                            <Droppable key={String(ind)} droppableId={String(ind)}>
                              {(droppableProvided, droppableSnapshot) => (
                                <div
                                  ref={droppableProvided.innerRef}
                                  style={getListStyle(droppableSnapshot.isDraggingOver)}
                                  {...droppableProvided.droppableProps}
                                >
                                  {el.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                      {(draggableProvided, draggableSnapshot) => (
                                        <div
                                          ref={draggableProvided.innerRef}
                                          {...draggableProvided.draggableProps}
                                          style={getItemStyle(
                                            draggableSnapshot.isDragging,
                                            draggableProvided.draggableProps.style
                                          )}
                                        >
                                          <Box
                                            sx={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              m:0,
                                            }}
                                          >
                                            <FormControl
                                              sx={{
                                                flexGrow: 1,
                                                '& .MuiOutlinedInput-root': {
                                                  borderTopRightRadius: 0,
                                                  borderBottomRightRadius: 0,
                                                  '& fieldset': {
                                                    borderRight: 'none',
                                                  },
                                                },
                                              }}
                                            >
                                              <InputLabel>Custom Fields</InputLabel>
                                              <Select
                                                onFocus={() => handleBlur('custom_fields')}
                                                value={selectedValues[item.id] || ''}
                                                onChange={({ target: { value } }) => {
                                                  setSelectedValues((prev) => ({
                                                    ...prev,
                                                    [item.id]: value,
                                                  }));
                                                }}
                                                label="Custom Fields"
                                              >
                                                {getFields.map((option) => (
                                                  <MenuItem
                                                    key={option.id}
                                                    value={option.id}
                                                    disabled={Object.values(
                                                      selectedValues
                                                    ).includes(option.id)}
                                                  >
                                                    {option.field_label}
                                                  </MenuItem>
                                                ))}
                                              </Select>
                                            </FormControl>
                                            <Button
                                              variant="outlined"
                                              color="error"
                                              onClick={() => {
                                                const newState = [...state];
                                                const removedItem = newState[ind][index];
                                                newState[ind].splice(index, 1);
                                                setSelectedValues((prev) => {
                                                  const updatedValues = { ...prev };
                                                  delete updatedValues[removedItem.id];
                                                  return updatedValues;
                                                });
                                                const filteredState = newState.filter(
                                                  (group) => group.length > 0
                                                );
                                                setState(filteredState);
                                              }}
                                              sx={{
                                                minWidth: 'auto',
                                                padding: '8px',
                                                borderTopLeftRadius: 0,
                                                borderBottomLeftRadius: 0,
                                                borderTopRightRadius: 0,
                                                borderBottomRightRadius: 0,
                                                // borderLeft: 'none',
                                                borderRight: 'none',
                                                height: '56px',
                                              }}
                                            >
                                              <Cancel />
                                            </Button>
                                            <Tooltip title="Drag to reorder">
                                              <IconButton
                                                {...draggableProvided.dragHandleProps}
                                                sx={{
                                                  padding: '8px',
                                                  borderTopLeftRadius: 0,
                                                  borderBottomLeftRadius: 0,
                                                  border: '1px solid',
                                                  // borderLeft: 'none',
                                                  height: '56px',
                                                  
                                                }}
                                              >
                                                <DragIndicator />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {droppableProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          )
                      )}
                    </DragDropContext>
                  )}
                </Grid>
              </Grid>

              <Grid item xs={12} display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  sx={{
                    mx: 2,
                    backgroundColor: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  }}
                  variant="contained"
                  onClick={handleSubmit}
                >
                  {id ? 'Update Template' : 'Save Template'}
                </Button>
                <Button variant="outlined" onClick={() => navigate('/template')}>
                  Back
                </Button>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CreateTemplates;
