// ============================================================
//  UTILITÁRIOS GLOBAIS
// ============================================================

function abrirModal(id) {
  document.getElementById(id).classList.add('active');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('active');
}

function fecharSeOverlay(event, id) {
  if (event.target === document.getElementById(id)) fecharModal(id);
}

function toggleVisivel(id, mostrar) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = mostrar ? '' : 'none';
}

function setErro(id, mostrar) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList[mostrar ? 'add' : 'remove']('show');
}


// ============================================================
//  loginpage.html
// ============================================================

function fazerLogin() {
  const email = document.getElementById('email')?.value;
  const senha = document.getElementById('senha')?.value;
  const erro  = document.getElementById('email-error');
  if (!erro) return;

  if (!email || !senha) {
    erro.textContent = 'Preencha todos os campos.';
    erro.classList.add('show');
    return;
  }

  // Em produção: POST /api/login
  erro.classList.remove('show');
  window.location.href = 'home.html';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && document.getElementById('email') && document.getElementById('senha')) {
    fazerLogin();
  }
});


// ============================================================
//  signuppage.html
// ============================================================

function iniciarMascaraCPF() {
  const cpfInput = document.getElementById('cpf');
  if (!cpfInput) return;
  cpfInput.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    this.value = v;
  });
}

function cadastrar() {
  const nome  = document.getElementById('nome')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const senha = document.getElementById('senha')?.value;
  const cpf   = document.getElementById('cpf')?.value.trim();
  let valid = true;

  setErro('nome-error',  !nome);                          if (!nome)  valid = false;
  setErro('email-error', !email || !email.includes('@')); if (!email || !email.includes('@')) valid = false;
  setErro('senha-error', senha.length < 8);               if (senha.length < 8) valid = false;
  setErro('cpf-error',   cpf.replace(/\D/g,'').length < 11); if (cpf.replace(/\D/g,'').length < 11) valid = false;

  if (valid) {
    // Em produção: POST /api/cadastro
    window.location.href = 'home.html';
  }
}


// ============================================================
//  termos.html
// ============================================================

function verificarCheckboxes() {
  const t = document.getElementById('chk-termos')?.checked;
  const l = document.getElementById('chk-lgpd')?.checked;
  const btn = document.getElementById('btn-aceitar');
  if (btn) btn.disabled = !(t && l);
}

function aceitar() {
  // Em produção: registrar aceite com timestamp e versão dos termos
  window.location.href = 'loginpage.html';
}

function recusar() {
  alert('Por não aceitar os Termos e Condições de Uso, você não poderá utilizar o SIGEPI. A aba será fechada.');
  window.close();
}


// ============================================================
//  entrar-empresa.html
// ============================================================

function entrarEmpresa() {
  const codigo = document.getElementById('codigo')?.value.trim();
  const erro   = document.getElementById('codigo-error');
  if (!erro) return;

  if (!codigo) {
    erro.textContent = 'Digite o código da empresa.';
    erro.classList.add('show');
    return;
  }

  // Em produção: GET /api/empresa/:codigo
  if (codigo.length >= 4) {
    erro.classList.remove('show');
    window.location.href = 'complementar-funcionario.html';
  } else {
    erro.textContent = 'Código não encontrado. Verifique e tente novamente.';
    erro.classList.add('show');
  }
}


// ============================================================
//  cadastrar-empresa.html
// ============================================================

function iniciarMascaraCNPJ() {
  const cnpjInput = document.getElementById('cnpj');
  if (!cnpjInput) return;
  cnpjInput.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    v = v.replace(/^(\d{2})(\d)/,         '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/,         '.$1/$2');
    v = v.replace(/(\d{4})(\d)/,           '$1-$2');
    this.value = v;
  });

  const codigoInput = document.getElementById('codigo');
  if (codigoInput) {
    codigoInput.value = Math.floor(1000000000 + Math.random() * 9000000000);
  }
}

