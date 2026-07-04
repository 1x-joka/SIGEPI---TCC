const express = require('express');
const router = express.Router();
const epiController = require('../controllers/epiController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

// Só o ADMIN cadastra EPI
router.post('/cadastrar', autenticar, exigirEmpresa, exigirAdmin, epiController.cadastrarEpi);

// Admin E funcionário podem listar os EPIs da empresa (o funcionário precisa ver o que pode solicitar)
router.get('/listar', autenticar, exigirEmpresa, epiController.listarEpis);

module.exports = router;