const express = require('express');
const router = express.Router();
const entregaController = require('../controllers/entregaController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

// Só o ADMIN registra entregas
router.post('/registrar', autenticar, exigirEmpresa, exigirAdmin, entregaController.registrarEntrega);

module.exports = router;