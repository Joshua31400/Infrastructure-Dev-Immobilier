require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes       = require('./src/routes/auth');
const realStatesRoutes = require('./src/routes/realStates');
const usersRoutes      = require('./src/routes/users');
const agenciesRoutes   = require('./src/routes/agencies');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/real-states', realStatesRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/agencies',    agenciesRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
