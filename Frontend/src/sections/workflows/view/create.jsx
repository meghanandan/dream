import React, { useCallback, useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  IconButton,
  Breadcrumbs,
  Tooltip,
  Drawer,
  Snackbar,
  Alert as MuiAlert,
} from '@mui/material';
import {
  TaskAlt as TaskAltIcon,
  AltRoute as AltRouteIcon,
  Flag as FlagIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Redo as RedoIcon,
  Visibility as PreviewIcon,
  Close as CloseIcon,
  CheckCircle as ValidateIcon,
  AutoFixHigh as AIIcon,
} from '@mui/icons-material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Controls,
  Background,
  MarkerType,
} from 'react-flow-renderer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Storage from 'src/utils/local-store';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import DecisionNode from './decision';
import ActionNode from './ActionNode';
import StartEndNode from './StartEndNode';
import AIWorkflowGenerator from './AIWorkflowGenerator';
import NodeEditForm from './NodeEditForm';
import EdgeEditForm from './EdgeEditForm';
import { 
  buildFullWorkflowPreview, 
  serializeConditions, 
  validateWorkflow, 
  isConnectionAllowed 
} from './helpers';

const WorkflowSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  mail_template_id: z.string().min(1),
});

const nodeTypes = {
  decision: DecisionNode,
  action: ActionNode,
  start: StartEndNode,
  end: StartEndNode,
};

