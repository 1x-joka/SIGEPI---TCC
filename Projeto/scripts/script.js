// ============================================================
//  INTEGRAÇÃO AO FRONT-END
// ============================================================

const API_URL = 'http://localhost:3000/api';

// SEGURANÇA: páginas com "data-protegida" no <body> exigem login. Sem token, volta ao login.
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.hasAttribute('data-protegida') && !localStorage.getItem('token')) {
    window.location.href = 'loginpage.html';
  }
});

// Helper: faz fetch já com o token do login no cabeçalho. Reaproveitável em toda tela protegida.
async function fetchAutenticado(endpoint, opcoes = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'loginpage.html';
    return null;
  }
  const cabecalhos = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    ...(opcoes.headers || {})
  };
  return fetch(`${API_URL}${endpoint}`, { ...opcoes, headers: cabecalhos });
}

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
  if (!el){
    return;
  }
  el.style.display = mostrar ? '' : 'none';
}

function setErro(id, mostrar) {
  const el = document.getElementById(id);
  if (!el){
    return;
  }
  el.classList[mostrar ? 'add' : 'remove']('show');
}


// ============================================================
//  loginpage.html
// ============================================================

async function fazerLogin() {
  const email = document.getElementById('email')?.value;
  const senha = document.getElementById('senha')?.value;
  const erro  = document.getElementById('email-error');
  if (!erro) return;

  if (!email || !senha) {
    erro.textContent = 'Preencha todos os campos.';
    erro.classList.add('show');
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/auth/login`, { // await fetch(url, {...}) = dispara a requisição. É a versão do navegador do mesmo fetch do back-end. await porque a resposta demora (vai e volta pela rede).
      // Aqui os mesmos que se configura no Postman (method, headers (Content-Type: application/json é o que se marca em "raw → JSON") e body (JSON.stringify({...}) é o JSON que se digita na aba Body))
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json(); // await resposta.json() = lê o JSON que a API devolveu (a mensagem, o token, etc.).

    if (resposta.ok) { // Se o status foi 2xx (200/201). É o front reagindo aos status codes que os controllers definiram: sucesso → segue; erro → mostra a mensagem.
      localStorage.setItem('token', dados.token); // Guarda o token do usuário no próprio navegador, ou seja, quando você transita entre telas o seu token continua guardado lá para ser usado nas outras páginas (empresa, EPI, etc.). O front vai ler esse token e mandar pra aba "Authorization" no Postman, é o ctrl c + ctrl v automático
      localStorage.setItem('usuario', JSON.stringify(dados.usuario));
      erro.classList.remove('show');

      const u = dados.usuario;
      if (u.tipo === 1) {
        // ADMIN: sem empresa -> cadastrar; com empresa -> dashboard
        window.location.href = u.empresa ? 'dashboard.html' : 'cadastrar-empresa.html';
      } else {
        // FUNCIONÁRIO: sem empresa -> código; com empresa e sem completar -> completar; senão -> meus EPIs
        if (!u.empresa) window.location.href = 'entrar-empresa.html';
        else if (!u.completou) window.location.href = 'complementar-funcionario.html';
        else window.location.href = 'meus-equipamentos.html';
      }
    } else {
      // 401 (credenciais inválidas) ou 403 (conta bloqueada/inativada)
      erro.textContent = dados.erro || 'E-mail ou senha incorretos.';
      erro.classList.add('show');
    }
  } catch (err) { // Pega o caso do servidor desligado
    erro.textContent = 'Não foi possível conectar ao servidor.';
    erro.classList.add('show');
  }
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
  if (!cpfInput) {
    return;
  }
  cpfInput.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');

    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    this.value = v;
  });
}

function iniciarMascaraTelefone() {
  const inputs = document.querySelectorAll('input[type="tel"]');
  inputs.forEach(input => {
    input.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '').substring(0, 11);

      if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      else if (v.length > 6) {
        v = v.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
      }
      else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d+)/, '($1) $2');
      }
      else if (v.length > 0) {
        v = v.replace(/^(\d+)/, '($1');
      }
      this.value = v;
    });
  });
}

async function cadastrar() {
  const nome = document.getElementById('nome')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const senha = document.getElementById('senha')?.value;
  const cpf = document.getElementById('cpf')?.value.trim();
  const tipo = document.getElementById('tipo')?.value;
  let valid = true;

  setErro('nome-error',  !nome);
  if (!nome) valid = false;
  setErro('email-error', !email || !email.includes('@'));
  if (!email || !email.includes('@')) valid = false;
  setErro('senha-error', senha.length < 8);
  if (senha.length < 8) valid = false;
  setErro('cpf-error', cpf.replace(/\D/g,'').length < 11);
  if (cpf.replace(/\D/g,'').length < 11) valid = false;
  setErro('tipo-error', !tipo);
  if (!tipo) valid = false;

  if (!valid) return;

  try {
    const resposta = await fetch(`${API_URL}/auth/cadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, cpf, tipo: parseInt(tipo) })
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      alert('Cadastro realizado com sucesso! Faça login para continuar.');
      window.location.href = 'loginpage.html';
    } else {
      // Ex.: 409 (e-mail/CPF já cadastrado) ou 400 (campos)
      alert(dados.erro || 'Erro ao cadastrar.');
    }
  } catch (err) {
    alert('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
  }
}


