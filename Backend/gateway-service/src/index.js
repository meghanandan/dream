require('dotenv').config();
console.log('DEBUG: All environment variables:', process.env);
console.log('DEBUG: Current working directory:', process.cwd());
console.log('DEBUG: PORT from process.env:', process.env.PORT);
console.log('DEBUG: JWT_SECRET exists:', !!process.env.JWT_SECRET);
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const ws = require('ws');
const jwt = require('jsonwebtoken');
const { URL } = require('url');

const gatewayRoutes = require('./routes/gatewayRoutes');
const { registerBroadcast } = require('./broadcast');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (socket, req) => {
  console.log('[WS] Connection received!');
  const parsed = new URL(req.url, `https://${req.headers.host}`);
  const token = parsed.searchParams.get('token');
  console.log('Incoming WS connection. Token:', token);
  
  if (!token) {
     console.warn('[Gateway] WS connection missing token');
    return socket.close(4001, 'Missing token');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
     console.log('JWT decoded:', payload);  
  } catch (err) {
    console.warn('[Gateway] WS invalid token:', err.message);
    return socket.close(4002, 'Invalid token');
  }

  socket.userId = payload.user_id || payload.emp_id || payload.id;
  console.log(`?? WS connected as userId=${socket.userId}`);
  clients.add(socket);

  socket.on('close', () => {
    console.log(`?? WS disconnected for userId=${socket.userId}`);
    clients.delete(socket);
  });

  socket.on('error', err => {
    console.error(`? WS error:`, err);
  });
});

function broadcastToSockets(payload) {
  const msg = JSON.stringify(payload);
  for (let client of clients) {
    if (
      client.readyState === ws.OPEN &&
      (!payload.to || client.userId === payload.to)
    ) {
      client.send(msg);
    }
  }
}

registerBroadcast(broadcastToSockets);
app.locals.broadcast = broadcastToSockets;

app.use(cors({ origin: true, credentials: true }));

// Add direct static file serving for uploads through gateway - BEFORE /api routes
const path = require('path');
const authUploadsPath = path.join(__dirname, '../../auth-service/src/uploads');
app.use('/api/auth/uploads', express.static(authUploadsPath));

app.use('/api', gatewayRoutes);

// Add this function to your file, right before the app.post('/api/notify'...) route
function attemptSend(userId, notification, retriesLeft = 3) {
  // Check if user is connected
  let userSocket = null;
  for (let client of clients) {
    if (client.userId === userId) {
      userSocket = client;
      break;
    }
  }
  
  if (userSocket && userSocket.readyState === ws.OPEN) {
    try {
      // Try to send the notification
      userSocket.send(JSON.stringify(notification));
      console.log(`? Notification sent to ${userId} successfully`);
      return true;
    } catch (err) {
      console.error(`? Error sending to ${userId}: ${err.message}`);
    }
  } else {
    console.log(`?? User ${userId} not connected or socket not ready, will retry`);
  }
  
  // If failed and we have retries left, try again after a delay
  if (retriesLeft > 0) {
    console.log(`?? Will retry sending to ${userId} in 2 seconds. Retries left: ${retriesLeft}`);
    setTimeout(() => {
      attemptSend(userId, notification, retriesLeft - 1);
    }, 2000);
  } else {
    console.error(`? Failed to send notification to ${userId} after all retries`);
  }
}

// Add these at the top of your file, after other imports
const pendingNotifications = new Map(); // Map to store notifications by user ID

// Function to store a notification for later delivery
function storeNotification(userId, notification) {
  if (!pendingNotifications.has(userId)) {
    pendingNotifications.set(userId, []);
  }
  pendingNotifications.get(userId).push(notification);
  console.log(`?? Stored notification for ${userId}. Queue size: ${pendingNotifications.get(userId).length}`);
}

