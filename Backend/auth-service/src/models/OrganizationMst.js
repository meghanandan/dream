const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 

const OrganizationMst = sequelize.define('OrganizationMst', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    orgCode: {
        type: DataTypes.STRING(30),
        field: 'org_code', 
        allowNull: false,
        unique: true,
    },
    orgName: {
        type: DataTypes.STRING(100),
        field: 'org_name',  
        allowNull: false,
        unique: true,
    },
    supportMail: {
        type: DataTypes.STRING(50),
        field: 'support_mail', 
        allowNull: false,
        unique: true,
    },
    contactNo: {
        type: DataTypes.STRING(50),
        field: 'contact_no', 
        allowNull: false,
        unique: true,
    },
    industry: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    stateName: {
        type: DataTypes.STRING(50),
         field: 'state_name',
        allowNull: false,
    },
    country: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    zipcode: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    region: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    createdBy: {
        type: DataTypes.STRING(30),
        field: 'created_by', 
        allowNull: true,
    },
    createdDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_date',
    },
    // Trial metadata - minimal additions
    customerType: {
        type: DataTypes.STRING(20),
        field: 'customer_type',
        defaultValue: 'PAID', // 'PAID', 'TRIAL', 'EXPIRED_TRIAL'
    },
    trialConvertedDate: {
        type: DataTypes.DATE,
        field: 'trial_converted_date',
        allowNull: true,
    }, 
}, {
    tableName: 'cmn_org_mst',  
    timestamps: false,  
});

module.exports = OrganizationMst;