// ============================================================
//  termos.html
// ============================================================

function verificarCheckboxes() {
  const t = document.getElementById('chk-termos')?.checked;
  const l = document.getElementById('chk-lgpd')?.checked;
  const btn = document.getElementById('btn-aceitar');
  if (btn){
    btn.disabled = !(t && l);
  }
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

async function entrarEmpresa() {
  const codigo = document.getElementById('codigo')?.value.trim();
  const erro = document.getElementById('codigo-error');
  if (!codigo) { if (erro){ erro.textContent='Digite o código.'; erro.classList.add('show'); } return; }

  try {
    const resposta = await fetchAutenticado('/funcionario/entrar', {
      method: 'POST',
      body: JSON.stringify({ codigo })
    });
    if (!resposta) return;
    const dados = await resposta.json();
    if (resposta.ok) {
      erro?.classList.remove('show');
      window.location.href = 'complementar-funcionario.html';
    } else {
      if (erro) { erro.textContent = dados.erro || 'Código inválido.'; erro.classList.add('show'); }
    }
  } catch (err) {
    if (erro) { erro.textContent = 'Não foi possível conectar ao servidor.'; erro.classList.add('show'); }
  }
}


// ============================================================
//  cadastrar-empresa.html
// ============================================================

function iniciarMascaraCNPJ() {
  const cnpjInput = document.getElementById('cnpj');
  if (!cnpjInput){
    return;
  }
  cnpjInput.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    this.value = v;
  });

  const codigoInput = document.getElementById('codigo');
  if (codigoInput) {
    codigoInput.value = Math.floor(1000000000 + Math.random() * 9000000000);
  }
}

