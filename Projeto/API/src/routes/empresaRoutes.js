const express = require('express');
const router  = express.Router();
const empresaController = require('../controllers/empresaController');
const { autenticar } = require('../middlewares/authMiddleware');

router.post('/cadastrar', autenticar, empresaController.cadastrarEmpresa);

module.exports = router;