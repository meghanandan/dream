const { DataTypes, UUIDV4 } = require('sequelize'); // Import necessary Sequelize components
const sequelize = require('../config/db'); // Database connection

const SettingCustomFields = sequelize.define(
  'SettingCustomFields',
  {
    id: {
      type: DataTypes.UUID, // UUID type for unique IDs
      defaultValue: UUIDV4, // Generate UUID automatically
      primaryKey: true, // Mark as primary key
    },
    fieldName: {
      type: DataTypes.STRING,
      allowNull: false, // Ensure fieldName is required
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false, // Ensure label is required
    },
    fieldType: {
      type: DataTypes.ENUM('text', 'number', 'date', 'select', 'textarea'), // Define valid field types
      allowNull: false, // Ensure fieldType is required
    },
    placeholder: {
      type: DataTypes.STRING,
      allowNull: true, // Optional placeholder
    },
    options: {
      type: DataTypes.JSON, // Store options as JSON object
      allowNull: true, // Optional field
    },
    isRequired: {
      type: DataTypes.BOOLEAN, // Boolean to mark as required or not
      defaultValue: false, // Default value is `false`
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false, // Ensure the order is provided
    },
  },
  {
    tableName: 'SettingCustomFields', // Define table name explicitly
    timestamps: true, // Enable `createdAt` and `updatedAt`
    defaultScope: {
      order: [['order', 'ASC']], // Default order by 'order' column in ascending order
    },
  }
);

module.exports = SettingCustomFields;
