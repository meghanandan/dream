const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust the path to your database configuration file

const MasterPage = sequelize.define('MasterPage', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    pageName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'page_name',
    },
    route: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    add: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    view: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    edit: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    delete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    download: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    parentPageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'parent_page_id',
    },
    menuOrder: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'menu_order',
    },
    icon: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName: 'master_pages', // Explicitly define the table name
    timestamps: false, // Disable createdAt and updatedAt fields
});

module.exports = MasterPage;
