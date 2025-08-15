const { DataTypes } = require("sequelize");
const {sequelize} = require("../config/db");

// External API Endpoints Table
const ExternalApiEndpoint = sequelize.define(
  "ExternalApiEndpoint",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    external_api_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    purpose: DataTypes.STRING,
    method: DataTypes.STRING,
    url: DataTypes.STRING,
    params: DataTypes.ARRAY(DataTypes.STRING),
    body: DataTypes.ARRAY(DataTypes.STRING),
  },
  {
    tableName: "external_api_endpoints",
    timestamps: false,
  }
);

// External API Keys Table
const ExternalApiKey = sequelize.define(
  "ExternalApiKey",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    api_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key_type: DataTypes.STRING,
    external_api_code: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: ExternalApiEndpoint,
        key: "external_api_code", // Ensure foreign key references external_api_code
      },
    },
  },
  {
    tableName: "external_api_keys",
    timestamps: false,
  }
);

// External API Key Values Table
const ExternalApiKeyValue = sequelize.define(
  "ExternalApiKeyValue",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    api_key: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: ExternalApiKey,
        key: "api_key", // Ensure foreign key references api_key
      },
    },
    external_api_code: { // 🔹 Add external_api_code field
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: DataTypes.STRING,
    org_code: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
  },
  {
    tableName: "external_api_key_values",
    timestamps: false,
  }
);

// **Relationships**
ExternalApiEndpoint.hasMany(ExternalApiKey, { foreignKey: "external_api_code", sourceKey: "external_api_code" });
ExternalApiKey.belongsTo(ExternalApiEndpoint, { foreignKey: "external_api_code", targetKey: "external_api_code" });

ExternalApiKey.hasMany(ExternalApiKeyValue, { foreignKey: "api_key", sourceKey: "api_key" });
ExternalApiKeyValue.belongsTo(ExternalApiKey, { foreignKey: "api_key", targetKey: "api_key" });



const ApiKeyValues = sequelize.define('external_api_key_values', 
  {

    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    api_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
     external_api_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    org_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updated_by: {
      type: DataTypes.STRING, // Add updated_by
      allowNull: true, // Allow it to be null initially
    },
    updated_at: {
      type: DataTypes.DATE, // Add updated_at
      allowNull: true,
    },

  },
  {
    timestamps: false, // <== Add this line to prevent Sequelize from expecting createdAt/updatedAt
  }
);

module.exports = {
  ExternalApiEndpoint,
  ExternalApiKey,
  ExternalApiKeyValue,
  ApiKeyValues
};
