const db = require('../config/db');
const registrarLog = require('../utils/registrarLog');

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

    // CA é único por empresa (Certificado de Aprovação não se repete)
    if (ca) {
      const [caExiste] = await db.query(
        'SELECT id_epi FROM tb_epi WHERE ca_epi = ? AND tb_empresa_id_empresa = ?',
        [ca, empresa]
      );
      if (caExiste.length > 0) {
        return res.status(409).json({ erro: 'Já existe um EPI com esse CA nesta empresa.' });
      }
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

    await registrarLog({ empresa, tipo: 'CADASTRO_EPI', descricao: 'Cadastro de EPI', equipamento: nome, responsavel: req.usuario.id });

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
      `SELECT epi.id_epi, epi.nm_epi, epi.ca_epi, epi.st_epi,
              COALESCE(SUM(es.qtd_disponivel_estoque), 0) AS quantidade,
              COALESCE(MAX(es.qtd_minima_estoque), 0) AS limite
       FROM tb_epi epi
       LEFT JOIN tb_estoque es ON es.tb_epi_id_epi = epi.id_epi
       WHERE epi.tb_empresa_id_empresa = ? AND epi.st_epi = 'A'
       GROUP BY epi.id_epi, epi.nm_epi, epi.ca_epi, epi.st_epi
       ORDER BY epi.nm_epi`,
      [empresa]
    );

    return res.status(200).json(epis);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

async function listarCategorias(req, res) {
  try {
    const [cats] = await db.query('SELECT id_categoria, nm_categoria FROM tb_categoria ORDER BY nm_categoria');
    return res.status(200).json(cats);
  } catch (err) { return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message }); }
}

function limparModalCadastrarEpi() {
  ['cad-nome','cad-desc','cad-ca','cad-validade','cad-qtd','cad-limite','cad-cat']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

async function inativarEpi(req, res) {
  const id_epi = req.params.id;
  const empresa = req.usuario.empresa;
  try {
    const [e] = await db.query('SELECT id_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ?', [id_epi, empresa]);
    if (e.length === 0) return res.status(404).json({ erro: 'EPI não encontrado.' });
    await db.query("UPDATE tb_epi SET st_epi = 'I' WHERE id_epi = ?", [id_epi]);
    return res.status(200).json({ mensagem: 'EPI inativado com sucesso.' });
  } catch (err) { return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message }); }
}

module.exports = { cadastrarEpi, listarEpis, limparModalCadastrarEpi, inativarEpi };