function previewLogo(event) {
  const file = event.target.files[0];
  if (!file){
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('logo-preview');
    const placeholder = document.getElementById('logo-placeholder');
    if (preview) {
      preview.src = e.target.result; preview.style.display = 'block';
    }
    if (placeholder) {
      placeholder.style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

async function cadastrarEmpresa() {
  const nome = document.getElementById('nome')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const cnpj = document.getElementById('cnpj')?.value.trim();
  const responsavel = document.getElementById('responsavel')?.value.trim();
  const setor = document.getElementById('setor')?.value.trim();
  const telefone = document.getElementById('telefone')?.value.trim();

  if (!nome || !email || !cnpj || !responsavel || !telefone || !setor) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  // Lê o "crachá" guardado no login
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'loginpage.html';
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/empresa/cadastrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token   // mandar o token pro back, só que forma automática
      },
      body: JSON.stringify({ nome, cnpj, responsavel, email, telefone, setor })
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      const campoCodigo = document.getElementById('codigo');
      if (campoCodigo) campoCodigo.value = dados.codigo;
      alert('Empresa cadastrada com sucesso!\nCódigo da empresa: ' + dados.codigo +
            '\nAnote e compartilhe com seus funcionários.');
      window.location.href = 'setores-empresa.html';
    } else {
      // Ex.: 409 (CNPJ já cadastrado), 401/403 (token inválido)
      alert(dados.erro || 'Erro ao cadastrar empresa.');
    }
  } catch (err) {
    alert('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
  }
}


// ============================================================
//  setores-empresa.html
// ============================================================

// Guarda os setores vindos da API (cada um com id_setor e nm_setor)
let setoresEmpresa = [];

// Ao abrir a página de setores, carrega os que já existem no banco
async function carregarSetores() {
  const lista = document.getElementById('setores-lista');
  if (!lista) return; // só roda na página que tem essa lista

  try {
    const resposta = await fetchAutenticado('/setor/listar');
    if (!resposta) return;
    if (resposta.ok) {
      setoresEmpresa = await resposta.json();
      renderSetoresEmpresa();
    }
  } catch (err) {
    alert('Não foi possível carregar os setores.');
  }
}
document.addEventListener('DOMContentLoaded', carregarSetores);

async function adicionarSetor() {
  const input = document.getElementById('input-setor');
  const erro = document.getElementById('setor-error');
  if (!input) return;
  const nome = input.value.trim();
  if (!nome) return;

  try {
    const resposta = await fetchAutenticado('/setor/cadastrar', {
      method: 'POST',
      body: JSON.stringify({ nome })
    });
    if (!resposta) return;
    const dados = await resposta.json();

    if (resposta.ok) {
      erro?.classList.remove('show');
      input.value = '';
      await carregarSetores(); // recarrega a lista atualizada do banco
    } else {
      // Ex.: 409 (setor já existe nesta empresa)
      if (erro) {
        erro.textContent = dados.erro || 'Erro ao adicionar setor.';
        erro.classList.add('show');
      }
    }
  } catch (err) {
    alert('Não foi possível conectar ao servidor.');
  }
}

function renderSetoresEmpresa() {
  const lista = document.getElementById('setores-lista');
  if (!lista) return;
  lista.innerHTML = '';

  setoresEmpresa.forEach(setor => {
    const item = document.createElement('div');
    item.className = 'setor-item';

    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = setor.nm_setor; // BLINDAGEM XSS: createElement + textContent, NUNCA innerHTML com dados do usuário, trata o nome como texto puro, ou seja, até mesmo um img aparecerá como texto literal, inofensivo

    const btn = document.createElement('button');
    btn.className = 'btn-rm';
    btn.textContent = '✕';
    btn.onclick = () => removerSetor(setor.id_setor);

    item.appendChild(nome);
    item.appendChild(btn);
    lista.appendChild(item);
  });
}

async function removerSetor(idSetor) {
  if (!confirm('Deseja realmente excluir este setor?')) return;
  try {
    const resposta = await fetchAutenticado(`/setor/${idSetor}`, { method: 'DELETE' });
    if (!resposta) return;
    const dados = await resposta.json();
    if (resposta.ok) {
      await carregarSetores();
    } else {
      // Ex.: 409 (setor com funcionários) — mostra a mensagem da trava
      alert(dados.erro || 'Não foi possível excluir o setor.');
    }
  } catch (err) {
    alert('Não foi possível conectar ao servidor.');
  }
}

async function avancar() {
  if (setoresEmpresa.length === 0) {
    alert('Adicione pelo menos um setor antes de continuar.');
    return;
  }
  window.location.href = 'dashboard.html';
}

// Carrega os setores DA EMPRESA no select (só na página de complementar)
async function carregarSetoresComplementar() {
  const select = document.getElementById('setor');
  if (!select || !document.querySelector('.card-complementar')) return;
  try {
    const resp = await fetchAutenticado('/setor/listar');
    if (resp && resp.ok) {
      const setores = await resp.json();
      setores.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id_setor;
        opt.textContent = s.nm_setor; // XSS-safe
        select.appendChild(opt);
      });
    }
  } catch (err) {}
}
document.addEventListener('DOMContentLoaded', carregarSetoresComplementar);



