import React from 'react';
import { Box, Typography } from '@mui/material';
import {QuickTour} from './QuickTour';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export function WelcomeSection({ user }) {
  return (
    <Box
      sx={{
        px: 3,
        py: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0 }}>
        {getGreeting()} {user.name ? user.name.split(' ')[0] : 'User'}!
      </Typography>
      <Typography variant="body1" sx={{  color: '#666' }}>
        You can view analytics, team activity, quota statuses, and more by switching to the Dashboard tab.
      </Typography>
      <QuickTour />
    </Box>
  );
}

export default WelcomeSection