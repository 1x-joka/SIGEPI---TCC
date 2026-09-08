const db = require('../config/db');
const registrarLog = require('../utils/registrarLog');

// normaliza para casar categoria mesmo sem acento / com maiúsculas diferentes
const normalizarTexto = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// Cadastrar um EPI vinculado à empresa do admin logado
async function cadastrarEpi(req, res) {
  const { nome, tamanho, descricao, ca, categoria, validadeCa, quantidade, quantidadeMinima, validade, setores } = req.body;
  const empresa = req.usuario.empresa;
  if (!nome) return res.status(400).json({
    erro: 'Informe o nome do EPI.'
  });

  const conexao = await db.getConnection(); // Ligando ao banco de dados de fato
  try {
   const [existe] = await conexao.execute("SELECT id_epi FROM tb_epi WHERE nm_epi = ? AND (tamanho_epi <=> ?) AND tb_empresa_id_empresa = ? AND st_epi = 'A'", [nome, tamanho || null, empresa]);
    if (existe.length > 0) {
      conexao.release();
      return res.status(409).json({
        erro: 'Já existe um EPI com esse nome e tamanho nesta empresa.'
      });
    }
    if (ca) {
      const [caEx] = await conexao.execute("SELECT id_epi FROM tb_epi WHERE ca_epi = ? AND (tamanho_epi <=> ?) AND tb_empresa_id_empresa = ? AND st_epi = 'A'", [ca, tamanho || null, empresa]);
      if (caEx.length > 0) {
        conexao.release(); return res.status(409).json({
          erro: 'Já existe um EPI com esse CA e tamanho nesta empresa.'
        });
      }
    }
    if (categoria) {
      const [cats] = await conexao.execute('SELECT id_categoria FROM tb_categoria WHERE id_categoria = ?', [categoria]);
      if (cats.length === 0) {
        conexao.release(); return res.status(400).json({
          erro: 'Categoria inválida.'
        });
      }
    }

    await conexao.beginTransaction();
    const [result] = await conexao.execute(
      `INSERT INTO tb_epi (nm_epi, tamanho_epi, desc_epi, st_epi, dt_cadastro_epi, ca_epi, dt_validade_ca, tb_categoria_id_categoria, tb_empresa_id_empresa)
       VALUES (?, ?, ?, 'A', CURDATE(), ?, ?, ?, ?)`,
      [nome, tamanho || null, descricao || null, ca || null, validadeCa || null, categoria || null, empresa]
    );
    const id_epi = result.insertId;
    await conexao.execute(
      `INSERT INTO tb_estoque (qtd_disponivel_estoque, qtd_minima_estoque, dt_validade_estoque, tb_empresa_id_empresa, tb_epi_id_epi)
       VALUES (?, ?, ?, ?, ?)`,
      [quantidade || 0, quantidadeMinima || 0, validade || null, empresa, id_epi]
    );

    // Vincula o EPI aos setores marcados (N:N)
    if (Array.isArray(setores) && setores.length > 0) {
      for (const idSetor of setores) {
        // segurança: o setor tem que ser DESTA empresa
        const [s] = await conexao.execute(
          'SELECT id_setor FROM tb_setor WHERE id_setor = ? AND tb_empresa_id_empresa = ?',
          [idSetor, empresa]
        );
        if (s.length > 0) {
          await conexao.execute(
            'INSERT INTO tb_epi_setor (tb_epi_id_epi, tb_setor_id_setor) VALUES (?, ?)',
            [id_epi, idSetor]
          );
        }
      }
    }

    await conexao.commit();

    await registrarLog({
      empresa, tipo: 'CADASTRO_EPI',
      descricao: 'Cadastro de EPI',
      equipamento: nome,
      quantidade: quantidade || 0,
      responsavel: req.usuario.id
    });
    return res.status(201).json({
      mensagem: 'EPI cadastrado com sucesso.',
      id_epi
    });
  }
  catch (err) {
    await conexao.rollback();
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
  finally { conexao.release(); }
}

// Lista apenas os EPIs da empresa do usuário logado
async function listarEpis(req, res) {
  const empresa = req.usuario.empresa;

  try {
    // Se for FUNCIONÁRIO (tipo 2), mostra só os EPIs vinculados ao SETOR dele
    if (req.usuario.tipo === 2) {
      const [epis] = await db.execute(
        `SELECT epi.id_epi, epi.nm_epi, epi.tamanho_epi, epi.ca_epi, epi.st_epi, epi.dt_validade_ca,
                COALESCE(SUM(es.qtd_disponivel_estoque), 0) AS quantidade,
                COALESCE(MAX(es.qtd_minima_estoque), 0) AS limite
         FROM tb_epi epi
         JOIN tb_epi_setor eps ON eps.tb_epi_id_epi = epi.id_epi
         JOIN tb_funcionario f ON f.tb_setor_id_setor = eps.tb_setor_id_setor
         LEFT JOIN tb_estoque es ON es.tb_epi_id_epi = epi.id_epi
         WHERE epi.tb_empresa_id_empresa = ? AND epi.st_epi = 'A'
           AND f.tb_usuario_id_usuario = ?
         GROUP BY epi.id_epi, epi.nm_epi, epi.tamanho_epi, epi.ca_epi, epi.st_epi, epi.dt_validade_ca
         ORDER BY epi.nm_epi`,
        [empresa, req.usuario.id]
      );
      return res.status(200).json(epis);
    }

    // ADMIN vê todos os EPIs ativos da empresa
    const [epis] = await db.execute(
      `SELECT epi.id_epi, epi.nm_epi, epi.tamanho_epi, epi.ca_epi, epi.st_epi, epi.dt_validade_ca,
              COALESCE(SUM(es.qtd_disponivel_estoque), 0) AS quantidade,
              COALESCE(MAX(es.qtd_minima_estoque), 0) AS limite
       FROM tb_epi epi
       LEFT JOIN tb_estoque es ON es.tb_epi_id_epi = epi.id_epi
       WHERE epi.tb_empresa_id_empresa = ? AND epi.st_epi = 'A'
       GROUP BY epi.id_epi, epi.nm_epi, epi.tamanho_epi, epi.ca_epi, epi.st_epi, epi.dt_validade_ca
       ORDER BY epi.nm_epi`,
      [empresa]
    );
    return res.status(200).json(epis);
  }

  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.', detalhe: err.message
    });
  }
}