export function CreateWorkflow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userData = Storage.getJson('userData');

  // State
  const [workflowHeaderSaved, setWorkflowHeaderSaved] = useState(Boolean(id));
  const [workflowId, setWorkflowId] = useState(id || null);
  const [workflowName, setWorkflowName] = useState('');
  const [routingType, setRoutingType] = useState('');
  const [mailTemplate, setMailTemplate] = useState('');
  const [formError, setFormError] = useState('');

  const [nodes, setNodes] = useState([
    {
      id: uuidv4(),
      data: { label: 'Start' },
      position: { x: 40, y: 120 },
      type: 'start',
      typenode: 'start',
      isResizable: false,
      style: { fontSize: '13px' },
    },
  ]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState('node');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [edgeDetails, setEdgeDetails] = useState({});
  const [optionsUser, setOptionsUser] = useState([]);
  const [roles, setRoles] = useState([]);
  const [optionsLevel, setOptionsLevel] = useState([]);
  const [regions, setRegions] = useState([]);
  const [subregions, setSubregions] = useState([]);
  const [nodeDetails, setNodeDetails] = useState({});
  
  // ** CAN EDIT? **
  const canEdit = workflowHeaderSaved;

  // Load workflow details if editing
  useEffect(() => {
    if (!workflowId) return;
    postService(endpoints.auth.getWorkflowDetails, 'POST', { id: workflowId }).then((res) => {
      const { workflow, rawnodes, rawedges } = res.data;
      setWorkflowName(workflow.name);
      setRoutingType(workflow.type);
      setMailTemplate(workflow.mail_template_id);

      // 🔧 Fixed: Enhanced node/edge shape fixing with safer label handling
      const fixedNodes = (rawnodes || []).map((n) => ({
        ...n,
        id: String(n.id),
        type: n.typenode,
        data: { 
          ...n.data,
          // 🔧 Fixed: Safer label fallback without unsafe optional chaining
          label: n.data?.label || 
                 (n.typenode === 'action' ? n.data?.action_user_id : null) || 
                 (n.typenode ? (n.typenode.charAt(0).toUpperCase() + n.typenode.slice(1)) : null) || 
                 'Unnamed'
        },
      }));

      const fixedEdges = (rawedges || []).map((e, i) => ({
        ...e,
        id: String(e.id || `e${e.source}_${e.target}_${i}`),
        type: e.type || 'straight',
        source: String(e.source),
        target: String(e.target),
        label: e.label != null ? e.label : 'Default arrow',
        animated: true,
        markerEnd: e.marker_end
          ? { type: 'arrowclosed', markerWidth: 40, markerHeight: 40 }
          : { type: 'arrowclosed', markerWidth: 40, markerHeight: 40 },
        labelStyle: { fontSize: '10px' },
      }));

      setNodes(fixedNodes.length ? fixedNodes : getDefaultStartNode());
      setEdges(fixedEdges);
      setUndoStack([{
        nodes: JSON.parse(JSON.stringify(fixedNodes.length ? fixedNodes : getDefaultStartNode())),
        edges: JSON.parse(JSON.stringify(fixedEdges)),
      }]);
      setWorkflowHeaderSaved(true);
    });
  }, [workflowId]);

  // Helper function for default start node
  const getDefaultStartNode = () => [{
    id: uuidv4(),
    data: { label: 'Start' },
    position: { x: 40, y: 120 },
    type: 'start',
    typenode: 'start',
    isResizable: false,
    style: { fontSize: '13px' },
  }];

  // 🔧 Fixed: Load dropdown options with proper case block structure
  useEffect(() => {
    if (!routingType) return;
    
    const loadRoutingOptions = async () => {
      try {
        // 🔧 Fixed: Moved declarations outside switch cases
        let hierarchyRes;
        let roleRes;
        let roleList;
        let userRes;
        let smartRes;

        switch (routingType) {
          case 'hierarchy':
            hierarchyRes = await postService(endpoints.auth.getOrganizationHierarchyList, 'POST', {
              org_code: userData.organization,
            });
            setOptionsLevel(hierarchyRes.data || []);
            break;
            
          case 'role':
            roleRes = await postService(endpoints.auth.getUsersBaseOnRole, 'POST', { 
              org_code: userData.organization 
            });
            roleList = (roleRes.data || []).map((item) => ({
              role_id: item.role_id,
              role_name: item.role_name,
            }));
            setRoles(roleList);
            break;
            
          case 'user':
            userRes = await postService(endpoints.auth.getUsers, 'POST', { 
              org_code: userData.organization 
            });
            setOptionsUser(userRes.data || []);
            break;
            
          case 'smartrouting':
            smartRes = await postService(endpoints.auth.getOrganizationSmartRoutingList, 'POST', {
              org_code: userData.organization,
            });
            setRegions(smartRes.data || []);
            break;
            
          default:
            break;
        }
      } catch (error) {
        console.error('Error loading routing options:', error);
        // Reset relevant state on error
        setOptionsLevel([]);
        setRoles([]);
        setOptionsUser([]);
        setRegions([]);
      }
    };

    loadRoutingOptions();
  }, [routingType, userData.organization]);

  // --- Enhanced Header Save ---
  const handleHeaderSave = async () => {
    if (!workflowName?.trim() || !routingType || !mailTemplate) {
      setSnackbar({ 
        open: true, 
        message: 'All fields are required: Name, Routing Type, and Mail Template', 
        severity: 'warning' 
      });
      return;
    }
    
    if (workflowId) {
      setWorkflowHeaderSaved(true);
      return;
    }
    
    try {
      const res = await postService(endpoints.auth.createWorkflow, 'POST', {
        name: workflowName.trim(),
        type: routingType,
        mail_template_id: mailTemplate,
        created_by: userData.user_id,
        org_code: userData.organization,
      });
      
      if (res.status && res.data?.id) {
        setWorkflowHeaderSaved(true);
        setWorkflowId(res.data.id);
        navigate(`/workflows/${res.data.id}/edit`);
        setSnackbar({ 
          open: true, 
          message: 'Workflow header saved successfully', 
          severity: 'success' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: res.message || 'Failed to save workflow header', 
          severity: 'error' 
        });
      }
    } catch (err) {
      console.error('Header save error:', err);
      setSnackbar({ 
        open: true, 
        message: 'Error saving workflow header', 
        severity: 'error' 
      });
    }
  };

  // --- Undo/Redo with better state management ---
  const saveHistory = useCallback(() => {
    setUndoStack((u) => {
      const newStack = [
        ...u,
        { 
          nodes: JSON.parse(JSON.stringify(nodes)), 
          edges: JSON.parse(JSON.stringify(edges)) 
        }
      ];
      // Limit undo stack to prevent memory issues
      return newStack.slice(-50);
    });
    setRedoStack([]);
  }, [nodes, edges]);

  const handleUndo = () => {
    if (undoStack.length < 2 || !canEdit) return;
    const prev = undoStack[undoStack.length - 2];
    setRedoStack((r) => [...r, { nodes, edges }]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setUndoStack((u) => u.slice(0, -1));
    setSnackbar({ open: true, message: 'Undo applied', severity: 'info' });
  };

  const handleRedo = () => {
    if (!redoStack.length || !canEdit) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setRedoStack((r) => r.slice(0, -1));
    setSnackbar({ open: true, message: 'Redo applied', severity: 'info' });
  };

  // --- Enhanced Node Addition ---
  const handleAddNode = (type) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: 'Save workflow details before adding nodes.',
        severity: 'warning',
      });
      return;
    }
    
    saveHistory();
    const nodeId = uuidv4();
    
    // Better positioning logic
    const base = nodes.length > 0
      ? nodes.reduce((rightmost, n) => (n.position.x > rightmost.position.x ? n : rightmost), nodes[0])
      : { position: { x: 100, y: 100 } };
    
    const isEnd = type === 'End';
    const isStart = type === 'Start';
    const typenode = isEnd ? 'end' : isStart ? 'start' : type.toLowerCase();
    
    const newNode = {
      id: nodeId,
      data: { 
        label: type, 
        id: nodeId,
        // Pre-set default values for action nodes
        ...(typenode === 'action' && {
          comment: false,
          attachment: false,
          action_user_id: '',
        })
      },
      position: { 
        x: base.position.x + 200, 
        y: base.position.y + (Math.random() - 0.5) * 100 // Slight vertical offset
      },
      type: typenode,
      typenode,
      isResizable: true,
      minWidth: 60,
      minHeight: 20,
      style: { fontSize: '13px' },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setSnackbar({ 
      open: true, 
      message: `${type} node added successfully`, 
      severity: 'success' 
    });
  };

  // --- Enhanced React Flow handlers ---
  const onNodesChange = useCallback(
    (changes) => {
      if (!canEdit) return;
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [canEdit]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      if (!canEdit) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [canEdit]
  );

  // 🔧 Enhanced onConnect with validation
  const onConnect = useCallback(
    (params) => {
      if (!canEdit) {
        setSnackbar({
          open: true,
          message: 'Save workflow details before connecting nodes.',
          severity: 'warning',
        });
        return;
      }

      // 🔧 Validate connection before allowing it
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (sourceNode && targetNode) {
        const sourceType = sourceNode.typenode;
        const targetType = targetNode.typenode;
        
        if (!isConnectionAllowed(sourceType, targetType)) {
          const sourceLabel = sourceNode.data?.label || sourceType;
          const targetLabel = targetNode.data?.label || targetType;
          
          setSnackbar({
            open: true,
            message: `Invalid connection: ${sourceType.toUpperCase()} "${sourceLabel}" cannot connect to ${targetType.toUpperCase()} "${targetLabel}"`,
            severity: 'error',
          });
          return;
        }
      }

      saveHistory();
      const newEdge = {
        ...params,
        id: uuidv4(),
        type: params.label === 'Yes' ? 'bezier' : 'straight',
        style: params.label === 'Yes' ? { stroke: '#43a047', strokeWidth: 2 } : {},
        labelStyle: params.label === 'Yes' ? { fill: '#43a047', fontWeight: 700 } : {},
        markerEnd: { type: MarkerType.ArrowClosed, markerWidth: 40, markerHeight: 40 },
        animated: true,
        label: params.label || 'forward',
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      setEdgeDetails(newEdge);
      
      // Auto-open edge editor
      setTimeout(() => {
        setSelectedNode(null);
        setSelectedEdge(newEdge);
        setDrawerType('edge');
        setDrawerOpen(true);
      }, 50);
    },
    [nodes, saveHistory, canEdit]
  );

  // --- Enhanced Node/Edge click handlers ---
  const handleNodeClick = (_, node) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: 'Save workflow details before editing nodes.',
        severity: 'warning',
      });
      return;
    }
    
    setSelectedEdge(null);
    setSelectedNode(node);
    setNodeDetails({ ...node.data });
    setDrawerType('node');
    setDrawerOpen(true);
  };

  const handleEdgeClick = (e, edge) => {
    e.preventDefault();
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: 'Save workflow details before editing edges.',
        severity: 'warning',
      });
      return;
    }
    
    setSelectedNode(null);
    setSelectedEdge(edge);
    setDrawerType('edge');
    setDrawerOpen(true);
    setEdgeDetails(edge);
  };

  // --- Enhanced Node Update ---
  const updateNode = (filters) => {
    const node_conditions = serializeConditions(filters);
    const amountFilter = filters?.find((f) => f.field === 'amount');
    
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? {
              ...n,
              data: {
                ...nodeDetails,
                ...(filters ? { actionFilters: filters } : {}),
                node_conditions,
                amount: amountFilter ? amountFilter.value : null,
                amount_condition: amountFilter ? amountFilter.comparator : null,
                comment: Boolean(nodeDetails.comment),
                attachment: Boolean(nodeDetails.attachment),
                // Ensure label is always updated
                label: nodeDetails.label || n.data.label || 'Unnamed'
              },
            }
          : n
      )
    );
    
    setDrawerOpen(false);
    setSnackbar({ 
      open: true, 
      message: `${selectedNode.data?.label || 'Node'} updated successfully`, 
      severity: 'success' 
    });
  };

  // --- Enhanced Delete handlers ---
  const handleDeleteNode = (nodeId) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    const nodeLabel = nodeToDelete?.data?.label || 'Node';
    
    // Prevent deleting the last start node
    if (nodeToDelete?.typenode === 'start') {
      const startNodes = nodes.filter(n => n.typenode === 'start');
      if (startNodes.length === 1) {
        setSnackbar({
          open: true,
          message: 'Cannot delete the only Start node. Workflow must have at least one Start node.',
          severity: 'error',
        });
        return;
      }
    }
    
    saveHistory();
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setDrawerOpen(false);
    setSnackbar({ 
      open: true, 
      message: `${nodeLabel} deleted successfully`, 
      severity: 'success' 
    });
  };

  const handleDeleteEdge = (edgeId) => {
    saveHistory();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdge(null);
    setDrawerOpen(false);
    setSnackbar({ 
      open: true, 
      message: 'Connection deleted successfully', 
      severity: 'success' 
    });
  };

  // --- Enhanced Workflow Validation ---
  const validateWorkflowManual = () => {
    const validation = validateWorkflow(nodes, edges);
    
    if (validation.isValid) {
      if (validation.warnings.length === 0) {
        setSnackbar({ 
          open: true, 
          message: '✅ Workflow validation passed - no issues found!', 
          severity: 'success' 
        });
      } else {
        const warningMsg = `⚠️ Workflow is valid but has warnings:\n• ${validation.warnings.join('\n• ')}`;
        setSnackbar({ 
          open: true, 
          message: warningMsg, 
          severity: 'warning' 
        });
      }
    } else {
      const errorMsg = `❌ Workflow validation failed:\n• ${validation.errors.join('\n• ')}`;
      setSnackbar({ 
        open: true, 
        message: errorMsg, 
        severity: 'error' 
      });
    }
  };

  // --- Enhanced Save Workflow ---
  const saveWorkflow = async () => {
    if (!workflowHeaderSaved) {
      setSnackbar({ 
        open: true, 
        message: 'Please save workflow details first', 
        severity: 'warning' 
      });
      return;
    }

    // 🔧 Comprehensive validation before save
    const validation = validateWorkflow(nodes, edges);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.length === 1 
        ? validation.errors[0]
        : `Multiple validation errors:\n• ${validation.errors.join('\n• ')}`;
        
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
      return;
    }

    // Show warnings but continue with save
    if (validation.warnings.length > 0) {
      const warningMessage = `Warnings found:\n• ${validation.warnings.join('\n• ')}\n\nWorkflow will still be saved.`;
      setSnackbar({ 
        open: true, 
        message: warningMessage, 
        severity: 'warning' 
      });
    }

    try {
      // Enhanced data sanitization
      const sanitizedNodes = nodes.map(({ data, ...n }) => {
        const cleanedData = { ...data };
        
        // Remove frontend-only properties
        delete cleanedData.json_node;
        delete cleanedData.subregion;
        
        // Ensure required properties exist
        if (n.typenode === 'action') {
          cleanedData.comment = Boolean(cleanedData.comment);
          cleanedData.attachment = Boolean(cleanedData.attachment);
          cleanedData.action_user_id = cleanedData.action_user_id || '';
        }
        
        return { ...n, id: n.id, data: cleanedData };
      });

      const sanitizedEdges = edges.map((e) => ({
        ...e,
        source: e.source,
        target: e.target,
        label: e.label || 'forward',
      }));

      const payload = {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
        name: workflowName.trim(),
        created_by: userData.user_id,
        org_code: userData.organization,
        type: routingType,
        mail_template_id: mailTemplate,
      };

      // Schema validation
      const schemaValidation = WorkflowSchema.safeParse(payload);
      if (!schemaValidation.success) {
        setFormError(schemaValidation.error.issues[0].message);
        setSnackbar({
          open: true,
          message: `Invalid data: ${schemaValidation.error.issues[0].message}`,
          severity: 'error',
        });
        return;
      }

      const endpoint = workflowId ? endpoints.auth.updateWorkflow : endpoints.auth.createWorkflow;
      const res = await postService(endpoint, 'POST', { ...payload, id: workflowId });
      
      if (res.status) {
        const successMessage = validation.warnings.length > 0 
          ? 'Workflow saved successfully with warnings - please review' 
          : 'Workflow saved successfully';
          
        setSnackbar({ 
          open: true, 
          message: successMessage, 
          severity: 'success' 
        });
        
        if (!workflowId && res.data?.id) {
          navigate(`/workflows/${res.data.id}/edit`);
        }
      } else {
        setSnackbar({ 
          open: true, 
          message: res.message || 'Failed to save workflow', 
          severity: 'error' 
        });
      }
    } catch (err) {
      console.error('Save workflow error:', err);
      setSnackbar({ 
        open: true, 
        message: `Save failed: ${err.message || 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  // AI Generation Handlers
  const handleOpenAIGenerator = () => {
    setShowAIGenerator(true);
  };

  const handleCloseAIGenerator = () => {
    setShowAIGenerator(false);
  };

  const handleWorkflowGenerated = (workflowStructure) => {
    applyGeneratedWorkflow(workflowStructure);
    setIsAIGenerating(false); // Re-enable canvas tools
    // Don't auto-close - let user generate more workflows
    
    setSnackbar({
      open: true,
      message: 'AI workflow generated successfully! Generate another or close the AI dialog to continue editing.',
      severity: 'success'
    });
  };

  const handleAIGenerationStart = () => {
    setIsAIGenerating(true); // Disable canvas tools during generation
  };

  // [REMOVED] Simple Template Generator - moved to AIWorkflowGenerator component

  // Apply Generated Workflow Structure
  const applyGeneratedWorkflow = (workflowStructure) => {
    if (workflowStructure.workflowName && !workflowName) {
      setWorkflowName(workflowStructure.workflowName);
    }

    // Convert to React Flow format
    const generatedNodes = workflowStructure.nodes.map((node, index) => ({
      id: node.id || uuidv4(),
      data: { 
        label: node.label,
        ...(node.type === 'action' && node.conditions && {
          actionFilters: node.conditions.map(condition => ({
            field: condition.field,
            comparator: condition.operator,
            value: condition.value,
            andOr: null
          }))
        })
      },
      position: node.position || { x: 100 + (index * 200), y: 120 },
      type: node.type,
      typenode: node.type,
      isResizable: node.type !== 'start',
      style: { fontSize: '13px' },
      ...(node.type === 'start' && { width: 56, height: 56 }),
      ...(node.type === 'end' && { width: 56, height: 56 }),
      ...(node.type === 'decision' && { width: 90, height: 90 }),
      ...(node.type === 'action' && { width: 120, height: 24 }),
    }));

    const generatedEdges = workflowStructure.edges.map((edge, index) => {
      // Get source and target nodes to determine handle positions
      const sourceNode = workflowStructure.nodes.find(n => n.id === edge.source);
      const targetNode = workflowStructure.nodes.find(n => n.id === edge.target);
      
      let sourceHandle = null;
      let targetHandle = null;
      
      // For decision nodes, use different handles based on edge label
      if (sourceNode?.type === 'decision') {
        if (edge.label === 'Yes') {
          sourceHandle = 'top';    // Yes goes from top of decision
          targetHandle = 'in-left'; // to left of target action node
        } else if (edge.label === 'No') {
          sourceHandle = 'no';     // No goes from bottom of decision (id="no")
          targetHandle = 'in-left'; // to left of target action node
        } else {
          sourceHandle = 'yes';    // Default forward from right (id="yes")
          targetHandle = 'in-left'; // to left of target action node
        }
      } else if (sourceNode?.type === 'start') {
        // Start nodes use 'right' handle
        sourceHandle = 'right';
        targetHandle = 'in-left';  // Target action nodes use 'in-left'
      } else if (sourceNode?.type === 'action') {
        // Action nodes use 'out-right' handle
        sourceHandle = 'out-right';
        if (targetNode?.type === 'end') {
          targetHandle = 'left';   // End nodes use 'left'
        } else {
          targetHandle = 'in-left'; // Other nodes use 'in-left'
        }
      } else {
        // Fallback for other node types
        sourceHandle = 'right';
        targetHandle = 'left';
      }
      
      return {
        id: uuidv4(),
        source: edge.source,
        target: edge.target,
        label: edge.label || '',
        sourceHandle,
        targetHandle,
        animated: true,
        style: { stroke: '#6B7280' },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
    });

    setNodes(generatedNodes);
    setEdges(generatedEdges);
  };

  // --- Helper function for chip styling ---
  const getChipStyle = (label) => {
    switch (label?.toLowerCase()) {
      case 'start':
        return { background: '#1976d2', color: '#fff' };
      case 'end':
        return { background: '#43a047', color: '#fff' };
      case 'approve':
      case 'yes':
        return { background: '#e3fcef', color: '#24b47e' };
      case 'reject':
      case 'no':
        return { background: '#ffeaea', color: '#e53935' };
      default:
        return { background: '#f2f4f8', color: '#222' };
    }
  };

  // --- Breadcrumbs ---
  const crumbs = [
    <Link key="1" to="/home">Home</Link>,
    <Link key="2" to="/workflows">Workflows</Link>,
    <Typography key="3" color="text.primary">
      {workflowId ? 'Edit Workflow' : 'Create Workflow'}
    </Typography>,
  ];

  // --- Enhanced Drawer Content ---
  // Pre-compute used routing selections to prevent duplicate assignments across action nodes
  const otherActionNodes = nodes.filter((n) => n.typenode === 'action' && n.id !== selectedNode?.id);
  const usedActionUserIds = otherActionNodes.map((n) => n.data?.action_user_id).filter(Boolean);
  const usedRegions = otherActionNodes.map((n) => n.data?.region).filter(Boolean);
  const usedSubregions = otherActionNodes.map((n) => n.data?.sub_region).filter(Boolean);
  const drawerContent = (
    <Box sx={{ width: 380, p: 2, position: 'relative', backgroundColor: '#fff', height: '100vh' }}>
      <IconButton
        aria-label="close"
        onClick={() => setDrawerOpen(false)}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
      >
        <CloseIcon />
      </IconButton>

      {drawerType === 'node' && selectedNode && (
        <NodeEditForm
          selectedNode={selectedNode}
          nodeDetails={nodeDetails}
          setNodeDetails={setNodeDetails}
          updateNode={updateNode}
          onDelete={handleDeleteNode}
          optionsUser={optionsUser}
          roles={roles}
          optionsLevel={optionsLevel}
          typeLeve={routingType}
          orgCode={userData.organization}
          usedActionUserIds={usedActionUserIds}
          usedRegions={usedRegions}
          usedSubregions={usedSubregions}
        />
      )}
      
      {drawerType === 'edge' && selectedEdge && (
        <EdgeEditForm
          selectedEdge={selectedEdge}
          edgeDetails={edgeDetails}
          setEdgeDetails={setEdgeDetails}
          onClose={() => setDrawerOpen(false)}
          onDelete={handleDeleteEdge}
          updateEdge={() => {
            setEdges((eds) =>
              eds.map((e) =>
                e.id === selectedEdge.id
                  ? {
                      ...e,
                      ...edgeDetails,
                      animated: true,
                      markerEnd: { type: 'arrowclosed', markerWidth: 40, markerHeight: 40 },
                    }
                  : e
              )
            );
            setDrawerOpen(false);
            setSnackbar({ open: true, message: 'Connection updated successfully', severity: 'success' });
          }}
          nodes={nodes}
        />
      )}
      
      {drawerType === 'preview' && (
        <>
          <Typography variant="h6" mb={2} fontWeight={700}>
            Workflow Preview
          </Typography>
          <Box sx={{ maxHeight: '80vh', overflowY: 'auto', px: 1 }}>
            {buildFullWorkflowPreview(nodes, edges).length > 0 ? (
              buildFullWorkflowPreview(nodes, edges).map((line, i) => {
                const steps = line.split(' → ').map((s) => s.trim());
                return (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    {steps.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1.5,
                            py: 0.5,
                            mb: 0.75,
                            fontWeight: 600,
                            fontSize: 13,
                            borderRadius: 1.5,
                            minWidth: 28,
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                            ...getChipStyle(step),
                          }}
                        >
                          {step}
                        </Box>
                        {idx !== steps.length - 1 && (
                          <Box
                            component="span"
                            sx={{
                              color: '#888',
                              fontSize: 18,
                              mx: 0.5,
                              fontWeight: 700,
                              verticalAlign: 'middle',
                            }}
                          >
                            →
                          </Box>
                        )}
                      </React.Fragment>
                    ))}
                  </Box>
                );
              })
            ) : (
              <Typography color="text.secondary">
                No complete workflow paths found. Add nodes and connections to see preview.
              </Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <ReactFlowProvider>
      {/* Breadcrumbs */}
      <Stack spacing={1} sx={{ mx: 2, mt: 2, zIndex: 3 }}>
        <Breadcrumbs separator="›">{crumbs}</Breadcrumbs>
      </Stack>

      {/* Enhanced Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ px: 1.5, py: 1, background: '#fff', my: 1, mx: 2, boxShadow: 2, borderRadius: 1 }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{ minWidth: 140, color: 'text.secondary' }}
        >
          {`Workflow details${workflowId ? ` of ${workflowId}` : ''}:`}
        </Typography>
        <TextField
          label="Name"
          placeholder="Enter workflow name"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          size="small"
          disabled={workflowHeaderSaved}
          error={!workflowName && workflowHeaderSaved}
          helperText={!workflowName && workflowHeaderSaved ? "Name is required" : ""}
        />
        <Select
          value={routingType}
          onChange={(e) => setRoutingType(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
          displayEmpty
          disabled={workflowHeaderSaved}
          error={!routingType && workflowHeaderSaved}
        >
          <MenuItem value="" disabled>
            Select Routing
          </MenuItem>
          <MenuItem value="role">Role</MenuItem>
          <MenuItem value="hierarchy">Hierarchy</MenuItem>
          <MenuItem value="user">User</MenuItem>
          <MenuItem value="smartrouting">Smart Routing</MenuItem>
        </Select>
        <Select
          value={mailTemplate}
          onChange={(e) => setMailTemplate(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
          displayEmpty
          disabled={workflowHeaderSaved}
          error={!mailTemplate && workflowHeaderSaved}
        >
          <MenuItem value="" disabled>
            Select Mail Template
          </MenuItem>
          <MenuItem value="m_tam1">Template 1</MenuItem>
          <MenuItem value="m_tam2">Template 2</MenuItem>
          <MenuItem value="m_tam3">Template 3</MenuItem>
        </Select>
        {!workflowHeaderSaved && (
          <Button
            startIcon={<SaveIcon />}
            onClick={handleHeaderSave}
            disabled={!workflowName?.trim() || !routingType || !mailTemplate}
            variant="contained"
          >
            Save
          </Button>
        )}
        {!workflowHeaderSaved && (
          <Typography variant="caption" sx={{ color: '#673ab7', fontSize: '0.75rem', fontStyle: 'italic' }}>
            💡 Save details to unlock AI workflow generation
          </Typography>
        )}
        {workflowHeaderSaved && (
          <>
            <Tooltip title="Update Workflow">
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                color="primary"
                onClick={saveWorkflow}
                disabled={isAIGenerating}
              >
                Update
              </Button>
            </Tooltip>
            {/* <Tooltip title="Validate Workflow">
              <IconButton
                onClick={validateWorkflowManual}
                sx={{
                  bgcolor: '#673ab7',
                  color: '#fff',
                  '&:hover': { bgcolor: '#5e35b1' },
                  boxShadow: 1,
                }}
              >
                <ValidateIcon />
              </IconButton>
            </Tooltip> */}
            <Tooltip title="Workflow Preview">
              <IconButton
                onClick={() => {
                  setDrawerType('preview');
                  setDrawerOpen(true);
                }}
                sx={{
                  bgcolor: '#607D8B',
                  color: '#fff',
                  '&:hover': { bgcolor: '#596971' },
                  boxShadow: 1,
                }}
              >
                <PreviewIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Back to Workflows">
              <IconButton
                onClick={() => navigate('/workflows')}
                sx={{
                  bgcolor: '#8e8e8e',
                  color: '#fff',
                  '&:hover': { bgcolor: '#737373' },
                  boxShadow: 1,
                }}
              >
                <BackIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>

      {/* COMMENTED OUT: AI Workflow Generator Section
      {workflowHeaderSaved && (!id || (id && nodes.length <= 1)) && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{ 
            px: 1.5, 
            py: 1, 
            background: '#f8f9fa', 
            my: 1, 
            mx: 2, 
            boxShadow: 1, 
            borderRadius: 1, 
            border: '2px dashed #e0e0e0' 
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ minWidth: 140, color: '#673ab7' }}
          >
            🤖 AI Generator:
          </Typography>
          <Button
            startIcon={<AIIcon />}
            onClick={handleOpenAIGenerator}
            variant="outlined"
            color="secondary"
            size="small"
            sx={{ 
              borderColor: '#673ab7', 
              color: '#673ab7',
              '&:hover': { 
                borderColor: '#5e35b1', 
                backgroundColor: '#f3e5f5' 
              }
            }}
          >
            Generate with AI
          </Button>
          <Typography variant="caption" sx={{ color: '#2e7d32', fontSize: '0.75rem' }}>
            Free • Open Source • Local AI
          </Typography>
        </Stack>
      )}
      */}

      {/* Main Canvas */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 160px)',
          px: 2,
          py: 0,
          boxShadow: 2,
          borderRadius: 1,
        }}
      >
        {/* Enhanced Toolbar */}
        <Stack
          sx={{
            position: 'absolute',
            right: 30,
            top: 20,
            zIndex: 10,
          }}
          spacing={1}
          direction="row"
        >
          <Tooltip title="Add Action Node">
            <IconButton
              onClick={() => handleAddNode('Action')}
              disabled={!canEdit || isAIGenerating}
              sx={{
                bgcolor: canEdit && !isAIGenerating ? '#38b000' : '#ccc',
                color: '#fff',
                '&:hover': { bgcolor: canEdit && !isAIGenerating ? '#299800' : '#ccc' },
                boxShadow: 1,
              }}
            >
              <TaskAltIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Decision Node">
            <IconButton
              onClick={() => handleAddNode('Decision')}
              disabled={!canEdit || isAIGenerating}
              sx={{
                bgcolor: canEdit && !isAIGenerating ? '#ffbe0b' : '#ccc',
                color: '#fff',
                '&:hover': { bgcolor: canEdit && !isAIGenerating ? '#fab005' : '#ccc' },
                boxShadow: 1,
              }}
            >
              <AltRouteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add End Node">
            <IconButton
              onClick={() => handleAddNode('End')}
              disabled={!canEdit || isAIGenerating}
              sx={{
                bgcolor: canEdit && !isAIGenerating ? '#ef233c' : '#ccc',
                color: '#fff',
                '&:hover': { bgcolor: canEdit && !isAIGenerating ? '#c30018' : '#ccc' },
                boxShadow: 1,
              }}
            >
              <FlagIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={`Undo (${undoStack.length - 1} available)`}>
            <IconButton
              onClick={handleUndo}
              disabled={undoStack.length < 2 || !canEdit}
              sx={{
                bgcolor: (undoStack.length >= 2 && canEdit) ? '#dee2e6' : '#f8f9fa',
                color: '#333',
                '&:hover': { bgcolor: (undoStack.length >= 2 && canEdit) ? '#adb5bd' : '#f8f9fa' },
                boxShadow: 1,
              }}
            >
              <BackIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={`Redo (${redoStack.length} available)`}>
            <IconButton
              onClick={handleRedo}
              disabled={!redoStack.length || !canEdit}
              sx={{
                bgcolor: (redoStack.length > 0 && canEdit) ? '#dee2e6' : '#f8f9fa',
                color: '#333',
                '&:hover': { bgcolor: (redoStack.length > 0 && canEdit) ? '#adb5bd' : '#f8f9fa' },
                boxShadow: 1,
              }}
            >
              <RedoIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* ReactFlow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          fitView
          style={{ width: '100%', height: '100%' }}
          connectionLineStyle={{ stroke: '#ddd', strokeWidth: 2 }}
          defaultEdgeOptions={{
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, markerWidth: 40, markerHeight: 40 },
          }}
        >
          <Controls />
          <Background gap={16} size={1} color="#f1f1f1" />
        </ReactFlow>
      </Box>

      {/* Enhanced Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={(event, reason) => {
          // Prevent closing on backdrop click to avoid accidental closes
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
          setDrawerOpen(false);
        }}
        PaperProps={{
          sx: { 
            width: 380,
            backgroundColor: '#fafafa',
          }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Enhanced Snackbar */}
      <Snackbar
        open={!!snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 5000 : 3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <MuiAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity || 'info'}
          variant="filled"
          sx={{ 
            width: '100%',
            maxWidth: 400,
            whiteSpace: 'pre-line', // Allows \n line breaks in messages
          }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {/* Form Error Display */}
      {formError && (
        <Snackbar
          open={!!formError}
          autoHideDuration={4000}
          onClose={() => setFormError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <MuiAlert
            onClose={() => setFormError('')}
            severity="error"
            variant="filled"
          >
            {formError}
          </MuiAlert>
        </Snackbar>
      )}

      {/* COMMENTED OUT: AI Workflow Generator Dialog
      {showAIGenerator && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
          }}
        >
          <AIWorkflowGenerator
            onWorkflowGenerated={handleWorkflowGenerated}
            onClose={handleCloseAIGenerator}
            onGenerationStart={handleAIGenerationStart}
          />
        </Box>
      )}
      */}
    </ReactFlowProvider>
  );
}

export default CreateWorkflow;