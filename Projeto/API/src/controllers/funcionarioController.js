const db = require('../config/db');
const registrarLog = require('../utils/registrarLog');

// PASSO 1: funcionário entra na empresa usando o código único recebido do admin
async function entrarEmpresa(req, res) {
  if (req.usuario.tipo !== 2) {
    return res.status(403).json({ erro: 'Apenas funcionários entram em empresa por código.' });
  }

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
    const [empresas] = await db.execute(
      'SELECT id_empresa FROM tb_empresa WHERE codigo_empresa = ?',
      [codigo]
    );
    if (empresas.length === 0) {
      return res.status(404).json({ erro: 'Código inválido: empresa não encontrada.' });
    }

    const id_empresa = empresas[0].id_empresa;

    // Vincula o usuário à empresa e o marca como Funcionário (tipo 2)
    await db.execute(
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
  const { dataNascimento, setor } = req.body;
  const empresa = req.usuario.empresa;

  if (!setor) {
    return res.status(400).json({ erro: 'Selecione um setor.' });
  }

  try {
    // Impede completar duas vezes
    const [jaExiste] = await db.execute(
      'SELECT id_funcionario FROM tb_funcionario WHERE tb_usuario_id_usuario = ?',
      [req.usuario.id]
    );
    if (jaExiste.length > 0) {
      return res.status(409).json({ erro: 'Cadastro de funcionário já concluído.' });
    }

    // O setor precisa ser da empresa do funcionário (isolamento)
    const [setores] = await db.execute(
      'SELECT id_setor FROM tb_setor WHERE id_setor = ? AND tb_empresa_id_empresa = ?',
      [setor, empresa]
    );
    if (setores.length === 0) {
      return res.status(400).json({ erro: 'Setor inválido para esta empresa.' });
    }

    // Tendo como obrigatório o funcionário ter, pelo menos, 18 anos

    if (dataNascimento) {
      const nasc = new Date(dataNascimento), hoje = new Date();
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
      if (idade < 18) return res.status(400).json({ erro: 'O funcionário deve ter no mínimo 18 anos.' });
    }

    // Nome vem da conta (nm_usuario), definido no cadastro
    const [usuarios] = await db.execute(
      'SELECT nm_usuario FROM tb_usuario WHERE id_usuario = ?',
      [req.usuario.id]
    );
    const nomeCompleto = usuarios[0].nm_usuario;

    const [result] = await db.execute(
      `INSERT INTO tb_funcionario
        (nm_funcionario, dt_nascimento_funcionario, st_funcionario, dt_cadastro_funcionario, tb_empresa_id_empresa, tb_setor_id_setor, tb_usuario_id_usuario)
       VALUES (?, ?, 'A', CURDATE(), ?, ?, ?)`,
      [nomeCompleto, dataNascimento || null, empresa, setor, req.usuario.id]
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
    const [funcionarios] = await db.execute(
      `SELECT f.id_funcionario, f.nm_funcionario, f.sobrenome_funcionario, f.st_funcionario,
              s.nm_setor, u.cpf_usuario,
              (SELECT COUNT(*) FROM tb_entrega e WHERE e.tb_funcionario_id_funcionario = f.id_funcionario AND e.st_entrega = 'A') AS total_epis
       FROM tb_funcionario f
       LEFT JOIN tb_setor s   ON s.id_setor = f.tb_setor_id_setor
       LEFT JOIN tb_usuario u ON u.id_usuario = f.tb_usuario_id_usuario
       WHERE f.tb_empresa_id_empresa = ?
       ORDER BY f.nm_funcionario`,
      [empresa]
    );

    return res.status(200).json(funcionarios);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// ADMIN inativa um funcionário (exclusão lógica) + bloqueia o acesso dele
async function inativarFuncionario(req, res) {
  const id_funcionario = req.params.id;   // da URL
  const { motivo } = req.body;
  const empresa = req.usuario.empresa;

  // NF12.2: motivo obrigatório
  if (!motivo) {
    return res.status(400).json({ erro: 'Informe o motivo da inativação.' });
  }

  const conexao = await db.getConnection();

  try {
    // Segurança: o funcionário precisa ser DESTA empresa e ainda estar ATIVO.
    // Traz também o id_usuario para bloquear o login.
    const [funcs] = await conexao.execute(
      `SELECT id_funcionario, st_funcionario, tb_usuario_id_usuario
       FROM tb_funcionario
       WHERE id_funcionario = ? AND tb_empresa_id_empresa = ?`,
      [id_funcionario, empresa]
    );

    if (funcs.length === 0) {
      conexao.release();
      return res.status(404).json({ erro: 'Funcionário não encontrado para esta empresa.' });
    }
    if (funcs[0].st_funcionario === 'I') {
      conexao.release();
      return res.status(409).json({ erro: 'Este funcionário já está inativo.' });
    }

    const id_usuario = funcs[0].tb_usuario_id_usuario;

    // ===== TRANSAÇÃO: as duas gravações são "tudo ou nada" =====
    await conexao.beginTransaction();

    // 1) Exclusão lógica do funcionário (guarda motivo e data)
    // data_inativacao = CURDATE():  o "quando" fica registrado, junto com o "por quê" (motivo). Isso é a auditoria que o NF12.1 pede.

    await conexao.execute(
      `UPDATE tb_funcionario
       SET st_funcionario = 'I', motivo_inativacao_funcionario = ?, data_inativacao = CURDATE()
       WHERE id_funcionario = ?`,
      [motivo, id_funcionario]
    );

    // 2) Bloqueia o acesso: usuário vinculado vira inativo (NF12.1)
    if (id_usuario) {
      await conexao.execute(
        `UPDATE tb_usuario SET st_usuario = 'I' WHERE id_usuario = ?`,
        [id_usuario]
      );
    }

    await conexao.commit();

    const [dadosFunc] = await db.execute(
      `SELECT f.nm_funcionario, u.cpf_usuario FROM tb_funcionario f
       LEFT JOIN tb_usuario u ON u.id_usuario = f.tb_usuario_id_usuario
       WHERE f.id_funcionario = ?`, [id_funcionario]
    );
    const alvo = dadosFunc[0] ? `${dadosFunc[0].nm_funcionario} (CPF: ${dadosFunc[0].cpf_usuario || '—'})` : null;
    await registrarLog({ empresa, tipo: 'INATIVACAO_FUNC', descricao: 'Inativação de funcionário', equipamento: alvo, motivo: motivo, responsavel: req.usuario.id });

    return res.status(200).json({ mensagem: 'Funcionário inativado com sucesso.' });

  } catch (err) {
    await conexao.rollback();
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });

  } finally {
    conexao.release();
  }
}

// ADMIN edita um funcionário (nome e setor) — setor pode ficar vazio (desvincula)
async function editarFuncionario(req, res) {
  const id_funcionario = req.params.id;
  const { nome, setor } = req.body;
  const empresa = req.usuario.empresa;

  if (!nome) {
    return res.status(400).json({ erro: 'Informe o nome' });
  }

  try {
    // O funcionário precisa ser desta empresa (isolamento)
    const [funcs] = await db.execute(
      "SELECT id_funcionario FROM tb_funcionario WHERE id_funcionario = ? AND tb_empresa_id_empresa = ? AND st_funcionario = 'A'",
      [id_funcionario, empresa]
    );
    if (funcs.length === 0) {
      return res.status(404).json({ erro: 'Funcionário não encontrado ou inativo.' });
    }

    // Se informou setor, ele precisa ser desta empresa. Vazio = desvincular (null).
    if (setor) {
      const [setores] = await db.execute(
        'SELECT id_setor FROM tb_setor WHERE id_setor = ? AND tb_empresa_id_empresa = ?',
        [setor, empresa]
      );
      if (setores.length === 0) {
        return res.status(400).json({ erro: 'Setor inválido para esta empresa.' });
      }
    }

    await db.execute(
      'UPDATE tb_funcionario SET nm_funcionario = ?, tb_setor_id_setor = ? WHERE id_funcionario = ?',
      [nome, setor || null, id_funcionario]
    );

    const [dadosFunc] = await db.execute(
      `SELECT f.nm_funcionario, u.cpf_usuario FROM tb_funcionario f
       LEFT JOIN tb_usuario u ON u.id_usuario = f.tb_usuario_id_usuario
       WHERE f.id_funcionario = ?`, [id_funcionario]
    );
    const alvo = dadosFunc[0] ? `${dadosFunc[0].nm_funcionario} (CPF: ${dadosFunc[0].cpf_usuario || '—'})` : null;
    await registrarLog({ empresa, tipo: 'EDICAO_FUNC', descricao: 'Edição de funcionário', equipamento: alvo, responsavel: req.usuario.id });

    return res.status(200).json({ mensagem: 'Funcionário atualizado com sucesso.' });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { entrarEmpresa, completarCadastro, listarFuncionarios, inativarFuncionario, editarFuncionario };