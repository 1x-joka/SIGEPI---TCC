const db = require('../config/db');
const registrarLog = require('../utils/registrarLog');

// O controller não mexe no estoque. Ele insere em tb_entrega e para.
// A checagem st_entrega === 'D' evita "devolver duas vezes" (409).

// Registrar a entrega de um EPI a um funcionário — só admin
async function registrarEntrega(req, res) {
  const { funcionario, epi } = req.body;
  const empresa = req.usuario.empresa;
  const admin = req.usuario.id; // quem entregou fica registrado (auditoria). Vem do token, confiável.

  if (!funcionario || !epi) {
    return res.status(400).json({ erro: 'Informe o funcionário e o EPI.' });
  }

  try {
    // 1) O funcionário precisa ser DESTA empresa (segurança/isolamento)
    const [funcs] = await db.execute(
      'SELECT id_funcionario FROM tb_funcionario WHERE id_funcionario = ? AND tb_empresa_id_empresa = ? AND st_funcionario = "A"',
      [funcionario, empresa]
    );
    if (funcs.length === 0) {
      return res.status(400).json({ erro: 'Funcionário inválido ou inativo para esta empresa.' });
    }

    // 2) O EPI precisa ser DESTA empresa
    const [epis] = await db.execute(
      'SELECT id_epi, nm_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ?',
      [epi, empresa]
    );
    if (epis.length === 0) {
      return res.status(400).json({ erro: 'EPI inválido para esta empresa.' });
    }

    // 3) VERIFICAÇÃO DE ESTOQUE: existe algum lote com quantidade disponível?
    // A verificação usa SUM(...). Como cada entrada é um lote (linha) separado, um EPI pode ter vários lotes. O SUM soma a quantidade de todos os lotes daquele EPI para saber o total disponível. Se o total for < 1, recusa.
    const [estoque] = await db.execute(
      `SELECT SUM(qtd_disponivel_estoque) AS total
       FROM tb_estoque
       WHERE tb_epi_id_epi = ? AND tb_empresa_id_empresa = ?`,
      [epi, empresa]
    );
    const totalDisponivel = estoque[0].total || 0;
    if (totalDisponivel < 1) {
      return res.status(400).json({ erro: 'Sem estoque disponível para este EPI.' });
    }

    // 4) Registra a entrega. O TRIGGER desconta 1 do estoque (FIFO) automaticamente.
    const [result] = await db.execute(
      `INSERT INTO tb_entrega
        (dt_entrega, st_entrega, tb_funcionario_id_funcionario, tb_epi_id_epi, tb_usuario_id_usuario)
       VALUES (CURDATE(), 'P', ?, ?, ?)`,
      [funcionario, epi, admin]
    );

    await registrarLog({ empresa, tipo: 'ENTREGA', descricao: 'Entrega de EPI', equipamento: epis[0]?.nm_epi,quantidade: 1, responsavel: req.usuario.id });

    return res.status(201).json({
      mensagem: 'Entrega registrada com sucesso.',
      id_entrega: result.insertId
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
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

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// Registra a DEVOLUÇÃO de um EPI (atualiza a entrega existente)
async function registrarDevolucao(req, res) {
  const id_entrega = req.params.id;      // vem da URL, não do body
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
      return res.status(404).json({ erro: 'Entrega não encontrada para esta empresa.' });
    }
    if (entregas[0].st_entrega === 'D') {
      return res.status(409).json({ erro: 'Este EPI já foi devolvido.' });
    }

    // Atualiza: marca como devolvido e grava a data. (Opção A: NÃO repõe estoque.)
    await db.execute(
      `UPDATE tb_entrega
       SET st_entrega = 'D', dt_devolucao = CURDATE()
       WHERE id_entrega = ?`,
      [id_entrega]
    );

    await registrarLog({ empresa, tipo: 'DEVOLUCAO', descricao: 'Devolução de EPI', responsavel: req.usuario.id });

    return res.status(200).json({ mensagem: 'Devolução registrada com sucesso.' });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
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
      return res.status(404).json({ erro: 'Funcionário não encontrado para esta empresa.' });
    }

    const [historico] = await db.execute(
      `SELECT e.id_entrega, e.dt_entrega, e.dt_devolucao, e.st_entrega, epi.nm_epi
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

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
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
      return res.status(403).json({ erro: 'Apenas funcionários possuem equipamentos.' });
    }
    const id_funcionario = funcs[0].id_funcionario;

    const [equipamentos] = await db.execute(
      `SELECT e.id_entrega, e.dt_entrega, e.dt_devolucao, e.st_entrega, epi.nm_epi
       FROM tb_entrega e
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       WHERE e.tb_funcionario_id_funcionario = ? AND e.st_entrega IN ('A','D')
       ORDER BY e.dt_entrega DESC`,
      [id_funcionario]
    );

    return res.status(200).json(equipamentos);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
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
      return res.status(403).json({ erro: 'Apenas funcionários possuem entregas.' });
    }

    const [pendentes] = await db.execute(
      `SELECT e.id_entrega, e.dt_entrega, epi.nm_epi, u.nm_usuario AS entregue_por
       FROM tb_entrega e
       JOIN tb_epi epi ON epi.id_epi = e.tb_epi_id_epi
       JOIN tb_usuario u ON u.id_usuario = e.tb_usuario_id_usuario
       WHERE e.tb_funcionario_id_funcionario = ? AND e.st_entrega = 'P'
       ORDER BY e.dt_entrega DESC`,
      [funcs[0].id_funcionario]
    );

    return res.status(200).json(pendentes);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
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
      return res.status(404).json({ erro: 'Entrega não encontrada ou já respondida.' });
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

    return res.status(200).json({ mensagem: 'Recebimento confirmado com sucesso.' });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// FUNCIONÁRIO: recusa o recebimento (o estoque NÃO volta — só com devolução física)
async function recusarRecebimento(req, res) {
  const { id } = req.params;
  const { motivo } = req.body;
  const empresa = req.usuario.empresa;

  if (!motivo || motivo.trim().length < 5) {
    return res.status(400).json({ erro: 'Informe o motivo da recusa (mínimo 5 caracteres).' });
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
      return res.status(404).json({ erro: 'Entrega não encontrada ou já respondida.' });
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

    return res.status(200).json({ mensagem: 'Recebimento recusado. O administrador será notificado.' });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { registrarEntrega, listarEntregas, registrarDevolucao, historicoFuncionario, meusEquipamentos, pendentesConfirmacao, confirmarRecebimento, recusarRecebimento };