function previewLogo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview     = document.getElementById('logo-preview');
    const placeholder = document.getElementById('logo-placeholder');
    if (preview)     { preview.src = e.target.result; preview.style.display = 'block'; }
    if (placeholder)   placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function cadastrarEmpresa() {
  // Em produção: POST /api/empresa
  window.location.href = 'setores-empresa.html';
}


// ============================================================
//  setores-empresa.html
// ============================================================

const setoresLista = [];

function adicionarSetor() {
  const input = document.getElementById('input-setor');
  const erro  = document.getElementById('setor-error');
  if (!input) return;
  const nome = input.value.trim();
  if (!nome) return;

  if (setoresLista.includes(nome.toLowerCase())) {
    erro?.classList.add('show');
    return;
  }
  erro?.classList.remove('show');
  setoresLista.push(nome.toLowerCase());
  renderSetoresEmpresa();
  input.value = '';
}

function removerSetor(idx) {
  setoresLista.splice(idx, 1);
  renderSetoresEmpresa();
}

function renderSetoresEmpresa() {
  const lista = document.getElementById('setores-lista');
  if (!lista) return;
  lista.innerHTML = setoresLista.map((s, i) => `
    <div class="setor-item">
      <span class="nome">${s.charAt(0).toUpperCase() + s.slice(1)}</span>
      <button class="btn-rm" onclick="removerSetor(${i})">✕</button>
    </div>
  `).join('');
}

function avancar() {
  if (setoresLista.length === 0) {
    alert('Adicione pelo menos um setor antes de continuar.');
    return;
  }
  window.location.href = 'planos.html';
}


// ============================================================
//  planos.html
// ============================================================

function selecionarPlano(num) {
  document.querySelectorAll('.plano-card').forEach(c => c.classList.remove('selected'));
  const cards = document.querySelectorAll('.plano-card');
  if (cards[num - 1]) cards[num - 1].classList.add('selected');
  // Em produção: salvar plano escolhido
  setTimeout(() => window.location.href = 'pagamento.html', 300);
}


// ============================================================
//  pagamento.html
// ============================================================

function iniciarMascarasCartao() {
  const numCartao = document.getElementById('num-cartao');
  const validade  = document.getElementById('validade');
  if (!numCartao || !validade) return;

  numCartao.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 16);
    v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.value = v;
  });

  validade.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
    this.value = v;
  });
}

function confirmarPagamento() {
  const num  = document.getElementById('num-cartao')?.value.replace(/\s/g, '');
  const nome = document.getElementById('nome-cartao')?.value.trim();
  const val  = document.getElementById('validade')?.value.trim();
  const cvv  = document.getElementById('cvv')?.value.trim();
  let valid = true;

  setErro('num-error',  num.length < 16);             if (num.length < 16)              valid = false;
  setErro('nome-error', !nome);                        if (!nome)                        valid = false;
  setErro('val-error',  !/^\d{2}\/\d{2}$/.test(val)); if (!/^\d{2}\/\d{2}$/.test(val)) valid = false;
  setErro('cvv-error',  cvv.length < 3);               if (cvv.length < 3)               valid = false;

  if (valid) {
    // Em produção: POST /api/pagamento via Stripe
    window.location.href = 'dashboard.html';
  }
}


// ============================================================
//  complementar-funcionario.html
// ============================================================

function avancarComplementar() {
  const setor = document.getElementById('setor')?.value;
  const nasc  = document.getElementById('nascimento')?.value;
  let valid = true;

  setErro('setor-error', !setor); if (!setor) valid = false;
  setErro('nasc-error',  !nasc);  if (!nasc)  valid = false;

  if (valid) {
    // Em produção: PATCH /api/funcionarios/complementar
    window.location.href = 'meus-equipamentos.html';
  }
}


// ============================================================
//  epis.html
// ============================================================

