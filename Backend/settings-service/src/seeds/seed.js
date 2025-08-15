const { Sequelize } = require('sequelize'); // Import Sequelize for UUID
const SettingCustomField = require('./../models/SettingCustomField'); // Import the model

const seedDatabase = async () => {
  try {
    // Seed data
    const fields = [
      {
        fieldName: 'Name',
        label: 'Enter Your Name',
        fieldType: 'text',
        placeholder: 'e.g., John Doe',
        options: [], // No options for text field
        isRequired: true,
        order: 1,
      },
      {
        fieldName: 'Age',
        label: 'Enter Your Age',
        fieldType: 'number',
        placeholder: 'e.g., 30',
        options: [], // No options for number field
        isRequired: true,
        order: 2,
      },
      {
        fieldName: 'Date of Birth',
        label: 'Select Your Date of Birth',
        fieldType: 'date',
        placeholder: '',
        options: [], // No options for date field
        isRequired: false,
        order: 3,
      },
      {
        fieldName: 'Gender',
        label: 'Select Your Gender',
        fieldType: 'select',
        placeholder: 'Choose...',
        options: ['Male', 'Female', 'Other'], // Options for select field
        isRequired: true,
        order: 4,
      },
      {
        fieldName: 'Bio',
        label: 'Write a short bio',
        fieldType: 'textarea',
        placeholder: 'Tell us about yourself...',
        options: [], // No options for textarea field
        isRequired: false,
        order: 5,
      },
    ];

    // Loop through the fields and create each entry
    for (const field of fields) {
      await SettingCustomField.create({
        ...field, // Spread field properties
        options: JSON.stringify(field.options), // Store options as JSON
        createdAt: new Date(), // Set timestamps
        updatedAt: new Date(),
      });
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Run the seed function
seedDatabase();
