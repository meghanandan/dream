const express = require('express');
const {
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  getAllTemplates,
} = require('./../controllers/templateController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();


console.log('getAllTemplates',router);
// Template routes with authentication middleware
router.post('/create', authenticateToken, createTemplate);
router.get('/:id', authenticateToken, getTemplateById);
router.put('/:id', authenticateToken, updateTemplate);
router.delete('/:id', authenticateToken, deleteTemplate);
router.get('/', authenticateToken, getAllTemplates);

module.exports = router;