function filtrarEpis() {
  const busca = document.getElementById('busca-epi')?.value.toLowerCase();
  document.querySelectorAll('#tabela-epis tbody tr').forEach(tr => {
    tr.style.display = tr.cells[0]?.textContent.toLowerCase().includes(busca) ? '' : 'none';
  });
}

function cadastrarEPI() {
  const nome = document.getElementById('cad-nome')?.value.trim();
  const ca   = document.getElementById('cad-ca')?.value.trim();
  const qtd  = document.getElementById('cad-qtd')?.value;
  const lim  = document.getElementById('cad-limite')?.value;
  const val  = document.getElementById('cad-validade')?.value;
  const cat  = document.getElementById('cad-cat')?.value;
  const desc = document.getElementById('cad-desc')?.value.trim();
  let ok = true;

  const caInvalido = !ca || ca.length < 3 || ca.length > 6 || !/^\d+$/.test(ca);
  setErro('cad-nome-err', !nome);        if (!nome)        ok = false;
  setErro('cad-ca-err',   caInvalido);   if (caInvalido)   ok = false;
  setErro('cad-qtd-err',  !qtd || qtd < 1); if (!qtd)     ok = false;
  setErro('cad-lim-err',  !lim || lim < 1); if (!lim)     ok = false;
  setErro('cad-val-err',  !val);         if (!val)         ok = false;
  setErro('cad-cat-err',  !cat);         if (!cat)         ok = false;

  if (ok && !desc) {
    if (!confirm('A descrição está vazia. Tem certeza que deseja continuar?')) return;
  }

  if (ok) {
    // Em produção: POST /api/epis
    fecharModal('modal-cadastrar');
  }
}

function adicionarEstoque() {
  const epi = document.getElementById('add-epi')?.value;
  const qtd = document.getElementById('add-qtd')?.value;
  const val = document.getElementById('add-validade')?.value;
  let ok = true;

  setErro('add-epi-err', !epi); if (!epi) ok = false;
  setErro('add-qtd-err', !qtd || qtd < 1); if (!qtd) ok = false;
  setErro('add-val-err', !val); if (!val) ok = false;

  if (ok) {
    // Em produção: POST /api/estoque/entrada
    fecharModal('modal-adicionar');
  }
}

function retirarEstoque() {
  const epi = document.getElementById('ret-epi')?.value;
  const qtd = parseInt(document.getElementById('ret-qtd')?.value);
  const mot = document.getElementById('ret-motivo')?.value;
  let ok = true;

  setErro('ret-epi-err', !epi);           if (!epi)         ok = false;
  setErro('ret-qtd-err', !qtd || qtd < 1); if (!qtd || qtd < 1) ok = false;
  setErro('ret-mot-err', !mot);           if (!mot)         ok = false;

  const estoques = {
    'Luva de Segurança Nitrílica': 50,
    'Capacete de Segurança': 120,
    'Óculos de Proteção Incolor': 150,
    'Botina de Segurança com Biqueira': 80
  };
  const disponivel = estoques[epi] ?? 999;
  const semEstoque = qtd > disponivel;
  setErro('ret-estoque-err', semEstoque);
  if (semEstoque) ok = false;

  if (ok) {
    // Em produção: POST /api/estoque/saida
    fecharModal('modal-retirar');
  }
}


// ============================================================
//  funcionarios.html
// ============================================================

let funcSelecionado = null;

function filtrarFuncionarios() {
  const busca  = document.getElementById('busca')?.value.toLowerCase();
  const status = document.getElementById('filtro-status')?.value;
  document.querySelectorAll('#tbody-func tr').forEach(tr => {
    const nome  = tr.dataset.nome?.toLowerCase();
    const st    = tr.dataset.status;
    const okB   = !busca  || nome?.includes(busca);
    const okS   = !status || st === status;
    tr.style.display = (okB && okS) ? '' : 'none';
  });
}

