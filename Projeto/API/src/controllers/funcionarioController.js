const db = require('../config/db');

// PASSO 1: funcionário entra na empresa usando o código único recebido do admin
async function entrarEmpresa(req, res) {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ erro: 'Informe o código da empresa.' });
  }

  // Se o usuário já tem empresa, não pode entrar em outra
  if (req.usuario.empresa) {
    return res.status(409).json({ erro: 'Você já está vinculado a uma empresa.' });
  }

  try {
    // Acha a empresa pelo código (fonte confiável: banco)
    const [empresas] = await db.query(
      'SELECT id_empresa FROM tb_empresa WHERE codigo_empresa = ?',
      [codigo]
    );
    if (empresas.length === 0) {
      return res.status(404).json({ erro: 'Código inválido: empresa não encontrada.' });
    }

    const id_empresa = empresas[0].id_empresa;

    // Vincula o usuário à empresa e o marca como Funcionário (tipo 2)
    await db.query(
      'UPDATE tb_usuario SET tb_empresa_id_empresa = ?, tb_tipousuario_id_tipousuario = 2 WHERE id_usuario = ?',
      [id_empresa, req.usuario.id]
    );

    return res.status(200).json({
      mensagem: 'Vinculado à empresa com sucesso.',
      id_empresa
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// PASSO 2: funcionário completa o próprio cadastro (cria a linha em tb_funcionario)
async function completarCadastro(req, res) {
  const { nome, sobrenome, dataNascimento, setor } = req.body;
  const empresa = req.usuario.empresa; // já garantida pelo middleware exigirEmpresa

  if (!nome || !sobrenome) {
    return res.status(400).json({ erro: 'Informe nome e sobrenome.' });
  }

  try {
    // Impede completar duas vezes (a FK tb_usuario_id_usuario é UNIQUE no banco)
    const [jaExiste] = await db.query(
      'SELECT id_funcionario FROM tb_funcionario WHERE tb_usuario_id_usuario = ?',
      [req.usuario.id]
    );
    if (jaExiste.length > 0) {
      return res.status(409).json({ erro: 'Cadastro de funcionário já concluído.' });
    }

    // Se informou setor, ele PRECISA pertencer à mesma empresa (segurança)
    if (setor) {
      const [setores] = await db.query(
        'SELECT id_setor FROM tb_setor WHERE id_setor = ? AND tb_empresa_id_empresa = ?',
        [setor, empresa]
      );
      if (setores.length === 0) {
        return res.status(400).json({ erro: 'Setor inválido para esta empresa.' });
      }
    }

    const [result] = await db.query(
      `INSERT INTO tb_funcionario
        (nm_funcionario, sobrenome_funcionario, dt_nascimento_funcionario, st_funcionario, dt_cadastro_funcionario, tb_empresa_id_empresa, tb_setor_id_setor, tb_usuario_id_usuario)
       VALUES (?, ?, ?, 'A', CURDATE(), ?, ?, ?)`,
      [nome, sobrenome, dataNascimento || null, empresa, setor || null, req.usuario.id]
    );

    return res.status(201).json({
      mensagem: 'Cadastro de funcionário concluído com sucesso.',
      id_funcionario: result.insertId
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// Lista os funcionários da empresa do usuário logado
async function listarFuncionarios(req, res) {
  const empresa = req.usuario.empresa;

  try {
    const [funcionarios] = await db.query(
      `SELECT f.id_funcionario, f.nm_funcionario, f.sobrenome_funcionario,
              f.st_funcionario, s.nm_setor
       FROM tb_funcionario f
       LEFT JOIN tb_setor s ON s.id_setor = f.tb_setor_id_setor
       WHERE f.tb_empresa_id_empresa = ?
       ORDER BY f.nm_funcionario`,
      [empresa]
    );

    return res.status(200).json(funcionarios);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { entrarEmpresa, completarCadastro, listarFuncionarios };