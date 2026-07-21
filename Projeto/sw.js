// sw.js = Um script que fica em segundo plano e guarda os arquivos pra abrir offline
// manifest.json = A "identidade" do app: nome, cor, ícone, por onde abre

const CACHE_NOME = 'sigepi-v6'; // Sempre que mexer no sw.js troque para 'sigepi-v1,v2,v3,v4,v5,...'

// Arquivos que ficam guardados para o app abrir mesmo sem internet
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './estilos/style.css',
  './scripts/script.js',
  './imagens/logo.png',
  './imagens/icone-192.png',
  './imagens/icone-512.png',
  './paginas/termos.html',
  './paginas/loginpage.html',
  './paginas/signuppage.html',
  './paginas/cadastrar-empresa.html',
  './paginas/entrar-empresa.html',
  './paginas/complementar-funcionario.html',
  './paginas/dashboard.html',
  './paginas/epis.html',
  './paginas/funcionarios.html',
  './paginas/historico.html',
  './paginas/meus-equipamentos.html',
  './paginas/secao-empresa.html',
  './paginas/secao-setores.html',
  './paginas/setores-empresa.html'
];

// 1) INSTALAÇÃO: baixa e guarda os arquivos acima
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then(cache => cache.addAll(ARQUIVOS))
  );
  self.skipWaiting();
});

// 2) ATIVAÇÃO: apaga caches de versões antigas
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(chaves =>
      Promise.all(chaves.filter(c => c !== CACHE_NOME).map(c => caches.delete(c)))
    )
  );
  self.clients.claim();
});

// 3) REQUISIÇÕES: decide o que responder
self.addEventListener('fetch', evento => {
  const url = new URL(evento.request.url);

  // NUNCA guardar respostas da API: dado sensível não fica no aparelho
  // e estoque/entrega não podem aparecer desatualizados
  if (url.pathname.startsWith('/api') || url.port === '3000') {
    return;
  }

  if (evento.request.method !== 'GET') {
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then(resposta => resposta || fetch(evento.request))
  );
});