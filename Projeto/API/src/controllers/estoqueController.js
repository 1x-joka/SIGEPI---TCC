const db = require('../config/db');
const registrarLog = require('../utils/registrarLog');

// Registrar ENTRADA de estoque (um lote novo) — só admin
async function registrarEntrada(req, res) {
  const { epi, quantidade, validade, quantidadeMinima } = req.body;
  const empresa = req.usuario.empresa; // do token, nunca do cliente

  // Validação básica
  if (!epi || !quantidade) {
    return res.status(400).json({ erro: 'Informe o EPI e a quantidade.' });
  }
  if (quantidade <= 0) {
    return res.status(400).json({ erro: 'A quantidade deve ser maior que zero.' });
  }

  // Pega UMA conexão do pool para a transação (todas as queries usam ela)
  const conexao = await db.getConnection();

  try {
    // Segurança: o EPI precisa pertencer À MESMA empresa do admin logado
    const [epis] = await conexao.query(
      'SELECT id_epi, nm_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ?',
      [epi, empresa]
    );
    if (epis.length === 0) {
      conexao.release();
      return res.status(400).json({ erro: 'EPI inválido para esta empresa.' });
    }

    // ===== INÍCIO DA TRANSAÇÃO =====
    await conexao.beginTransaction();

    // 1) Cria o LOTE em tb_estoque (Opção A: cada entrada é uma linha nova)
    const [resultEstoque] = await conexao.query(
      `INSERT INTO tb_estoque
        (qtd_disponivel_estoque, qtd_minima_estoque, dt_validade_estoque, tb_empresa_id_empresa, tb_epi_id_epi)
       VALUES (?, ?, ?, ?, ?)`,
      [quantidade, quantidadeMinima || null, validade || null, empresa, epi]
    );
    const id_estoque = resultEstoque.insertId;

    // 2) Registra a MOVIMENTAÇÃO (histórico da entrada)
    await conexao.query(
      `INSERT INTO tb_movimentacao
        (tipo_movimentacao, qtd_movimentacao, dt_movimentacao, desc_movimentacao, tb_estoque_id_estoque)
       VALUES ('E', ?, CURDATE(), ?, ?)`,
      [quantidade, 'Entrada de estoque', id_estoque]
    );

    await registrarLog({ empresa, tipo: 'ENTRADA_ESTOQUE', descricao: 'Entrada de estoque', equipamento: epis[0].nm_epi, quantidade, responsavel: req.usuario.id });

    // Se chegou aqui, as DUAS deram certo → grava de verdade
    await conexao.commit();

    return res.status(201).json({
      mensagem: 'Entrada de estoque registrada com sucesso.',
      id_estoque
    });

  } catch (err) {
    // Qualquer erro no meio → desfaz TUDO (nem estoque, nem movimentação ficam)
    await conexao.rollback();
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });

  } finally {
    // Aconteça o que acontecer, devolve a conexão ao pool
    conexao.release();
  }
}

// Lista o estoque (todos os lotes) da empresa do usuário logado
async function listarEstoque(req, res) {
  const empresa = req.usuario.empresa;

  try {
    const [estoque] = await db.query(
      `SELECT e.id_estoque, e.qtd_disponivel_estoque, e.qtd_minima_estoque,
              e.dt_validade_estoque, epi.nm_epi
       FROM tb_estoque e
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       WHERE e.tb_empresa_id_empresa = ?
       ORDER BY epi.nm_epi, e.dt_validade_estoque`,
      [empresa]
    );

    return res.status(200).json(estoque);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// Registrar SAÍDA de estoque (baixa manual) — só admin
async function registrarSaida(req, res) {
  const { epi, quantidade, motivo } = req.body;
  const empresa = req.usuario.empresa;

  if (!epi || !quantidade || quantidade <= 0) {
    return res.status(400).json({ erro: 'Informe o EPI e uma quantidade válida.' });
  }

  const conexao = await db.getConnection();
  try {
    // Estoque total disponível deste EPI (soma dos lotes) — fonte confiável
    const [tot] = await conexao.query(
      `SELECT COALESCE(SUM(qtd_disponivel_estoque),0) AS total
       FROM tb_estoque WHERE tb_epi_id_epi = ? AND tb_empresa_id_empresa = ?`,
      [epi, empresa]
    );
    if (tot[0].total < quantidade) {
      conexao.release();
      return res.status(400).json({ erro: 'Quantidade superior ao estoque disponível.' });
    }

    await conexao.beginTransaction();

    // Baixa FIFO: retira dos lotes mais antigos (validade mais próxima) primeiro
    let restante = quantidade;
    const [lotes] = await conexao.query(
      `SELECT id_estoque, qtd_disponivel_estoque
       FROM tb_estoque
       WHERE tb_epi_id_epi = ? AND tb_empresa_id_empresa = ? AND qtd_disponivel_estoque > 0
       ORDER BY dt_validade_estoque ASC`,
      [epi, empresa]
    );

    for (const lote of lotes) {
      if (restante <= 0) break;
      const baixa = Math.min(lote.qtd_disponivel_estoque, restante);
      await conexao.query(
        'UPDATE tb_estoque SET qtd_disponivel_estoque = qtd_disponivel_estoque - ? WHERE id_estoque = ?',
        [baixa, lote.id_estoque]
      );
      await conexao.query(
        `INSERT INTO tb_movimentacao
          (tipo_movimentacao, qtd_movimentacao, dt_movimentacao, desc_movimentacao, tb_estoque_id_estoque)
         VALUES ('S', ?, CURDATE(), ?, ?)`,
        [baixa, motivo || 'Saída de estoque', lote.id_estoque]
      );
      restante -= baixa;
    }

    const [epiNome] = await db.query('SELECT nm_epi FROM tb_epi WHERE id_epi = ?', [epi]);

    await registrarLog({ empresa, tipo: 'SAIDA_ESTOQUE', descricao: 'Retirada de estoque', equipamento: epiNome[0]?.nm_epi || null, quantidade, motivo: motivo || null, responsavel: req.usuario.id });

    await conexao.commit();
    return res.status(200).json({ mensagem: 'Saída de estoque registrada com sucesso.' });

  } catch (err) {
    await conexao.rollback();
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  } finally {
    conexao.release();
  }
}

module.exports = { registrarEntrada, listarEstoque, registrarSaida };