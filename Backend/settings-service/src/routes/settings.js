const express = require('express');

const {
  createSettingCustomField,
  getAllSettingCustomFields,
  getSettingCustomFieldById,
  updateSettingCustomField,
  deleteSettingCustomField,
  createOrGetApiConnection,
  getApiConnection,
  updateApiConnection,
  deleteApiConnection,
} = require('../controllers/SettingsController');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

// Custom Fields Routes
router.post('/custom-fields', authenticateToken, createSettingCustomField);
router.get('/custom-fields', authenticateToken, getAllSettingCustomFields);
router.get('/custom-fields/:id', authenticateToken, getSettingCustomFieldById);
router.put('/custom-fields/:id', authenticateToken, updateSettingCustomField);
router.delete('/custom-fields/:id', authenticateToken, deleteSettingCustomField);

// API Connection Routes
router.post('/api-connection', authenticateToken, createOrGetApiConnection);
router.get('/api-connection', authenticateToken, getApiConnection);
router.put('/api-connection/:id', authenticateToken, updateApiConnection);
router.delete('/api-connection/:id', authenticateToken, deleteApiConnection);

module.exports = router;
