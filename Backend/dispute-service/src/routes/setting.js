const express = require('express');
const {
    createSettingCustomField,
    getAllSettingCustomFields,
    getSettingCustomFieldById,
    updateSettingCustomField,
    deleteSettingCustomField,
} = require('../controllers/SettingsController');

const router = express.Router();

// Custom Fields Routes
router.post('/custom-fields/create', createSettingCustomField);
router.get('/custom-fields/get-all', getAllSettingCustomFields);
router.get('/custom-fields/get-by/:id', getSettingCustomFieldById);
router.put('/custom-fields/update/:id', updateSettingCustomField);
router.delete('/custom-fields/delete/:id', deleteSettingCustomField);

module.exports = router;
