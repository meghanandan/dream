const { DataTypes } = require('sequelize');
const sequelize = require('../../config/dbConfig');

module.exports = (sequelize, DataTypes) => {
  const DisputeTemplate = sequelize.define('DisputeTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING, // Template name (e.g., adjustment, compensation)
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('dispute', 'adjustment', 'compensation'),
      allowNull: false
    },
    availableFields: {

      type: DataTypes.JSON,  // Use JSON type to store objects/arrays
      // type: DataTypes.ENUM('Text Input', 'Number Input', 'Date Picker', 'DropDown', 'Text Area'),
      allowNull: false,
      defaultValue: "Text Input" // Default to an empty array
    }
  });
  return DisputeTemplate;
};

