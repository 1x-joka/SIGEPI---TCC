/* LOCAL QUE AS ROTAS SÃO GUARDADAS PARA MELHOR VISIBILIDADE E MANUTENÇÃO */

const express    = require('express');
const router     = express.Router();
const authController = require('../controllers/authController');

router.post('/cadastrar', authController.cadastrar); // Rota de cadastro de usuário
router.post('/login', authController.login); // Rota de login de usuário

module.exports = router;