import React, { useState, useEffect } from 'react';
import {
  Typography,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  IconButton,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import FormHelperText from '@mui/material/FormHelperText';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { defaultFilter } from './constants';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';
import { serializeConditions } from './helpers';

const NodeEditForm = ({
  selectedNode,
  onDelete = () => {},
  nodeDetails = {},
  setNodeDetails = () => {},
  updateNode = () => {},
  typeLeve,
  roles = [],
  optionsLevel = [],
  optionsUser = [],
  saveHistory = () => {},
  // Newly added lists of already-used routing selections for uniqueness constraints
  usedActionUserIds = [],
  usedRegions = [],
  usedSubregions = [],
}) => {
  const userData = Storage.getJson('userData');

  // Smart routing region/subregion
  const [regions, setRegions] = useState([]);
  const [subregions, setSubregions] = useState([]);
  const [region, setRegion] = useState(nodeDetails.region || '');
  const [subregion, setSubregion] = useState(nodeDetails.sub_region || '');
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingSubregions, setLoadingSubregions] = useState(false);

  // Conditions
  const [actionFilters, setActionFilters] = useState(
    Array.isArray(nodeDetails?.actionFilters) && nodeDetails.actionFilters.length > 0
      ? nodeDetails.actionFilters
      : [defaultFilter]
  );
  const [amountError, setAmountError] = useState('');

  // Dropdown options for priority and severity
  const [dropdownOptions, setDropdownOptions] = useState({
    priority: [],
    severity: [],
  });
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Keep region/subregion in sync when opening node
  useEffect(() => {
    setRegion(nodeDetails.region || '');
    setSubregion(nodeDetails.sub_region || '');
  }, [selectedNode?.id]);

  // Parse actionFilters from json_node when nodeDetails changes
  useEffect(() => {
    if (nodeDetails?.json_node) {
      try {
        const parsedNode = JSON.parse(nodeDetails.json_node);
        if (parsedNode?.data?.actionFilters && Array.isArray(parsedNode.data.actionFilters)) {
          setActionFilters(parsedNode.data.actionFilters);
        }
      } catch (error) {
        console.error('Error parsing json_node for actionFilters:', error);
      }
    }
  }, [nodeDetails?.json_node]);

  // Fetch dropdown options for priority and severity
  useEffect(() => {
    if (selectedNode?.typenode === 'action') {
      fetchDropdownOptions();
    }
  }, [selectedNode?.typenode]);

  // Debug: Log actionFilters changes
  useEffect(() => {
    console.log('ActionFilters updated:', actionFilters);
  }, [actionFilters]);

  const fetchDropdownOptions = async () => {
    setLoadingDropdowns(true);
    try {
      const res = await postService(endpoints.auth.getQuickCodeListForDisputes, 'GET');
      if (res) {
        setDropdownOptions({
          priority: res.priority || [],
          severity: res.severity || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch dropdown options:', error);
      setDropdownOptions({
        priority: [],
        severity: [],
      });
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Fetch regions on drawer open for smart routing
  useEffect(() => {
    if (typeLeve === 'smartrouting' && selectedNode?.typenode === 'action') {
      setLoadingRegions(true);
      postService(endpoints.auth.getOrganizationSmartRoutingList, 'POST', {
        org_code: userData.organization,
      })
        .then((res) => {
          setRegions(res.data || []);
          setLoadingRegions(false);
        })
        .catch(() => {
          setRegions([]);
          setLoadingRegions(false);
        });
    }
    // eslint-disable-next-line
  }, [typeLeve, selectedNode, userData.organization]);

  // Fetch subregions when region changes
  useEffect(() => {
    if (typeLeve === 'smartrouting' && region) {
      setLoadingSubregions(true);
      postService(endpoints.auth.getOrganizationSubSmartRoutingList, 'POST', {
        org_code: userData.organization,
        region,
      })
        .then((res) => {
          setLoadingSubregions(false);
          // Normalize response to always have .value and .label
          const items = (res.data || []).map((item) => ({
            value: item.subsmartregion || item.subsmartrouting || item.smartrouting,
            label: item.subsmartregion || item.subsmartrouting || item.smartrouting,
            role_id: item.role_id || '',
          }));
          setSubregions(items);
        })
        .catch(() => {
          setLoadingSubregions(false);
          setSubregions([]);
        });
    } else if (typeLeve === 'smartrouting') {
      setSubregions([]);
    }
  }, [region, typeLeve, userData.organization]);

  // --- Routing dropdown options ---
  const renderRoutingDropdown = () => {
    // Only for Action node!
    if (selectedNode.typenode !== 'action') return null;

    // Smart Routing
  if (typeLeve === 'smartrouting') {
      return (
        <>
          {/* Region */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Region</InputLabel>
            <Select
              value={region}
              label="Region"
              onChange={(e) => {
                const { value } = e.target;
                setRegion(value);
                setSubregion('');
                setNodeDetails((prev) => ({
                  ...prev,
                  region: value,
                  sub_region: '',
                  action_user_id: '',
                }));
              }}
              disabled={loadingRegions}
              size="small"
            >
              <MenuItem value="">Select Region</MenuItem>
              {regions.map((r, idx) => {
                const value = r.smartrouting || r.subsmartrouting || r.subsmartregion;
                const disabled =
                  usedRegions.includes(value) && value !== nodeDetails.region; // allow current value
                return (
                  <MenuItem key={value || idx} value={value} disabled={disabled}>
                    {value}
                  </MenuItem>
                );
              })}
            </Select>
            {usedRegions.length > 0 && (
              <FormHelperText>Already-assigned regions are disabled.</FormHelperText>
            )}
            {loadingRegions && (
              <CircularProgress size={20} sx={{ position: 'absolute', right: 10, top: 10 }} />
            )}
          </FormControl>
          {/* Subregion */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Subregion</InputLabel>
            <Select
              value={subregion}
              label="Subregion"
              onChange={(e) => {
                const { value } = e.target;
                setSubregion(value);
                const sel = subregions.find((s) => s.value === value) || {};
                
                // For smart routing, use the subregion value as action_user_id if role_id is not available
                let actionUserId = sel.role_id || value || '';
                
                // Ensure we have a valid action_user_id for smart routing
                if (!actionUserId && value) {
                  actionUserId = `SMART_${region}_${value}`;
                }
                
                setNodeDetails((prev) => ({
                  ...prev,
                  sub_region: value,
                  action_user_id: actionUserId,
                }));
              }}
              disabled={!region || loadingSubregions}
              size="small"
            >
              <MenuItem value="">Select Subregion</MenuItem>
              {(subregions || []).map((s, idx) => {
                const disabled =
                  usedSubregions.includes(s.value) && s.value !== nodeDetails.sub_region;
                return (
                  <MenuItem key={s.value || idx} value={s.value} disabled={disabled}>
                    {s.label}
                  </MenuItem>
                );
              })}
            </Select>
            {usedSubregions.length > 0 && (
              <FormHelperText>Already-assigned subregions are disabled.</FormHelperText>
            )}
            {loadingSubregions && (
              <CircularProgress size={20} sx={{ position: 'absolute', right: 10, top: 10 }} />
            )}
          </FormControl>
        </>
      );
    }

    // Role Routing
    if (typeLeve === 'role') {
      return (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={nodeDetails.action_user_id || ''}
            label="Role"
            onChange={(e) => setNodeDetails((prev) => ({ ...prev, action_user_id: e.target.value }))}
            size="small"
          >
            <MenuItem value="">Select Role</MenuItem>
            {roles.map((r) => {
              const disabled =
                usedActionUserIds.includes(r.role_id) && r.role_id !== nodeDetails.action_user_id;
              return (
                <MenuItem key={r.role_id} value={r.role_id} disabled={disabled}>
                  {r.role_name}
                </MenuItem>
              );
            })}
          </Select>
          {usedActionUserIds.length > 0 && (
            <FormHelperText>Assigned roles are disabled.</FormHelperText>
          )}
        </FormControl>
      );
    }

    // Hierarchy Routing
    if (typeLeve === 'hierarchy') {
      return (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={nodeDetails.action_user_id || ''}
            label="Level"
            onChange={(e) => setNodeDetails((prev) => ({ ...prev, action_user_id: e.target.value }))}
            size="small"
          >
            <MenuItem value="">Select Level</MenuItem>
            {optionsLevel.map((opt) => {
              const levelVal = opt.level_id || opt.designation_code;
              const disabled =
                usedActionUserIds.includes(levelVal) && levelVal !== nodeDetails.action_user_id;
              return (
                <MenuItem key={levelVal} value={levelVal} disabled={disabled}>
                  {opt.level_desc || opt.designation_name}
                </MenuItem>
              );
            })}
          </Select>
          {usedActionUserIds.length > 0 && (
            <FormHelperText>Assigned levels are disabled.</FormHelperText>
          )}
        </FormControl>
      );
    }

    // User Routing
    if (typeLeve === 'user') {
      return (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>User</InputLabel>
          <Select
            value={nodeDetails.action_user_id || ''}
            label="User"
            onChange={(e) => setNodeDetails((prev) => ({ ...prev, action_user_id: e.target.value }))}
            size="small"
          >
            <MenuItem value="">Select User</MenuItem>
            {optionsUser.map((user) => {
              const disabled =
                usedActionUserIds.includes(user.emp_id) && user.emp_id !== nodeDetails.action_user_id;
              return (
                <MenuItem key={user.emp_id} value={user.emp_id} disabled={disabled}>
                  {user.first_name} {user.last_name}
                </MenuItem>
              );
            })}
          </Select>
          {usedActionUserIds.length > 0 && (
            <FormHelperText>Assigned users are disabled.</FormHelperText>
          )}
        </FormControl>
      );
    }

    return null;
  };

  // Conditions (only amount allowed for smart routing)
  const allowedFields =
    typeLeve === 'smartrouting' ? ['amount'] : ['priority', 'severity', 'amount'];
  const filters = Array.isArray(actionFilters) ? actionFilters : [defaultFilter];

  const updateFilter = (idx, key, val) => {
    setActionFilters((prevFilters) => {
      const newFilters = [...prevFilters];
      const currentFilter = { ...newFilters[idx] };
      
      currentFilter[key] = val;
      
      // Reset value and comparator when field changes
      if (key === 'field') {
        currentFilter.value = '';
        currentFilter.comparator = '';
      }
      
      newFilters[idx] = currentFilter;
      return newFilters;
    });
  };
  const addCondition = () => {
    setActionFilters((fArr) => {
      const next = [...fArr, { ...defaultFilter }];
      if (next.length >= 2) next[0].andOr = next[0].andOr || 'AND';
      return next;
    });
    setTimeout(() => document.activeElement?.blur(), 0);
  };
  const deleteCondition = (idx) => setActionFilters((fArr) => fArr.filter((_, i) => i !== idx));

// Update nodeDetails without forcing a fallback label while the user is typing.
// Previous logic replaced an emptied label with 'Unnamed' immediately, preventing the user
// from clearing the field via Backspace/Delete. If a fallback display name is desired,
// it should be applied at render time (e.g., when drawing the node) or on save, not during typing.
const updateNodeDetails = (key, value) => {
  setNodeDetails((prev) => ({
    ...prev,
    [key]: value,
  }));
};

  if (!selectedNode) return null;

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Edit Node: {selectedNode.data?.label || 'Unknown'}
      </Typography>

      {/* --- ACTION NODE FIELDS --- */}
      {selectedNode.typenode === 'action' && (
        <>
          {/* Node Label */}
          <Tooltip title="Name this Action (optional)" placement="top">
            <TextField
              label="Action Label"
              fullWidth
              size="small"
              value={nodeDetails.label || ''}
              onChange={(e) => updateNodeDetails('label', e.target.value)}
              sx={{ mb: 2 }}
            />
          </Tooltip>
          {/* Routing type dependent */}
          {renderRoutingDropdown()}
        </>
      )}

      {/* --- CONDITIONS (always rendered, only "amount" for smartrouting) --- */}
      {selectedNode.typenode === 'action' && (
        <Accordion sx={{ mb: 0 }} defaultExpanded={false}>
          <AccordionSummary sx={{ m: 0 }} expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontSize: '14px' }}>Conditions</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pb: 1, px: 1 }}>
            {filters.map((filter, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
                  {/* Field Selection */}
                  <FormControl size="small" sx={{ minWidth: 95 }}>
                    <InputLabel sx={{ fontSize: '12px' }}>Field</InputLabel>
                    <Select
                      size="small"
                      value={filter.field || ''}
                      onChange={(e) => updateFilter(idx, 'field', e.target.value)}
                      sx={{ fontSize: '13px', height: '36px' }}
                    >
                      {allowedFields.map((field) => (
                        <MenuItem key={field} value={field} sx={{ fontSize: '13px' }}>
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Comparator Selection - Show for all field types */}
                  {filter.field && (
                    <FormControl size="small" sx={{ minWidth: 105 }}>
                      <InputLabel sx={{ fontSize: '12px' }}>Operator</InputLabel>
                      <Select
                        value={filter.comparator || ''}
                        onChange={(e) => {
                          console.log('Operator selected:', e.target.value);
                          updateFilter(idx, 'comparator', e.target.value);
                        }}
                        size="small"
                        sx={{ fontSize: '13px', height: '36px' }}
                      >
                        <MenuItem key=">" value=">">Greater than</MenuItem>
                        <MenuItem key=">=" value=">=">Greater or equal</MenuItem>
                        <MenuItem key="<" value="<">Less than</MenuItem>
                        <MenuItem key="<=" value="<=">Less or equal</MenuItem>
                        <MenuItem key="==" value="==">Equal</MenuItem>
                        <MenuItem key="!=" value="!=">Not Equal</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  {/* Value Selection - Show for all field types */}
                  {filter.field === 'amount' && (
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={filter.value || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const regex = /^\d*\.?\d{0,2}$/;
                        if (val === '' || regex.test(val)) {
                          updateFilter(idx, 'value', val);
                        }
                      }}
                      inputProps={{
                        step: '0.01',
                        min: 0,
                        pattern: '[0-9]+([.][0-9]{1,2})?',
                      }}
                      placeholder="100.50"
                      autoComplete="off"
                      sx={{ 
                        minWidth: 130,
                        '& .MuiInputLabel-root': { fontSize: '12px' },
                        '& .MuiInputBase-input': { fontSize: '13px', height: '20px', padding: '8px 12px' }
                      }}
                      error={!!amountError}
                    />
                  )}

                  {filter.field === 'priority' && (
                    <FormControl size="small" sx={{ minWidth: 95, position: 'relative' }} key={`priority-${idx}`}>
                      <InputLabel sx={{ fontSize: '12px' }}>Priority</InputLabel>
                      <Select
                        size="small"
                        value={filter.value || ''}
                        onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                        disabled={loadingDropdowns}
                        sx={{ fontSize: '12px', height: '36px' }}
                        displayEmpty
                      >
                        {/* <MenuItem value="" sx={{ fontSize: '12px' }}>Select</MenuItem> */}
                        {dropdownOptions.priority.map((option) => (
                          <MenuItem key={option.quick_code_type} value={option.quick_code_type} sx={{ fontSize: '13px' }}>
                            {option.quick_code_desc}
                          </MenuItem>
                        ))}
                      </Select>
                      {loadingDropdowns && (
                        <CircularProgress size={14} sx={{ position: 'absolute', right: 24, top: 11 }} />
                      )}
                    </FormControl>
                  )}

                  {filter.field === 'severity' && (
                    <FormControl size="small" sx={{ minWidth: 130, position: 'relative' }} key={`severity-${idx}`}>
                      <InputLabel sx={{ fontSize: '12px' }}>Severity</InputLabel>
                      <Select
                        size="small"
                        value={filter.value || ''}
                        onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                        disabled={loadingDropdowns}
                        sx={{ fontSize: '13px', height: '36px' }}
                        displayEmpty
                      >
                        <MenuItem value="" sx={{ fontSize: '13px' }}>Select</MenuItem>
                        {dropdownOptions.severity.map((option) => (
                          <MenuItem key={option.quick_code_type} value={option.quick_code_type} sx={{ fontSize: '13px' }}>
                            {option.quick_code_desc}
                          </MenuItem>
                        ))}
                      </Select>
                      {loadingDropdowns && (
                        <CircularProgress size={14} sx={{ position: 'absolute', right: 24, top: 11 }} />
                      )}
                    </FormControl>
                  )}

                  {/* Action buttons for conditions */}
                  {filters.length > 1 && (
                    <>
                      <Tooltip title="Toggle AND/OR">
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateFilter(idx, 'andOr', filter.andOr === 'AND' ? 'OR' : 'AND')
                          }
                          sx={{ 
                            border: '1px solid #ccc', 
                            borderRadius: '3px', 
                            minWidth: 40, 
                            height: 28,
                            fontSize: '11px'
                          }}
                        >
                          <Typography sx={{ fontSize: '10px', fontWeight: 600 }}>{filter.andOr || 'AND'}</Typography>
                        </IconButton>
                      </Tooltip>
                      {idx > 0 && (
                        <Tooltip title="Delete condition">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => deleteCondition(idx)}
                            sx={{ width: 28, height: 28 }}
                          >
                            <DeleteIcon sx={{ fontSize: '16px' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                </Stack>
                {filters.length > 1 && idx > 0 && filter.andOr && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      textAlign: 'center', 
                      color: 'text.secondary', 
                      fontSize: '10px',
                      mt: -0.8,
                      mb: 0.3
                    }}
                  >
                    {filter.andOr} with above
                  </Typography>
                )}
              </Box>
            ))}
            {((typeLeve === 'smartrouting' && !filters.some((f) => f.field === 'amount')) ||
              (typeLeve !== 'smartrouting' && filters.length < allowedFields.length)) && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: '14px' }} />}
                onClick={addCondition}
                sx={{ 
                  fontSize: '11px', 
                  height: '28px',
                  minWidth: '100px',
                  textTransform: 'none'
                }}
              >
                Add Condition
              </Button>
            )}
            <Box sx={{ mt: 1, p: 1, background: "#f7f7fa", borderRadius: 1 }}>
              <Typography fontWeight={600} fontSize={13} gutterBottom>
                Condition Summary:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {serializeConditions(actionFilters) || 'No conditions set.'}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* --- END NODE DELETE BUTTON --- */}
      {selectedNode.typenode === 'end' && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Tooltip title="Remove this End node from the workflow" placement="top">
            <Button
              size="small"
              variant="contained"
              color="error"
              fullWidth
              onClick={() => onDelete(selectedNode.id)}
            >
              Delete End Node
            </Button>
          </Tooltip>
        </Stack>
      )}

      {/* --- BASIC INFO/COMMENT/ATTACHMENT --- */}
      {['action', 'decision'].includes(selectedNode.typenode) && (
        <>
          {selectedNode.typenode === 'action' && (
            <Stack direction="row" spacing={4} sx={{ mb: 2, mt: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!nodeDetails.comment}
                    onChange={e =>
                      updateNodeDetails('comment', e.target.checked)
                    }
                  />
                }
                label="Comment Required"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!nodeDetails.attachment}
                    onChange={e =>
                      updateNodeDetails('attachment', e.target.checked)
                    }
                  />
                }
                label="Attachment Required"
              />
            </Stack>
          )}

          {selectedNode.typenode === 'decision' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Quick Select Action</InputLabel>
              <Select
                value={nodeDetails.label || ''}
                label="Quick Select Action"
                onChange={(e) => {
                  updateNodeDetails('label', e.target.value);
                }}
              >
                <MenuItem value="Review">Review</MenuItem>
                <MenuItem value="Approve">Approve</MenuItem>
                <MenuItem value="Reject">Reject</MenuItem>
              </Select>
            </FormControl>
          )}

          <Tooltip title="Describe the node behavior" placement="top">
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={nodeDetails.description || ''}
              placeholder="Describe this node"
              sx={{ mb: 0 }}
              onChange={(e) => updateNodeDetails('description', e.target.value)}
            />
          </Tooltip>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Tooltip title="Apply changes to the node" placement="top">
              <Button
                size="small"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mb: 2 }}
                onClick={() => updateNode(filters)}
              >
                Update Node
              </Button>
            </Tooltip>
            <Tooltip title="Remove this node from the workflow" placement="top">
              <Button
                size="small"
                variant="contained"
                color="error"
                fullWidth
                onClick={() => onDelete(selectedNode.id)}
              >
                Delete Node
              </Button>
            </Tooltip>
          </Stack>
        </>
      )}
    </div>
  );
};

export default NodeEditForm;
