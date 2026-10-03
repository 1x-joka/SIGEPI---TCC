const db = require('../config/db');
const registrarLog = require('../utils/registrarLog');

// O controller não mexe no estoque. Ele insere em tb_entrega e para.
// A checagem st_entrega === 'D' evita "devolver duas vezes" (409).

// Registrar a entrega de um EPI a um funcionário — só admin
async function registrarEntrega(req, res) {
  const empresa = req.usuario.empresa;
  const admin = req.usuario.id;
  const funcionario = req.body.funcionario;

  // aceita o novo formato (itens: [{epi, quantidade}]) ou o antigo (epi único)
  let itens = req.body.itens;
  if (!Array.isArray(itens) || itens.length === 0) {
    if (req.body.epi) itens = [{ epi: req.body.epi, quantidade: req.body.quantidade || 1 }];
    else return res.status(400).json({ erro: 'Selecione ao menos um EPI.' });
  }
  if (!funcionario) {
    return res.status(400).json({ erro: 'Informe o funcionário.' });
  }

  const conexao = await db.getConnection();
  try {
    const [funcs] = await conexao.execute(
      'SELECT id_funcionario FROM tb_funcionario WHERE id_funcionario = ? AND tb_empresa_id_empresa = ? AND st_funcionario = "A"',
      [funcionario, empresa]
    );
    if (funcs.length === 0) {
      return res.status(400).json({ erro: 'Funcionário inválido ou inativo para esta empresa.' });
    }

    // Valida cada item: EPI da empresa + estoque suficiente para a quantidade pedida
    const validados = [];
    for (const item of itens) {
      const epi = parseInt(item.epi);
      const qtd = parseInt(item.quantidade);
      if (!epi || !qtd || qtd < 1) {
        return res.status(400).json({ erro: 'Quantidade inválida em um dos EPIs.' });
      }
      const [epis] = await conexao.execute(
        "SELECT nm_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ? AND st_epi = 'A'",
        [epi, empresa]
      );
      if (epis.length === 0) {
        return res.status(400).json({ erro: 'EPI inválido para esta empresa.' });
      }
      const [estoque] = await conexao.execute(
        'SELECT COALESCE(SUM(qtd_disponivel_estoque), 0) AS total FROM tb_estoque WHERE tb_epi_id_epi = ? AND tb_empresa_id_empresa = ?',
        [epi, empresa]
      );
      if (Number(estoque[0].total) < qtd) {
        return res.status(400).json({ erro: `Estoque insuficiente para "${epis[0].nm_epi}" (disponível: ${estoque[0].total}).` });
      }
      validados.push({ epi, qtd, nome: epis[0].nm_epi });
    }

    // Insere as entregas. O TRIGGER desconta a quantidade do estoque (FIFO).
    await conexao.beginTransaction();
    for (const v of validados) {
      await conexao.execute(
        `INSERT INTO tb_entrega
          (dt_entrega, quantidade, st_entrega, tb_funcionario_id_funcionario, tb_epi_id_epi, tb_usuario_id_usuario)
         VALUES (CURDATE(), ?, 'P', ?, ?, ?)`,
        [v.qtd, funcionario, v.epi, admin]
      );
      await registrarLog({
        empresa,
        tipo: 'ENTREGA',
        descricao: 'Entrega de EPI',
        equipamento: v.nome,
        quantidade: v.qtd,
        responsavel: admin
      });
    }
    await conexao.commit();
    return res.status(201).json({ mensagem: 'Entrega registrada com sucesso.' });
  }
  catch (err) {
    await conexao.rollback();
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
  finally {
    conexao.release();
  }
}

// Lista as entregas da empresa (com nome do funcionário e do EPI)
async function listarEntregas(req, res) {
  const empresa = req.usuario.empresa;

  try {
    const [entregas] = await db.execute(
      `SELECT e.id_entrega, e.dt_entrega, e.dt_devolucao, e.st_entrega,
              f.nm_funcionario, epi.nm_epi
       FROM tb_entrega e
       JOIN tb_funcionario f ON f.id_funcionario = e.tb_funcionario_id_funcionario
       JOIN tb_epi epi        ON epi.id_epi = e.tb_epi_id_epi
       WHERE f.tb_empresa_id_empresa = ?
       ORDER BY e.dt_entrega DESC`,
      [empresa]
    );

    return res.status(200).json(entregas);

  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

// Registra a DEVOLUÇÃO de um EPI (atualiza a entrega existente)
async function registrarDevolucao(req, res) {
  const id_entrega = req.params.id; // vem da URL, não do body
  const empresa = req.usuario.empresa;

  try {
    // Segurança: a entrega precisa existir, ser DESTA empresa e ainda estar ATIVA
    const [entregas] = await db.execute(
      `SELECT e.id_entrega, e.st_entrega
       FROM tb_entrega e
       JOIN tb_funcionario f ON f.id_funcionario = e.tb_funcionario_id_funcionario
       WHERE e.id_entrega = ? AND f.tb_empresa_id_empresa = ?`,
      [id_entrega, empresa]
    );

    if (entregas.length === 0) {
      return res.status(404).json({
        erro: 'Entrega não encontrada para esta empresa.'
      });
    }
    if (entregas[0].st_entrega === 'D') {
      return res.status(409).json({
        erro: 'Este EPI já foi devolvido.'
      });
    }

    // Atualiza: marca como devolvido e grava a data. (Opção A: NÃO repõe estoque.)
    await db.execute(
      `UPDATE tb_entrega
       SET st_entrega = 'D', dt_devolucao = CURDATE()
       WHERE id_entrega = ?`,
      [id_entrega]
    );

    await registrarLog({
      empresa,
      tipo: 'DEVOLUCAO',
      descricao: 'Devolução de EPI',
      responsavel: req.usuario.id
    });

    return res.status(200).json({
      mensagem: 'Devolução registrada com sucesso.'
    });

  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

// ADMIN: histórico de EPIs de um funcionário (funciona mesmo se ele estiver INATIVO — auditoria)
async function historicoFuncionario(req, res) {
  const id_funcionario = req.params.id;
  const empresa = req.usuario.empresa;

  try {
    // Funcionário precisa ser DESTA empresa. NÃO filtramos por status de propósito:
    // o histórico deve existir mesmo para quem foi inativado (é o valor da exclusão lógica).
    const [funcs] = await db.execute(
      `SELECT id_funcionario, nm_funcionario, st_funcionario
       FROM tb_funcionario WHERE id_funcionario = ? AND tb_empresa_id_empresa = ?`,
      [id_funcionario, empresa]
    );
    if (funcs.length === 0) {
      return res.status(404).json({
        erro: 'Funcionário não encontrado para esta empresa.'
      });
    }

    const [historico] = await db.execute(
       `SELECT e.id_entrega, e.dt_entrega, e.dt_confirmacao, e.dt_devolucao, e.motivo_recusa, e.st_entrega, epi.nm_epi
       FROM tb_entrega e
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       WHERE e.tb_funcionario_id_funcionario = ?
       ORDER BY e.dt_entrega DESC`,
      [id_funcionario]
    );

    return res.status(200).json({
      funcionario: funcs[0],
      historico
    });

  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

// FUNCIONÁRIO: vê os próprios equipamentos (tela "meus equipamentos")
async function meusEquipamentos(req, res) {
  const empresa = req.usuario.empresa;

  try {
    // Ponte usuário -> funcionário (só vê os próprios; admin cai fora aqui)
    const [funcs] = await db.execute(
      `SELECT id_funcionario FROM tb_funcionario
       WHERE tb_usuario_id_usuario = ? AND tb_empresa_id_empresa = ?`,
      [req.usuario.id, empresa]
    );
    if (funcs.length === 0) {
      return res.status(403).json({
        erro: 'Apenas funcionários possuem equipamentos.'
      });
    }
    const id_funcionario = funcs[0].id_funcionario;

    const [equipamentos] = await db.execute(
            `SELECT e.id_entrega, e.dt_entrega, e.dt_devolucao, e.st_entrega, epi.nm_epi, epi.id_epi, epi.dt_validade_ca
       FROM tb_entrega e
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       WHERE e.tb_funcionario_id_funcionario = ? AND e.st_entrega IN ('A','D')
       ORDER BY e.dt_entrega DESC`,
      [id_funcionario]
    );

    return res.status(200).json(equipamentos);

  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.', detalhe: err.message
    });
  }
}

// FUNCIONÁRIO: entregas aguardando a confirmação de recebimento
async function pendentesConfirmacao(req, res) {
  const empresa = req.usuario.empresa;

  try {
    const [funcs] = await db.execute(
      `SELECT id_funcionario FROM tb_funcionario
       WHERE tb_usuario_id_usuario = ? AND tb_empresa_id_empresa = ?`,
      [req.usuario.id, empresa]
    );
    if (funcs.length === 0) {
      return res.status(403).json({
        erro: 'Apenas funcionários possuem entregas.'
      });
    }

    const [pendentes] = await db.execute(
      `SELECT e.id_entrega, e.dt_entrega, epi.nm_epi, epi.tamanho_epi, u.nm_usuario AS entregue_por
       FROM tb_entrega e
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       JOIN tb_usuario u ON u.id_usuario = e.tb_usuario_id_usuario
       WHERE e.tb_funcionario_id_funcionario = ? AND e.st_entrega = 'P'
       ORDER BY e.dt_entrega DESC`,
      [funcs[0].id_funcionario]
    );

    return res.status(200).json(pendentes);

  } catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

// FUNCIONÁRIO: confirma que recebeu o EPI (evidência de recebimento — NR-6)
async function confirmarRecebimento(req, res) {
  const { id } = req.params;
  const empresa = req.usuario.empresa;

  try {
    // A entrega precisa ser DESTE funcionário e estar pendente (segurança)
    const [linhas] = await db.execute(
      `SELECT e.id_entrega, epi.nm_epi
       FROM tb_entrega e
       JOIN tb_funcionario f ON f.id_funcionario = e.tb_funcionario_id_funcionario
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       WHERE e.id_entrega = ? AND f.tb_usuario_id_usuario = ?
         AND f.tb_empresa_id_empresa = ? AND e.st_entrega = 'P'`,
      [id, req.usuario.id, empresa]
    );
    if (linhas.length === 0) {
      return res.status(404).json({
        erro: 'Entrega não encontrada ou já respondida.'
      });
    }

    await db.execute(
      `UPDATE tb_entrega SET st_entrega = 'A', dt_confirmacao = CURDATE() WHERE id_entrega = ?`,
      [id]
    );

    await registrarLog({
      empresa,
      tipo: 'ENTREGA_CONFIRMADA',
      descricao: 'Recebimento confirmado pelo funcionário',
      equipamento: linhas[0].nm_epi,
      quantidade: 1,
      responsavel: req.usuario.id
    });

    return res.status(200).json({
      mensagem: 'Recebimento confirmado com sucesso.'
    });

  } catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

// FUNCIONÁRIO: recusa o recebimento (o estoque NÃO volta — só com devolução física)
async function recusarRecebimento(req, res) {
  const { id } = req.params;
  const { motivo } = req.body;
  const empresa = req.usuario.empresa;

  if (!motivo || motivo.trim().length < 5) {
    return res.status(400).json({
      erro: 'Informe o motivo da recusa (mínimo 5 caracteres).'
    });
  }

  try {
    const [linhas] = await db.execute(
      `SELECT e.id_entrega, epi.nm_epi
       FROM tb_entrega e
       JOIN tb_funcionario f ON f.id_funcionario = e.tb_funcionario_id_funcionario
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       WHERE e.id_entrega = ? AND f.tb_usuario_id_usuario = ?
         AND f.tb_empresa_id_empresa = ? AND e.st_entrega = 'P'`,
      [id, req.usuario.id, empresa]
    );
    if (linhas.length === 0) {
      return res.status(404).json({
        erro: 'Entrega não encontrada ou já respondida.'
      });
    }

    await db.execute(
      `UPDATE tb_entrega SET st_entrega = 'R', motivo_recusa = ?, dt_confirmacao = CURDATE()
       WHERE id_entrega = ?`,
      [motivo.trim(), id]
    );

    await registrarLog({
      empresa,
      tipo: 'ENTREGA_RECUSADA',
      descricao: 'Recebimento recusado pelo funcionário',
      equipamento: linhas[0].nm_epi,
      quantidade: 1,
      motivo: motivo.trim(),
      responsavel: req.usuario.id
    });

    return res.status(200).json({
      mensagem: 'Recebimento recusado. O administrador será notificado.'
    });

  } catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

module.exports = { registrarEntrega, listarEntregas, registrarDevolucao, historicoFuncionario, meusEquipamentos, pendentesConfirmacao, confirmarRecebimento, recusarRecebimento };