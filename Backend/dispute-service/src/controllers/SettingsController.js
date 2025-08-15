const { SettingCustomField } = require("../models");

// Create a new setting custom field
const createSettingCustomField = async (req, res) => {
    const { fieldName, label, fieldType, placeholder, options, isRequired } = req.body;
    const transaction = await SettingCustomField.sequelize.transaction();
    try {
        // Count the number of existing fields to determine the next order
        const totalFields = await SettingCustomField.count({ transaction });
        const nextOrder = totalFields + 1;
        // Create the new field with the next order value
        const newField = await SettingCustomField.create(
            {
                fieldName,
                label,
                fieldType,
                placeholder,
                options,
                isRequired,
                order: nextOrder,
            },
            { transaction }
        );

        // Commit the transaction
        await transaction.commit();

        res.status(201).json(newField);
    } catch (error) {
        // Rollback the transaction in case of an error
        await transaction.rollback();
        console.error('Error creating field:', error);
        res.status(400).json({ error: 'Bad Request' });
    }
};





// Get all setting custom fields
const getAllSettingCustomFields = async (req, res) => {
    try {
        const fields = await SettingCustomField.findAll();
        return res.status(200).json(fields);
    } catch (error) {
        console.error('Error fetching custom fields:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get a setting custom field by ID
const getSettingCustomFieldById = async (req, res) => {
    const { id } = req.params;
    try {
        const field = await SettingCustomField.findByPk(id);
        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }
        return res.status(200).json(field);
    } catch (error) {
        console.error('Error fetching custom field:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update a setting custom field by ID
const updateSettingCustomField = async (req, res) => {
    const { id } = req.params;
    const { fieldName, label, fieldType, placeholder } = req.body;

    try {
        const field = await SettingCustomField.findByPk(id);
        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }
        field.fieldName = fieldName || field.fieldName;
        field.label = label || field.label;
        field.fieldName = fieldName || field.fieldName;
        field.fieldType = fieldType || field.fieldType;
        field.placeholder = placeholder || field.placeholder;

        await field.save();
        return res.status(200).json(field);
    } catch (error) {
        console.error('Error updating custom field:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Delete a setting custom field by ID
const deleteSettingCustomField = async (req, res) => {
    const { id } = req.params;
    try {
        const field = await SettingCustomField.findByPk(id);
        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }
        await field.destroy();
        return res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting custom field:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};




module.exports = {
    createSettingCustomField,
    getAllSettingCustomFields,
    getSettingCustomFieldById,
    updateSettingCustomField,
    deleteSettingCustomField,
};
