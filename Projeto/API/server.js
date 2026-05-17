const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes    = require('./src/routes/authRoutes');
const empresaRoutes = require('./src/routes/empresaRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',    authRoutes);
app.use('/api/empresa', empresaRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API SIGEPI funcionando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});