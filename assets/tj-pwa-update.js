(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  let registration, dirty=false, reloading=false, lastCheck=0;
  const initiallyControlled=!!navigator.serviceWorker.controller;
  document.addEventListener('input',()=>{dirty=true;},true);
  document.addEventListener('change',()=>{dirty=true;},true);
  function refresh(){if(reloading)return;reloading=true;window.location.reload();}
  function offer(){
    if(document.getElementById('tj-update-notice'))return;
    const box=document.createElement('div');box.id='tj-update-notice';box.setAttribute('role','status');
    box.style.cssText='position:fixed;bottom:20px;left:12px;right:12px;z-index:20000;padding:14px;border-radius:12px;background:var(--surface,#fff);color:var(--text,#172033);border:1px solid var(--border,#bbb);box-shadow:0 4px 20px #0004;display:flex;flex-wrap:wrap;gap:12px;align-items:center';
    const text=document.createElement('span');text.textContent='Nova versão disponível.';
    const button=document.createElement('button');button.type='button';button.className='btn-tj';button.textContent='Atualizar aplicativo';
    button.addEventListener('click',async()=>{
      if(dirty&&!confirm('Atualizar agora? Dados ainda não salvos nos formulários serão descartados.'))return;
      button.disabled=true;
      try{if(window.state&&state.perfilSessao==='cliente'&&window.TJFB?.salvarClienteAgora)await window.TJFB.salvarClienteAgora();refresh();}
      catch(e){button.disabled=false;text.textContent='Não foi possível salvar as alterações. Tente novamente antes de atualizar.';}
    });box.append(text,button);document.body.append(box);
  }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!initiallyControlled)return;
    if(dirty||document.querySelector('dialog[open]'))offer();else refresh();
  });
  async function check(){
    if(!registration||document.visibilityState==='hidden'||!navigator.onLine||Date.now()-lastCheck<60000)return;
    lastCheck=Date.now();try{await registration.update();}catch(e){console.warn('[TJPWA] Verificação de atualização indisponível.');}
  }
  window.addEventListener('load',async()=>{
    try{
      registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&initiallyControlled&&(dirty||document.querySelector('dialog[open]')))offer();});
      });if(registration.waiting&&initiallyControlled)offer();await check();
    }catch(e){console.warn('[TJPWA] Falha ao registrar atualização.',e);}
  });
  window.addEventListener('focus',check);window.addEventListener('online',check);
  document.addEventListener('visibilitychange',check);
  setInterval(check,60000);
})();
