/* LOCAL QUE AS ROTAS SÃO CRIADAS PARA MELHOR VISIBILIDADE E MANUTENÇÃO */

const db     = require('../config/db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

async function cadastrar(req, res) {
  const { nome, email, senha, cpf } = req.body;

  if (!nome || !email || !senha || !cpf) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  try {
    const [existe] = await db.query(
      'SELECT id_usuario FROM tb_usuario WHERE email_usuario = ?', [email]
    );
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }

    const hash = await bcrypt.hash(senha, 10);

    await db.query(
  `INSERT INTO tb_usuario 
    (nm_usuario, email_usuario, senha_usuario, cpf_usuario, st_usuario, dt_cadastro_usuario)
   VALUES (?, ?, ?, ?, 'A', CURDATE())`,
  [nome, email, hash, cpf]
);

    return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso.' });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM tb_usuario WHERE email_usuario = ?', [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const usuario = rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_usuario);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, email: usuario.email_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso.',
      token,
      usuario: {
        id:   usuario.id_usuario,
        nome: usuario.nome_usuario,
        email: usuario.email_usuario
      }
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { cadastrar, login };