import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Stack, Breadcrumbs, Grid, Card, CardContent, Paper, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, Button
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from "chart.js";
import postService from "src/utils/httpService";
import Storage from "src/utils/local-store";
import { Link } from "react-router-dom";
import { endpoints } from "src/utils/axios";
import dayjs from "dayjs";

// Chart.js modules registration
ChartJS.register(ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const chartColors = (count) => [
  "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
  "#9966FF", "#FF9F40", "#C9CBCF", "#84FF63",
  "#634AFF", "#4AFFC7", "#FF7F7F", "#FFD966",
  "#A9D18E", "#6FA8DC"
].slice(0, count);

const getDefaultFilters = () => {
  const now = dayjs();
  return {
    from: now.startOf('month').format("YYYY-MM-DD"),
    to: now.format("YYYY-MM-DD"),
    status: "",
    type: "",
    priority: "",
    user_id: "",
  };
};

export function AnalyticsDashboard() {
  // Basic context/user info
  const userDatas = Storage.getJson("userData") || {};
  const org_code = userDatas.organization || "";

  // State
  const [filters, setFilters] = useState(getDefaultFilters());
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [userOptions, setUserOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const priorityOptions = [
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" }
  ];

  // Fetch dropdown/filter data (users, type, status)
  useEffect(() => {
    postService(endpoints.auth.getUsers, "POST", { org_code }).then((res) => {
      // Adjust the field names as per your API response!
      setUserOptions(
        (res?.data ?? []).map(u => ({
          value: u.emp_id, // or u.id if you prefer
          label: [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
        }))
      );
    });

    postService(endpoints.auth.getDisputesByType, "POST", { org_code }).then((res) => {
      setTypeOptions(res?.data?.map(t => ({ value: t.label, label: t.label })) || []);
    });

    postService(endpoints.auth.getDisputesByStatus, "POST", { org_code }).then((res) => {
      setStatusOptions(res?.data?.map(s => ({ value: s.label, label: s.label })) || []);
    });

    postService(endpoints.auth.getUsers, "POST", { org_code }).then((res) => {
      setUserOptions(
        (res?.data ?? []).map(u => ({
          value: u.emp_id, // or u.id
          label: [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
        }))
      );
    });
  }, [org_code]);

  // Analytics fetcher
  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    const payload = { org_code, ...filters };
    Promise.all([
      postService(endpoints.auth.getDisputesByType, "POST", payload),
      postService(endpoints.auth.getDisputesByStatus, "POST", payload),
      postService(endpoints.auth.getDisputesByMonth, "POST", payload),
      postService(endpoints.auth.getDisputesByEscalation, "POST", payload),
      postService(endpoints.auth.getAvgResolutionTimeByMonth, "POST", payload),
      postService(endpoints.auth.getDisputesSummary, "POST", payload),
      postService(endpoints.auth.getDisputesByLicenceType, "POST", payload), // Pass all filters for flexibility
    ])
      .then(([typeRes, statusRes, monthRes, escalationRes, resolutionRes, summaryRes, licenceTypeRes]) => {
        setAnalytics({
          typeData: typeRes?.data ?? [],
          statusData: statusRes?.data ?? [],
          monthData: monthRes?.data ?? [],
          escalationData: escalationRes?.data ?? [],
          resolutionData: resolutionRes?.data ?? [],
          summary: summaryRes?.data ?? {},
          licenceTypeData: licenceTypeRes?.data ?? [],
        });
      })
      .catch(() => setAnalytics({}))
      .finally(() => setLoading(false));
  }, [org_code, filters]);

  // Trigger fetch on mount and on filters change
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Chart helpers
  const pieData = (data, label = "Count") => ({
    labels: data.map((d) => d.label),
    datasets: [{
      label,
      data: data.map((d) => Number(d.value)),
      backgroundColor: chartColors(data.length)
    }]
  });
  const barData = (data, label = "Count") => pieData(data, label);
  const lineData = (data, label = "Avg Days") => ({
    labels: data.map((d) => d.label),
    datasets: [{
      label,
      data: data.map((d) => Number(d.value)),
      borderColor: "#36A2EB",
      backgroundColor: "#C9CBCF",
      fill: true,
      tension: 0.3,
      pointBackgroundColor: "#36A2EB"
    }]
  });

  // Stat Card
  const statCard = (title, value, color = "primary") => (
    <Card sx={{ borderLeft: `8px solid var(--mui-palette-${color}-main, #1976d2)`, minWidth: 160 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{value ?? "--"}</Typography>
      </CardContent>
    </Card>
  );

  // Filter Panel
  const filterPanel = (
    <Paper sx={{ mb: 2, p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <DatePicker
        label="From"
        value={dayjs(filters.from)}
        onChange={d => setFilters(f => ({ ...f, from: d.format("YYYY-MM-DD") }))}
        slotProps={{ textField: { size: "small", sx: { minWidth: 140 } } }}
      />
      <DatePicker
        label="To"
        value={dayjs(filters.to)}
        onChange={d => setFilters(f => ({ ...f, to: d.format("YYYY-MM-DD") }))}
        slotProps={{ textField: { size: "small", sx: { minWidth: 140 } } }}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Status</InputLabel>
        <Select label="Status" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <MenuItem value="">All</MenuItem>
          {statusOptions.map(o => <MenuItem value={o.value} key={o.value}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Type</InputLabel>
        <Select label="Type" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          <MenuItem value="">All</MenuItem>
          {typeOptions.map(o => <MenuItem value={o.value} key={o.value}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Priority</InputLabel>
        <Select label="Priority" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <MenuItem value="">All</MenuItem>
          {priorityOptions.map(o => <MenuItem value={o.value} key={o.value}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>User</InputLabel>
        <Select label="User" value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}>
          <MenuItem value="">All</MenuItem>
          {userOptions.map(o => <MenuItem value={o.value} key={o.value}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>
      <Button variant="contained" size="small" onClick={fetchAnalytics}>Apply</Button>
      <Button variant="outlined" size="small" color="secondary" onClick={() => setFilters(getDefaultFilters())}>Reset</Button>
    </Paper>
  );

  // Breadcrumbs
  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">Home</Link>,
    <Typography key="2" color="text.primary">Analytics</Typography>
  ];

  const {
    typeData = [], statusData = [], monthData = [],
    escalationData = [], resolutionData = [], summary = {},
    licenceTypeData = []
  } = analytics;

  return (
    <Box sx={{ px: 3, py: 2, minHeight: "100vh" }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
      </Stack>
      <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>Dispute Analytics</Typography>
      {filterPanel}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress size={50} />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={2}>{statCard("Total Disputes", summary.total_disputes, "primary")}</Grid>
            <Grid item xs={6} md={2}>{statCard("Resolved", summary.resolved, "success")}</Grid>
            <Grid item xs={6} md={2}>{statCard("In Progress", summary.in_progress, "info")}</Grid>
            <Grid item xs={6} md={2}>{statCard("Escalated", summary.escalated, "warning")}</Grid>
            <Grid item xs={6} md={2}>{statCard("Rejected", summary.rejected, "error")}</Grid>
            <Grid item xs={6} md={2}>{statCard("Avg. Resolution (Days)", summary.avg_resolution_days, "secondary")}</Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Disputes by Type</Typography>
                  <Paper sx={{ height: 280, p: 2, display: "flex", alignItems: "center" }}>
                    {typeData.length > 0 ? (
                      <Doughnut data={pieData(typeData, "Disputes")} options={{ maintainAspectRatio: false }} />
                    ) : (<Typography color="text.secondary">No data</Typography>)}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Disputes by Status</Typography>
                  <Paper sx={{ height: 280, p: 2, display: "flex", alignItems: "center" }}>
                    {statusData.length > 0 ? (
                      <Bar data={barData(statusData, "Disputes")} options={{ maintainAspectRatio: false }} />
                    ) : (<Typography color="text.secondary">No data</Typography>)}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Disputes by Month</Typography>
                  <Paper sx={{ height: 280, p: 2, display: "flex", alignItems: "center" }}>
                    {monthData.length > 0 ? (
                      <Line data={lineData(monthData, "Disputes")} options={{ maintainAspectRatio: false }} />
                    ) : (<Typography color="text.secondary">No data</Typography>)}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Disputes by Escalation Level</Typography>
                  <Paper sx={{ height: 280, p: 2, display: "flex", alignItems: "center" }}>
                    {escalationData.length > 0 ? (
                      <Bar data={barData(escalationData, "Disputes")} options={{ maintainAspectRatio: false }} />
                    ) : (<Typography color="text.secondary">No data</Typography>)}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Resolution Time (by Month)</Typography>
                  <Paper sx={{ height: 280, p: 2, display: "flex", alignItems: "center" }}>
                    {resolutionData.length > 0 ? (
                      <Line data={lineData(resolutionData, "Avg Days")} options={{ maintainAspectRatio: false }} />
                    ) : (<Typography color="text.secondary">No data</Typography>)}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Disputes by License Type</Typography>
                  <Paper sx={{ height: 280, p: 2, display: "flex", alignItems: "center" }}>
                    {licenceTypeData.length > 0 ? (
                      <Doughnut data={pieData(licenceTypeData, "Disputes")} options={{ maintainAspectRatio: false }} />
                    ) : (
                      <Typography color="text.secondary">No data</Typography>
                    )}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

export default AnalyticsDashboard;
