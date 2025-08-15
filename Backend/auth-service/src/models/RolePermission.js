const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust the path to your database configuration

const RolePermission = sequelize.define('RolePermission', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    fkRoleId: {
        type: DataTypes.STRING(100),
        field: 'fk_role_id', // Maps to the column `fk_role_id` in the database
        allowNull: false,
    },
    org_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    isAdd: {
        type: DataTypes.BOOLEAN,
        field: 'is_add', // Maps to the column `is_add` in the database
        defaultValue: false,
    },
    isView: {
        type: DataTypes.BOOLEAN,
        field: 'is_view', // Maps to the column `is_view` in the database
        defaultValue: false,
    },
    isEdit: {
        type: DataTypes.BOOLEAN,
        field: 'is_edit', // Maps to the column `is_edit` in the database
        defaultValue: false,
    },
    isDelete: {
        type: DataTypes.BOOLEAN,
        field: 'is_delete', // Maps to the column `is_delete` in the database
        defaultValue: false,
    },
    isList: {
        type: DataTypes.BOOLEAN,
        field: 'is_list', // Maps to the column `is_list` in the database
        defaultValue: false,
    },
    isDownload: {
        type: DataTypes.BOOLEAN,
        field: 'is_download', // Maps to the column `is_download` in the database
        defaultValue: false,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    parentPageId: {
        type: DataTypes.STRING(255),
        field: 'parent_page_id', // Maps to the column `parent_page_id` in the database
        allowNull: true,
    },
    pageId: {
        type: DataTypes.INTEGER,
        field: 'page_id', // Maps to the column `page_id` in the database
        allowNull: true,
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
        onUpdate: DataTypes.NOW,
        field: 'updated_at', // Maps to the column `updated_at` in the database
    },
    updatedBy: {
        type: DataTypes.STRING(255),
        field: 'updated_by', // Maps to the column `updated_by` in the database
        allowNull: true,
    },
}, {
    tableName: 'role_permissions', // Explicitly specify the table name
    timestamps: false, // Disable automatic `createdAt` and `updatedAt` fields
});

module.exports = RolePermission;
