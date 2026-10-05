const CACHE_NAME = 'tj-refrigeracao-pwa-v44-fluxo-orcamento';
const APP_SHELL = [
  './index.html',
  './assets/tj-core.js',
  './assets/tj-pwa-update.js',
  './assets/tj-orcamento-fluxo.js',
  './assets/tj-orcamento-decisao.js',
  './assets/tj-cadastros.js',
  './assets/tj-atendimento.js',
  './assets/tj-atendimento-pecas.js',
  './assets/tj-deslocamento.js',
  './assets/tj-media-config.js',
  './assets/tj-chamado-media.js',
  './assets/tj-recibos.js',
  './assets/tj-layout.js', './assets/tj-realtime.js',
  './assets/tj-financeiro.js',
  './assets/tj-cliente-acompanhamento.js',
  './manifest.webmanifest',
  './assets/tj-logo.png',
  './assets/tj-watermark.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon-64.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.map(path => new Request(path, {cache: 'reload'})))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('tj-refrigeracao-pwa-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  const navigation=request.mode==='navigate';
  const code=/\.(?:js|css)$/.test(url.pathname);
  async function cached(){const cache=await caches.open(CACHE_NAME);return cache.match(navigation?'./index.html':request);}
  async function fresh(){
    const response=await fetch(request,{cache:'no-cache'});
    if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(navigation?'./index.html':request,response.clone());}
    return response;
  }
  event.respondWith((async()=>{
    if(navigation||code){try{return await fresh();}catch(e){return await cached()||new Response('Sem conexão. Abra novamente quando estiver online.',{status:503});}}
    return await cached()||fresh();
  })());
});
