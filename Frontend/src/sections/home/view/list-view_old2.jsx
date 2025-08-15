import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { WavingHand } from '@mui/icons-material';
import dayjs from 'dayjs';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';
import { Link } from 'react-router-dom';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export function Home() {
  const user = Storage.getJson('userData') || {};
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const payload = {
          org_code: user.organization,
          role: user.role,
          user_id: user.user_id, // <-- important: use emp_id!
        };
        const res = await postService(endpoints.auth.getQuotaAnalytics, 'POST', payload);
        if (res.status) {
          setAnalytics(res.data);
        } else {
          setAnalytics(null);
          setError(res.message || 'Error fetching data');
        }
      } catch (err) {
        setAnalytics(null);
        setError('Failed to fetch analytics');
      }
      setLoading(false);
    }
    if (user?.organization && user?.role && user?.user_id) fetchAnalytics();
  }, [user.organization, user.role, user.user_id]);

  if (loading) return <LinearProgress sx={{ mt: 6 }} />;
  if (error)
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  if (!analytics) return null;

  // ----------- ADMIN VIEW -----------
  if (analytics.orgLicenses && analytics.orgUsers) {
    const {
      quotaStatusBreakdown,
      quotasOverTime,
      approvalRates,
      avgApprovalTime,
      recentActivity,
      completionRate,
      totalQuotas,
      completedQuotas,
      orgLicenses,
      orgUsers,
    } = analytics;

    const noQuotas = !quotaStatusBreakdown || quotaStatusBreakdown.length === 0;

    return (
      <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <WavingHand sx={{ color: '#4CAF50' }} />
          {getGreeting()} {user.name || 'User'}
        </Typography>

        {/* No Quotas - Onboarding Message */}
        {noQuotas && (
          <Box sx={{ textAlign: 'center', color: '#aaa', my: 7 }}>
            <WarningIcon sx={{ fontSize: 56, mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              No quotas found for your organization yet.
            </Typography>
            <Typography>
              Start by{' '}
              <b>
                <Link to="/quotas">creating a quota</Link>
              </b>{' '}
              or importing your first record.
            </Typography>
          </Box>
        )}

        {/* Quota Status Breakdown */}
        <Box sx={{ mt: 3, mb: 0 }}>
          <Grid container spacing={2}>
            {/* Total Quotas */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 1, bgcolor: '#f8fafc' }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }}>Total Quotas</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 28, color: '#1a6d1a' }}>
                    {totalQuotas ?? 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* Completed Quotas */}
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
            {/* Completion Rate */}
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
            {/* Status Breakdown */}
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
        </Box>

        {/* Org Licenses and Users Row */}
        <Grid container spacing={3} sx={{ mt: noQuotas ? 2 : 0 }}>
          {/* License Details Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 1, minHeight: 235 }}>
              <CardContent sx={{ px: 3, py: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                  Organization License Details
                </Typography>
                {orgLicenses.map((lic, idx) => {
                  const expiry = dayjs(lic.licence_to_date);
                  const daysLeft = expiry.diff(dayjs(), 'day');
                  return (
                    <Box key={idx} sx={{ mb: 1.5, lineHeight: 1.85 }}>
                      <Box>
                        <b>Type:</b>{' '}
                        <span style={{ color: '#1654a3', fontWeight: 600 }}>
                          {lic.licence_type}
                        </span>
                      </Box>
                      <Box>
                        <b>Valid From:</b> {lic.licence_from_date}
                        &nbsp; <b>To:</b> {lic.licence_to_date}
                        {daysLeft <= 30 && (
                          <span style={{ color: '#d32f2f', fontWeight: 700, marginLeft: 8 }}>
                            {daysLeft > 0 ? `⚠️ ${daysLeft} days left` : '❗ Expired'}
                          </span>
                        )}
                      </Box>
                      <Box>
                        <b>Licenses:</b> {lic.no_of_licences}
                        &nbsp; <b>Grace:</b> {lic.grace_period} days
                      </Box>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>

          {/* User Count Stats */}
          <Grid item xs={12} md={3}>
            <Card sx={{ borderRadius: 1, minHeight: 235 }}>
              <CardContent
                sx={{
                  px: 3,
                  py: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: '#333', fontSize: 16 }}>
                    Total Users
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 30, color: '#22733a' }}>
                    {orgUsers.length}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: '#333', fontSize: 16 }}>
                    Active Users
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 30, color: '#1654a3' }}>
                    {orgUsers.filter((u) => u.user_active).length}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#333', fontSize: 16 }}>
                    Admins
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 30, color: '#ff9800' }}>
                    {
                      orgUsers.filter(
                        (u) =>
                          (u.role_name || u.role) === 'Admin' ||
                          (u.role || u.role_name) === 'RL_NyAd'
                      ).length
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tabbed Recent/User List */}
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
                            {item.quota_id} at {item.created_at}
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

  // ---------- USER VIEW ----------
  if (analytics.userLicenses || analytics.userQuotas) {
    const { userLicenses = [], userQuotas = [] } = analytics;
    return (
      <Box sx={{ px: 3, py: 2 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <WavingHand sx={{ color: '#4CAF50' }} />
          {getGreeting()} {user.name || 'User'}
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Licenses Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ px: 3, py: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                  Your License Details
                </Typography>
                {userLicenses.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No licenses assigned to you yet.
                  </Typography>
                ) : (
                  userLicenses.map((lic, idx) => {
                    const expiry = dayjs(lic.licence_to_date);
                    const daysLeft = expiry.diff(dayjs(), 'day');
                    return (
                      <Box key={idx} sx={{ mb: 1.5, lineHeight: 1.85 }}>
                        <Box>
                          <b>Type:</b>{' '}
                          <span style={{ color: '#1654a3', fontWeight: 600 }}>
                            {lic.licence_type}
                          </span>
                        </Box>
                        <Box>
                          <b>Valid From:</b> {lic.licence_from_date}
                          &nbsp; <b>To:</b> {lic.licence_to_date}
                          {daysLeft <= 30 && (
                            <span style={{ color: '#d32f2f', fontWeight: 700, marginLeft: 8 }}>
                              {daysLeft > 0 ? `⚠️ ${daysLeft} days left` : '❗ Expired'}
                            </span>
                          )}
                        </Box>
                        <Box>
                          <b>Licenses:</b> {lic.no_of_licences}
                          &nbsp; <b>Grace:</b> {lic.grace_period} days
                        </Box>
                      </Box>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </Grid>
          {/* User Quotas Table */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ px: 3, py: 2 }}>
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
                        <Box component="th" sx={{ p: 1.1, fontWeight: 800 }}>
                          ID
                        </Box>
                        <Box component="th" sx={{ p: 1.1, fontWeight: 800 }}>
                          Status
                        </Box>
                        <Box component="th" sx={{ p: 1.1, fontWeight: 800 }}>
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
                            {q.id}
                          </Box>
                          <Box component="td" sx={{ p: 1 }}>
                            {q.status}
                          </Box>
                          <Box component="td" sx={{ p: 1 }}>
                            {q.created_at}
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
      <Typography>Please contact your organization admin or onboard your organization.</Typography>
    </Box>
  );
}

export default Home;
