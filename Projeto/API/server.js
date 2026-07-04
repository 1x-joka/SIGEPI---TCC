const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const empresaRoutes = require('./src/routes/empresaRoutes');
const setorRoutes = require('./src/routes/setorRoutes');
const epiRoutes = require('./src/routes/epiRoutes');
const funcionarioRoutes = require('./src/routes/funcionarioRoutes');
const estoqueRoutes = require('./src/routes/estoqueRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/funcionario', funcionarioRoutes);
app.use('/api/setor', setorRoutes);
app.use('/api/epi', epiRoutes);
app.use('/api/estoque', estoqueRoutes);

// Verificando se a API funciona (roda "npm start" no terminal na pasta API e testa no google com a url: http://localhost:3000/ )
app.get('/', (req, res) => {
  res.json({ mensagem: 'API SIGEPI funcionando!' });
});

// Verificando se a API funciona (roda "npm start" no terminal na pasta API e tem que aparecer "Servidor rodando na porta 3000")
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});