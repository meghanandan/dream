const express = require('express');
const { createDisputeTemplate, viewDisputeTemplate, editDisputeTemplate, deleteDisputeTemplate, viewAllDisputeTemplates } = require('../controllers/TemplateController');

const router = express.Router();

// Routes for dispute templates
router.post('/disputeTemplate/create', createDisputeTemplate);
router.get('/disputeTemplate/get-by/:id', viewDisputeTemplate);
router.put('/disputeTemplate/edit/:id', editDisputeTemplate);
router.delete('/disputeTemplate/delete/:id', deleteDisputeTemplate);
router.get('/disputeTemplates/get', viewAllDisputeTemplates);

module.exports = router;
