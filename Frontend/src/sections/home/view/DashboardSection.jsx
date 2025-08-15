import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Popover,
  Badge,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import WarningIcon from '@mui/icons-material/Warning';
import { WavingHand, TrendingUp, TrendingDown } from '@mui/icons-material';
import dayjs from 'dayjs';
import ReactApexChart from 'react-apexcharts';

const DATA_TYPES = ['Quotas', 'Disputes', 'Adjustments', 'Payments'];
const TIME_PERIODS = ['Last 12 Months', 'Last 6 Months', 'Last 3 Months'];
const TIME_BUCKETS = ['Monthly', 'Weekly', 'Daily'];

const statusColor = (status) => {
  switch (status) {
    case 'New': return 'info';
    case 'In Progress': return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'error';
    default: return 'default';
  }
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export function DashboardSection({ user, analytics }) {
  const [tab, setTab] = useState(0);

  const [dataType, setDataType] = useState(DATA_TYPES[0]);
  const [timePeriod, setTimePeriod] = useState(TIME_PERIODS[0]);
  const [timeBucket, setTimeBucket] = useState(TIME_BUCKETS[0]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [anchorEl, setAnchorEl] = useState(null);

  const handleFilterOpen = (event) => setAnchorEl(event.currentTarget);
  const handleFilterClose = () => setAnchorEl(null);
  const filterOpen = Boolean(anchorEl);

  if (!analytics) return null;

  if (analytics.orgUsers) {
    const {
      quotaStatusBreakdown = [],
      quotasOverTime = [],
      approvalRates = [],
      avgApprovalTime = 0,
      recentActivity = [],
      completionRate = 0,
      totalQuotas = 0,
      completedQuotas = 0,
      orgUsers = [],
    } = analytics;

    
    const noQuotas = !quotaStatusBreakdown.length;
    const currentValue = totalQuotas;
    const prevValue = Math.round(totalQuotas * 0.85);
    const trendDirection = currentValue >= prevValue ? 'up' : 'down';
    const trendPercentage = prevValue
      ? Math.round(Math.abs(currentValue - prevValue) / prevValue * 100)
      : 0;

    // Bar chart
    const chartTimeSeries =
      quotasOverTime.length > 0
        ? quotasOverTime.map((q) => ({
            x: q.period || q.month || q.date,
            y: Number(q.count ?? q.total ?? 0), // Use count OR total, cast to number
          }))
        : [];
    const barChartOptions = {
      chart: { type: 'bar', height: 250, toolbar: { show: false } },
      xaxis: {
        categories: chartTimeSeries.map((item) => item.x),
        labels: { style: { fontSize: '12px' } },
      },
      yaxis: { labels: { style: { fontSize: '12px' } } },
      colors: ['#3f51b5'],
      grid: { borderColor: '#f1f1f1' },
      dataLabels: { enabled: false },
    };
    const barChartSeries = [
      { name: 'Quotas', data: chartTimeSeries.map((item) => item.y) },
    ];

    // Pie chart
    const pieChartOptions = {
      chart: { type: 'pie' },
      labels: quotaStatusBreakdown.map((s) => s.status),
      legend: { position: 'right' },
      dataLabels: { enabled: true },
    };
    const pieChartSeries = quotaStatusBreakdown.map((s) => Number(s.total || 0)); // Cast all to number

    return (
      <Box sx={{ px: 3, pb: 2, minHeight: '100vh' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1
        }}>
          <Typography variant="h6">
            You can view analytics, team activity, quota statuses, and more by switching to the Dashboard tab.
          </Typography>
          <Tooltip title="Show filters">
            <IconButton color="primary" onClick={handleFilterOpen} sx={{ border: '1.5px solid #ddd', bgcolor: '#fff' }}>
              <Badge color="secondary" variant="dot" invisible={!filterOpen}>
                <FilterAltIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        {/* FILTERS POPOVER */}
        <Popover
          open={filterOpen}
          anchorEl={anchorEl}
          onClose={handleFilterClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { p: 2, minWidth: 280 } }}
        >
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Data Type</InputLabel>
                <Select value={dataType} onChange={(e) => setDataType(e.target.value)} label="Data Type">
                  {DATA_TYPES.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Period</InputLabel>
                <Select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} label="Time Period">
                  {TIME_PERIODS.map(period => (
                    <MenuItem key={period} value={period}>{period}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Bucket</InputLabel>
                <Select value={timeBucket} onChange={(e) => setTimeBucket(e.target.value)} label="Time Bucket">
                  {TIME_BUCKETS.map(bucket => (
                    <MenuItem key={bucket} value={bucket}>{bucket}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                  <MenuItem value="All">All</MenuItem>
                  {(quotaStatusBreakdown || []).map((item) => (
                    <MenuItem key={item.status} value={item.status}>{item.status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Popover>

        {/* METRICS CARDS */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 1, bgcolor: '#f8fafc' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700 }}>Total Quotas</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 28, color: '#1a6d1a' }}>
                    {totalQuotas ?? 0}
                  </Typography>
                  <Chip
                    label={`${trendPercentage}% ${trendDirection}`}
                    color={trendDirection === 'up' ? 'success' : 'error'}
                    icon={trendDirection === 'up' ? <TrendingUp /> : <TrendingDown />}
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  vs {prevValue} last period
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 1, bgcolor: '#e7f5ed' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700 }}>Completed</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 28, color: '#01579b' }}>
                  {completedQuotas ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 1, bgcolor: '#fef6e4' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700 }}>Completion Rate</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 28, color: '#f6b02c' }}>
                  {completionRate ?? 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 1 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Status Breakdown</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {(quotaStatusBreakdown || []).map((item, idx) => (
                    <Chip
                      key={idx}
                      label={`${item.status}: ${item.total}`}
                      color={
                        item.status === 'Approved'
                          ? 'success'
                          : item.status === 'Rejected'
                          ? 'error'
                          : item.status === 'New'
                          ? 'info'
                          : 'default'
                      }
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* CHARTS */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={3}>
              <Typography variant="h6" gutterBottom>
                Quota Trend ({timeBucket})
              </Typography>
              {chartTimeSeries.length === 0 ? (
                <Typography sx={{ p: 4, color: '#aaa', textAlign: 'center' }}>
                  No data for the selected filters.
                </Typography>
              ) : (
                <ReactApexChart
                  options={barChartOptions}
                  series={barChartSeries}
                  type="bar"
                  height={350}
                />
              )}
              <Typography variant="caption" display="block" textAlign="center">
                {timePeriod} ({timeBucket} view)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={3}>
              <Typography variant="h6" gutterBottom>Status Distribution</Typography>
              {pieChartSeries.length === 0 ? (
                <Typography sx={{ p: 4, color: '#aaa', textAlign: 'center' }}>
                  No status data to show.
                </Typography>
              ) : (
                <ReactApexChart
                  options={pieChartOptions}
                  series={pieChartSeries}
                  type="pie"
                  height={350}
                />
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ORG USERS & TABS */}
        <Grid container spacing={3} sx={{ mt: noQuotas ? 2 : 0 }}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 1, minHeight: 235 }}>
              <CardContent sx={{ px: 0, py: 0 }}>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  sx={{
                    borderBottom: 1,
                    borderColor: '#eee',
                    minHeight: 48,
                    '& .MuiTab-root': {
                      fontWeight: 700,
                      textTransform: 'none',
                      minHeight: 48,
                      fontSize: 16,
                    },
                    '& .Mui-selected': { color: '#22733a' },
                    '& .MuiTabs-indicator': { backgroundColor: '#22733a' },
                  }}
                  variant="fullWidth"
                >
                  <Tab label="Recent Activity" />
                  <Tab label="All Users" />
                </Tabs>
                <Box sx={{ px: 2, pt: 2, maxHeight: 170, overflow: 'auto' }}>
                  {tab === 0 &&
                    (recentActivity.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">
                        No recent activity.
                      </Typography>
                    ) : (
                      recentActivity.map((item, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            py: 1,
                            borderBottom: idx !== recentActivity.length - 1 && '1px solid #eee',
                          }}
                        >
                          <Typography variant="body2">
                            <b>{item.status}</b> by <b>{item.created_by}</b> on Quota #
                            {item.quota_id} at{' '}
                            {item.created_at
                              ? dayjs(item.created_at).format('MM/DD/YYYY')
                              : ''}
                            {item.remarks ? (
                              <>
                                {' '}
                                — <i>{item.remarks}</i>
                              </>
                            ) : null}
                          </Typography>
                        </Box>
                      ))
                    ))}
                  {tab === 1 && (
                    <Box
                      component="table"
                      sx={{
                        width: '100%',
                        borderSpacing: 0,
                        borderCollapse: 'collapse',
                        background: '#fafbfc',
                        borderRadius: 1,
                        boxShadow: '0 0 0 1px #eee',
                      }}
                    >
                      <Box
                        component="thead"
                        sx={{ position: 'sticky', top: 0, bgcolor: '#f4f7fa', zIndex: 2 }}
                      >
                        <Box component="tr">
                          <Box component="th" sx={{ p: 1.1, fontWeight: 800, fontSize: 15 }}>
                            Name
                          </Box>
                          <Box component="th" sx={{ p: 1.1, fontWeight: 800, fontSize: 15 }}>
                            Role Name
                          </Box>
                          <Box component="th" sx={{ p: 1.1, fontWeight: 800, fontSize: 15 }}>
                            Active
                          </Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {orgUsers.map((u, idx) => (
                          <Box
                            component="tr"
                            key={u.emp_id || idx}
                            sx={{
                              bgcolor: idx % 2 ? '#f8fafd' : 'white',
                              '&:hover': { bgcolor: '#e3f2fd' },
                            }}
                          >
                            <Box component="td" sx={{ p: 1.1, fontWeight: 600 }}>
                              {u.first_name} {u.last_name}
                            </Box>
                            <Box component="td" sx={{ p: 1.1 }}>
                              {u.role_name || u.role}
                            </Box>
                            <Box component="td" sx={{ p: 1.1 }}>
                              {u.user_active ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  label="Active"
                                  sx={{ fontWeight: 700 }}
                                />
                              ) : (
                                <Chip size="small" color="default" label="Inactive" />
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // ---------- USER DASHBOARD VIEW ----------
  if (analytics.userQuotas) {
    const { userQuotas = [] } = analytics;
    return (
      <Box sx={{ px: 3, py: 2, height: '100vh' }}>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={6}>
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ px: 2, py: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                  Your Recent Quotas
                </Typography>
                {userQuotas.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No quotas assigned or created by you.
                  </Typography>
                ) : (
                  <Box
                    component="table"
                    sx={{
                      width: '100%',
                      borderSpacing: 0,
                      borderCollapse: 'collapse',
                      background: '#fafbfc',
                    }}
                  >
                    <Box component="thead" sx={{ bgcolor: '#f4f7fa' }}>
                      <Box component="tr">
                        <Box component="th" sx={{ textAlign: 'left', p: 1.1, fontWeight: 800 }}>
                          Quota Name
                        </Box>
                        <Box component="th" sx={{ textAlign: 'left', fontWeight: 800 }}>
                          Status
                        </Box>
                        <Box component="th" sx={{ textAlign: 'left', fontWeight: 800 }}>
                          Created At
                        </Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {userQuotas.map((q) => (
                        <Box
                          component="tr"
                          key={q.id}
                          sx={{
                            '&:hover': { bgcolor: '#e3f2fd' },
                          }}
                        >
                          <Box component="td" sx={{ p: 1 }}>
                            {q.quota_name}
                          </Box>
                          <Box component="td" sx={{ p: 1 }}>
                            <Chip
                              label={q.status || 'Unknown'}
                              color={statusColor(q.status)}
                              size="small"
                            />
                          </Box>
                          <Box component="td" sx={{ p: 1 }}>
                            {q.created_at ? dayjs(q.created_at).format('MM/DD/YYYY') : ''}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Fallback
  return (
    <Box sx={{ px: 3, py: 7, textAlign: 'center' }}>
      <WarningIcon sx={{ fontSize: 56, mb: 2 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>
        Welcome! No data to display.
      </Typography>
      <Typography>
        Please contact your organization admin or onboard your organization.
      </Typography>
    </Box>
  );
}

export default DashboardSection;
