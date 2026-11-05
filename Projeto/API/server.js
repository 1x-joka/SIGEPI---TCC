const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
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

app.use(helmet({ contentSecurityPolicy: false })); // CSP off: o front usa onclick inline, scripts inline, Google Fonts e reCAPTCHA
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Bloqueia o acesso público ao código-fonte do back e ao banco (o .env já é protegido)
app.use((req, res, next) => {
  const p = decodeURIComponent(req.path);
  if (/^\/(API|banco de dados)(\/|$)/.test(p)) {
    return res.status(403).send('Acesso negado.');
  }
  next();
});

app.use(express.static(path.join(__dirname, '..'), { dotfiles: 'ignore' }));

// Limite geral: 300 requisições por IP a cada 15 min (uso normal nunca chega perto)
const limiteGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Muitas requisições. Tente novamente em alguns minutos.'
  }
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

// catch-all que entrega o front
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Verificando se a API funciona (roda "npm start" no terminal na pasta API e tem que aparecer "Servidor rodando na porta 3000")
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});