const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

router.get('/', autenticar, exigirEmpresa, exigirAdmin, logController.listarLog);
module.exports = router;