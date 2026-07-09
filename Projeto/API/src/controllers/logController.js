const db = require('../config/db');

async function listarLog(req, res) {
  const empresa = req.usuario.empresa;
  try {
    const [logs] = await db.query(
      `SELECT l.id_log, l.dt_log, l.tipo_acao, l.equipamento, l.quantidade, l.motivo,
              u.nm_usuario, u.cpf_usuario
       FROM tb_log l
       LEFT JOIN tb_usuario u ON u.id_usuario = l.responsavel
       WHERE l.tb_empresa_id_empresa = ? ORDER BY l.dt_log DESC`,
      [empresa]
    );
    return res.status(200).json(logs);
  } catch (err) { return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message }); }
}
module.exports = { listarLog };