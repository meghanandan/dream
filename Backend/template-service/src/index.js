require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const templateRoute = require('./routes/templateRoute');

const app = express();

app.use(cors('*'));
app.use(express.json());

app.use('/', templateRoute);

const PORT = process.env.PORT || 4002;

sequelize.sync().then(() => {
    console.log('Database connected!');
    app.listen(PORT, () => console.log(`Template Service running on port ${PORT}`));
}).catch(err => console.log('Database connection error:', err));
