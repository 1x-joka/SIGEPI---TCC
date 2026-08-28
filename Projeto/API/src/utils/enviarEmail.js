const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const REMETENTE = process.env.EMAIL_REMETENTE || 'onboarding@resend.dev'; // process.env.EMAIL_REMETENTE = lê o email real que o usuário enviou (o qual está no ENV) e, se não achar, manda para o email onboarding utilizando fallback (o operador ||)

async function enviarEmailRecuperacao(destino, nome, linkReset) { // o sistema procura na base de dados quem está solicitando o email obtendo seu email e seu nome para melhor clareza e design do email
  try {
    const { data, error } = await resend.emails.send({ // resend.email.send = uma função que envia de fato o conteúdo abaixo
      from: `SIGEPI <${REMETENTE}>`,
      to: destino,
      subject: 'Recuperação de senha - SIGEPI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
          <h2 style="color: #1F6F8B;">Recuperação de senha</h2>
          <p>Olá, ${nome}.</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta no SIGEPI. Clique no botão abaixo para criar uma nova senha:</p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="${linkReset}" style="background: #1F6F8B; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; display: inline-block;">Redefinir minha senha</a>
          </p>
          <p style="font-size: 13px; color: #777;">Este link expira em 1 hora. Se você não solicitou a recuperação, ignore este e-mail — sua senha continua a mesma.</p>
        </div>
      `
    });

    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      return false;
    }
    return true;
  }
  catch (err) {
    console.error('Falha no serviço de e-mail:', err);
    return false;
  }
}

module.exports = { enviarEmailRecuperacao };
