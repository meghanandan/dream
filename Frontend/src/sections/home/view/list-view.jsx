import React, { useState, useEffect } from 'react';
import { Box, Button, Divider, LinearProgress } from '@mui/material';
import { EmojiEmotions, Dashboard as DashboardIcon } from '@mui/icons-material';
import Storage from 'src/utils/local-store';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';
import {WelcomeSection} from './WelcomeSection';
import {DashboardSection} from './DashboardSection';
import {GetListView} from './getListView';

const tabBtnStyle = (active) => ({
  fontWeight: 700,
  color: active ? '#fff' : '#22733a',
  background: active ? '#22733a' : '#e9f5ee',
  border: '1px solid #22733a',
  borderRadius: 0,
  px: 4,
  py: 1.5,
  fontSize: 17,
  boxShadow: active ? '0 2px 8px #dbeae1' : 'none',
  '&:hover': {
    background: active ? '#195c29' : '#e0f2e9'
  }
});

export function Home() {
  const user = Storage.getJson('userData') || {};
  const [mainTab, setMainTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const payload = {
          org_code: user.organization,
          role: user.role,
          user_id: user.user_id,
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
        <span style={{ color: 'red' }}>{error}</span>
      </Box>
    );

  return (
    <Box sx={{minHeight: '100vh',}}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, mt: 2, px: 3 }}>
        <Button
          sx={{
            color: mainTab === 0 ? '#fff' : '#fda92d',
            background: mainTab === 0 ? '#fda92d' : '#fff',
            border: '2px solid #fda92d',
            borderRight: 'none',
            borderRadius: '24px 0 0 24px',
            px: 3,
            py: 0.5,
            fontSize: 14,
            boxShadow: 'none',
            zIndex: mainTab === 0 ? 2 : 1,
            transition: 'all 0.12s',
            '&:hover': {
              background: mainTab === 0 ? '#545454' : '#e9f5ee',
            }
          }}
          onClick={() => setMainTab(0)}
        >
          Welcome
        </Button>
        <Button
          sx={{
            color: mainTab === 1 ? '#fff' : '#fda92d',
            background: mainTab === 1 ? '#fda92d' : '#fff',
            border: '2px solid #fda92d',
            borderLeft: 'none',
            borderRadius: '0 24px 24px 0',
            px: 3,
            py: 0.5,
            fontSize: 14,
            boxShadow: 'none',
            zIndex: mainTab === 1 ? 2 : 1,
            transition: 'all 0.12s',
            '&:hover': {
              background: mainTab === 1 ? '#545454' : '#e9f5ee',
            }
          }}
          onClick={() => setMainTab(1)}
        >
          Dashboard
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />
      {mainTab === 0
        ? <WelcomeSection user={user} />
        // : <DashboardSection user={user} analytics={analytics} />
        : <GetListView />
      }
    </Box>
  );
}


export default Home;