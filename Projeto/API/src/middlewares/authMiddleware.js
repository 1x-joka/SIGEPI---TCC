/* PROTEÇÃO DAS ROTAS QUE SÓ USUÁRIOS LOGADOS PODEM ACESSAR */

const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = dados;
    
    // Empresa vem do banco (fonte confiável), nunca do cliente
    const [rows] = await db.query(
      'SELECT tb_empresa_id_empresa FROM tb_usuario WHERE id_usuario = ?',
      [dados.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ erro: 'Usuário não encontrado.' });
    }
    req.usuario.empresa = rows[0].tb_empresa_id_empresa;

    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Bloqueia rotas que exigem empresa quando o usuário ainda não tem uma vinculada
function exigirEmpresa(req, res, next) {
  if (!req.usuario || !req.usuario.empresa) {
    return res.status(403).json({ erro: 'Usuário sem empresa vinculada.' });
  }
  next();
}

module.exports = { autenticar, exigirEmpresa };