async function listarCategorias(req, res) {
  try {
    const [cats] = await db.execute('SELECT id_categoria, nm_categoria FROM tb_categoria ORDER BY nm_categoria');
    return res.status(200).json(cats);
  }
  catch (err){
    return res.status(500).json({
      erro: 'Erro interno.', detalhe: err.message
    });
  }
}

function limparModalCadastrarEpi() {
  ['cad-nome','cad-desc','cad-ca','cad-validade','cad-qtd','cad-limite','cad-cat']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

async function inativarEpi(req, res) {
  const id_epi = req.params.id;
  const empresa = req.usuario.empresa;
  try {
    const [epis] = await db.execute(
      'SELECT id_epi, nm_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ?',
      [id_epi, empresa]
    );
    if (epis.length === 0) return res.status(404).json({
      erro: 'EPI não encontrado.'
    });

    await db.execute("UPDATE tb_epi SET st_epi = 'I' WHERE id_epi = ?", [id_epi]);
    await registrarLog({ empresa, tipo: 'INATIVACAO_EPI', descricao: 'Inativação de EPI', equipamento: epis[0].nm_epi, responsavel: req.usuario.id });
    return res.status(200).json({ mensagem: 'EPI inativado com sucesso.' });
  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.', detalhe: err.message
    });
  }
}

