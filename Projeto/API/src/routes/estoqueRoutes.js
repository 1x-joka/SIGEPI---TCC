const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoqueController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

// Só o ADMIN abastece o estoque
router.post('/entrada', autenticar, exigirEmpresa, exigirAdmin, estoqueController.registrarEntrada);

// Admin e funcionário podem consultar o estoque da empresa
router.get('/listar', autenticar, exigirEmpresa, estoqueController.listarEstoque);

router.post('/saida', autenticar, exigirEmpresa, exigirAdmin, estoqueController.registrarSaida);

module.exports = router;