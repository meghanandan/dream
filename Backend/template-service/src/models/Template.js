const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');


const Template = sequelize.define('templates', {

  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Dispute', 'Adjustment', 'Compensation'),
    allowNull: false,
  },
  resaon_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  commit: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  availableFields: {
    type: DataTypes.JSON, // Store available fields as JSON
    allowNull: false,
    defaultValue: [],
  },
});

module.exports = Template;
