import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Typography, Slide, TextField, IconButton, Tooltip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Alert, Chip
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import Chat from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import GlobalStyles from '@mui/material/GlobalStyles';
import { format } from 'date-fns';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import { layoutClasses } from '../classes';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend);


// const API_URL = 'http://localhost:3001/chatbot/query';
// const API_URL = 'https://vyva.ai/chatbot/query';
const API_URL = 'https://dream.uniflo.ai/query';

export function ChatBox() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const defaultSuggestions = [
    "Show orders from last month",
    "Count orders by status with a chart",
    "List orders for customer John Doe",
    "Show orders where amount is more than 100"
  ];

  const formatValue = (value) => {
    if (!value || value === 'null' || value === 'NaT') return 'N/A';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return format(new Date(value), 'MM/dd/yyyy');
      } catch {
        return 'N/A';
      }
    }
    return String(value);
  };

  const handleSendMessage = async (queryText) => {
    const query = queryText || inputValue.trim();
    if (!query) {
      setError('Please enter a query.');
      return;
    }

    const userMessage = { id: Date.now(), text: query, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode: 'summary' }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.response.message || 'No response from server',
        summary: data.response.summary || null,
        data: data.response.data || [],
        suggestions: data.response.suggestions || [],
        csv: data.response.csv || null,
        pdf: data.response.pdf || null,
        chart: data.response.chart || null,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setError(`Server: Something went wrong`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) handleSendMessage();
  };

  const handleClearChat = () => {
    setMessages([]);
    setError('');
  };

  const toggleChat = () => {
    setOpen(!open);
    if (!open && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        text: 'Welcome to the UniBot! 🤖 Try asking something like:',
        sender: 'bot',
        suggestions: defaultSuggestions
      }]);
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: '5%', right: '2%', zIndex: 1200 }}>
      <Button
        variant="contained"
        onClick={toggleChat}
        sx={{ bgcolor: '#fda92d', p: '1rem', borderRadius: '50%' }}
        aria-label="Toggle chatbot"
      >
        <Tooltip title={open ? 'Close Chat' : 'Open Chat'}>
          <Chat sx={{ fontSize: '2rem', color: '#fff' }} />
        </Tooltip>
      </Button>

      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Box
          sx={{
            width: { xs: '90vw', sm: isFullScreen ? '100vw' : '35vw' },
            height: isFullScreen ? '100vh' : { xs: '60vh', sm: 500 },
            borderRadius: isFullScreen ? 0 : 2,
            boxShadow: 3,
            bgcolor: 'white',
            position: isFullScreen ? 'fixed' : 'absolute',
            top: isFullScreen ? 0 : 'auto',
            left: isFullScreen ? 0 : 'auto',
            bottom: isFullScreen ? 'auto' : '60px',
            right: isFullScreen ? 'auto' : 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1300
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#fda92d', color: '#fff' }}>
            <Typography variant="h6">UniBot</Typography>
            <Box>
              <Tooltip title="Clear chat">
                <IconButton onClick={handleClearChat} sx={{ color: '#fff' }}><DeleteSweepIcon /></IconButton>
              </Tooltip>
              <Tooltip title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
                <IconButton onClick={() => setIsFullScreen(!isFullScreen)} sx={{ color: '#fff' }}>
                  {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Error */}
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {/* Messages */}
          <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
            {messages.map((msg) => (
              <Box key={msg.id} sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    textAlign: msg.sender === 'user' ? 'right' : 'left',
                    bgcolor: msg.sender === 'user' ? '#e1f5fe' : '#f5f5f5',
                    p: 1,
                    borderRadius: 2,
                    maxWidth: '80%',
                    display: 'inline-block'
                  }}
                >
                  {msg.text}
                </Typography>

                {msg.summary && (
                  <Alert severity="info" sx={{ mt: 1 }}>{msg.summary}</Alert>
                )}

                {msg.suggestions?.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {msg.suggestions.map((sug, i) => (
                      <Chip key={i} label={sug} onClick={() => handleSendMessage(sug)} />
                    ))}
                  </Box>
                )}

                {msg.data?.length > 0 && (
                  <TableContainer component={Paper} sx={{ mt: 1, maxHeight: 200, border: '1px solid #ccc' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {Object.keys(msg.data[0]).map((col) => (
                            <TableCell key={col}>{col}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {msg.data.map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).map((val, j) => (
                              <TableCell key={j}>{formatValue(val)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {(msg.csv || msg.pdf) && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    {msg.csv && (
                      <Button
                        variant="contained"
                        href={msg.csv}
                        download
                        sx={{ bgcolor: '#4caf50' }}
                      >
                        Download CSV
                      </Button>
                    )}
                    {msg.pdf && (
                      <Button
                        variant="contained"
                        href={msg.pdf}
                        download
                        sx={{ bgcolor: '#f44336' }}
                      >
                        Download PDF
                      </Button>
                    )}
                  </Box>
                )}

                {msg.chart && (
                  <Box sx={{ mt: 1, maxHeight: 300 }}>
                    <Bar
                      data={msg.chart}
                      options={{
                        responsive: true,
                        plugins: { title: { display: true, text: 'Orders by Status' } },
                      }}
                    />
                  </Box>
                )}
              </Box>
            ))}
          </Box>

          {/* Input */}
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#f5f5f5' }}>
            <TextField
              inputRef={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me something..."
              fullWidth
              size="small"
              disabled={isLoading}
            />
            <IconButton onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()} sx={{ ml: 1, color: '#fda92d' }}>
              {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
          </Box>
        </Box>
      </Slide>
    </Box>
  );
}

export function LayoutSection({
  sx,
  cssVars,
  children,
  footerSection,
  headerSection,
  sidebarSection,
}) {
  const inputGlobalStyles = (
    <GlobalStyles
      styles={{
        body: {
          '--layout-nav-zIndex': 1101,
          '--layout-nav-mobile-width': '320px',
          '--layout-header-blur': '8px',
          '--layout-header-zIndex': 1100,
          '--layout-header-mobile-height': '64px',
          '--layout-header-desktop-height': '72px',
          ...cssVars,
        },
      }}
    />
  );

  return (
    <>
      {inputGlobalStyles}
      <Box id="root__layout" className={layoutClasses.root} sx={sx}>
        {sidebarSection ? (
          <>
            {sidebarSection}
            <Box
              display="flex"
              flex="1 1 auto"
              flexDirection="column"
              className={layoutClasses.hasSidebar}
            >
              {headerSection}
              {children}
              {footerSection}
            </Box>
          </>
        ) : (
          <>
            {headerSection}
            {children}
            {footerSection}
          </>
        )}
        {/* <ChatBox /> */}
      </Box>
    </>
  );
}