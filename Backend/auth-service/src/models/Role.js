const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust the path to your database configuration

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    roleName: {
        type: DataTypes.STRING(100),
        field: 'role_name', // Maps to the column `role_name` in the database
        allowNull: false,
    },
    roleId: {
        type: DataTypes.STRING(100),
        field: 'role_id', // Maps to the column `role_id` in the database
        allowNull: false,
        unique: true,
    },
    org_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at', // Maps to the column `created_at` in the database
    },
    createdBy: {
        type: DataTypes.STRING(255),
        field: 'created_by', // Maps to the column `created_by` in the database
        allowNull: true,
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW, // Automatically updates the timestamp
        field: 'updated_at', // Maps to the column `updated_at` in the database
    },
    updatedBy: {
        type: DataTypes.STRING(255),
        field: 'updated_by', // Maps to the column `updated_by` in the database
        allowNull: true,
    },
}, {
    tableName: 'roles', // Explicitly specify the table name
    timestamps: false, // Disable automatic `createdAt` and `updatedAt` fields
});

module.exports = Role;
