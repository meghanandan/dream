const express = require('express');
const {
    updateApiConnection,
    deleteApiConnection,
    createOrGetApiConnection,
    getApiConnection,
} = require('../controllers/SettingsApiController');

const router = express.Router();

// API Connections Routes
router.post('/connections/create', createOrGetApiConnection);
router.get('/connections/get-all', getApiConnection);
router.put('/connections/update/:id', updateApiConnection);
router.delete('/connections/delete/:id', deleteApiConnection);

module.exports = router;
