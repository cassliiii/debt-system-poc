const express = require('express');
const cors = require('cors');
const debtRoutes = require('./routes/debtRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Debt System API funcionando 🚀' });
});

// Registrar rutas de deudas
app.use('/api/debt', debtRoutes);

module.exports = app;