function selecionarFuncionario() {
  document.querySelectorAll('#tbody-func tr').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      document.querySelectorAll('#tbody-func tr').forEach(r => r.style.outline = '');
      tr.style.outline = '2px solid var(--btn-primary)';
      funcSelecionado = {
        nome:  tr.dataset.nome,
        setor: tr.dataset.setor,
        cpf:   tr.dataset.cpf,
        epis:  tr.dataset.epis
      };
    });
  });
}

function abrirVerificar() {
  const nome = funcSelecionado?.nome ?? 'Joaquim Pereira Lima';
  const titulo = document.getElementById('titulo-verificar');
  if (titulo) titulo.textContent = 'Verificação dos EPIs de ' + nome;
  abrirModal('modal-verificar');
}

function abrirExcluir() {
  const f = funcSelecionado ?? { nome: 'Joaquim Pereira Lima', cpf: '987.654.321-00', setor: 'Acabamento', epis: '3' };
  const titulo = document.getElementById('titulo-excluir');
  if (titulo) titulo.textContent = 'Exclusão de ' + f.nome;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setEl('excluir-nome', f.nome);
  setEl('excluir-cpf',  f.cpf);
  setEl('excluir-epis', f.epis + ' EPI(s)');
  const chk = document.getElementById('chk-confirmar-exclusao');
  if (chk) chk.checked = false;
  const btn = document.getElementById('btn-inativar');
  if (btn) btn.disabled = true;
  abrirModal('modal-excluir');
}

function toggleOutroMotivo() {
  const val  = document.getElementById('motivo-exclusao')?.value;
  const wrap = document.getElementById('outro-motivo-wrap');
  if (wrap) wrap.style.display = val === 'Outro' ? 'flex' : 'none';
}

function toggleBtnInativar() {
  const chk = document.getElementById('chk-confirmar-exclusao')?.checked;
  const btn = document.getElementById('btn-inativar');
  if (btn) btn.disabled = !chk;
}

function inativarFuncionario() {
  // Em produção: PATCH /api/funcionarios/:id { status: 'I', motivo }
  fecharModal('modal-excluir');
}

function reporSelecionados() {
  const ids = ['chk-1', 'chk-2', 'chk-3'];
  const selecionados = ids.filter(id => document.getElementById(id)?.checked);
  if (selecionados.length === 0) { alert('Selecione ao menos um EPI.'); return; }
  // Em produção: POST /api/reposicao com EPIs selecionados
  fecharModal('modal-verificar');
}

function reporTodos() {
  // Em produção: POST /api/reposicao com todos os EPIs
  fecharModal('modal-verificar');
}


// ============================================================
//  historico.html
// ============================================================

function filtrarHistorico() {
  const tipo  = document.getElementById('filtro-tipo')?.value;
  const setor = document.getElementById('filtro-setor')?.value;
  document.querySelectorAll('#tabela-hist tbody tr').forEach(tr => {
    const tds    = tr.querySelectorAll('td');
    const tipoOk  = !tipo  || tds[1]?.textContent.trim() === tipo;
    const setorOk = !setor || tds[5]?.textContent.trim() === setor;
    tr.style.display = (tipoOk && setorOk) ? '' : 'none';
  });
}

function exportarPDF() {
  // Em produção: GET /api/historico/export-pdf
  alert('Exportando PDF...');
}


// ============================================================
//  meus-equipamentos.html
// ============================================================

const episSolicitacao = ['Máscara Respiratória', 'Óculos de Proteção', 'Luvas Nitrílicas (par)'];
const justificativasSolicitacao = [];
let epiAtualIdx = 0;
let solicitacaoEnviada = false;

function abrirSolicitar() {
  if (solicitacaoEnviada) return;
  epiAtualIdx = 0;
  justificativasSolicitacao.length = 0;
  mostrarEtapaSolic(1);
  abrirModal('modal-solicitar');
}

function irEtapa2() {
  mostrarEtapaSolic(2);
  atualizarEtapa2();
}

