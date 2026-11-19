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
      return {
        ok: false,
        erro: error.message || JSON.stringify(error)
      };
    }
    return { ok: true };
  }
  catch (err) {
    console.error('Falha no serviço de e-mail:', err);
    return {
      ok: false,
      erro: err.message
    };
  }
}

// ===== Base genérica + layout (reaproveita o try/catch e o visual) =====
async function _enviar(to, subject, html) {
  try {
    const { error } = await resend.emails.send({ from: `SIGEPI <${REMETENTE}>`, to, subject, html });
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      return {
        ok: false, erro: error.message || JSON.stringify(error)
      };
    }
    return { ok: true };
  } catch (err) {
    console.error('Falha no serviço de e-mail:', err);
    return {
      ok: false,
      erro: err.message
    };
  }
}

function _layout(titulo, corpoHtml) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
      <h2 style="color: #1F6F8B;">${titulo}</h2>
      ${corpoHtml}
      <p style="font-size: 12px; color: #999; margin-top: 24px;">Mensagem automática do SIGEPI — não é necessário responder.</p>
    </div>`;
}

// 1) Entrega de EPI -> funcionário
async function enviarEmailEntregaEpi(destino, dados) {
  const lista = (dados.itens || []).map(i => `<li>${i.nome}${i.qtd > 1 ? ` (x${i.qtd})` : ''}</li>`).join('');
  return _enviar(destino, 'Novo EPI entregue a você - SIGEPI', _layout('Você recebeu um novo EPI', `
    <p>Olá, ${dados.nomeFuncionario}.</p>
    <p>O administrador <strong>${dados.admin}</strong> registrou a entrega do(s) seguinte(s) EPI(s) para você em <strong>${dados.data}</strong>:</p>
    <ul>${lista}</ul>
    <p><strong>Funcionário:</strong> ${dados.nomeFuncionario}<br>
       <strong>CPF:</strong> ${dados.cpf || '—'}<br>
       <strong>Setor:</strong> ${dados.setor || '—'}</p>
    <p>Acesse o SIGEPI para <strong>confirmar</strong> ou <strong>recusar</strong> o recebimento.</p>`));
}

// 2) Aceite/Recusa de recebimento -> admin(s)
async function enviarEmailRecebimento(destinos, dados) {
  const extra = (dados.acao === 'recusou' && dados.motivo) ? `<p><strong>Motivo da recusa:</strong> ${dados.motivo}</p>` : '';
  return _enviar(destinos, `Funcionário ${dados.acao} um EPI - SIGEPI`, _layout(`Recebimento ${dados.acao}`, `
    <p>O funcionário <strong>${dados.nomeFuncionario}</strong> <strong>${dados.acao}</strong> o recebimento do EPI <strong>${dados.epi}</strong> em ${dados.data}.</p>
    ${extra}`));
}

// 3) Nova solicitação de reposição -> admin(s)
async function enviarEmailNovaSolicitacao(destinos, dados) {
  return _enviar(destinos, 'Nova solicitação de reposição - SIGEPI', _layout('Nova solicitação de reposição', `
    <p>O funcionário <strong>${dados.nomeFuncionario}</strong> solicitou a reposição do EPI <strong>${dados.epi}</strong> em ${dados.data}.</p>
    <p><strong>Motivo:</strong> ${dados.motivo || '—'}</p>
    <p>Acesse o SIGEPI para aprovar ou recusar.</p>`));
}

// 4) Decisão da solicitação -> funcionário
async function enviarEmailDecisaoSolicitacao(destino, dados) {
  return _enviar(destino, `Sua solicitação foi ${dados.decisao} - SIGEPI`, _layout(`Solicitação ${dados.decisao}`, `
    <p>Olá, ${dados.nomeFuncionario}.</p>
    <p>Sua solicitação de reposição do EPI <strong>${dados.epi}</strong> foi <strong>${dados.decisao}</strong> pelo administrador.</p>`));
}

// 5) Devolução registrada pelo admin -> funcionário
async function enviarEmailDevolucao(destino, dados) {
  return _enviar(destino, 'Devolução de EPI solicitada - SIGEPI', _layout('Devolva seu EPI', `
    <p>Olá, ${dados.nomeFuncionario}.</p>
    <p>O administrador registrou a <strong>devolução</strong> do EPI <strong>${dados.epi}</strong> que estava com você.</p>
    <p style="background:#fdecea; border-left:4px solid #e53935; padding:10px 14px; border-radius:6px;">
      <strong>Ação necessária:</strong> devolva o equipamento <strong>imediatamente</strong> ao responsável do seu setor${dados.setor ? ` (<strong>${dados.setor}</strong>)` : ''}.</p>`));
}

module.exports = {
  enviarEmailRecuperacao,
  enviarEmailEntregaEpi,
  enviarEmailRecebimento,
  enviarEmailNovaSolicitacao,
  enviarEmailDecisaoSolicitacao,
  enviarEmailDevolucao
};