module.exports = (sequelize, DataTypes) => {
    const SettingCustomField = sequelize.define('SettingCustomField', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        fieldName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        label: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fieldType: {
            type: DataTypes.ENUM('text', 'number', 'date', 'select', 'textarea'),
            allowNull: false,
        },
        placeholder: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        options: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        isRequired: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        timestamps: true,
        tableName: 'setting_custom_fields',
        defaultScope: {
            order: [['order', 'ASC']], // Default ordering by 'order' column
        },
    });

    return SettingCustomField;
};
