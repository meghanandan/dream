const express = require('express');
const { createDispute, getAllDisputes } = require('../controllers/DisputeController');
const router = express.Router();

router.get('/', getAllDisputes);
router.post('/', createDispute);

module.exports = router;