// Modify your WebSocket connection handler
wss.on('connection', (socket, req) => {
  console.log('[WS] Connection received!');
  const parsed = new URL(req.url, `https://${req.headers.host}`);
  const token = parsed.searchParams.get('token');
  console.log('Incoming WS connection. Token:', token);
  
  if (!token) {
    console.warn('[Gateway] WS connection missing token');
    return socket.close(4001, 'Missing token');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT decoded:', payload);  
  } catch (err) {
    console.warn('[Gateway] WS invalid token:', err.message);
    return socket.close(4002, 'Invalid token');
  }

  socket.userId = payload.user_id || payload.emp_id || payload.id;
  console.log(`?? WS connected as userId=${socket.userId}`);
  clients.add(socket);

  // Check for pending notifications after connection is established
  setTimeout(() => {
    if (pendingNotifications.has(socket.userId)) {
      const notifications = pendingNotifications.get(socket.userId);
      if (notifications.length > 0) {
        console.log(`?? Sending ${notifications.length} pending notifications to ${socket.userId}`);
        
        // Process each pending notification
        notifications.forEach(notification => {
          try {
            if (socket.readyState === ws.OPEN) {
              socket.send(JSON.stringify(notification));
              console.log(`? Sent pending notification to ${socket.userId}`);
            } else {
              console.log(`?? Socket not ready for ${socket.userId}, keeping notification in queue`);
              return; // Keep remaining notifications in queue
            }
          } catch (err) {
            console.error(`? Error sending pending notification: ${err.message}`);
            return; // Keep remaining notifications in queue
          }
        });
        
        // Clear the queue only if we've successfully processed all notifications
        pendingNotifications.delete(socket.userId);
      }
    }
  }, 1000); // Wait 1 second to ensure connection is stable

  // Set up a ping interval to keep the connection alive
  const pingInterval = setInterval(() => {
    if (socket.readyState === ws.OPEN) {
      try {
        socket.ping();
        console.log(`?? Ping sent to ${socket.userId}`);
      } catch (err) {
        console.error(`? Error sending ping to ${socket.userId}: ${err.message}`);
      }
    }
  }, 30000); // Send ping every 30 seconds

  socket.on('close', () => {
    console.log(`?? WS disconnected for userId=${socket.userId}`);
    clients.delete(socket);
    clearInterval(pingInterval); // Clean up ping interval
  });

  socket.on('error', err => {
    console.error(`? WS error for ${socket.userId}:`, err);
  });
});

// Implement the notify endpoint
app.post('/api/notify', express.json(), (req, res) => {
  // Validate authorization
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${process.env.SERVICE_TOKEN}`) {
    console.log('[Notify] Unauthorized attempt:', auth);
    return res.sendStatus(401);
  }
  
  console.log('[Notify] Request received:', req.body);
  
  // Always respond with success immediately
  res.status(200).json({ success: true });
  
  // Handle the notification
  if (req.body.to) {
    const userId = req.body.to;
    console.log(`?? Processing notification for ${userId}`);
    
    // Find all sockets for this user
    const userSockets = Array.from(clients).filter(client => client.userId === userId);
    console.log(`Found ${userSockets.length} sockets for ${userId}`);
    
    if (userSockets.length > 0) {
      // At least one socket exists, try to send
      let sent = false;
      
      for (const socket of userSockets) {
        if (socket.readyState === ws.OPEN) {
          try {
            socket.send(JSON.stringify(req.body));
            console.log(`? Notification sent to ${userId} via socket`);
            sent = true;
            break; // Successfully sent to one socket
          } catch (err) {
            console.error(`? Error sending to ${userId}: ${err.message}`);
          }
        } else {
          console.log(`?? Socket for ${userId} exists but not ready (state: ${socket.readyState})`);
        }
      }
      
      if (!sent) {
        // Couldn't send to any socket, store for later
        storeNotification(userId, req.body);
      }
    } else {
      // No sockets for this user, store notification
      storeNotification(userId, req.body);
    }
  } else {
    // It's a broadcast, use the existing broadcast function
    app.locals.broadcast(req.body);
  }
});



const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`?? Gateway + WebSocket running on http://localhost:${PORT}`);
});
