const SettingApiConnections = require('../models/SettingApiConnection');
const SettingCustomFields = require('../models/SettingCustomField');

// Create a new custom field
exports.createSettingCustomField = async (req, res) => {
  const { fieldName, label, fieldType, placeholder, options, isRequired } = req.body;
  const transaction = await SettingCustomFields.sequelize.transaction();

  try {
    const totalFields = await SettingCustomFields.count({ transaction });
    const nextOrder = totalFields + 1;

    const newField = await SettingCustomFields.create(
      { fieldName, label, fieldType, placeholder, options, isRequired, order: nextOrder },
      { transaction }
    );

    await transaction.commit();
    return res.status(201).json({newField});
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating custom field:', error.message);
    return res.status(400).json({ error: 'Error creating custom field', details: error.message });
  }
};

// Get all custom fields
exports.getAllSettingCustomFields = async (req, res) => {
  try {
    const fields = await SettingCustomFields.findAll();
    console.log({fields})
    return res.status(200).json(fields);
  } catch (error) {
    console.error('Error fetching custom fields:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get a specific custom field by ID
exports.getSettingCustomFieldById = async (req, res) => {
  try {
    const field = await SettingCustomFields.findByPk(req.params.id);
    if (!field) return res.status(404).json({ error: 'Custom field not found' });

    return res.status(200).json(field);
  } catch (error) {
    console.error('Error fetching custom field:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update a custom field by ID
exports.updateSettingCustomField = async (req, res) => {
  try {
    const { id } = req.params;
    const { fieldName, label, fieldType, placeholder, options } = req.body;

    const field = await SettingCustomFields.findByPk(id);
    if (!field) return res.status(404).json({ error: 'Custom field not found' });

    await field.update({ fieldName, label, fieldType, placeholder, options });
    return res.status(200).json(field);
  } catch (error) {
    console.error('Error updating custom field:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete a custom field by ID
exports.deleteSettingCustomField = async (req, res) => {
  try {
    const field = await SettingCustomFields.findByPk(req.params.id);
    if (!field) return res.status(404).json({ error: 'Custom field not found' });

    await field.destroy();
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting custom field:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create or get API connection
exports.createOrGetApiConnection = async (req, res) => {
  try {
    const existingConnection = await SettingApiConnections.findOne();
    if (existingConnection) return res.status(200).json(existingConnection);

    const { apiKey, systemUrl } = req.body;
    const newConnection = await SettingApiConnections.create({ apiKey, systemUrl });

    return res.status(201).json(newConnection);
  } catch (error) {
    console.error('Error managing API connection:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get API connection
exports.getApiConnection = async (req, res) => {
  try {
    const connection = await SettingApiConnections.findOne();
    if (!connection) return res.status(404).json({ error: 'API connection not found' });

    return res.status(200).json(connection);
  } catch (error) {
    console.error('Error fetching API connection:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update API connection by ID
exports.updateApiConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const { apiKey, systemUrl } = req.body;

    const connection = await SettingApiConnections.findByPk(id);
    if (!connection) return res.status(404).json({ error: 'API connection not found' });

    await connection.update({ apiKey, systemUrl });
    return res.status(200).json(connection);
  } catch (error) {
    console.error('Error updating API connection:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete API connection by ID
exports.deleteApiConnection = async (req, res) => {
  try {
    const connection = await SettingApiConnections.findByPk(req.params.id);
    if (!connection) return res.status(404).json({ error: 'API connection not found' });

    await connection.destroy();
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting API connection:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
