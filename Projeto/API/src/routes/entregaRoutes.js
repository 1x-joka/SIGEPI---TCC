const express = require('express');
const router = express.Router();
const entregaController = require('../controllers/entregaController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');


// Só o ADMIN registra entregas
router.post('/registrar', autenticar, exigirEmpresa, exigirAdmin, entregaController.registrarEntrega);

// Listar entregas da empresa (admin)
router.get('/listar', autenticar, exigirEmpresa, exigirAdmin, entregaController.listarEntregas);

// Devolver um EPI (PUT = atualizar uma entrega existente). O :id é o id_entrega.
router.put('/:id/devolver', autenticar, exigirEmpresa, exigirAdmin, entregaController.registrarDevolucao);

// ADMIN: histórico de um funcionário específico (mesmo inativo)
router.get('/funcionario/:id', autenticar, exigirEmpresa, exigirAdmin, entregaController.historicoFuncionario);

// FUNCIONÁRIO: meus equipamentos
router.get('/meus', autenticar, exigirEmpresa, entregaController.meusEquipamentos);

// FUNCIONÁRIO: entregas aguardando confirmação de recebimento
router.get('/pendentes', autenticar, exigirEmpresa, entregaController.pendentesConfirmacao);

// FUNCIONÁRIO: confirma ou recusa o recebimento (só o próprio, validado no controller)
router.put('/:id/confirmar', autenticar, exigirEmpresa, entregaController.confirmarRecebimento);
router.put('/:id/recusar', autenticar, exigirEmpresa, entregaController.recusarRecebimento);

module.exports = router;