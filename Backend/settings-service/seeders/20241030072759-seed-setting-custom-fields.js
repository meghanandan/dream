'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const fields = [
      {
        id: Sequelize.UUIDV4(), 
        fieldName: 'Name',
        label: 'Enter Your Name',
        fieldType: 'text',
        placeholder: 'e.g., John Doe',
        options: JSON.stringify([]), // No options for text field
        isRequired: true,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: Sequelize.UUIDV4(),
        fieldName: 'Age',
        label: 'Enter Your Age',
        fieldType: 'number',
        placeholder: 'e.g., 30',
        options: JSON.stringify([]), // No options for number field
        isRequired: true,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: Sequelize.UUIDV4(),
        fieldName: 'Date of Birth',
        label: 'Select Your Date of Birth',
        fieldType: 'date',
        placeholder: '',
        options: JSON.stringify([]), // No options for date field
        isRequired: false,
        order: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: Sequelize.UUIDV4(),
        fieldName: 'Gender',
        label: 'Select Your Gender',
        fieldType: 'select',
        placeholder: 'Choose...',
        options: JSON.stringify(['Male', 'Female', 'Other']),
        isRequired: true,
        order: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: Sequelize.UUIDV4(),
        fieldName: 'Bio',
        label: 'Write a short bio',
        fieldType: 'textarea',
        placeholder: 'Tell us about yourself...',
        options: JSON.stringify([]),
        isRequired: false,
        order: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await queryInterface.bulkInsert('SettingCustomField', fields, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('SettingCustomField', null, {});
  },
};
