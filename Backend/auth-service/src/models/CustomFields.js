const { DataTypes, UUIDV4 } = require('sequelize'); // Import necessary Sequelize components
const sequelize = require('../config/db'); // Database connection

const CustomFields = sequelize.define(
  'customFields',
  {
    id: {
        type: DataTypes.UUID, // Use UUID for id
        defaultValue: DataTypes.UUIDV4, // Automatically generate UUID
        primaryKey: true, // Mark as primary key
    },
    org_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    name: {
      type: DataTypes.STRING,
      allowNull: false, // Ensure fieldName is required
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false, // Ensure label is required
    },
    field_type: {
      type: DataTypes.ENUM('text', 'number', 'date', 'select', 'textarea'), // Define valid field types
      allowNull: false, // Ensure fieldType is required
    },
    placeholder: {
      type: DataTypes.STRING,
      allowNull: true, // Optional placeholder
    },
    // options: {
    //   type: DataTypes.JSON, // Store options as JSON object
    //   allowNull: true, // Optional field
    // },
    is_required: {
      type: DataTypes.BOOLEAN, // Boolean to mark as required or not
      defaultValue: false, // Default value is `false`
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // Ensure the order is provided
    },
    created_at: {
      type: DataTypes.INTEGER,
      allowNull: false, // Ensure the order is provided
    },
  },
  {
    tableName: 'master_template_custom_fields', // Define table name explicitly
    timestamps: true, // Enable `createdAt` and `updatedAt`
    defaultScope: {
      order: [['order', 'ASC']], // Default order by 'order' column in ascending order
    },
  }
);

module.exports = CustomFields;
