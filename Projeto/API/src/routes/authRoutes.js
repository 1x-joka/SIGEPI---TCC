/* LOCAL QUE AS ROTAS SÃO GUARDADAS PARA MELHOR VISIBILIDADE E MANUTENÇÃO */

const rateLimit = require('express-rate-limit');

// Login: no máximo 5 tentativas por IP a cada 15 min (anti força-bruta)
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos.' }
});

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/cadastrar', authController.cadastrar); // Rota de cadastro de usuário
router.post('/login', limiteLogin, authController.login);

module.exports = router;