(function(){
  'use strict';
  let account='',generation=0,stops=[],snapshots=[],timer;
  function stop(){generation++;clearTimeout(timer);stops.forEach(fn=>fn());stops=[];snapshots=[];account='';}
  function start(){
    const fb=window.TJFB,user=fb?.auth.currentUser;
    if(state.perfilSessao!=='empresa'||!user){if(account)stop();return;}
    if(account===user.uid)return;
    stop();account=user.uid;const token=generation;
    ['clients','users','clientData'].forEach((name,index)=>{
      const ref=fb.db.collection(name);if(typeof ref.onSnapshot!=='function')return;
      stops.push(ref.onSnapshot(snap=>{
        if(token!==generation||fb.auth.currentUser?.uid!==account)return;
        snapshots[index]=snap;clearTimeout(timer);
        timer=setTimeout(async()=>{
          if(token!==generation||snapshots.filter(Boolean).length!==3)return;
          const ok=await fb.carregarDadosEmpresaFirebase(snapshots.slice());
          if(!ok||token!==generation||state.perfilSessao!=='empresa')return;
          // Refresh the visible read-only screen; never rebuild a draft or modal.
          const screen=document.querySelector('main.content-area > section:not(.hidden)');
          const views={'tela-emp-orcamentos':()=>renderizarOrcamentosEmpresa(),'tela-detalhe-orcamento':()=>renderizarDetalheOrcamento(),'tela-emp-chamados':()=>renderizarChamadosEmpresa(),'tela-emp-atendimento':()=>renderizarAtendimentoEmpresa()};
          if(views[screen?.id])views[screen.id]();
          window.dispatchEvent(new Event('tj-budgets-changed'));
        },120);
      },()=>{if(token===generation){stop();toast('A atualização em tempo real foi interrompida. Confira a conexão e reabra a aba.');}}));
    });
  }
  const navigate=abrirTela;abrirTela=function(){const result=navigate.apply(this,arguments);start();return result;};
  window.TJFB.auth.onAuthStateChanged(()=>{stop();});
  window.addEventListener('online',start);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
})();
