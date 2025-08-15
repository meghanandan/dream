const sequelize = require('../../config/dbConfig');
const User = require('../../../auth-service/src/models/User'); // Adjust path
const Dispute = require('./Dispute'); // Adjust path

// Define relationships
Dispute.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
Dispute.belongsTo(User, { as: 'resolver', foreignKey: 'resolvedBy' });

module.exports = { sequelize, Dispute, User };



