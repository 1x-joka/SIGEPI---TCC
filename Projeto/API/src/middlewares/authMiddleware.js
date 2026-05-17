/* PROTEÇÃO DAS ROTAS QUE SÓ USUÁRIOS LOGADOS PODEM ACESSAR */

const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = dados;
    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = { autenticar };