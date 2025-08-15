const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

  const WorkFlow = sequelize.define("WorkFlow",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      org_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      work_flow_stage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // is_tested: {
      //   type: DataTypes.BOOLEAN,
      //   allowNull: true,
      // },
      community_access: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      price: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      mail_template_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      work_flow_status: {
        type: DataTypes.STRING,
        allowNull: true,
      },

    },
    {
      tableName: "work_flows",
      timestamps: false, // Disable Sequelize's automatic timestamp fields
    }
  );


module.exports = WorkFlow;