function atualizarEtapa2() {
  const titulo = document.getElementById('titulo-epi-atual');
  const just   = document.getElementById('justificativa');
  if (titulo) titulo.textContent = episSolicitacao[epiAtualIdx];
  if (just)   just.value = justificativasSolicitacao[epiAtualIdx] || '';
  setErro('just-error', false);
}

function proximoEpi() {
  const just = document.getElementById('justificativa')?.value.trim();
  if (!just) { setErro('just-error', true); return; }
  justificativasSolicitacao[epiAtualIdx] = just;
  epiAtualIdx++;
  if (epiAtualIdx < episSolicitacao.length) {
    atualizarEtapa2();
  } else {
    // Em produção: POST /api/solicitacoes
    mostrarEtapaSolic(3);
  }
}

function voltarEtapa1() { mostrarEtapaSolic(1); }

function finalizarSolicitacao() {
  fecharModal('modal-solicitar');
  solicitacaoEnviada = true;

  const bannerTxt = document.getElementById('banner-texto');
  if (bannerTxt) bannerTxt.textContent = 'Solicitações enviadas - aguardando aprovação';

  const tbody = document.getElementById('tbody-equipamentos');
  if (tbody) {
    tbody.innerHTML = `
      <tr><td>Máscara respiratória</td><td>Pintura</td><td>1</td><td>20/02/2026</td>
        <td style="color:var(--text-yellow);font-weight:600;font-size:13px;">SOLICITADO<br>Previsão: 22/04/2026</td></tr>
      <tr><td>Óculos de Proteção</td><td>Pintura</td><td>2</td><td>30/10/2026</td>
        <td style="color:var(--text-yellow);font-weight:600;font-size:13px;">SOLICITADO<br>Previsão: 22/04/2026</td></tr>
      <tr><td>Luvas nitrílicas (par)</td><td>Pintura</td><td>3</td><td>10/05/2026</td>
        <td style="color:var(--text-yellow);font-weight:600;font-size:13px;">SOLICITADO<br>Previsão: 22/04/2026</td></tr>
    `;
  }

  const btn = document.getElementById('btn-solicitar');
  if (btn) btn.disabled = true;
  const aviso = document.getElementById('aviso-pendente');
  if (aviso) aviso.style.display = 'block';
}

function mostrarEtapaSolic(n) {
  [1, 2, 3].forEach(i => {
    const el = document.getElementById('etapa-' + i);
    if (el) el.style.display = i === n ? '' : 'none';
  });
}


// ============================================================
//  secao-empresa.html
// ============================================================

