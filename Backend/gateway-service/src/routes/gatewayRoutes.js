// Import required modules
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const router = express.Router();


// Proxy options with logging and error handling
const proxyOptions = {
    changeOrigin: true, // Adjust the origin of the host header to the target URL
    onError: (err, req, res) => {
        console.log(`${req.method} ${req.url}`);
        console.error('Proxy error:', err.message); // Log proxy errors
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    },
    onProxyReq: (proxyReq, req) => {
        console.log(`Proxying request: ${req.method} ${req.originalUrl}`); // Log request details
    },
};

// Dynamic service targets based on environment
console.log("Process env");
console.log(process.env);
const services = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4021',
    templates: process.env.TEMPLATES_SERVICE_URL || 'http://localhost:4024',
    settings: process.env.SETTINGS_SERVICE_URL || 'http://localhost:4023',
    disputes: process.env.DISPUTES_SERVICE_URL || 'http://localhost:4024',
    users: process.env.USERS_SERVICE_URL || 'http://localhost:4005',
    externalApi:process.env.EXTERNAL_API_SERVICE_URL || 'http://localhost:4025',
};

// Define proxy routes dynamically
router.use('/auth', createProxyMiddleware({ target: services.auth, ...proxyOptions }));
router.use('/templates', createProxyMiddleware({ target: services.templates, ...proxyOptions }));
router.use('/settings', createProxyMiddleware({ target: services.settings, ...proxyOptions }));
router.use('/disputes', createProxyMiddleware({ target: services.disputes, ...proxyOptions }));
router.use('/users', createProxyMiddleware({ target: services.users, ...proxyOptions }));
router.use('/external-api', createProxyMiddleware({ target: services.externalApi, ...proxyOptions }));

// Add specific route for uploaded files - this should come AFTER the /auth route
// so that /auth/uploads requests are handled by the auth service
console.log('Gateway routes configured for services:', services);

// Export the router module
module.exports = router;
