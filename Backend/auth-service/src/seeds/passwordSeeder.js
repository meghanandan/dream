const bcrypt = require('bcryptjs');

async function hashAdminPassword() {
    try {
        // Hash admin password
        const adminPassword = await bcrypt.hash('admiin123', 10);
        console.log(adminPassword);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
}

// Execute the function
hashAdminPassword();