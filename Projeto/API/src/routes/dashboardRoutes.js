const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

// Painel gerencial — só admin
router.get('/', autenticar, exigirEmpresa, exigirAdmin, dashboardController.obterDashboard);

module.exports = router;