// ADMIN edita os dados de um EPI (não altera o estoque, que tem fluxo próprio de entrada/saída)
async function editarEpi(req, res) {
  const id_epi = req.params.id;
  const { nome, tamanho, descricao, ca, categoria, validadeCa, setores } = req.body;
  const empresa = req.usuario.empresa;

  if (!nome) return res.status(400).json({
    erro: 'Informe o nome do EPI.'
  });

  const conexao = await db.getConnection();
  try {
    // Segurança: o EPI precisa ser DESTA empresa e estar ativo
    const [epis] = await conexao.execute(
      "SELECT id_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ? AND st_epi = 'A'",
      [id_epi, empresa]
    );
    if (epis.length === 0) {
      return res.status(404).json({
        erro: 'EPI não encontrado para esta empresa.'
      });
    }

    // Unicidade nome+tamanho, excluindo o PRÓPRIO EPI
    const [existe] = await conexao.execute(
      "SELECT id_epi FROM tb_epi WHERE nm_epi = ? AND (tamanho_epi <=> ?) AND tb_empresa_id_empresa = ? AND st_epi = 'A' AND id_epi != ?",
      [nome, tamanho || null, empresa, id_epi]
    );
    if (existe.length > 0) {
      return res.status(409).json({
        erro: 'Já existe um EPI com esse nome e tamanho nesta empresa.'
      });
    }

    // Unicidade CA+tamanho, também excluindo o próprio
    if (ca) {
      const [caEx] = await conexao.execute(
        "SELECT id_epi FROM tb_epi WHERE ca_epi = ? AND (tamanho_epi <=> ?) AND tb_empresa_id_empresa = ? AND st_epi = 'A' AND id_epi != ?",
        [ca, tamanho || null, empresa, id_epi]
      );
      if (caEx.length > 0) {
        return res.status(409).json({
          erro: 'Já existe um EPI com esse CA e tamanho nesta empresa.'
        });
      }
    }

    if (categoria) {
      const [cats] = await conexao.execute('SELECT id_categoria FROM tb_categoria WHERE id_categoria = ?', [categoria]);
      if (cats.length === 0) {
        return res.status(400).json({
          erro: 'Categoria inválida.'
        });
      }
    }

    await conexao.beginTransaction();
    await conexao.execute(
      `UPDATE tb_epi
       SET nm_epi = ?, tamanho_epi = ?, desc_epi = ?, ca_epi = ?, dt_validade_ca = ?, tb_categoria_id_categoria = ?
       WHERE id_epi = ?`,
      [nome, tamanho || null, descricao || null, ca || null, validadeCa || null, categoria || null, id_epi]
    );

    // Atualiza os setores vinculados (N:N): remove os antigos e insere os novos
    await conexao.execute('DELETE FROM tb_epi_setor WHERE tb_epi_id_epi = ?', [id_epi]);
    if (Array.isArray(setores) && setores.length > 0) {
      for (const idSetor of setores) {
        const [s] = await conexao.execute(
          'SELECT id_setor FROM tb_setor WHERE id_setor = ? AND tb_empresa_id_empresa = ?',
          [idSetor, empresa]
        );
        if (s.length > 0) {
          await conexao.execute(
            'INSERT INTO tb_epi_setor (tb_epi_id_epi, tb_setor_id_setor) VALUES (?, ?)',
            [id_epi, idSetor]
          );
        }
      }
    }

    await conexao.commit();

    await registrarLog({
      empresa, tipo: 'EDICAO_EPI',
      descricao: 'Edição de EPI',
      equipamento: nome,
      responsavel: req.usuario.id
    });
    return res.status(200).json({
      mensagem: 'EPI atualizado com sucesso.'
    });
  }
  catch (err) {
    await conexao.rollback();
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
  finally { conexao.release(); }
}

// Retorna UM EPI completo (com setores vinculados) para preencher o formulário de edição
async function obterEpi(req, res) {
  const id_epi = req.params.id;
  const empresa = req.usuario.empresa;
  try {
    const [epis] = await db.execute(
      `SELECT id_epi, nm_epi, tamanho_epi, desc_epi, ca_epi,
              DATE_FORMAT(dt_validade_ca, '%Y-%m-%d') AS dt_validade_ca,
              tb_categoria_id_categoria
       FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ? AND st_epi = 'A'`,
      [id_epi, empresa]
    );
    if (epis.length === 0) {
      return res.status(404).json({
        erro: 'EPI não encontrado para esta empresa.'
      });
    }
    const [setores] = await db.execute(
      'SELECT tb_setor_id_setor FROM tb_epi_setor WHERE tb_epi_id_epi = ?',
      [id_epi]
    );
    const epi = epis[0];
    epi.setores = setores.map(s => s.tb_setor_id_setor);
    return res.status(200).json(epi);
  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.', detalhe: err.message
    });
  }
}

