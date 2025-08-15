const { DataTypes } = require('sequelize');
const sequelize = require('../../config/dbConfig');

module.exports = (sequelize, DataTypes) => {
    const SettingApiConnection = sequelize.define('SettingApiConnection', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      apiKey: {
        type: DataTypes.STRING, // Template name (e.g., adjustment, compensation)
        allowNull: false
      },
      systemUrl: {
        type: DataTypes.STRING,
        allowNull: false
      },
    });
    return SettingApiConnection;
  };
