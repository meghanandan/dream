const { DataTypes } = require('sequelize');
const sequelize = require('../../config/dbConfig'); // Adjust path to your db config

const Dispute = sequelize.define('Dispute', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: false },
    resolvedBy: { type: DataTypes.UUID },
}, { timestamps: true });

module.exports = Dispute;
