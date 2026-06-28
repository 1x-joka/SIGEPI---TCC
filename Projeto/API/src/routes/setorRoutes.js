const express = require('express');
const router = express.Router();
const setorController = require('../controllers/setorController');
const { autenticar, exigirEmpresa } = require('../middlewares/authMiddleware');

router.post('/cadastrar', autenticar, exigirEmpresa, setorController.cadastrarSetor);
router.get('/listar', autenticar, exigirEmpresa, setorController.listarSetores);

module.exports = router;