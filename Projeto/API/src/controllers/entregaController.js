const db = require('../config/db');

// O controller não mexe no estoque. Ele insere em tb_entrega e para.

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
    const [funcs] = await db.query(
      'SELECT id_funcionario FROM tb_funcionario WHERE id_funcionario = ? AND tb_empresa_id_empresa = ? AND st_funcionario = "A"',
      [funcionario, empresa]
    );
    if (funcs.length === 0) {
      return res.status(400).json({ erro: 'Funcionário inválido ou inativo para esta empresa.' });
    }

    // 2) O EPI precisa ser DESTA empresa
    const [epis] = await db.query(
      'SELECT id_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ?',
      [epi, empresa]
    );
    if (epis.length === 0) {
      return res.status(400).json({ erro: 'EPI inválido para esta empresa.' });
    }

    // 3) VERIFICAÇÃO DE ESTOQUE: existe algum lote com quantidade disponível?
    // A verificação usa SUM(...). Como cada entrada é um lote (linha) separado, um EPI pode ter vários lotes. O SUM soma a quantidade de todos os lotes daquele EPI para saber o total disponível. Se o total for < 1, recusa.
    const [estoque] = await db.query(
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
    const [result] = await db.query(
      `INSERT INTO tb_entrega
        (dt_entrega, st_entrega, tb_funcionario_id_funcionario, tb_epi_id_epi, tb_usuario_id_usuario)
       VALUES (CURDATE(), 'A', ?, ?, ?)`,
      [funcionario, epi, admin]
    );

    return res.status(201).json({
      mensagem: 'Entrega registrada com sucesso.',
      id_entrega: result.insertId
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { registrarEntrega };