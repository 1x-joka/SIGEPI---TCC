const db = require('../config/db');

// Cadastrar um EPI vinculado à empresa do admin logado
async function cadastrarEpi(req, res) {
  const { nome, descricao, ca, categoria, validadeCa } = req.body;
  const empresa = req.usuario.empresa; // do middleware, nunca do cliente

  if (!nome) {
    return res.status(400).json({ erro: 'Informe o nome do EPI.' });
  }

  try {
    // Impede EPI duplicado (mesmo nome) dentro da mesma empresa
    const [existe] = await db.query(
      'SELECT id_epi FROM tb_epi WHERE nm_epi = ? AND tb_empresa_id_empresa = ?',
      [nome, empresa]
    );
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Já existe um EPI com esse nome nesta empresa.' });
    }

    // Se informou categoria, ela precisa existir (evita erro de FK)
    if (categoria) {
      const [cats] = await db.query(
        'SELECT id_categoria FROM tb_categoria WHERE id_categoria = ?',
        [categoria]
      );
      if (cats.length === 0) {
        return res.status(400).json({ erro: 'Categoria inválida.' });
      }
    }

    const [result] = await db.query(
      `INSERT INTO tb_epi
        (nm_epi, desc_epi, st_epi, dt_cadastro_epi, ca_epi, dt_validade_ca, tb_categoria_id_categoria, tb_empresa_id_empresa)
       VALUES (?, ?, 'A', CURDATE(), ?, ?, ?, ?)`,
      [nome, descricao || null, ca || null, validadeCa || null, categoria || null, empresa]
    );

    return res.status(201).json({
      mensagem: 'EPI cadastrado com sucesso.',
      id_epi: result.insertId,
      nm_epi: nome
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// Lista apenas os EPIs da empresa do usuário logado
async function listarEpis(req, res) {
  const empresa = req.usuario.empresa;

  try {
    const [epis] = await db.query(
      `SELECT id_epi, nm_epi, desc_epi, st_epi, ca_epi, tb_categoria_id_categoria
       FROM tb_epi WHERE tb_empresa_id_empresa = ? ORDER BY nm_epi`,
      [empresa]
    );

    return res.status(200).json(epis);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { cadastrarEpi, listarEpis };