const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 

const OrganizationMstLicence = sequelize.define('OrganizationMstLicence', {
    slNo: {
        type: DataTypes.INTEGER,
        field: 'sl_no', 
        autoIncrement: true,
        primaryKey: true,
    },
    orgCode: {
        type: DataTypes.STRING(30),
        field: 'org_code',  
        allowNull: false,
        unique: true,
    },
    licenceType: {
        type: DataTypes.STRING(30),
        field: 'licence_type', 
        allowNull: false,
        unique: true,
    },
    licenceFromDate: {
        type: DataTypes.DATE,
        field: 'licence_from_date', 
    },
    licenceToDate: {
        type: DataTypes.DATE,
        field: 'licence_to_date', 
    },
    noOfLicences: {
        type: DataTypes.INTEGER,
        field: 'no_of_licences', 
    },
    gracePeriod: {
        type: DataTypes.INTEGER,
        field: 'grace_period', 
    },
    createdBy: {
        type: DataTypes.STRING(50),
        field: 'created_by', 
        allowNull: true,
    },
    createdDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_date',
    },
    lastUpdatedBy: {
        type: DataTypes.STRING(50),
        field: 'last_updated_by',
        allowNull: true,
    },
    lastUpdatedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW,
        field: 'last_updated_date', 
    },
}, {
    tableName: 'cmn_org_licences_mst',  
    timestamps: false, 
});

module.exports = OrganizationMstLicence;
