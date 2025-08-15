const { SettingApiConnection } = require("../models");

// Create or return an existing API connection (only one allowed)
const createOrGetApiConnection = async (req, res) => {
    try {
        const existingConnection = await SettingApiConnection.findOne();

        if (existingConnection) {
            return res.status(200).json(existingConnection); // Return the existing connection
        }

        const { apiKey, systemUrl } = req.body;
        const newConnection = await SettingApiConnection.create({ apiKey, systemUrl });
        return res.status(201).json(newConnection); // Create a new connection if none exists
    } catch (error) {
        console.error('Error creating or fetching API connection:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get the single API connection by ID (since there will only be one)
const getApiConnection = async (req, res) => {
    try {
        const connection = await SettingApiConnection.findOne(); // Fetch the single connection
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        return res.status(200).json(connection);
    } catch (error) {
        console.error('Error fetching API connection:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update the single API connection (by ID, as there will be only one)
const updateApiConnection = async (req, res) => {
    const { id } = req.params;
    const { apiKey, systemUrl } = req.body;

    try {
        const connection = await SettingApiConnection.findByPk(id);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        connection.apiKey = apiKey || connection.apiKey;
        connection.systemUrl = systemUrl || connection.systemUrl;
        await connection.save();

        return res.status(200).json(connection);
    } catch (error) {
        console.error('Error updating API connection:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Delete the API connection
const deleteApiConnection = async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await SettingApiConnection.findByPk(id);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        await connection.destroy();
        return res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting API connection:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    createOrGetApiConnection,
    getApiConnection,
    updateApiConnection,
    deleteApiConnection,
};
