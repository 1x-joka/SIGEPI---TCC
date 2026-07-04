const express = require('express');
const router = express.Router();
const solicitacaoController = require('../controllers/solicitacaoController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

// Funcionário cria a solicitação (NÃO usa exigirAdmin — é ação do funcionário)
router.post('/criar', autenticar, exigirEmpresa, solicitacaoController.criarSolicitacao);

// Funcionário acompanha as próprias solicitações
router.get('/minhas', autenticar, exigirEmpresa, solicitacaoController.listarMinhasSolicitacoes);

// ADMIN: ver pendentes e responder
router.get('/pendentes', autenticar, exigirEmpresa, exigirAdmin, solicitacaoController.listarPendentes);
router.put('/:id/responder', autenticar, exigirEmpresa, exigirAdmin, solicitacaoController.responderSolicitacao);

module.exports = router;