// ADMIN importa vários EPIs de uma vez a partir das linhas de uma planilha
async function importarEpisCsv(req, res) {
  const { linhas } = req.body;
  const empresa = req.usuario.empresa;

  if (!Array.isArray(linhas) || linhas.length === 0) {
    return res.status(400).json({
      erro: 'Nenhuma linha para importar.'
    });
  }

  const conexao = await db.getConnection();
  const erros = [];
  let importados = 0;

  try {
    // Carrega as categorias da NR-6 uma vez, mapeadas por nome normalizado
    const [cats] = await conexao.execute('SELECT id_categoria, nm_categoria FROM tb_categoria');
    const mapaCategoria = {};
    cats.forEach(c => { mapaCategoria[normalizarTexto(c.nm_categoria)] = c.id_categoria; });

    await conexao.beginTransaction();

    for (let i = 0; i < linhas.length; i++) {
      const numeroLinha = i + 2; // +2: a linha 1 da planilha é o cabeçalho
      const l = linhas[i] || {};

      const nome = (l.nome || '').trim();
      const tamanho = (l.tamanho || '').trim();
      const ca = (l.ca || '').toString().trim();
      const validade = (l.validade || '').trim();
      const quantidade = parseInt(l.quantidade);

      // --- validações da linha (mesmas regras do cadastro individual) ---
      if (!nome) { erros.push({ linha: numeroLinha, erro: 'Nome do EPI vazio.' }); continue; }
      if (!tamanho) { erros.push({ linha: numeroLinha, erro: 'Tamanho vazio.' }); continue; }
      if (!ca) { erros.push({ linha: numeroLinha, erro: 'CA vazio.' }); continue; }
      if (!validade || !/^\d{4}-\d{2}-\d{2}$/.test(validade)) {
        erros.push({ linha: numeroLinha, erro: 'Validade inválida (use o formato AAAA-MM-DD).' });
        continue;
      }
      const idCategoria = mapaCategoria[normalizarTexto(l.categoria)];
      if (!idCategoria) {
        erros.push({ linha: numeroLinha, erro: `Categoria "${(l.categoria || '').trim()}" não existe na NR-6.` });
        continue;
      }
      if (isNaN(quantidade) || quantidade < 0) {
        erros.push({ linha: numeroLinha, erro: 'Quantidade inválida.' });
        continue;
      }

      // --- unicidade (inclusive contra linhas já inseridas neste mesmo lote) ---
      const [dupNome] = await conexao.execute(
        "SELECT id_epi FROM tb_epi WHERE nm_epi = ? AND (tamanho_epi <=> ?) AND tb_empresa_id_empresa = ? AND st_epi = 'A'",
        [nome, tamanho, empresa]
      );
      if (dupNome.length > 0) { erros.push({ linha: numeroLinha, erro: 'Já existe EPI com esse nome e tamanho.' }); continue; }

      const [dupCa] = await conexao.execute(
        "SELECT id_epi FROM tb_epi WHERE ca_epi = ? AND (tamanho_epi <=> ?) AND tb_empresa_id_empresa = ? AND st_epi = 'A'",
        [ca, tamanho, empresa]
      );
      if (dupCa.length > 0) { erros.push({ linha: numeroLinha, erro: 'Já existe EPI com esse CA e tamanho.' }); continue; }

      // --- insere EPI + a linha de estoque com a quantidade ---
      const [rEpi] = await conexao.execute(
        `INSERT INTO tb_epi (nm_epi, tamanho_epi, st_epi, dt_cadastro_epi, ca_epi, dt_validade_ca, tb_categoria_id_categoria, tb_empresa_id_empresa)
         VALUES (?, ?, 'A', CURDATE(), ?, ?, ?, ?)`,
        [nome, tamanho, ca, validade, idCategoria, empresa]
      );
      await conexao.execute(
        `INSERT INTO tb_estoque (qtd_disponivel_estoque, tb_empresa_id_empresa, tb_epi_id_epi)
         VALUES (?, ?, ?)`,
        [quantidade, empresa, rEpi.insertId]
      );
      importados++;
    }

    await conexao.commit();

    await registrarLog({
      empresa, tipo: 'CADASTRO_EPI',
      descricao: `Importação de EPIs em lote (${importados} adicionados)`,
      responsavel: req.usuario.id
    });

    return res.status(200).json({
      total: linhas.length,
      importados,
      erros
    });
  }
  catch (err) {
    await conexao.rollback();
    return res.status(500).json({
      erro: 'Erro interno na importação.',
      detalhe: err.message
    });
  }
  finally {
    conexao.release();
  }
}

module.exports = { cadastrarEpi, listarEpis, limparModalCadastrarEpi, inativarEpi, listarCategorias, editarEpi, obterEpi, importarEpisCsv };