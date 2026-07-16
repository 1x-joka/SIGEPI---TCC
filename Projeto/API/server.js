const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const empresaRoutes = require('./src/routes/empresaRoutes');
const setorRoutes = require('./src/routes/setorRoutes');
const epiRoutes = require('./src/routes/epiRoutes');
const funcionarioRoutes = require('./src/routes/funcionarioRoutes');
const estoqueRoutes = require('./src/routes/estoqueRoutes');
const entregaRoutes = require('./src/routes/entregaRoutes');
const solicitacaoRoutes = require('./src/routes/solicitacaoRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const logRoutes = require('./src/routes/logRoutes');

const app = express();

app.use(helmet()); // cabeçalhos de segurança HTTP
app.use(cors());
app.use(express.json());

// Limite geral: 300 requisições por IP a cada 15 min (uso normal nunca chega perto)
const limiteGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em alguns minutos.' }
});
app.use('/api', limiteGeral);

app.use('/api/auth', authRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/funcionario', funcionarioRoutes);
app.use('/api/setor', setorRoutes);
app.use('/api/epi', epiRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/entrega', entregaRoutes)
app.use('/api/solicitacao', solicitacaoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/log', logRoutes);

// Verificando se a API funciona (roda "npm start" no terminal na pasta API e testa no google com a url: http://localhost:3000/ )
app.get('/', (req, res) => {
  res.json({ mensagem: 'API SIGEPI funcionando!' });
});

// Verificando se a API funciona (roda "npm start" no terminal na pasta API e tem que aparecer "Servidor rodando na porta 3000")
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});