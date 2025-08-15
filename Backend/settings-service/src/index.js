require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db'); // Import Sequelize instance
const settingsRoute = require('./routes/settings'); // Import settings routes

const app = express();

// Middleware
app.use(cors()); // Enable CORS (no need to pass '*' as it’s the default)
app.use(express.json()); // Parse incoming JSON requests

// Routes
app.use('/', settingsRoute); // Namespace the routes properly

// Define the port from environment variables or default to 4003
const PORT = process.env.PORT || 4003;

// Start the server after successful database connection
sequelize
  .authenticate() // Ensure connection is valid
  .then(() => {
    console.log('Database connected successfully!');
    return sequelize.sync(); // Sync the database schema
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Settings Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1); // Exit the process if the database connection fails
  });
