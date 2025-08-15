require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.set('trust proxy', true);

app.use(cors('*'));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', authRoutes);

const PORT = process.env.PORT || 4021;

sequelize.sync().then(() => {
    console.log('Database connected!');
    app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
}).catch(err => console.log('Database connection error:', err));
