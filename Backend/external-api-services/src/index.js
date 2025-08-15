require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {sequelize} = require('./config/db');
const externalApiRoute = require('./routes/externalApiRoute');

const app = express();

app.use(cors('*'));
app.use(express.json());

app.use('/', externalApiRoute);

const PORT = process.env.PORT || 4006;

sequelize.sync().then(() => {
    console.log('Database connected!');
    app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
}).catch(err => console.log('Database connection error:', err));
