const db = require('../config/db');

async function listarLog(req, res) {
  const empresa = req.usuario.empresa;
  try {
    const [logs] = await db.query(
      `SELECT id_log, dt_log, tipo_acao, descricao, equipamento, quantidade, motivo, responsavel
       FROM tb_log WHERE tb_empresa_id_empresa = ? ORDER BY dt_log DESC`,
      [empresa]
    );
    return res.status(200).json(logs);
  } catch (err) { return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message }); }
}
module.exports = { listarLog };