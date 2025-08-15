import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Menu,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Radio,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Gavel,
  Cancel,
  RemoveCircle,
  TrendingUp,
  TrendingDown,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  DragIndicator as DragIcon,
  TableChart as TableChartIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  DatasetLinked as DatasetIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import ReactApexChart from 'react-apexcharts';
import dummyData from './dummy_data.json';
// Replaced react-beautiful-dnd with @dnd-kit for modern DnD without deprecation warnings
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Constants
const STATUS_ICONS = {
  'Resolved': <CheckCircle />,
  'Pending Review': <HourglassEmpty />,
  'Under Review': <Gavel />,
  'Escalated': <Gavel />,
  'Rejected': <Cancel />,
  'Withdrawn': <RemoveCircle />,
  'Approved': <CheckCircle />,
  'Pending': <HourglassEmpty />,
  'Completed': <CheckCircle />,
  'Failed': <Cancel />,
  'Verified': <CheckCircle />,
  'New': <HourglassEmpty />,
  'In Progress': <HourglassEmpty />,
  'Return': <Cancel />
};

const TIME_PERIODS = ['Last 12 Months', 'Last 6 Months', 'Last 3 Months'];
const TIME_BUCKETS = ['Monthly', 'Weekly', 'Daily'];
const DATA_TYPES = ['Disputes', 'Adjustments', 'Payments', 'Quotas'];
const CHART_TYPES = [
  { id: 'bar', name: 'Bar Chart', icon: <BarChartIcon /> },
  { id: 'pie', name: 'Pie Chart', icon: <PieChartIcon /> },
  { id: 'line', name: 'Line Chart', icon: <LineChartIcon /> },
  { id: 'table', name: 'Data Table', icon: <TableChartIcon /> }
];

// Helper functions
const getTotalFieldName = (dataType) => {
  switch(dataType) {
    case 'Disputes': return 'totalDisputes';
    case 'Adjustments': return 'totalAdjustments';
    case 'Payments': return 'totalPayments';
    case 'Quotas': return 'totalQuotas';
    default: return 'total';
  }
};

const calculateAverageResolutionTime = (data) => (
  Math.floor(Math.random() * 10) + 1
);

const calculateWinRate = (data) => {
  const resolved = data.statusData.find(item => 
    item.name === 'Resolved' || 
    item.name === 'Approved' || 
    item.name === 'Completed' || 
    item.name === 'Verified'
  );
  const rejected = data.statusData.find(item => 
    item.name === 'Rejected' || 
    item.name === 'Failed' || 
    item.name === 'Return'
  );
  return resolved && rejected ? Math.round((resolved.value / (resolved.value + rejected.value)) * 100) : 0;
};

const getDefaultWidgets = (dataType = 'Quotas') => [
  {
    id: 'status-breakdown',
    title: `${dataType} Status Overview`,
    type: 'status',
    dataType,
    timePeriod: 'Last 12 Months',
    size: { xs: 12, md: 12 },
    order: 1,
    dataset: 'statusData'
  },
  {
    id: 'distribution-chart',
    title: `${dataType} Status Distribution`,
    type: 'pie',
    dataType,
    timePeriod: 'Last 12 Months',
    size: { xs: 12, md: 6 },
    order: 2,
    dataset: 'statusData'
  },
  {
    id: 'trend-chart',
    title: `${dataType} Trend Analysis`,
    type: 'bar',
    dataType,
    timePeriod: 'Last 12 Months',
    timeBucket: 'Monthly',
    size: { xs: 12, md: 6 },
    order: 3,
    dataset: 'monthlyData'
  }
];

// External SortableWidget component (moved out to avoid redefining per render)
const SortableWidget = ({ widget, editLayoutMode, handleWidgetMenu, renderWidget = () => null }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id, disabled: !widget.isDraggable });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '100%'
  };
  return (
    <Grid
      item
      xs={widget.size?.xs || 12}
      md={widget.size?.md || 6}
      ref={setNodeRef}
      style={style}
    >
      <Box sx={{ position: 'relative' }}>
        <Paper
          sx={{
            position: 'absolute', top:0,left:0,right:0,height:'40px',display:'flex',alignItems:'center',pl:2,pr:1,
            borderTopLeftRadius:'4px',borderTopRightRadius:'4px',
            backgroundColor: widget.isDraggable ? (isDragging ? 'primary.light' : 'primary.lighter') : 'background.neutral',
            borderBottom:'1px solid', borderBottomColor: widget.isDraggable ? 'primary.main':'divider',
            cursor: widget.isDraggable ? 'grab':'default'
          }} elevation={0}
          {...(widget.isDraggable ? listeners : {})}
          {...(widget.isDraggable ? attributes : {})}
        >
          {widget.isDraggable && <DragIcon color="primary" sx={{ mr:1 }} />}
          <Typography variant="subtitle2" color={widget.isDraggable ? 'primary.dark':'text.secondary'} sx={{ flex:1, fontWeight: widget.isDraggable ? 'bold':'normal' }}>
            {widget.isDraggable ? (
              <Tooltip title="Drag to reposition">
                <span>⬌ Drag to reposition</span>
              </Tooltip>
            ) : widget.title}
          </Typography>
            <IconButton size="small" onClick={(e)=>handleWidgetMenu(e, widget)}>
              <MoreVertIcon />
            </IconButton>
        </Paper>
        <Box sx={{ pt:5 }}>
          {widget.isDraggable && !editLayoutMode && (
            <Badge color="primary" badgeContent="New" sx={{ position:'absolute', top:10,right:10,zIndex:2,'& .MuiBadge-badge':{ fontSize:'10px',height:'20px',minWidth:'44px'} }} />
          )}
          {renderWidget(widget)}
        </Box>
      </Box>
    </Grid>
  );
};

