/* LOCAL QUE AS ROTAS SÃO CRIADAS PARA MELHOR VISIBILIDADE E MANUTENÇÃO */

const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const registrarLog = require('../utils/registrarLog'); // puxando o log de auditoria para ver e registrar o que está acontecendo em cada Controller
const { validarCPF } = require('../utils/validadores');

async function cadastrar(req, res) {
  const { nome, email, senha, cpf, tipo } = req.body;

  if (!nome || !email || !senha || !cpf) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  const tipoNum = parseInt(tipo);
  if (tipoNum !== 1 && tipoNum !== 2) {
    return res.status(400).json({ erro: 'Selecione o tipo de conta.' });
  }

  if (!validarCPF(cpf)) {
    return res.status(400).json({ erro: 'CPF inválido.' });
  }

  try {
    const [existe] = await db.query(
      'SELECT email_usuario, cpf_usuario FROM tb_usuario WHERE email_usuario = ? OR cpf_usuario = ?', [email, cpf]
    );
    if (existe.length > 0) {
      const emailDuplicado = existe.some(u => u.email_usuario === email);
      return res.status(409).json({
        erro: emailDuplicado ? 'E-mail já cadastrado.' : 'CPF já cadastrado.'
      });
    }

    const hash = await bcrypt.hash(senha, 10);

    await db.query(
      `INSERT INTO tb_usuario
        (nm_usuario, email_usuario, senha_usuario, cpf_usuario, st_usuario, dt_cadastro_usuario, tb_tipousuario_id_tipousuario)
       VALUES (?, ?, ?, ?, 'A', CURDATE(), ?)`,
      [nome, email, hash, cpf, tipoNum]
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

  // Valida o reCAPTCHA no servidor do Google (defesa real, não só no front)
  const captchaToken = req.body.captchaToken;
  if (!captchaToken) {
    return res.status(400).json({ erro: 'Confirme que você não é um robô.' });
  }
  try {
    const respCaptcha = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`
    });
    const resultado = await respCaptcha.json();
    if (!resultado.success) {
      return res.status(403).json({ erro: 'Falha na verificação do reCAPTCHA.' });
    }
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao validar o reCAPTCHA.' });
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

    if (usuario.st_usuario === 'I') {
      return res.status(403).json({ erro: 'Acesso bloqueado. Procure o administrador.' });
    }

    // A ordem importa: colocamos depois de validar a senha de propósito. Assim, quem erra a senha recebe "credenciais inválidas" (sem revelar que a conta existe), e só quem acerta a senha de uma conta inativa é que descobre que está bloqueado. É um detalhe de segurança (não vazar informação a quem nem sabe a senha).

    // Descobre se o funcionário já completou o cadastro (tem linha em tb_funcionario)
    const [func] = await db.query(
      'SELECT id_funcionario FROM tb_funcionario WHERE tb_usuario_id_usuario = ?',
      [usuario.id_usuario]
    );

    const token = jwt.sign(
      { id: usuario.id_usuario, email: usuario.email_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso.',
      token,
      usuario: {
        id: usuario.id_usuario,
        nome: usuario.nm_usuario,
        tipo: usuario.tb_tipousuario_id_tipousuario, // 1 = admin, 2 = funcionário
        empresa: usuario.tb_empresa_id_empresa, // null se ainda não tem
        completou: func.length > 0 // funcionário já completou?
      }
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { cadastrar, login };