// ============================================================
//  complementar-funcionario.html
// ============================================================

async function avancarComplementar() {
  const setor = document.getElementById('setor')?.value;
  const nascimento = document.getElementById('nascimento')?.value;
  const setorErro = document.getElementById('setor-error');
  const nascErro = document.getElementById('nasc-error');

  let ok = true;
  if (!setor) { setorErro?.classList.add('show'); ok = false; } else setorErro?.classList.remove('show');
  if (!nascimento) { nascErro?.classList.add('show'); ok = false; } else nascErro?.classList.remove('show');
  if (!ok) return;

  try {
    const resposta = await fetchAutenticado('/funcionario/completar', {
      method: 'POST',
      body: JSON.stringify({ setor: parseInt(setor), dataNascimento: nascimento })
    });
    if (!resposta) return;
    const dados = await resposta.json();
    if (resposta.ok) {
      window.location.href = 'meus-equipamentos.html';
    } else {
      alert(dados.erro || 'Erro ao completar cadastro.');
    }
  } catch (err) {
    alert('Não foi possível conectar ao servidor.');
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
  const ca = document.getElementById('cad-ca')?.value.trim();
  const qtd = document.getElementById('cad-qtd')?.value;
  const lim = document.getElementById('cad-limite')?.value;
  const val = document.getElementById('cad-validade')?.value;
  const cat = document.getElementById('cad-cat')?.value;
  const desc = document.getElementById('cad-desc')?.value.trim();
  let ok = true;

  const caInvalido = !ca || ca.length < 3 || ca.length > 6 || !/^\d+$/.test(ca);
  setErro('cad-nome-err', !nome);
  if (!nome){
    ok = false;
  }
  setErro('cad-ca-err', caInvalido);
  if (caInvalido){
    ok = false;
  }
  setErro('cad-qtd-err', !qtd || qtd < 1);
  if (!qtd){
    ok = false;
  }
  setErro('cad-lim-err', !lim || lim < 1);
  if (!lim){
    ok = false;
  }
  setErro('cad-val-err', !val);
  if (!val){
    ok = false;
  }
  setErro('cad-cat-err', !cat);
  if (!cat){
    ok = false;
  }

  if (ok && !desc) {
    if (!confirm('A descrição está vazia. Tem certeza que deseja continuar?')){
      return;
    }
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

  setErro('add-epi-err', !epi);
  if (!epi){
    ok = false;
  }
  setErro('add-qtd-err', !qtd || qtd < 1);
  if (!qtd){
    ok = false;
  }
  setErro('add-val-err', !val);
  if (!val){
    ok = false;
  }

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

  setErro('ret-epi-err', !epi);
  if (!epi){
    ok = false;
  }
  setErro('ret-qtd-err', !qtd || qtd < 1); 
  if (!qtd || qtd < 1){
    ok = false;
  }
  setErro('ret-mot-err', !mot); 
  if (!mot){
    ok = false;
  }

  const estoques = {
    'Luva de Segurança Nitrílica': 50,
    'Capacete de Segurança': 120,
    'Óculos de Proteção Incolor': 150,
    'Botina de Segurança com Biqueira': 80
  };
  const disponivel = estoques[epi] ?? 999;
  const semEstoque = qtd > disponivel;
  setErro('ret-estoque-err', semEstoque);
  if (semEstoque){
    ok = false;
  }

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
  const busca = document.getElementById('busca')?.value.toLowerCase();
  const status = document.getElementById('filtro-status')?.value;
  document.querySelectorAll('#tbody-func tr').forEach(tr => {
    const nome = tr.dataset.nome?.toLowerCase();
    const st = tr.dataset.status;
    const okB = !busca  || nome?.includes(busca);
    const okS = !status || st === status;
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
        nome: tr.dataset.nome,
        setor: tr.dataset.setor,
        cpf: tr.dataset.cpf,
        epis: tr.dataset.epis
      };
    });
  });
}

