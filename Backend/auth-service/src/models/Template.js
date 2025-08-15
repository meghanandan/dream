const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Template = sequelize.define('templates', {
  id: {
    type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
  },
  org_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  work_flow_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_predefined: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_usable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_fixed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  template_type: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  category: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,  // Use DataTypes.NOW instead of Sequelize.NOW
  },
  updated_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,  // Use DataTypes.NOW instead of Sequelize.NOW
    onUpdate: DataTypes.NOW,  // Also use DataTypes.NOW here
  },
  reason_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  // Additional model options
  timestamps: false, // Since you're handling `created_at` and `updated_at` manually
});

module.exports = Template;
