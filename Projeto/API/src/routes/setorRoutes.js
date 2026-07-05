const express = require('express');
const router = express.Router();
const setorController = require('../controllers/setorController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

router.post('/cadastrar', autenticar, exigirEmpresa, setorController.cadastrarSetor);
router.get('/listar', autenticar, exigirEmpresa, setorController.listarSetores);

// ADMIN exclui um setor (com trava de funcionários)
router.delete('/:id', autenticar, exigirEmpresa, exigirAdmin, setorController.deletarSetor);

module.exports = router;