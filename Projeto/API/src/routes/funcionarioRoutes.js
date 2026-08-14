const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionarioController');
const { autenticar, exigirEmpresa, exigirAdmin } = require('../middlewares/authMiddleware');

// Passo 1: entrar na empresa com o código — só exige estar logado (ainda não tem empresa)
router.post('/entrar', autenticar, funcionarioController.entrarEmpresa);

// Passo 2: completar cadastro — exige já estar vinculado a uma empresa
router.post('/completar', autenticar, exigirEmpresa, funcionarioController.completarCadastro);

// Listando todos os funcionários cadastrados na empresa
router.get('/listar', autenticar, exigirEmpresa, exigirAdmin, funcionarioController.listarFuncionarios);

// ADMIN inativa um funcionário (exclusão lógica)
router.put('/:id/inativar', autenticar, exigirEmpresa, exigirAdmin, funcionarioController.inativarFuncionario);

// ADMIN reativa um funcionário
router.put('/:id/ativar', autenticar, exigirEmpresa, exigirAdmin, funcionarioController.ativarFuncionario);

// ADMIN edita um funcionário
router.put('/:id', autenticar, exigirEmpresa, exigirAdmin, funcionarioController.editarFuncionario);

module.exports = router;