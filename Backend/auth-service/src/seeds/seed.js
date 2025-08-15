const bcrypt = require('bcryptjs');
const User = require('./../models/User'); // Import your User model

const seedDatabase = async () => {
    try {
        // Hash passwords
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('user123', 10);

        // Insert Admin
        await User.create({
            firstName: 'admin',
            lastName: 'admin',
            email: 'admin@gmail.com',
            password: adminPassword,
            role: 'ADMIN',
        });

        // Insert User 1
        await User.create({
            firstName: 'user1',
            lastName: 'user1',
            email: 'user1@gmail.com',
            password: userPassword,
            role: 'USER',
        });

        // Insert User 2
        await User.create({
            firstName: 'user2',
            lastName: 'user2',
            email: 'user2@gmail.com',
            password: userPassword,
            role: 'USER',
        });

        console.log('Admin and users created successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

// Run the seed function
seedDatabase();
