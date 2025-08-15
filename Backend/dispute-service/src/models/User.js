const { DataTypes } = require('sequelize');
const sequelize = require('../../config/dbConfig');
const User = sequelize.define('users', {
    id: {
        type: DataTypes.UUID, // Use UUID for id
        defaultValue: DataTypes.UUIDV4, // Automatically generate UUID
        primaryKey: true,
    },
    emp_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    reporting_to: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    reporting_role: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true, // Ensure unique values
        validate: {
            isEmail: true, // Validate as an email address
        },
    },
    role: {
        type: DataTypes.STRING(100), // Define valid roles
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Default to active
    },
    organization: {
        type: DataTypes.STRING(100),
        allowNull: true, // Nullable field
    },
    created_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    updated_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    user_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false, // Default to active
    },
}, {
    timestamps: true, // Automatically add `createdAt` and `updatedAt`
    createdAt: 'created_at', // Map `createdAt` to SQL `created_at`
    updatedAt: 'updated_at', // Map `updatedAt` to SQL `updated_at`
});

module.exports = User;
