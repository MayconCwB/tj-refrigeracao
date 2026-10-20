/* Temporary project suspension: replaces previously cached application screens. */
const maintenance="<!doctype html>\n<html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"theme-color\" content=\"#0d2b43\"><title>TJ Refrigeração — Acesso temporariamente suspenso</title>\n<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#071923;color:#eaf5fc;font-family:Arial,sans-serif}main{width:min(100%,540px);padding:36px 28px;border:1px solid #294d62;border-top:4px solid #83dafa;border-radius:20px;background:#0d2b43;box-shadow:0 20px 70px #0003}header{font-size:14px;font-weight:700;letter-spacing:2px;color:#8edcf5;margin-bottom:32px}h1{font-size:clamp(26px,6vw,36px);line-height:1.2;margin:0 0 20px}p{font-size:17px;line-height:1.7;color:#bbd0de;margin:0 0 16px}.status{display:inline-block;border:1px solid #416478;border-radius:30px;padding:9px 14px;font-size:13px;color:#d9ecf8;margin-bottom:24px}footer{border-top:1px solid #294d62;padding-top:20px;margin-top:28px;font-size:13px;color:#96b4c8}</style></head>\n<body><main><header>TJ REFRIGERAÇÃO</header><span class=\"status\">ACESSO TEMPORARIAMENTE SUSPENSO</span><h1>Uma pausa por aqui.</h1><p>O site e o aplicativo estão temporariamente indisponíveis.</p><p>As atividades deste projeto foram pausadas, com retomada prevista para 2027. Agradecemos pela compreensão.</p><footer>TJ Refrigeração · Assistência técnica</footer></main>\n\n</body></html>";
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith('tj-refrigeracao')).map(name=>caches.delete(name)));
  await self.clients.claim();
  const windows=await self.clients.matchAll({type:'window'});
  await Promise.all(windows.filter(client=>client.url.startsWith(self.registration.scope)).map(client=>client.navigate(self.registration.scope).catch(()=>{})));
})()));
self.addEventListener('fetch',event=>{
  if(event.request.mode==='navigate'&&event.request.url.startsWith(self.registration.scope)){
    event.respondWith(Promise.resolve(new Response(maintenance,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
  }
});
