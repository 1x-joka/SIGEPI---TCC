const express = require('express');
const router = express.Router();
const epiController = require('../controllers/epiController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

// Só o ADMIN cadastra EPI
router.post('/cadastrar', autenticar, exigirEmpresa, exigirAdmin, epiController.cadastrarEpi);

// Admin E funcionário podem listar os EPIs da empresa (o funcionário precisa ver o que pode solicitar)
router.get('/listar', autenticar, exigirEmpresa, epiController.listarEpis);

router.put('/:id/inativar', autenticar, exigirEmpresa, exigirAdmin, epiController.inativarEpi);

// Só o ADMIN edita EPI
router.put('/:id', autenticar, exigirEmpresa, exigirAdmin, epiController.editarEpi);

router.get('/categorias', autenticar, exigirEmpresa, epiController.listarCategorias);

module.exports = router;

// Busca UM EPI completo (para editar) — precisa ficar DEPOIS das rotas GET específicas
router.get('/:id', autenticar, exigirEmpresa, exigirAdmin, epiController.obterEpi);