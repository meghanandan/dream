const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Ensure the correct path to your db configuration

const SettingApiConnections = sequelize.define('SettingApiConnections', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    apiKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    systemUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    timestamps: true,
    tableName: 'SettingApiConnections', // Match the table name if explicitly defined
});

module.exports = SettingApiConnections;