function previewLogoSecao(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('logo-secao-preview');
    const txt     = document.getElementById('logo-secao-txt');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (txt)       txt.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function salvarAlteracoes() {
  // Em produção: PATCH /api/empresa
  window.history.back();
}


// ============================================================
//  secao-plano.html
// ============================================================

function mostrarCancelar() {
  toggleVisivel('tela-plano',   false);
  toggleVisivel('tela-cancelar', true);
  const chk = document.getElementById('chk-cancelar');
  if (chk) chk.checked = false;
  const btn = document.getElementById('btn-confirmar-cancelar');
  if (btn) btn.disabled = true;
}

function voltarPlano() {
  toggleVisivel('tela-cancelar', false);
  toggleVisivel('tela-plano',    true);
}

function toggleBtnCancelar() {
  const chk = document.getElementById('chk-cancelar')?.checked;
  const btn = document.getElementById('btn-confirmar-cancelar');
  if (btn) btn.disabled = !chk;
}

function confirmarCancelamento() {
  // Em produção: PATCH /api/empresa/cancelar-plano
  window.location.href = 'dashboard.html';
}


// ============================================================
//  secao-setores.html
// ============================================================

let setoresSecao = [
  { nome: 'Elétrica',             funcionarios: 2 },
  { nome: 'Construção Civil',     funcionarios: 0 },
  { nome: 'Mecânica Automotiva',  funcionarios: 1 }
];

function renderSetoresSecao() {
  const tbody = document.getElementById('tbody-setores');
  if (!tbody) return;
  tbody.innerHTML = setoresSecao.map((s, i) => `
    <tr id="row-s-${i}">
      <td style="text-align:left; padding-left:16px;">${s.nome}</td>
      <td>
        <div id="acao-s-${i}">
          <button class="btn btn-outline" style="padding:6px 16px; font-size:13px;" onclick="confirmarExcluirSetor(${i})">Excluir</button>
        </div>
        <div id="confirm-s-${i}" style="display:none; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">
          <span id="aviso-s-${i}" style="font-size:12px; color:#7a5000; background:#fff8e1; border:1px solid #f5a623; border-radius:8px; padding:4px 10px; display:none;"></span>
          <span style="font-size:13px;">Tem certeza?</span>
          <button class="btn btn-danger" style="padding:4px 12px; font-size:12px;" onclick="excluirSetorSecao(${i})">Sim</button>
          <button class="btn btn-outline" style="padding:4px 12px; font-size:12px;" onclick="renderSetoresSecao()">Não</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function confirmarExcluirSetor(i) {
  const acao    = document.getElementById('acao-s-' + i);
  const confirm = document.getElementById('confirm-s-' + i);
  if (acao)    acao.style.display    = 'none';
  if (confirm) confirm.style.display = 'flex';
  if (setoresSecao[i].funcionarios > 0) {
    const aviso = document.getElementById('aviso-s-' + i);
    if (aviso) {
      aviso.textContent = `Este setor possui ${setoresSecao[i].funcionarios} funcionário(s). Transfira-os antes de excluir.`;
      aviso.style.display = 'inline';
    }
  }
}

function excluirSetorSecao(i) {
  if (setoresSecao[i].funcionarios > 0) return;
  // Em produção: DELETE /api/setores/:id
  setoresSecao.splice(i, 1);
  renderSetoresSecao();
}

function adicionarSetorSecao() {
  const input = document.getElementById('novo-setor');
  const erro  = document.getElementById('setor-dup-error');
  if (!input) return;
  const nome = input.value.trim();
  if (!nome) return;

  const existe = setoresSecao.some(s => s.nome.toLowerCase() === nome.toLowerCase());
  if (existe) { erro?.classList.add('show'); return; }
  erro?.classList.remove('show');

  // Em produção: POST /api/setores
  setoresSecao.push({ nome, funcionarios: 0 });
  renderSetoresSecao();
  input.value = '';
}


// ============================================================
//  DROPDOWN — abre/fecha via click, não hover
// ============================================================

function iniciarDropdown() {
  const headerRight = document.querySelector('.header-right');
  const dropdown    = document.querySelector('.dropdown-menu');
  if (!headerRight || !dropdown) return;

  headerRight.addEventListener('click', function (e) {
    const aberto = dropdown.classList.contains('aberto');
    dropdown.classList[aberto ? 'remove' : 'add']('aberto');
    e.stopPropagation();
  });

  document.addEventListener('click', function () {
    if (dropdown) dropdown.classList.remove('aberto');
  });
}


// ============================================================
//  INICIALIZAÇÃO — executa ao carregar cada página
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  // Dropdown via click
  iniciarDropdown();

  // Máscaras
  iniciarMascaraCPF();
  iniciarMascaraCNPJ();
  iniciarMascarasCartao();
  iniciarMascaraTelefone();

  // Funcionários: seleção de linha
  selecionarFuncionario();

  // Setores cadastro: Enter adiciona
  const inputSetor = document.getElementById('input-setor');
  if (inputSetor) {
    inputSetor.addEventListener('keydown', e => { if (e.key === 'Enter') adicionarSetor(); });
  }

  // Setores seção: Enter adiciona + render inicial
  const novoSetor = document.getElementById('novo-setor');
  if (novoSetor) {
    novoSetor.addEventListener('keydown', e => { if (e.key === 'Enter') adicionarSetorSecao(); });
    renderSetoresSecao();
  }
});