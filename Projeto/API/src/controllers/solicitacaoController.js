const db = require('../config/db');

// Calcula uma data somando N dias ÚTEIS a partir de hoje (pula sábado e domingo)
function calcularPrevisao(diasUteis) {
  const data = new Date();
  let adicionados = 0;
  while (adicionados < diasUteis) {
    data.setDate(data.getDate() + 1);
    const dia = data.getDay(); // 0 = domingo, 6 = sábado
    if (dia !== 0 && dia !== 6) adicionados++;
  }
  // Formata como AAAA-MM-DD usando a data local (evita erro de fuso)
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const diaMes = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${diaMes}`;
}

// Funcionário solicita a reposição de um EPI
async function criarSolicitacao(req, res) {
  const { epi, motivo } = req.body;
  const empresa = req.usuario.empresa;

  // NF10.1: justificativa é obrigatória
  if (!epi || !motivo) {
    return res.status(400).json({ erro: 'Informe o EPI e a justificativa.' });
  }

  try {
    // PONTE usuário -> funcionário: quem está logado é um usuário;
    // a solicitação se liga ao id_funcionario. Também barra o admin (que não tem funcionário).
    const [funcs] = await db.query(
      `SELECT id_funcionario FROM tb_funcionario
       WHERE tb_usuario_id_usuario = ? AND tb_empresa_id_empresa = ? AND st_funcionario = 'A'`,
      [req.usuario.id, empresa]
    );
    if (funcs.length === 0) {
      return res.status(403).json({ erro: 'Apenas funcionários podem solicitar reposição.' });
    }
    const id_funcionario = funcs[0].id_funcionario;

    // O EPI precisa ser DESTA empresa
    const [epis] = await db.query(
      'SELECT id_epi FROM tb_epi WHERE id_epi = ? AND tb_empresa_id_empresa = ?',
      [epi, empresa]
    );
    if (epis.length === 0) {
      return res.status(400).json({ erro: 'EPI inválido para esta empresa.' });
    }

    // TRAVA: não pode existir solicitação PENDENTE para o MESMO EPI (F10)
    const [pendentes] = await db.query(
      `SELECT id_solicitacao FROM tb_solicitacao
       WHERE tb_funcionario_id_funcionario = ? AND tb_epi_id_epi = ? AND st_solicitacao = 'P'`,
      [id_funcionario, epi]
    );
    if (pendentes.length > 0) {
      return res.status(409).json({ erro: 'Você já tem uma solicitação pendente para este EPI.' });
    }

    // NF10.2: previsão de 3 dias úteis
    const previsao = calcularPrevisao(3);

    const [result] = await db.query(
      `INSERT INTO tb_solicitacao
        (dt_solicitacao, st_solicitacao, desc_motivo_solicitacao, dt_previsao, tb_funcionario_id_funcionario, tb_epi_id_epi)
       VALUES (CURDATE(), 'P', ?, ?, ?, ?)`,
      [motivo, previsao, id_funcionario, epi]
    );

    return res.status(201).json({
      mensagem: 'Solicitação registrada com sucesso.',
      id_solicitacao: result.insertId,
      previsao
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// Funcionário lista as PRÓPRIAS solicitações (para acompanhar o status)
async function listarMinhasSolicitacoes(req, res) {
  const empresa = req.usuario.empresa;

  try {
    const [funcs] = await db.query(
      `SELECT id_funcionario FROM tb_funcionario
       WHERE tb_usuario_id_usuario = ? AND tb_empresa_id_empresa = ?`,
      [req.usuario.id, empresa]
    );
    if (funcs.length === 0) {
      return res.status(403).json({ erro: 'Apenas funcionários possuem solicitações.' });
    }
    const id_funcionario = funcs[0].id_funcionario;

    const [solicitacoes] = await db.query(
      `SELECT s.id_solicitacao, s.dt_solicitacao, s.st_solicitacao,
              s.desc_motivo_solicitacao, s.dt_previsao, epi.nm_epi
       FROM tb_solicitacao s
       JOIN tb_epi epi ON epi.id_epi = s.tb_epi_id_epi
       WHERE s.tb_funcionario_id_funcionario = ?
       ORDER BY s.dt_solicitacao DESC`,
      [id_funcionario]
    );

    return res.status(200).json(solicitacoes);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// ADMIN lista as solicitações PENDENTES da empresa (NF11.1)
async function listarPendentes(req, res) {
  const empresa = req.usuario.empresa;

  try {
    const [solicitacoes] = await db.query(
      `SELECT s.id_solicitacao, s.dt_solicitacao, s.desc_motivo_solicitacao, s.dt_previsao,
              f.nm_funcionario, f.sobrenome_funcionario, epi.nm_epi
       FROM tb_solicitacao s
       JOIN tb_funcionario f ON f.id_funcionario = s.tb_funcionario_id_funcionario
       JOIN tb_epi epi        ON epi.id_epi = s.tb_epi_id_epi
       WHERE f.tb_empresa_id_empresa = ? AND s.st_solicitacao = 'P'
       ORDER BY s.dt_solicitacao`,
      [empresa]
    );

    return res.status(200).json(solicitacoes);

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// ADMIN aprova ou recusa uma solicitação (uma rota, decisão no body)
async function responderSolicitacao(req, res) {
  const id_solicitacao = req.params.id;   // da URL
  const { decisao } = req.body;           // 'A' (aprovar) ou 'R' (recusar)
  const empresa = req.usuario.empresa;

  // Só aceita valores válidos do domínio (mesma filosofia do ENUM: nada fora disso)
  if (decisao !== 'A' && decisao !== 'R') {
    return res.status(400).json({ erro: "Decisão inválida. Use 'A' (aprovar) ou 'R' (recusar)." });
  }

  try {
    // Segurança: a solicitação precisa existir, ser DESTA empresa e ainda estar PENDENTE
    const [solics] = await db.query(
      `SELECT s.id_solicitacao, s.st_solicitacao
       FROM tb_solicitacao s
       JOIN tb_funcionario f ON f.id_funcionario = s.tb_funcionario_id_funcionario
       WHERE s.id_solicitacao = ? AND f.tb_empresa_id_empresa = ?`,
      [id_solicitacao, empresa]
    );

    if (solics.length === 0) {
      return res.status(404).json({ erro: 'Solicitação não encontrada para esta empresa.' });
    }
    if (solics[0].st_solicitacao !== 'P') {
      return res.status(409).json({ erro: 'Esta solicitação já foi respondida.' });
    }

    // A checagem st_solicitacao !== 'P' evita "responder duas vezes" (aprovar uma solicitação já recusada, por exemplo).

    // Atualiza o status (Opção A: só decide, não gera entrega)
    await db.query(
      'UPDATE tb_solicitacao SET st_solicitacao = ? WHERE id_solicitacao = ?',
      [decisao, id_solicitacao]
    );

    const msg = decisao === 'A' ? 'Solicitação aprovada.' : 'Solicitação recusada.';
    return res.status(200).json({ mensagem: msg });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { criarSolicitacao, listarMinhasSolicitacoes, listarPendentes, responderSolicitacao };