// Main Component
export function GetListView() {
  // Global state
  const [timePeriod, setTimePeriod] = useState(TIME_PERIODS[0]);
  const [timeBucket, setTimeBucket] = useState(TIME_BUCKETS[0]);
  const [dataType, setDataType] = useState(DATA_TYPES[3]); // Default to Quotas
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  
  // Dashboard management state
  const [widgets, setWidgets] = useState([]);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [saveDashboardOpen, setSaveDashboardOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState('My Dashboard');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState('default');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [changeChartTypeOpen, setChangeChartTypeOpen] = useState(false);
  
  // Dataset selection state
  const [datasetSelectionOpen, setDatasetSelectionOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [tempWidgetConfig, setTempWidgetConfig] = useState({
    title: '',
    type: 'bar',
    dataType: '',
    timePeriod: '',
    timeBucket: '',
    size: { xs: 12, md: 6 },
    dataset: null
  });
  
  // Data type change confirmation state
  const [confirmDataTypeChangeOpen, setConfirmDataTypeChangeOpen] = useState(false);
  const [pendingDataType, setPendingDataType] = useState(null);
  const [suppressNextDataTypeNotice, setSuppressNextDataTypeNotice] = useState(false);
  const [lastSavedWidgets, setLastSavedWidgets] = useState([]);
  // Layout edit mode
  const [editLayoutMode, setEditLayoutMode] = useState(false);
  const [layoutEditSnapshot, setLayoutEditSnapshot] = useState([]);

  // DnD sensors (pointer with small activation distance)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  
  // Predefined datasets for each dataType
  const predefinedDatasets = {
    'Quotas': [
      { id: 'statusData', name: 'Quota Status Distribution', description: 'Shows distribution of quotas by status', recommendedChartType: 'pie' },
      { id: 'monthlyData', name: 'Monthly Quota Trends', description: 'Shows quota trends by month', recommendedChartType: 'bar' },
      { id: 'weeklyData', name: 'Weekly Quota Activity', description: 'Shows quota activity by week', recommendedChartType: 'line' }
    ],
    'Disputes': [
      { id: 'statusData', name: 'Dispute Status Breakdown', description: 'Shows distribution of disputes by status', recommendedChartType: 'pie' },
      { id: 'monthlyData', name: 'Monthly Dispute Volume', description: 'Shows dispute volume by month', recommendedChartType: 'bar' },
      { id: 'successMetrics', name: 'Resolution Success Rate', description: 'Shows dispute resolution success metrics', recommendedChartType: 'line' }
    ],
    'Adjustments': [
      { id: 'statusData', name: 'Adjustment Status Overview', description: 'Shows distribution of adjustments by status', recommendedChartType: 'pie' },
      { id: 'monthlyData', name: 'Monthly Adjustment Trends', description: 'Shows adjustment trends by month', recommendedChartType: 'bar' },
      { id: 'dailyData', name: 'Daily Adjustment Activity', description: 'Shows detailed daily adjustment activity', recommendedChartType: 'line' }
    ],
    'Payments': [
      { id: 'statusData', name: 'Payment Status Summary', description: 'Shows distribution of payments by status', recommendedChartType: 'pie' },
      { id: 'monthlyData', name: 'Monthly Payment Volume', description: 'Shows payment volume by month', recommendedChartType: 'bar' },
      { id: 'successMetrics', name: 'Payment Success Metrics', description: 'Shows payment completion metrics over time', recommendedChartType: 'line' }
    ]
  };
  
  // Track whether global filters changed
  const previousDataTypeRef = useRef(dataType);
  
  // Initialize data
  useEffect(() => {
    updateChartData();
    
    // Load saved dashboards from localStorage
    const savedDashboards = localStorage.getItem('dashboards');
    if (savedDashboards) {
      try {
        const parsed = JSON.parse(savedDashboards);
        setDashboards(parsed);
      } catch (error) {
        console.error(`Error parsing saved dashboards: ${error}`);
      }
    }
    
    // Load default or saved dashboard
    const currentDashboard = localStorage.getItem('currentDashboard') || 'default';
    setSelectedDashboard(currentDashboard);
    
    const savedWidgets = localStorage.getItem(`dashboard_${currentDashboard}`);
    if (savedWidgets) {
      try {
        const parsed = JSON.parse(savedWidgets);
        // Mark saved widgets as not draggable
        const widgetsWithDraggableFlag = parsed.map(widget => ({
          ...widget,
          isDraggable: false // Existing widgets are not draggable
        }));
  setWidgets(widgetsWithDraggableFlag);
  setLastSavedWidgets(widgetsWithDraggableFlag);
        if (widgetsWithDraggableFlag.length > 0) {
          // Set global filters based on first widget
          setDataType(widgetsWithDraggableFlag[0].dataType || DATA_TYPES[3]);
          setTimePeriod(widgetsWithDraggableFlag[0].timePeriod || TIME_PERIODS[0]);
          setTimeBucket(widgetsWithDraggableFlag[0].timeBucket || TIME_BUCKETS[0]);
        }
      } catch (error) {
        console.error(`Error parsing saved widgets: ${error}`);
        // Set default widgets as not draggable
        const defaultWidgetsNotDraggable = getDefaultWidgets(dataType).map(widget => ({
          ...widget, 
          isDraggable: false
        }));
  setWidgets(defaultWidgetsNotDraggable);
  setLastSavedWidgets(defaultWidgetsNotDraggable);
      }
    } else {
      // Set default widgets as not draggable
      const defaultWidgetsNotDraggable = getDefaultWidgets(dataType).map(widget => ({
        ...widget, 
        isDraggable: false
      }));
  setWidgets(defaultWidgetsNotDraggable);
  setLastSavedWidgets(defaultWidgetsNotDraggable);
    }
  }, []);

  // Update chart data when filters change
  useEffect(() => {
    updateChartData();
  }, [timePeriod, timeBucket, dataType]);
  
  // Track data type changes to detect unsaved changes
  useEffect(() => {
    if (previousDataTypeRef.current !== dataType) {
      if (!suppressNextDataTypeNotice && (hasUnsavedChanges || widgets.length > 0)) {
        setNotification({
          open: true,
          message: 'Data type changed. Your current widgets may not match the new data type. Consider saving your dashboard.',
          severity: 'warning'
        });
      }
      previousDataTypeRef.current = dataType;
      if (suppressNextDataTypeNotice) setSuppressNextDataTypeNotice(false);
    }
  }, [dataType, widgets, hasUnsavedChanges, suppressNextDataTypeNotice]);

  // Function to fetch chart data
  const updateChartData = () => {
    setLoading(true);
    
    setTimeout(() => {
      try {
        const rawData = dummyData[dataType][timePeriod];
        
        setChartData({
          ...rawData,
          timeSeries: getTimeSeriesData(rawData, timeBucket)
        });
        
        // Update available datasets based on current data
        const datasets = [
          { id: 'statusData', name: 'Status Data', data: rawData.statusData },
          { id: 'monthlyData', name: 'Monthly Data', data: rawData.monthlyData },
          { id: 'weeklyData', name: 'Weekly Data', data: rawData.weeklyData },
          { id: 'dailyData', name: 'Daily Data', data: rawData.dailyData },
          { id: 'successMetrics', name: 'Success Metrics', data: rawData.successMetrics }
        ];
        setAvailableDatasets(datasets);
      } catch (error) {
        console.error(`Error updating chart data: ${error}`);
        setNotification({
          open: true,
          message: 'Error loading data for the selected filters',
          severity: 'error'
        });
      }
      
      setLoading(false);
    }, 500);
  };

  const getTimeSeriesData = (data, bucket) => (
    bucket === 'Monthly' ? data.monthlyData :
    bucket === 'Weekly' ? data.weeklyData :
    bucket === 'Daily' ? data.dailyData :
    data.monthlyData
  );
  
  const getTimeSeriesLabel = (bucket) => (
    bucket === 'Monthly' ? 'month' :
    bucket === 'Weekly' ? 'week' :
    bucket === 'Daily' ? 'date' :
    'month'
  );

  // Chart configurations
  const getBarChartOptions = (widgetData = {}) => {
    const data = widgetData.chartData || chartData;
    const bucket = widgetData.timeBucket || timeBucket;
    const dataset = widgetData.dataset || 'timeSeries';
    
    // Handle different dataset types
    let categories = [];
    if (dataset === 'statusData') {
      categories = data?.statusData.map(item => item.name) || [];
    } else if (['monthlyData', 'weeklyData', 'dailyData'].includes(dataset)) {
      categories = data?.[dataset].map(item => item[getTimeSeriesLabel(bucket)]) || [];
    } else {
      categories = data?.timeSeries.map(item => item[getTimeSeriesLabel(bucket)]) || [];
    }
    
    return {
      chart: { 
        type: 'bar', 
        height: 250,
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 500 } 
      },
      plotOptions: { 
        bar: { 
          borderRadius: 4,
          columnWidth: '60%',
        } 
      },
      dataLabels: { enabled: false },
      xaxis: { 
        categories,
        labels: { style: { fontSize: '12px' } }
      },
      yaxis: { labels: { style: { fontSize: '12px' } } },
      colors: ['#3f51b5'],
      grid: { borderColor: '#f1f1f1' }
    };
  };

  const getBarChartSeries = (widgetData = {}) => {
    const data = widgetData.chartData || chartData;
    const type = widgetData.dataType || dataType;
    const dataset = widgetData.dataset || 'timeSeries';
    
    // Handle different dataset types
    let values = [];
    if (dataset === 'statusData') {
      values = data?.statusData.map(item => item.value) || [];
    } else if (['monthlyData', 'weeklyData', 'dailyData'].includes(dataset)) {
      values = data?.[dataset].map(item => item.value) || [];
    } else {
      values = data?.timeSeries.map(item => item.value) || [];
    }
    
    return [{ 
      name: type, 
      data: values
    }];
  };

  const getPieChartOptions = (widgetData = {}) => {
    const data = widgetData.chartData || chartData;
    const dataset = widgetData.dataset || 'statusData';
    
    // Default to status data for pie charts if not specified
    const labels = dataset === 'statusData'
      ? data?.statusData.map(item => item.name) || []
      : data?.[dataset]?.map((item, index) => `Item ${index + 1}`) || [];
      
    const colors = dataset === 'statusData'
      ? data?.statusData.map(item => item.color) || []
      : undefined;
    
    return {
      chart: { 
        type: 'pie', 
        height: 350,
        animations: { enabled: true, easing: 'easeinout', speed: 500 } 
      },
      labels,
      colors,
      legend: { 
        position: 'right',
        fontSize: '14px',
        markers: { radius: 2 },
        itemMargin: { horizontal: 10, vertical: 5 }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val.toFixed(1)}%`,
        style: {
          fontSize: '12px',
          fontWeight: 'bold'
        },
        dropShadow: {
          enabled: false
        }
      },
      responsive: [{ 
        breakpoint: 960, 
        options: { 
          chart: { width: '100%' },
          legend: { position: 'bottom' } 
        } 
      }],
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: false
            }
          },
          customScale: 0.9
        }
      }
    };
  };

  const getPieChartSeries = (widgetData = {}) => {
    const data = widgetData.chartData || chartData;
    const dataset = widgetData.dataset || 'statusData';
    
    // Default to status data for pie charts if not specified
    if (dataset === 'statusData') {
      return data?.statusData.map(item => item.value) || [];
    }
    
    if (['monthlyData', 'weeklyData', 'dailyData'].includes(dataset)) {
      return data?.[dataset].map(item => item.value) || [];
    }
    
    return data?.statusData.map(item => item.value) || [];
  };

  const getLineChartOptions = (widgetData = {}) => {
    const data = widgetData.chartData || chartData;
    const dataset = widgetData.dataset || 'monthlyData';
    
    // Handle different dataset types
    let categories = [];
    if (dataset === 'successMetrics') {
      categories = Array(data?.successMetrics.trendData.length || 12).fill(0)
        .map((_, i) => `Period ${i+1}`);
    } else if (['monthlyData', 'weeklyData', 'dailyData'].includes(dataset)) {
      categories = data?.[dataset].map(item => {
        const label = dataset === 'monthlyData' ? 'month' : 
                      dataset === 'weeklyData' ? 'week' : 'date';
        return item[label];
      }) || [];
    } else {
      categories = data?.monthlyData.map(item => item.month) || [];
    }
    
    return {
      chart: { 
        type: 'line', 
        height: 300,
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 500 } 
      },
      xaxis: { 
        categories,
        labels: { style: { fontSize: '12px' } }
      },
      yaxis: { 
        labels: { style: { fontSize: '12px' } }
      },
      colors: ['#2196F3', '#FF4560', '#00E396'],
      stroke: { 
        curve: 'smooth',
        width: [3, 3, 3]
      },
      markers: {
        size: 5,
        hover: { size: 7 }
      },
      dataLabels: { enabled: false },
      tooltip: { 
        y: { formatter: value => `${value}` }
      },
      grid: { borderColor: '#f1f1f1' }
    };
  };

  const getLineChartSeries = (widgetData = {}) => {
    const data = widgetData.chartData || chartData;
    const dataset = widgetData.dataset || 'monthlyData';
    const type = widgetData.dataType || dataType;
    
    // Handle different dataset types
    if (dataset === 'successMetrics') {
      return [
        { 
          name: 'Success Rate', 
          data: data?.successMetrics.trendData || [] 
        },
        { 
          name: 'Target', 
          data: Array(data?.successMetrics.trendData.length || 12).fill(75)
        }
      ];
    }
    
    if (['monthlyData', 'weeklyData', 'dailyData'].includes(dataset)) {
      return [{ 
        name: type, 
        data: data?.[dataset].map(item => item.value) || [] 
      }];
    }
    
    // Default to monthly data
    return [{ 
      name: type, 
      data: data?.monthlyData.map(item => item.value) || [] 
    }];
  };
  
  // Widget Management
  // Auto-selects recommended dataset and chart type based on data type
  const handleAutoSelectDataset = (datasetId) => {
    const currentDataType = tempWidgetConfig.dataType || dataType;
    const datasets = predefinedDatasets[currentDataType] || [];
    
    // Find the dataset with the given ID
    const dataset = datasets.find(d => d.id === datasetId);
    if (dataset) {
      setSelectedDataset(dataset);
      setTempWidgetConfig({
        ...tempWidgetConfig,
        title: dataset.name,
        type: dataset.recommendedChartType,
        dataType: currentDataType,
        timePeriod,
        timeBucket,
        dataset: dataset.id
      });
    }
  };
  
  const handleAddWidget = () => {
    if (!tempWidgetConfig.title) {
      setNotification({
        open: true,
        message: 'Please provide a widget title',
        severity: 'error'
      });
      return;
    }
    
    if (!tempWidgetConfig.dataset) {
      setNotification({
        open: true,
        message: 'Please select a dataset for your widget',
        severity: 'error'
      });
      return;
    }
    
    const newWidget = {
      ...tempWidgetConfig,
      id: `widget-${Date.now()}`,
      order: widgets.length + 1,
      isDraggable: true // Flag to indicate this is a newly added widget that can be dragged
    };
    
    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    setAddWidgetOpen(false);
    setDatasetSelectionOpen(false);
    setTempWidgetConfig({
      title: '',
      type: 'bar',
      dataType: '',
      timePeriod: '',
      timeBucket: '',
      size: { xs: 12, md: 6 },
      dataset: null
    });
    setSelectedDataset(null);
    setHasUnsavedChanges(true);
    
    setNotification({
      open: true,
      message: 'Widget added successfully. You can reposition this new widget by dragging.',
      severity: 'success'
    });
  };
  
  const handleSaveDashboard = () => {
    // Check if dashboard name exists
    if (dashboards.includes(dashboardName) && dashboardName !== selectedDashboard) {
      setNotification({
        open: true,
        message: 'A dashboard with this name already exists',
        severity: 'warning'
      });
      return;
    }
    if (!dashboards.includes(dashboardName)) {
      const newDashboards = [...dashboards, dashboardName];
      setDashboards(newDashboards);
      localStorage.setItem('dashboards', JSON.stringify(newDashboards));
    }
    // Freeze draggable state so only newly added (post-save) widgets are draggable
    const frozen = widgets.map(w => ({ ...w, isDraggable: false }));
    setWidgets(frozen);
    localStorage.setItem(`dashboard_${dashboardName}`, JSON.stringify(frozen));
    localStorage.setItem('currentDashboard', dashboardName);
    setSelectedDashboard(dashboardName);
    setHasUnsavedChanges(false);
    setSaveDashboardOpen(false);
    setNotification({
      open: true,
      message: 'Dashboard saved successfully',
      severity: 'success'
    });
    if (editLayoutMode) {
      setEditLayoutMode(false);
      setLayoutEditSnapshot([]);
    }
  };

  // ===== Data Type Change Helpers (added) =====
  const applyDataTypeChange = (newType) => {
    const prev = previousDataTypeRef.current;
    setDataType(newType);
    setWidgets(prevWidgets => prevWidgets.map(w => {
      let newTitle = w.title;
      if (prev && typeof newTitle === 'string' && newTitle.includes(prev)) {
        newTitle = newTitle.replace(prev, newType);
      }
      return { ...w, dataType: newType, title: newTitle };
    }));
    setHasUnsavedChanges(true);
    previousDataTypeRef.current = newType;
  };

  const handleDataTypeSelect = (e) => {
    const newType = e.target.value;
    if (newType === dataType) return;
    if (hasUnsavedChanges && widgets.length > 0) {
      setPendingDataType(newType);
      setConfirmDataTypeChangeOpen(true);
    } else {
      setSuppressNextDataTypeNotice(true);
      applyDataTypeChange(newType);
    }
  };

  // Begin layout edit: enable drag for all widgets
  const startEditLayout = () => {
    setLayoutEditSnapshot(widgets.map(w => ({ ...w }))); // deep-ish copy
    setEditLayoutMode(true);
    // Mark all widgets draggable visually (without changing original isDraggable flag persistently)
    setWidgets(prev => prev.map(w => ({ ...w, isDraggable: true })));
  };

  // Cancel layout edit: revert snapshot
  const cancelEditLayout = () => {
    setWidgets(layoutEditSnapshot.map(w => ({ ...w, isDraggable: false })));
    setEditLayoutMode(false);
    setLayoutEditSnapshot([]);
    setHasUnsavedChanges(false); // revert changes
  };

  // Finish layout edit: keep new order but freeze drag until next edit or new widget
  const finishEditLayout = () => {
    setWidgets(prev => prev.map(w => ({ ...w, isDraggable: false })));
    setEditLayoutMode(false);
    setLayoutEditSnapshot([]);
    setHasUnsavedChanges(true); // need save
  };
  
  const handleDeleteWidget = (widgetId) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    setWidgets(updatedWidgets);
    setMenuAnchorEl(null);
    setHasUnsavedChanges(true);
    
    setNotification({
      open: true,
      message: 'Widget removed',
      severity: 'info'
    });
  };
  
  const handleChangeChartType = () => {
    if (!selectedWidget) return;
    
    const updatedWidgets = widgets.map(widget => {
      if (widget.id === selectedWidget.id) {
        return {
          ...widget,
          type: tempWidgetConfig.type
        };
      }
      return widget;
    });
    
    setWidgets(updatedWidgets);
    setMenuAnchorEl(null);
    setChangeChartTypeOpen(false);
    setHasUnsavedChanges(true);
    
    setNotification({
      open: true,
      message: 'Chart type changed successfully',
      severity: 'success'
    });
  };

  const handleWidgetMenu = (event, widget) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedWidget(widget);
    setTempWidgetConfig({
      ...widget
    });
  };
  
  const closeWidgetMenu = () => {
    setMenuAnchorEl(null);
  };
  
  const loadWidgetData = (widget) => {
    const data = dummyData[widget.dataType][widget.timePeriod];
    const timeSeries = widget.timeBucket ? 
      getTimeSeriesData(data, widget.timeBucket) : 
      data.monthlyData;
      
    return {
      ...data,
      timeSeries
    };
  };
  
  // Handle dataset selection dialog
  const handleDatasetDialogOpen = () => {
    setTempWidgetConfig({
      ...tempWidgetConfig,
      dataType,
      timePeriod,
      timeBucket
    });
    
    // Automatically show the predefined datasets for the selected dataType
    const currentDatasets = predefinedDatasets[dataType] || [];
    if (currentDatasets.length > 0) {
      setAvailableDatasets(currentDatasets.map(dataset => {
        const rawData = dummyData[dataType][timePeriod];
        return {
          ...dataset,
          data: rawData[dataset.id] || []
        };
      }));
    }
    
    setDatasetSelectionOpen(true);
  };
  
  const handleDatasetSelect = (dataset) => {
    setSelectedDataset(dataset);
    
    // Auto-suggest chart type based on the dataset
    const suggestedType = dataset.recommendedChartType || tempWidgetConfig.type;
    
    setTempWidgetConfig({
      ...tempWidgetConfig,
      title: dataset.name || tempWidgetConfig.title,
      type: suggestedType,
      dataset: dataset.id
    });
  };
  
  // Drag and drop handlers
  const onDragEnd = (result) => {
    // This handler now unused after migration; replaced by handleDndDragEnd
  };

  // New DnD handler (@dnd-kit)
  const handleDndDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Work on list sorted by order
    const ordered = [...widgets].sort((a,b)=>a.order-b.order);
    const oldIndex = ordered.findIndex(w => w.id === active.id);
    const newIndex = ordered.findIndex(w => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(ordered, oldIndex, newIndex)
      .map((w,i) => ({ ...w, order: i+1 }));
    setWidgets(reordered);
    setHasUnsavedChanges(true);
    setNotification({ open: true, message: 'Widget position updated', severity: 'success' });
  };

  // (SortableWidget moved outside component scope)
  
  // Widget rendering functions
  const renderMetricsWidget = (widget, widgetData) => {
    const data = widgetData.chartData;
    const totalField = getTotalFieldName(widget.dataType);
    const totalValue = data[totalField];
    const prevPeriodValue = Math.round(totalValue * 0.85);
    const trendDirection = totalValue >= prevPeriodValue ? 'up' : 'down';
    const trendPercentage = Math.round(Math.abs(totalValue - prevPeriodValue) / prevPeriodValue * 100);
    const winRate = calculateWinRate(data);
    const avgResolutionTime = calculateAverageResolutionTime(data);
    
    return (
      <Paper sx={{ p: 2 }} elevation={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{widget.title}</Typography>
          <IconButton size="small" onClick={(e) => handleWidgetMenu(e, widget)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{px: 2, py:1}}>
                <Typography variant="subtitle2" color="textSecondary">
                  Total {widget.dataType}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="h5">{totalValue}</Typography>
                  <Chip 
                    label={`${trendPercentage}% ${trendDirection}`}
                    color={trendDirection === 'up' ? 'success' : 'error'}
                    icon={trendDirection === 'up' ? <TrendingUp /> : <TrendingDown />}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  vs {prevPeriodValue} last period
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{px: 2, py:1}}>
                <Typography variant="subtitle2" color="textSecondary">
                  Win Rate
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>{winRate}%</Typography>
                <Typography variant="caption" color="textSecondary">
                  Successful resolutions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{px: 2, py:1}}>
                <Typography variant="subtitle2" color="textSecondary">
                  Avg. Resolution Time
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>{avgResolutionTime} days</Typography>
                <Typography variant="caption" color="textSecondary">
                  Across all cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{px: 2, py:1}}>
                <Typography variant="subtitle2" color="textSecondary">
                  Completion Rate
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {data.successMetrics.completionRate}%
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Target: 75%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    );
  };
  
  const renderStatusWidget = (widget, widgetData) => {
    const { statusData } = widgetData.chartData;
    
    return (
      <Paper sx={{ p: 2 }} elevation={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{widget.title}</Typography>
          <IconButton size="small" onClick={(e) => handleWidgetMenu(e, widget)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          {statusData.map((item) => (
            <Grid item xs={6} sm={4} md={2} key={item.name}>
              <Card elevation={2} sx={{ bgcolor: `${item.color}15` }}>
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: item.color }}>{STATUS_ICONS[item.name]}</Box>
                    <Box>
                      <Typography variant="caption">{item.name}</Typography>
                      <Typography variant="subtitle1">{item.value}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  };
  
  const renderTableWidget = (widget, widgetData) => {
    const data = widgetData.chartData;
    const dataset = widget.dataset || 'statusData';
    
    let tableData = [];
    let columns = [];
    
    if (dataset === 'statusData') {
      tableData = data.statusData;
      columns = ['name', 'value'];
    } else if (dataset === 'monthlyData') {
      tableData = data.monthlyData;
      columns = ['month', 'value'];
    } else if (dataset === 'weeklyData') {
      tableData = data.weeklyData;
      columns = ['week', 'value'];
    } else if (dataset === 'dailyData') {
      tableData = data.dailyData;
      columns = ['date', 'value'];
    } else if (dataset === 'successMetrics') {
      // Convert object to array for table display
      tableData = Object.entries(data.successMetrics).map(([key, value]) => {
        if (key === 'trendData') return null; // Skip trend data
        return { metric: key, value };
      }).filter(Boolean);
      columns = ['metric', 'value'];
    }
    
    const columnLabels = {
      name: 'Status',
      value: 'Count',
      month: 'Month',
      week: 'Week',
      date: 'Date',
      metric: 'Metric'
    };
    
    return (
      <Paper sx={{ p: 2 }} elevation={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{widget.title}</Typography>
          <IconButton size="small" onClick={(e) => handleWidgetMenu(e, widget)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {columns.map(col => (
                  <TableCell key={col} align={col === 'value' ? 'right' : 'left'} sx={{ fontWeight: 'bold' }}>
                    {columnLabels[col] || col.charAt(0).toUpperCase() + col.slice(1)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                  {columns.map(col => (
                    <TableCell key={`${index}-${col}`} align={col === 'value' ? 'right' : 'left'}>
                      {col === 'value' && typeof row[col] === 'number' 
                        ? row[col].toLocaleString() 
                        : row[col]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  const renderWidget = (widget) => {
    const widgetData = {
      ...widget,
      chartData: loadWidgetData(widget)
    };
    
    switch (widget.type) {
      case 'bar':
        return (
          <Paper sx={{ p: 2, height: '100%' }} elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{widget.title}</Typography>
              <IconButton size="small" onClick={(e) => handleWidgetMenu(e, widget)}>
                <MoreVertIcon />
              </IconButton>
            </Box>
            <ReactApexChart
              options={getBarChartOptions(widgetData)}
              series={getBarChartSeries(widgetData)}
              type="bar"
              height={300}
            />
            <Typography variant="caption" display="block" textAlign="center">
              {widget.dataType} ({widget.timePeriod}) - {widget.dataset || 'Monthly'} data
            </Typography>
          </Paper>
        );
        
      case 'pie':
        return (
          <Paper sx={{ p: 2, height: '100%' }} elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{widget.title}</Typography>
              <IconButton size="small" onClick={(e) => handleWidgetMenu(e, widget)}>
                <MoreVertIcon />
              </IconButton>
            </Box>
            <ReactApexChart
              options={getPieChartOptions(widgetData)}
              series={getPieChartSeries(widgetData)}
              type="pie"
              height={300}
            />
            <Typography variant="caption" display="block" textAlign="center">
              {widget.dataType} ({widget.timePeriod}) - {widget.dataset || 'Status Distribution'}
            </Typography>
          </Paper>
        );
        
      case 'line':
        return (
          <Paper sx={{ p: 2, height: '100%' }} elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{widget.title}</Typography>
              <IconButton size="small" onClick={(e) => handleWidgetMenu(e, widget)}>
                <MoreVertIcon />
              </IconButton>
            </Box>
            <ReactApexChart
              options={getLineChartOptions(widgetData)}
              series={getLineChartSeries(widgetData)}
              type="line"
              height={300}
            />
            <Typography variant="caption" display="block" textAlign="center">
              {widget.dataType} ({widget.timePeriod}) - {widget.dataset || 'Trend Over Time'}
            </Typography>
          </Paper>
        );
        
      case 'table':
        return renderTableWidget(widget, widgetData);
        
      case 'metrics':
        return renderMetricsWidget(widget, widgetData);
        
      case 'status':
        return renderStatusWidget(widget, widgetData);
        
      default:
        return null;
    }
  };

  if (!chartData) return <LinearProgress />;

  return (
    <Box sx={{ px: 3, pt: 0, pb: 2 }}>
      {/* Header with Dashboard Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DashboardIcon /> 
          {dashboardName}
          {hasUnsavedChanges && (
            <Tooltip title="You have unsaved changes">
              <span>
                <Badge color="warning" variant="dot">
                  <WarningIcon sx={{ ml: 1, color: 'warning.main', fontSize: 20 }} />
                </Badge>
              </span>
            </Tooltip>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Add a new widget to your dashboard">
            <span>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={() => setAddWidgetOpen(true)}
                color="primary"
              >
                Add Widget
              </Button>
            </span>
          </Tooltip>
          {widgets.length > 0 && !editLayoutMode && (
            <Tooltip title="Enable drag & drop for all widgets">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={startEditLayout}
                >
                  Edit Layout
                </Button>
              </span>
            </Tooltip>
          )}
          {editLayoutMode && (
            <>
              <Tooltip title="Keep the new arrangement (unsaved until you save dashboard)">
                <span>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={finishEditLayout}
                  >
                    Finish Layout
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Revert layout changes">
                <span>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={cancelEditLayout}
                  >
                    Cancel Layout
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
          <Tooltip title="Save your dashboard configuration">
            <span>
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />} 
                onClick={() => setSaveDashboardOpen(true)}
                color="primary"
                disabled={!hasUnsavedChanges && widgets.length > 0}
              >
                Save Dashboard
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Global Filters */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Data Type</InputLabel>
              <Select
                value={dataType}
                onChange={handleDataTypeSelect}
                label="Data Type"
              >
                {DATA_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Period</InputLabel>
              <Select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                label="Time Period"
              >
                {TIME_PERIODS.map(period => (
                  <MenuItem key={period} value={period}>{period}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Bucket</InputLabel>
              <Select
                value={timeBucket}
                onChange={(e) => setTimeBucket(e.target.value)}
                label="Time Bucket"
              >
                {TIME_BUCKETS.map(bucket => (
                  <MenuItem key={bucket} value={bucket}>{bucket}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {widgets.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: editLayoutMode ? 'warning.lighter' : 'info.lighter', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DragIcon color={editLayoutMode ? 'warning' : 'primary'} />
            <Typography variant="body2" color={editLayoutMode ? 'warning.dark' : 'info.dark'}>
              <b>Layout Mode:</b> {editLayoutMode ? 'Drag any widget to reorder. Click Finish or Cancel when done.' : 'Click Edit Layout to reorder existing widgets or drag newly added ones directly.'}
            </Typography>
          </Box>
        )}
      </Paper>

      {loading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress color="secondary" sx={{ height: 6 }} />
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Updating dashboard...
          </Typography>
        </Box>
      )}

      {/* Dashboard Widgets with Drag and Drop */}
      {widgets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <DashboardIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.4 }} />
            <Typography variant="h6" color="text.secondary">
              Your dashboard is empty
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 2 }}>
              Start building your dashboard by clicking the &quot;Add Widget&quot; button above.
              Each data type has pre-built visualizations ready for you to use.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => setAddWidgetOpen(true)}
            >
              Add Your First Widget
            </Button>
          </Box>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDndDragEnd}
        >
          <SortableContext
            items={[...widgets].sort((a,b)=>a.order-b.order).map(w=>w.id)}
            strategy={verticalListSortingStrategy}
          >
            <Grid container spacing={3}>
              {[...widgets]
                .sort((a,b)=>a.order-b.order)
                .map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    editLayoutMode={editLayoutMode}
                    handleWidgetMenu={handleWidgetMenu}
                    renderWidget={renderWidget}
                  />
                ))}
            </Grid>
          </SortableContext>
        </DndContext>
      )}
      
      {/* Add Widget Dialog */}
      <Dialog 
        open={addWidgetOpen} 
        onClose={() => setAddWidgetOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AddIcon sx={{ mr: 1, color: 'primary.main' }}/>
            Add a new widget to your dashboard
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary.main" sx={{ mb: 3 }}>
              Choose visualization type
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Main visualization types */}
              <Grid item xs={6} sm={3}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => {
                    setTempWidgetConfig({...tempWidgetConfig, type: 'bar'});
                    handleDatasetDialogOpen();
                  }}
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: 'divider'
                  }}
                >
                  <BarChartIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>Bar Chart</Typography>
                </Button>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => {
                    setTempWidgetConfig({...tempWidgetConfig, type: 'pie'});
                    handleDatasetDialogOpen();
                  }}
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: 'divider'
                  }}
                >
                  <PieChartIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>Pie Chart</Typography>
                </Button>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => {
                    setTempWidgetConfig({...tempWidgetConfig, type: 'line'});
                    handleDatasetDialogOpen();
                  }}
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: 'divider'
                  }}
                >
                  <LineChartIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>Line Chart</Typography>
                </Button>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => {
                    setTempWidgetConfig({...tempWidgetConfig, type: 'table'});
                    handleDatasetDialogOpen();
                  }}
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: 'divider'
                  }}
                >
                  <TableChartIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>Data Table</Typography>
                </Button>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }}>
              <Chip label="Special Widgets" />
            </Divider>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button 
                  variant="outlined" 
                  color="secondary"
                  fullWidth
                  onClick={() => {
                    // For metrics widget, auto-create without dataset selection
                    setTempWidgetConfig({
                      title: `${dataType} Summary Metrics`,
                      type: 'metrics',
                      dataType,
                      timePeriod,
                      timeBucket,
                      size: { xs: 12, md: 12 },
                      dataset: null
                    });
                    handleAddWidget();
                  }}
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: 'secondary.light'
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 40, mb: 1, color: 'secondary.main' }} />
                  <Typography>Summary Metrics</Typography>
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button 
                  variant="outlined"
                  color="secondary" 
                  fullWidth
                  onClick={() => {
                    // For status widget, auto-create without dataset selection
                    setTempWidgetConfig({
                      title: `${dataType} Status Overview`,
                      type: 'status',
                      dataType,
                      timePeriod,
                      timeBucket,
                      size: { xs: 12, md: 12 },
                      dataset: 'statusData'
                    });
                    handleAddWidget();
                  }}
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: 'secondary.light'
                  }}
                >
                  <DashboardIcon sx={{ fontSize: 40, mb: 1, color: 'secondary.main' }} />
                  <Typography>Status Overview</Typography>
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddWidgetOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dataset Selection Dialog */}
      <Dialog
        open={datasetSelectionOpen}
        onClose={() => setDatasetSelectionOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DatasetIcon sx={{ mr: 1, color: 'primary.main' }}/>
            Select a pre-built visualization for {dataType}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Choose one of these ready-to-use data visualizations. New widgets you add can be repositioned by dragging.
          </Typography>
          
          <Grid container spacing={3}>
            {availableDatasets.map(dataset => {
              // Determine what chart preview to show
              let chartPreview;
              const chartType = dataset.recommendedChartType || 'bar'; // Set a default value to prevent errors
              
              if (chartType === 'pie') {
                chartPreview = (
                  <Box sx={{ height: 120, display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <PieChartIcon sx={{ fontSize: 80, color: 'primary.light', opacity: 0.8 }} />
                  </Box>
                );
              } else if (chartType === 'bar') {
                chartPreview = (
                  <Box sx={{ height: 120, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-evenly', mb: 2 }}>
                    {[40, 60, 80, 50, 75, 45].map((height, i) => (
                      <Box 
                        key={i} 
                        sx={{ 
                          height: `${height}px`, 
                          width: '20px', 
                          bgcolor: 'primary.light',
                          opacity: 0.8,
                          borderTopLeftRadius: 3,
                          borderTopRightRadius: 3
                        }} 
                      />
                    ))}
                  </Box>
                );
              } else if (chartType === 'line') {
                chartPreview = (
                  <Box sx={{ height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                    <LineChartIcon sx={{ fontSize: 80, color: 'primary.light', opacity: 0.8 }} />
                  </Box>
                );
              } else {
                chartPreview = (
                  <Box sx={{ height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                    <TableChartIcon sx={{ fontSize: 80, color: 'primary.light', opacity: 0.8 }} />
                  </Box>
                );
              }
              
              return (
                <Grid item xs={12} md={4} key={dataset.id}>
                  <Paper 
                    elevation={dataset.id === selectedDataset?.id ? 8 : 2}
                    sx={{ 
                      p: 2,
                      pt: 3, 
                      cursor: 'pointer',
                      height: '100%',
                      border: dataset.id === selectedDataset?.id ? '2px solid #3f51b5' : '1px solid #eee',
                      backgroundColor: dataset.id === selectedDataset?.id ? 'rgba(63, 81, 181, 0.04)' : 'white',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#3f51b5',
                        boxShadow: 6,
                        transform: 'translateY(-4px)'
                      },
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={() => handleDatasetSelect(dataset)}
                  >
                    {/* Chart type preview */}
                    {chartPreview}
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1
                    }}>
                      <Typography variant="h6" color="primary" fontWeight="medium">
                        {dataset.name}
                      </Typography>
                      <Radio 
                        checked={dataset.id === selectedDataset?.id}
                        onChange={() => handleDatasetSelect(dataset)}
                        color="primary"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                      {dataset.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 'auto' }}>
                      <Chip 
                        label={`Recommended: ${chartType ? chartType.charAt(0).toUpperCase() + chartType.slice(1) : 'Bar'} Chart`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          
          {selectedDataset && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Preview of {selectedDataset.name}
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 1 }}>
                {selectedDataset.id === 'statusData' && (
                  <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Count</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedDataset.data.slice(0, 5).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align="right">{item.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                
                {['monthlyData', 'weeklyData', 'dailyData'].includes(selectedDataset.id) && (
                  <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>{selectedDataset.id === 'monthlyData' ? 'Month' : selectedDataset.id === 'weeklyData' ? 'Week' : 'Date'}</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedDataset.data.slice(0, 5).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {selectedDataset.id === 'monthlyData' ? item.month : 
                               selectedDataset.id === 'weeklyData' ? item.week : 
                               item.date}
                            </TableCell>
                            <TableCell align="right">{item.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                
                {selectedDataset.id === 'successMetrics' && (
                  <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>Metric</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(selectedDataset.data)
                          .filter(([key]) => key !== 'trendData')
                          .slice(0, 5)
                          .map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</TableCell>
                              <TableCell align="right">{typeof value === 'number' ? value.toFixed(2) : value}</TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDatasetSelectionOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setDatasetSelectionOpen(false);
              // If a dataset is selected, add the widget immediately instead of going back to the add widget dialog
              if (selectedDataset) {
                handleAddWidget();
              } else {
                setAddWidgetOpen(true);
              }
            }} 
            variant="contained" 
            color="primary"
            disabled={!selectedDataset}
          >
            {selectedDataset ? 'Add Widget' : 'Select Dataset'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Save Dashboard Dialog */}
      <Dialog 
        open={saveDashboardOpen} 
        onClose={() => setSaveDashboardOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Save Dashboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dashboard Name"
            fullWidth
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            helperText="Enter a name to save your dashboard configuration"
          />
          
          {dashboards.length > 0 && (
            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>Load Existing Dashboard</InputLabel>
              <Select
                value={selectedDashboard}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  setSelectedDashboard(selectedValue);
                  setDashboardName(selectedValue);
                  
                  const savedWidgets = localStorage.getItem(`dashboard_${selectedValue}`);
                  if (savedWidgets) {
                    try {
                      setWidgets(JSON.parse(savedWidgets));
                      setHasUnsavedChanges(false);
                    } catch (error) {
                      console.error(`Error parsing saved widgets: ${error}`);
                    }
                  }
                }}
                label="Load Existing Dashboard"
              >
                {dashboards.map(name => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Select an existing dashboard to load or overwrite
              </Typography>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDashboardOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveDashboard} variant="contained" color="primary">
            Save Dashboard
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Change Chart Type Dialog */}
      <Dialog
        open={changeChartTypeOpen}
        onClose={() => setChangeChartTypeOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Change Chart Type</DialogTitle>
        <DialogContent>
          <List>
            {CHART_TYPES.map(type => (
              <ListItem
                button
                key={type.id}
                onClick={() => setTempWidgetConfig({...tempWidgetConfig, type: type.id})}
                selected={tempWidgetConfig.type === type.id}
              >
                <ListItemIcon>
                  {type.icon}
                </ListItemIcon>
                <ListItemText primary={type.name} />
                <Radio
                  edge="end"
                  checked={tempWidgetConfig.type === type.id}
                  onChange={() => setTempWidgetConfig({...tempWidgetConfig, type: type.id})}
                />
              </ListItem>
            ))}
            {['metrics', 'status'].includes(selectedWidget?.type) && (
              <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
                Special widget types (Metrics, Status) cannot be changed to other chart types
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeChartTypeOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleChangeChartType} 
            variant="contained" 
            color="primary"
            disabled={['metrics', 'status'].includes(selectedWidget?.type)}
          >
            Change Chart Type
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Widget Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeWidgetMenu}
      >
        {!['metrics', 'status'].includes(selectedWidget?.type) && (
          <MenuItem onClick={() => {
            setChangeChartTypeOpen(true);
            setMenuAnchorEl(null);
          }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Change Chart Type
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDeleteWidget(selectedWidget?.id)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Remove Widget
        </MenuItem>
      </Menu>
      
      {/* Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000}
        onClose={() => setNotification({...notification, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification({...notification, open: false})} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
      <Dialog
        open={confirmDataTypeChangeOpen}
        onClose={() => { setConfirmDataTypeChangeOpen(false); setPendingDataType(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Switch Data Type?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You have unsaved changes. Save the current dashboard before switching from <b>{previousDataTypeRef.current}</b> to <b>{pendingDataType}</b>?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Switch Without Saving will discard unsaved changes and update all widgets to the new data type.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDataTypeChangeOpen(false); setPendingDataType(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              handleSaveDashboard();
              setSuppressNextDataTypeNotice(true);
              applyDataTypeChange(pendingDataType);
              setConfirmDataTypeChangeOpen(false);
              setPendingDataType(null);
            }}
            startIcon={<SaveIcon />}
            color="primary"
          >
            Save & Switch
          </Button>
          <Button
            onClick={() => {
              // Discard unsaved changes by reverting to last saved snapshot then applying new type
              const reverted = lastSavedWidgets.map(w => ({ ...w, dataType: pendingDataType, title: w.title.replace(dataType, pendingDataType) }));
              setWidgets(reverted);
              setDataType(pendingDataType);
              previousDataTypeRef.current = pendingDataType;
              setHasUnsavedChanges(true); // switching creates new unsaved state unless user saves
              setSuppressNextDataTypeNotice(true);
              setConfirmDataTypeChangeOpen(false);
              setPendingDataType(null);
            }}
            variant="contained"
            color="warning"
          >
            Switch Without Saving
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GetListView;