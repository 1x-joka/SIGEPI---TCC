const express = require('express');
const router = express.Router();
const solicitacaoController = require('../controllers/solicitacaoController');
const { autenticar, exigirEmpresa } = require('../middlewares/authMiddleware');

// Funcionário cria a solicitação (NÃO usa exigirAdmin — é ação do funcionário)
router.post('/criar', autenticar, exigirEmpresa, solicitacaoController.criarSolicitacao);

// Funcionário acompanha as próprias solicitações
router.get('/minhas', autenticar, exigirEmpresa, solicitacaoController.listarMinhasSolicitacoes);

module.exports = router;