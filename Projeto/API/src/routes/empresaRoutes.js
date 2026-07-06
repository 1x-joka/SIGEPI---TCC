const express = require('express');
const router  = express.Router();
const empresaController = require('../controllers/empresaController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

router.post('/cadastrar', autenticar, empresaController.cadastrarEmpresa);

router.get('/', autenticar, exigirEmpresa, exigirAdmin, empresaController.obterEmpresa);
router.put('/', autenticar, exigirEmpresa, exigirAdmin, empresaController.atualizarEmpresa);

module.exports = router;