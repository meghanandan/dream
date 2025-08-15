import React, { useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  Checkbox, Chip, Grid, Paper, List, ListItem, IconButton, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const TOUR_PAGES = [
  {
    title: 'User Management',
    tasks: [
      {
        label: 'Go to Users page',
        video: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        link: '/users'
      },
      {
        label: 'Create a new user',
        video: 'https://www.youtube.com/embed/3KANI2dpXLw',
        link: '/users/create'
      },
      {
        label: 'Create a new role',
        video: 'https://www.youtube.com/embed/3KANI2dpXLw',
        link: '/role'
      }
    ]
  },
  {
    title: 'Work Flow Management',
    tasks: [
      {
        label: 'Go to Workflows page',
        video: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        link: '/workflows'
      },
      {
        label: 'Create a new workflow',
        video: 'https://www.youtube.com/embed/3KANI2dpXLw',
        link: '/workflows/create'
      }
    ]
  },
  {
    title: 'Quota Management',
    tasks: [
      {
        label: 'View Quotas',
        video: 'https://www.youtube.com/embed/SGJFWirQ3ks',
        link: '/quotas'
      },
      {
        label: 'Create a new quota',
        video: 'https://www.youtube.com/embed/nfWlot6h_JM',
        link: '/quotas'
      }
    ]
  },
  {
    title: 'Disputes Management',
    tasks: [
      {
        label: 'View Disputes',
        video: 'https://www.youtube.com/embed/SGJFWirQ3ks',
        link: '/disputes'
      },
      {
        label: 'Create a new dispute',
        video: 'https://www.youtube.com/embed/nfWlot6h_JM',
        link: '/orders'
      }
    ]
  },
  {
    title: 'Setup Management',
    tasks: [
      {
        label: 'Creat Custom Fields',
        video: 'https://www.youtube.com/embed/SGJFWirQ3ks',
        link: '/custom-fields'
      },
      {
        label: 'Create Connectors',
        video: 'https://www.youtube.com/embed/nfWlot6h_JM',
        link: '/configuration'
      },
    ]
  },
  {
    title: 'Audit Management',
    tasks: [
      {
        label: 'Audit Logs',
        video: 'https://www.youtube.com/embed/SGJFWirQ3ks',
        link: '/quotas/audit-trail'
      },
    ]
  }
];

const DEFAULT_VIDEO = 'https://www.youtube.com/embed/5qap5aO4i9A'; // overview video

export function QuickTour() {
  const [expanded, setExpanded] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});
  const [video, setVideo] = useState(DEFAULT_VIDEO);
  const [nowPlaying, setNowPlaying] = useState('Application Overview');

  const handleAccordion = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
    setVideo(DEFAULT_VIDEO);
    setNowPlaying('Application Overview');
  };

  const handleTaskClick = (pageIdx, taskIdx, task) => {
    setVideo(task.video);
    setNowPlaying(task.label);
    setCheckedTasks((prev) => ({
      ...prev,
      [`${pageIdx}-${taskIdx}`]: true
    }));
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        mt: 2,
        p: { xs: 1, sm: 2 },
        borderRadius: 1,
        mx: 'auto',
        bgcolor: '#fafbfc'
      }}
    >
      <Grid container spacing={4} sx={{ width: '100%', textAlign: 'left' }}>
        {/* LEFT: Accordion */}
        <Grid item xs={12} md={6}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              color: '#224e9e',
              gap: 1
            }}
          >
            <RocketLaunchIcon color="primary" sx={{ fontSize: 28 }} /> Quick Tour & Tasks
          </Typography>
          {TOUR_PAGES.map((section, pageIdx) => (
            <Accordion
              expanded={expanded === pageIdx}
              onChange={handleAccordion(pageIdx)}
              key={section.title}
              sx={{ mb: 1, boxShadow: 'none', border: '1px solid #e0e3e6', borderRadius: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={pageIdx + 1} color="success" size="small" />
                  {section.title}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, py: 0 }}>
                <List dense sx={{ pl: 0, pt: 0 }}>
                  {section.tasks.map((task, taskIdx) => (
                    <ListItem
                      key={task.label}
                      sx={{
                        pl: 0,
                        py: 0,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 0,
                        '&:hover': { background: '#f0f7ff' }
                      }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0 }}>
                          <Tooltip title="Go to page">
                            <IconButton
                              edge="end"
                              component="a"
                              href={task.link}
                              size="large"
                            >
                              <OpenInNewIcon color="secondary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Watch tutorial">
                            <IconButton
                              edge="end"
                              onClick={() => handleTaskClick(pageIdx, taskIdx, task)}
                              size="large"
                            >
                              <PlayCircleOutlineIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <Checkbox
                        icon={<RadioButtonUncheckedIcon />}
                        checkedIcon={<CheckCircleRoundedIcon color="success" />}
                        checked={!!checkedTasks[`${pageIdx}-${taskIdx}`]}
                        onChange={() => handleTaskClick(pageIdx, taskIdx, task)}
                        sx={{ mr: 0.5 }}
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 500,
                          color: '#1976d2',
                          cursor: 'pointer',
                          textDecoration: checkedTasks[`${pageIdx}-${taskIdx}`]
                            ? 'line-through'
                            : 'none'
                        }}
                        component="a"
                        href={task.link}
                        target="_blank"
                        rel="noopener"
                        onClick={e => {
                          e.preventDefault();
                          handleTaskClick(pageIdx, taskIdx, task);
                        }}
                      >
                        {task.label}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>
        {/* RIGHT: YouTube Video */}
        {/* <Grid item xs={12} md={6} sx={{ textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              color: '#4d1a7f',
              gap: 1
            }}
          >
            <SmartDisplayIcon color="secondary" sx={{ fontSize: 28 }} /> How-to Video
          </Typography>
          <Paper elevation={2} sx={{ borderRadius: 1, overflow: 'hidden', mb: 1 }}>
            <Box sx={{ width: '100%', height: 0, pb: '56.25%', position: 'relative' }}>
              <iframe
                title="App Quick Tour"
                width="100%"
                height="100%"
                src={video}
                style={{
                  border: 'none',
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '100%'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
          </Paper>
          <Typography variant="subtitle2" sx={{ color: '#555', mb: 1 }}>
            Now showing: <b>{nowPlaying}</b>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Click any checklist item or ▶️ icon to watch a step-by-step guide.
          </Typography>
          </Grid> */}
        </Grid>
    </Paper>
  );
}

export default QuickTour