require('dotenv').config();
const express = require('express');
const cors = require('cors');  // Import the cors package
// const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const disputeTemplateRoutes = require('./routes/disputeTemplate');
const settingRoutes = require('./routes/setting');
const settingApiRoutes = require('./routes/settingApi');
const disputeRoutes = require('./routes/disputes');

const app = express();
// app.use(bodyParser.json());

// Middleware
app.use(cors());  // Enable CORS for all routes
app.use(express.json());  // Use express' built-in middleware for JSON parsing


app.use('/api/disputes', disputeRoutes);
app.use('/api/templates', disputeTemplateRoutes);
app.use('/api/setting', settingRoutes);
app.use('/api', settingApiRoutes);
const PORT = process.env.PORT || 4001;

app.listen(PORT, async () => {
  console.log(`Dispute service running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});
