/* LOCAL QUE AS ROTAS SÃO CRIADAS PARA MELHOR VISIBILIDADE E MANUTENÇÃO */

const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const registrarLog = require('../utils/registrarLog'); // puxando o log de auditoria para ver e registrar o que está acontecendo em cada Controller
const { validarCPF } = require('../utils/validadores');
const crypto = require('crypto');
const { enviarEmailRecuperacao } = require('../utils/enviarEmail');

async function cadastrar(req, res) {
  const { nome, email, senha, cpf, tipo } = req.body;

  if (!nome || !email || !senha || !cpf) {
    return res.status(400).json({
      erro: 'Preencha todos os campos.'
    });
  }

  const tipoNum = parseInt(tipo);
  if (tipoNum !== 1 && tipoNum !== 2) {
    return res.status(400).json({
      erro: 'Selecione o tipo de conta.'
    });
  }

  if (!validarCPF(cpf)) {
    return res.status(400).json({
      erro: 'CPF inválido.'
    });
  }

  try {
    const [existe] = await db.execute(
      'SELECT email_usuario, cpf_usuario FROM tb_usuario WHERE email_usuario = ? OR cpf_usuario = ?', [email, cpf]
    );
    if (existe.length > 0) {
      const emailDuplicado = existe.some(u => u.email_usuario === email);
      return res.status(409).json({
        erro: emailDuplicado ? 'E-mail já cadastrado.' : 'CPF já cadastrado.'
      });
    }

    const hash = await bcrypt.hash(senha, 10);

    await db.execute(
      `INSERT INTO tb_usuario
        (nm_usuario, email_usuario, senha_usuario, cpf_usuario, st_usuario, dt_cadastro_usuario, tb_tipousuario_id_tipousuario)
       VALUES (?, ?, ?, ?, 'A', CURDATE(), ?)`,
      [nome, email, hash, cpf, tipoNum]
    );

    return res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso.'
    });

  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      erro: 'Preencha todos os campos.'
    });
  }

  // Valida o reCAPTCHA no servidor do Google (defesa real, não só no front)
  const captchaToken = req.body.captchaToken;
  if (!captchaToken) {
    return res.status(400).json({
      erro: 'Confirme que você não é um robô.'
    });
  }
  try {
    const respCaptcha = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`
    });
    const resultado = await respCaptcha.json();
    if (!resultado.success) {
      return res.status(403).json({ 
        erro: 'Falha na verificação do reCAPTCHA.'
      });
    }
  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro ao validar o reCAPTCHA.'
    });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM tb_usuario WHERE email_usuario = ?', [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        erro: 'E-mail ou senha incorretos.'
      });
    }

    const usuario = rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_usuario);
    if (!senhaCorreta) {
      return res.status(401).json({
        erro: 'E-mail ou senha incorretos.'
      });
    }

    if (usuario.st_usuario === 'I') {
      return res.status(403).json({
        erro: 'Acesso bloqueado. Procure o administrador.'
      });
    }

    // A ordem importa: colocamos depois de validar a senha de propósito. Assim, quem erra a senha recebe "credenciais inválidas" (sem revelar que a conta existe), e só quem acerta a senha de uma conta inativa é que descobre que está bloqueado. É um detalhe de segurança (não vazar informação a quem nem sabe a senha).

    // Descobre se o funcionário já completou o cadastro (tem linha em tb_funcionario)
    const [func] = await db.execute(
      'SELECT id_funcionario FROM tb_funcionario WHERE tb_usuario_id_usuario = ?',
      [usuario.id_usuario]
    );

    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        email: usuario.email_usuario
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h'
      }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });

    // Registra o acesso ao sistema (auditoria de login)
    await registrarLog({
      empresa: usuario.tb_empresa_id_empresa,
      tipo: 'LOGIN',
      descricao: 'Acesso ao sistema',
      responsavel: usuario.id_usuario
    });

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso.',
      usuario: {
        id: usuario.id_usuario,
        nome: usuario.nm_usuario,
        tipo: usuario.tb_tipousuario_id_tipousuario,
        empresa: usuario.tb_empresa_id_empresa,
        completou: func.length > 0
      }
    });
  }
  catch (err) {
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message
    });
  }
}

async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });
  return res.status(200).json({
    mensagem: 'Logout realizado com sucesso.'
  });
}

// FUNÇÃO 1: usuário pede a recuperação (informa o e-mail)
async function solicitarReset(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      erro: 'Informe o e-mail.'
    });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id_usuario, nm_usuario, reset_bloqueado_ate, tentativas_reset FROM tb_usuario WHERE email_usuario = ?',
      [email]
    );
    console.log('[reset] usuarios encontrados para', email, '=>', rows.length);

    // Resposta genérica de propósito: não revela se o e-mail existe (evita descobrir contas)
    const respostaGenerica = {
      mensagem: 'Se este e-mail estiver cadastrado, você receberá as instruções de recuperação.'
    };

    if (rows.length === 0) {
      return res.status(200).json(respostaGenerica);
    }

    const usuario = rows[0];

    // Verifica suspensão: se está bloqueado e o tempo ainda não passou
    if (usuario.reset_bloqueado_ate && new Date(usuario.reset_bloqueado_ate) > new Date()) {
      return res.status(429).json({
        erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
      });
    }

    // Conta a tentativa; a cada 5, bloqueia por 5 minutos
    let tentativas = usuario.tentativas_reset + 1;
    let bloqueadoAte = null;
    if (tentativas >= 5) {
      bloqueadoAte = new Date(Date.now() + 5 * 60 * 1000);
      tentativas = 0;
    }

    // Gera token aleatório e define validade de 1 hora
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000);

    await db.execute(
      'UPDATE tb_usuario SET token_reset = ?, token_reset_expira = ?, tentativas_reset = ?, reset_bloqueado_ate = ? WHERE id_usuario = ?',
      [token, expira, tentativas, bloqueadoAte, usuario.id_usuario]
    );

    // Monta o link e envia o e-mail
    const base = process.env.APP_URL || 'http://localhost:3000';
    const link = `${base}/paginas/redefinir-senha.html?token=${token}`;
    const enviado = await enviarEmailRecuperacao(email, usuario.nm_usuario, link);
    console.log('[reset] envio para', email, '=>', enviado ? 'OK' : 'FALHOU (veja o erro acima)');

    return res.status(200).json(respostaGenerica);
  }
  catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

// FUNÇÃO 2: usuário define a nova senha (chega pelo link do e-mail com o token)
async function redefinirSenha(req, res) {
  const { token, senha } = req.body;

  if (!token || !senha) {
    return res.status(400).json({
      erro: 'Dados incompletos.'
    });
  }

  if (senha.length < 8) {
    return res.status(400).json({
      erro: 'A senha deve ter pelo menos 8 caracteres.'
    });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id_usuario, token_reset_expira FROM tb_usuario WHERE token_reset = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        erro: 'Link inválido ou já utilizado.'
      });
    }

    const usuario = rows[0];

    // O token expirou?
    if (new Date(usuario.token_reset_expira) < new Date()) {
      return res.status(400).json({
        erro: 'Este link expirou. Solicite a recuperação novamente.'
      });
    }

    // Gera o NOVO hash bcrypt da senha nova redefinida pelo user
    const novoHash = await bcrypt.hash(senha, 10);

    // Atualiza a senha e LIMPA o token (para não poder reutilizar o link)
    await db.execute(
      'UPDATE tb_usuario SET senha_usuario = ?, token_reset = NULL, token_reset_expira = NULL, tentativas_reset = 0, reset_bloqueado_ate = NULL WHERE id_usuario = ?',
      [novoHash, usuario.id_usuario]
    );

    return res.status(200).json({
      mensagem: 'Senha redefinida com sucesso. Você já pode fazer login.'
    });
  }
  catch (err) {
    console.log('Erro SOLICITAR-RESET: ', err);
    return res.status(500).json({
      erro: 'Erro interno.',
      detalhe: err.message || err.sqlMessage || JSON.stringify(err)
    });
  }
}

module.exports = { cadastrar, login, logout, solicitarReset, redefinirSenha };