function abrirVerificar() {
  const nome = funcSelecionado?.nome ?? 'Joaquim Pereira Lima';
  const titulo = document.getElementById('titulo-verificar');
  if (titulo){
    titulo.textContent = 'Verificação dos EPIs de ' + nome;
  }
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
  if (chk){
    chk.checked = false;
  }
  const btn = document.getElementById('btn-inativar');
  if (btn){
    btn.disabled = true;
  }
  abrirModal('modal-excluir');
}

function toggleOutroMotivo() {
  const val = document.getElementById('motivo-exclusao')?.value;
  const wrap = document.getElementById('outro-motivo-wrap');
  if (wrap){
    wrap.style.display = val === 'Outro' ? 'flex' : 'none';
  }
}

function toggleBtnInativar() {
  const chk = document.getElementById('chk-confirmar-exclusao')?.checked;
  const btn = document.getElementById('btn-inativar');
  if (btn) {
    btn.disabled = !chk;
  }
}

function inativarFuncionario() {
  // Em produção: PATCH /api/funcionarios/:id { status: 'I', motivo }
  fecharModal('modal-excluir');
}

function reporSelecionados() {
  const ids = ['chk-1', 'chk-2', 'chk-3'];
  const selecionados = ids.filter(id => document.getElementById(id)?.checked);
  if (selecionados.length === 0) {
    alert('Selecione ao menos um EPI.');
    return;
  }
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
  const tipo = document.getElementById('filtro-tipo')?.value;
  const setor = document.getElementById('filtro-setor')?.value;
  document.querySelectorAll('#tabela-hist tbody tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    const tipoOk = !tipo  || tds[1]?.textContent.trim() === tipo;
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
  if (solicitacaoEnviada){
    return;
  }
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
  const just = document.getElementById('justificativa');
  if (titulo){
    titulo.textContent = episSolicitacao[epiAtualIdx];
  }
  if (just){
    just.value = justificativasSolicitacao[epiAtualIdx] || '';
  }
  setErro('just-error', false);
}

function proximoEpi() {
  const just = document.getElementById('justificativa')?.value.trim();
  if (!just){
    setErro('just-error', true);
    return;
  }
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
  if (bannerTxt){
    bannerTxt.textContent = 'Solicitações enviadas - aguardando aprovação';
  }

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
  if (btn){
    btn.disabled = true;
  }
  const aviso = document.getElementById('aviso-pendente');
  if (aviso){
    aviso.style.display = 'block';
  }
}

function mostrarEtapaSolic(n) {
  [1, 2, 3].forEach(i => {
    const el = document.getElementById('etapa-' + i);
    if (el){
      el.style.display = i === n ? '' : 'none';
    }
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
    const txt = document.getElementById('logo-secao-txt');
    if (preview){
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
    if (txt){
      txt.style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

async function carregarSecaoEmpresa() {
  if (!document.getElementById('secao-nome')) return; // só na secao-empresa
  try {
    const resp = await fetchAutenticado('/empresa');
    if (resp && resp.ok) {
      const e = await resp.json();
      document.getElementById('secao-nome').value = e.nm_empresa || '';
      document.getElementById('secao-cnpj').value = e.cnpj_empresa || '';
      document.getElementById('secao-codigo').value = e.codigo_empresa || '';
      document.getElementById('responsavel').value = e.responsavel_empresa || '';
      document.getElementById('email').value = e.email_empresa || '';
      document.getElementById('telefone').value = e.tel_empresa || '';
    }
  } catch (err) {}
}
document.addEventListener('DOMContentLoaded', carregarSecaoEmpresa);

async function salvarAlteracoes() {
  const responsavel = document.getElementById('responsavel')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const telefone = document.getElementById('telefone')?.value.trim();
  try {
    const resp = await fetchAutenticado('/empresa', {
      method: 'PUT', body: JSON.stringify({ responsavel, email, telefone })
    });
    if (!resp) return;
    const dados = await resp.json();
    alert(resp.ok ? 'Alterações salvas com sucesso!' : (dados.erro || 'Erro ao salvar.'));
  } catch (err) { alert('Não foi possível conectar ao servidor.'); }
}

// ============================================================
//  secao-setores.html
// ============================================================

let setoresSecao = [
  {nome: 'Elétrica', funcionarios: 2},
  {nome: 'Construção Civil', funcionarios: 0},
  {nome: 'Mecânica Automotiva', funcionarios: 1}
];

let secaoSetores = [];

async function carregarSecaoSetores() {
  const tbody = document.getElementById('tbody-setores');
  if (!tbody) return;
  try {
    const resp = await fetchAutenticado('/setor/listar');
    if (resp && resp.ok) { secaoSetores = await resp.json(); renderSetoresSecao(); }
  } catch (err) { alert('Não foi possível carregar os setores.'); }
}
document.addEventListener('DOMContentLoaded', carregarSecaoSetores);

function renderSetoresSecao() {
  const tbody = document.getElementById('tbody-setores');
  if (!tbody) return;
  tbody.innerHTML = '';
  secaoSetores.forEach(s => {
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td');
    tdNome.textContent = s.nm_setor;                 // XSS-safe
    const tdAcao = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.textContent = 'Excluir';
    btn.onclick = () => excluirSetorSecao(s.id_setor);
    tdAcao.appendChild(btn);
    tr.append(tdNome, tdAcao);
    tbody.appendChild(tr);
  });
}

async function adicionarSetorSecao() {
  const input = document.getElementById('novo-setor');
  const erro = document.getElementById('setor-dup-error');
  if (!input) return;
  const nome = input.value.trim();
  if (!nome) return;
  try {
    const resp = await fetchAutenticado('/setor/cadastrar', { method: 'POST', body: JSON.stringify({ nome }) });
    if (!resp) return;
    const dados = await resp.json();
    if (resp.ok) { erro?.classList.remove('show'); input.value = ''; await carregarSecaoSetores(); }
    else { if (erro) { erro.textContent = dados.erro || 'Erro ao adicionar.'; erro.classList.add('show'); } }
  } catch (err) { alert('Não foi possível conectar ao servidor.'); }
}

async function excluirSetorSecao(idSetor) {
  if (!confirm('Deseja realmente excluir este setor?')) return;
  try {
    const resp = await fetchAutenticado(`/setor/${idSetor}`, { method: 'DELETE' });
    if (!resp) return;
    const dados = await resp.json();
    if (resp.ok) await carregarSecaoSetores();
    else alert(dados.erro || 'Não foi possível excluir o setor.'); // ex.: 409 setor com funcionários
  } catch (err) { alert('Não foi possível conectar ao servidor.'); }
}

// ============================================================
//  DROPDOWN — abre/fecha via click, não hover
// ============================================================

function iniciarDropdown() {
  const headerRight = document.querySelector('.header-right');
  const dropdown = document.querySelector('.dropdown-menu');
  if (!headerRight || !dropdown){
    return;
  }

  headerRight.addEventListener('click', function (e) {
    const aberto = dropdown.classList.contains('aberto');
    dropdown.classList[aberto ? 'remove' : 'add']('aberto');
    e.stopPropagation();
  });

  document.addEventListener('click', function () {
    if (dropdown){
      dropdown.classList.remove('aberto');
    }
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
  }
});

// ============================================================
//  funcionarios.html  (integração: listar + editar)
// ============================================================
let funcionariosCache = [];

async function carregarFuncionarios() {
  const tbody = document.getElementById('tbody-func');
  if (!tbody) return; // só roda na página de funcionários
  try {
    const resposta = await fetchAutenticado('/funcionario/listar');
    if (!resposta) return;
    if (resposta.ok) {
      funcionariosCache = await resposta.json();
      renderFuncionarios();
    }
  } catch (err) {
    alert('Não foi possível carregar os funcionários.');
  }
}
document.addEventListener('DOMContentLoaded', carregarFuncionarios);

function renderFuncionarios() {
  const tbody = document.getElementById('tbody-func');
  if (!tbody) return;
  tbody.innerHTML = '';

  funcionariosCache.forEach(f => {
    const nomeCompleto = `${f.nm_funcionario}`.trim();
    const tr = document.createElement('tr');
    tr.setAttribute('data-nome', nomeCompleto);
    tr.setAttribute('data-status', f.st_funcionario);

    const tdNome = document.createElement('td');
    tdNome.textContent = nomeCompleto; // XSS-safe

    const tdSetor = document.createElement('td');
    tdSetor.textContent = f.nm_setor || 'Sem setor';

    const tdEpis = document.createElement('td');
    tdEpis.textContent = '—';

    const tdStatus = document.createElement('td');
    tdStatus.textContent = f.st_funcionario === 'A' ? 'Ativo' : 'Inativo';

    const tdAcao = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.textContent = 'Editar';
    btn.onclick = () => abrirEditar(f.id_funcionario);
    tdAcao.appendChild(btn);

    tr.append(tdNome, tdSetor, tdEpis, tdStatus, tdAcao);
    tbody.appendChild(tr);
  });
}

async function abrirEditar(id) {
  const f = funcionariosCache.find(x => x.id_funcionario === id);
  if (!f) return;

  document.getElementById('editar-id').value = f.id_funcionario;
  document.getElementById('editar-nome').value = f.nm_funcionario;

  // Popular o select com os setores da empresa + opção "Sem setor"
  const select = document.getElementById('editar-setor');
  select.innerHTML = '<option value="">Sem setor</option>';
  try {
    const resp = await fetchAutenticado('/setor/listar');
    if (resp && resp.ok) {
      const setores = await resp.json();
      setores.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id_setor;
        opt.textContent = s.nm_setor;
        if (s.nm_setor === f.nm_setor) opt.selected = true; // pré-seleciona o atual
        select.appendChild(opt);
      });
    }
  } catch (err) {}

  abrirModal('modal-editar');
}

async function salvarEdicao() {
  const id = document.getElementById('editar-id').value;
  const nome = document.getElementById('editar-nome').value.trim();
  const setorVal = document.getElementById('editar-setor').value;
  const setor = setorVal ? parseInt(setorVal) : null; // vazio = desvincular

  if (!nome) {
    alert('Informe o nome');
    return;
  }

  try {
    const resposta = await fetchAutenticado(`/funcionario/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nome, setor })
    });
    if (!resposta) return;
    const dados = await resposta.json();
    if (resposta.ok) {
      fecharModal('modal-editar');
      await carregarFuncionarios();
    } else {
      alert(dados.erro || 'Erro ao editar funcionário.');
    }
  } catch (err) {
    alert('Não foi possível conectar ao servidor.');
  }
}

// ============================================================
//  COMENTÁRIOS
// ============================================================

// --> JSON.stringify no front → vira req.body no back; res.status().json() no back → vira resposta.json() no front.

// --> Proteção contra SQL Injection: no back-end, usa-se prepared statements (?) nas queries (requisições no banco de dados)

// --> Usar LocalStorage para guardar o token não é inseguro? o localStorage só é vulnerável se existir uma porta de entrada: um ataque de XSS (Cross-Site Scripting). Mas um sistema com XSS é vulnerável por quaisquer formas, não só localStorage, mesmo com cookies httpOnly. O cookie httpOnly protege o token de ser lido, mas não impede o atacante de usar a sessão que já está aberta. Trrocar localStorage por cookie httpOnly reduz o dano do XSS, mas não é a defesa principal. A defesa principal é não ter XSS. E o SIGEPI blinda contra XSS já embutida na integração, usando textContent em vez de innerHTML de propósito em telas que exibem dados do usuário (listar setores, funcionários, EPIs, etc.) e prepared statements (os ?) no back-end contra injeção.