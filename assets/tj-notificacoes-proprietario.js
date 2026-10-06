(function(){
  'use strict';
  const owner=()=>state.perfilSessao==='empresa'&&window.TJFB.auth.currentUser;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  let account='',stop=null,requests=[],ready=false,error='',seen=new Set();
  const key=()=> 'tj-owner-notifications-read:'+account;
  function identity(kind,uid,id){return JSON.stringify([kind,uid,String(id)]);}
  function events(){
    const calls=(state.chamados||[]).filter(c=>c.clienteUid).map(c=>({id:identity('call',c.clienteUid,c.num),title:'Chamado #'+c.num,desc:(c.cliente||'Cliente')+' • '+(c.equip||'Equipamento não informado')+' • '+(c.problema||''),status:c.status||'Aberto',date:c.data||'',screen:'tela-emp-chamados'}));
    const quotes=requests.map(r=>({id:identity('request',r.clienteUid,r.id),title:'Solicitação de orçamento',desc:(r.clienteNome||r.cliente||'Cliente')+' • '+(r.equipamentos?.length?window.TJEquipmentGroup.names(r.equipamentos):r.equipamentoNome||'Equipamento não informado')+' • '+(r.problema||r.descricao||''),status:r.status||'Solicitado',date:r.criadoEm?.toDate?.().toLocaleDateString('pt-BR')||'',screen:'tela-emp-orcamentos'}));
    return [...(window.TJPreventive?.events()||[]),...quotes,...calls];
  }
  function persist(){try{localStorage.setItem(key(),JSON.stringify([...seen].slice(-3000)));}catch(e){toast('Não foi possível guardar a leitura neste dispositivo.');}}
  function badge(){const bell=document.getElementById('btn-bell-notif'),b=document.getElementById('bell-badge');if(!owner())return;bell.style.display='flex';const count=events().filter(e=>!seen.has(e.id)).length;b.style.display=count?'inline-block':'none';b.textContent=String(count);}
  function render(){
    if(!owner())return;const box=document.getElementById('tj-owner-notifications-list'),message=document.getElementById('tj-owner-notifications-status');box.replaceChildren();message.textContent=error||(!ready?'Atualizando solicitações…':'');
    const list=events();if(!list.length)box.append(node('p','Nenhum chamado ou solicitação registrado.','list-meta'));
    list.forEach(e=>{const card=node('article',null,'list-item');card.style.cssText='display:block;overflow-wrap:anywhere;margin-bottom:12px';card.append(node('strong',e.title+(seen.has(e.id)?'':' • Não lida')),node('p',e.desc),node('p',[e.date,e.status].filter(Boolean).join(' • '),'list-meta'));const b=node('button','Abrir '+(e.screen==='tela-emp-preventiva'?'revisões':e.screen==='tela-emp-chamados'?'chamados':'orçamentos'),'btn-tj-secondary');b.type='button';b.addEventListener('click',()=>{seen.add(e.id);persist();badge();abrirTela(e.screen);});card.append(b);box.append(card);});badge();
  }
  function reset(){if(stop)stop();stop=null;account='';requests=[];seen=new Set();ready=false;error='';document.getElementById('tj-owner-notifications-list')?.replaceChildren();}
  function start(){
    if(!owner()){if(account)reset();return;}const uid=window.TJFB.auth.currentUser.uid;if(account===uid){badge();return;}reset();account=uid;try{seen=new Set(JSON.parse(localStorage.getItem(key())||'[]'));}catch(e){seen=new Set();}
    const ref=window.TJFB.db.collection('solicitacoesOrcamento');const accept=s=>{if(!owner()||account!==uid)return;requests=s.docs.map(d=>({...d.data(),id:d.id}));ready=true;error='';badge();if(!document.getElementById('tela-emp-notificacoes').classList.contains('hidden'))render();};
    if(typeof ref.onSnapshot==='function')stop=ref.onSnapshot(accept,()=>{if(account!==uid)return;error='Não foi possível atualizar as solicitações. Confira sua conexão e tente novamente.';ready=true;render();});
    else ref.get().then(accept).catch(()=>{if(account===uid){ready=true;error='Não foi possível atualizar as solicitações.';render();}});badge();
  }
  const section=node('section');section.id='tela-emp-notificacoes';section.className='hidden';section.innerHTML='<button type="button" class="btn-voltar" data-action="voltar">‹ Voltar</button><div class="card-box"><h2>Notificações</h2><p>Chamados e solicitações dos clientes. A leitura é guardada neste dispositivo.</p><div class="admin-card-actions" id="tj-owner-notifications-actions"></div><p id="tj-owner-notifications-status" role="status"></p><div id="tj-owner-notifications-list"></div></div>';document.querySelector('main.content-area').append(section);
  const actions=document.getElementById('tj-owner-notifications-actions');for(const [label,fn] of [['Marcar todas como lidas',()=>{events().forEach(e=>seen.add(e.id));persist();render();}],['Atualizar notificações',async()=>{reset();start();try{await window.TJFB.carregarDadosEmpresaFirebase();if(owner())render();}catch(e){toast('Não foi possível atualizar os chamados.');}}]]){const b=node('button',label,'btn-tj-secondary');b.type='button';b.addEventListener('click',fn);actions.append(b);}
  const navigation=abrirTela;abrirTela=function(id,history){if(id==='tela-emp-notificacoes'&&!owner())return;const result=navigation(id,history);start();if(id==='tela-emp-notificacoes'){atualizarBreadcrumb([{label:'Notificações'}]);render();}const main=document.querySelector('#painel-principal .content-area');if(main)main.scrollTop=0;return result;};
  const originalBadge=atualizarBadgeNotificacoes;atualizarBadgeNotificacoes=function(){if(owner())badge();else originalBadge();};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(owner()&&['abrir-notific','abrir-notificacoes'].includes(b?.dataset.action)){e.preventDefault();e.stopImmediatePropagation();abrirTela('tela-emp-notificacoes');}},true);
  window.addEventListener('tj-budgets-changed',()=>{if(!owner())return;badge();if(!section.classList.contains('hidden'))render();});
  window.TJFB.auth.onAuthStateChanged(()=>{reset();});
})();
