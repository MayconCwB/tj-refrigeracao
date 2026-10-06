(function(){
  'use strict';
  const fb=()=>window.TJFB,owner=()=>state.perfilSessao==='empresa'&&fb().auth.currentUser;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  let plans=[],account='',role='',stop=null,generation=0,error='',ready=false;
  const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),get=type=>parts.find(p=>p.type===type).value;return get('year')+'-'+get('month')+'-'+get('day');};
  function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(new Date(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
  function status(p,date=today()){if(!validDate(p.dataRevisao))return 'Data inválida';const days=Math.round((Date.parse(p.dataRevisao+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);return days<0?'Vencida':days===0?'Hoje':days<=7?'Próxima':'Programada';}
  const label=p=>p.dataRevisao.split('-').reverse().join('/');
  const idFor=(uid,id)=>encodeURIComponent(JSON.stringify([uid,String(id)]));
  const planFor=e=>plans.find(p=>p.clienteUid===(e.clienteUid||fb().auth.currentUser?.uid)&&String(p.equipamentoId)===String(e.id));
  function events(){return owner()?plans.filter(p=>['Vencida','Hoje','Próxima'].includes(status(p))).map(p=>({id:JSON.stringify(['preventiva',p.clienteUid,p.equipamentoId,p.dataRevisao,status(p)]),title:'Revisão '+status(p).toLowerCase(),desc:p.clienteNome+' • '+p.equipamentoNome,date:label(p),status:status(p),screen:'tela-emp-preventiva'})):[];}
  function stopAll(){generation++;stop?.();stop=null;account='';role='';plans=[];ready=false;error='';document.querySelector('.tj-preventive-dialog')?.close();}
  function update(){render();decorate();window.dispatchEvent(new Event('tj-budgets-changed'));}
  function start(force=false){
    const user=fb().auth.currentUser,currentRole=state.perfilSessao;if(!user||!['cliente','empresa'].includes(currentRole)){if(account)stopAll();return;}
    if(!force&&account===user.uid&&role===currentRole)return;stopAll();account=user.uid;role=currentRole;const token=generation;
    let query=fb().db.collection('manutencoesPreventivas');if(role==='cliente')query=query.where('clienteUid','==',account);
    const accept=s=>{if(token!==generation||fb().auth.currentUser?.uid!==account)return;plans=s.docs.map(d=>({...d.data(),id:d.id}));ready=true;error='';update();};
    const fail=()=>{if(token!==generation)return;plans=[];ready=true;error='Não foi possível carregar as revisões. Confira a conexão e tente atualizar.';update();};
    if(typeof query.onSnapshot==='function')stop=query.onSnapshot(accept,fail);else query.get().then(accept).catch(fail);
  }
  async function edit(e){
    if(!owner()||document.querySelector('.tj-preventive-dialog'))return;const actor=fb().auth.currentUser.uid,uid=e.clienteUid;if(!uid)return toast('Cliente não identificado. Abra pela lista de equipamentos.');
    const d=node('dialog',null,'tj-preventive-dialog');d.style.cssText='margin:auto;width:min(520px,calc(100% - 24px));padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text)';d.innerHTML='<form><h2>Próxima revisão</h2><p class="tj-preventive-equipment"></p><label for="tj-preventive-date">Data da próxima revisão</label><input id="tj-preventive-date" type="date" class="form-input" required><label for="tj-preventive-note">Orientações para o cliente (opcional)</label><textarea id="tj-preventive-note" class="form-input" rows="3" maxlength="500"></textarea><p role="alert"></p><div class="admin-card-actions"><button type="submit" class="btn-tj">Salvar revisão</button><button type="button" class="btn-tj-secondary">Cancelar</button><button type="button" class="btn-tj-danger">Remover programação</button></div></form>';
    d.querySelector('.tj-preventive-equipment').textContent=e.nome+' — '+e.cliente;const date=d.querySelector('input'),note=d.querySelector('textarea'),buttons=d.querySelectorAll('button'),alert=d.querySelector('[role=alert]'),ref=fb().db.collection('manutencoesPreventivas').doc(idFor(uid,e.id));let busy=true,review=null;
    const disabled=v=>{busy=v;buttons.forEach(b=>b.disabled=v);date.disabled=note.disabled=v;};disabled(true);buttons[1].addEventListener('click',()=>{if(!busy)d.close();});d.addEventListener('cancel',ev=>{if(busy)ev.preventDefault();});d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
    try{const s=await ref.get();if(!d.isConnected||!owner()||fb().auth.currentUser.uid!==actor)return;review=s.exists?s.data():null;date.value=review?.dataRevisao||'';note.value=review?.observacao||'';disabled(false);buttons[2].hidden=!review;}catch(err){alert.textContent='Não foi possível carregar esta revisão. Feche e tente novamente.';buttons[1].disabled=false;busy=false;return;}
    async function save(remove){
      if(busy)return;if(!remove&&!validDate(date.value)){alert.textContent='Informe uma data válida.';return;}const nextDate=date.value,nextNote=note.value.trim();disabled(true);alert.textContent='';
      try{await fb().db.runTransaction(async tx=>{
        const actorDoc=await tx.get(fb().db.collection('users').doc(actor)),customer=await tx.get(fb().db.collection('users').doc(uid)),data=await tx.get(fb().db.collection('clientData').doc(uid)),live=await tx.get(ref);
        if(!owner()||fb().auth.currentUser.uid!==actor||actorDoc.data()?.role!=='owner'||actorDoc.data()?.active!==true)throw Error('Sessão administrativa inválida.');
        const current=live.exists?live.data():null;if(JSON.stringify(current)!==JSON.stringify(review))throw Error('A revisão mudou em outra sessão. Feche e abra novamente antes de salvar.');
        if(remove){tx.delete(ref);return;}
        const eq=(data.data()?.equip||[]).find(x=>String(x.id)===String(e.id));if(customer.data()?.active!==true||!eq)throw Error('Cliente inativo ou equipamento removido. Atualize a lista.');
        tx.set(ref,{clienteUid:uid,clienteNome:customer.data().nome||e.cliente||'Cliente',equipamentoId:String(eq.id),equipamentoNome:eq.nome,dataRevisao:nextDate,observacao:nextNote,atualizadoPor:actor,atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()});
      });d.close();toast(remove?'Programação removida.':'Próxima revisão salva.');start(true);
      }catch(err){alert.textContent=err.message;disabled(false);buttons[2].hidden=!review;}
    }
    d.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();save(false);});buttons[2].addEventListener('click',()=>save(true));
  }
  function decorate(){
    for(const [id,isOwner] of [['lista-emp-equipamentos',true],['lista-cli-equipamentos',false]]){
      const box=document.getElementById(id);if(!box||state.perfilSessao!==(isOwner?'empresa':'cliente'))continue;box.querySelectorAll('.tj-preventive-info').forEach(n=>n.remove());
      const equipment=(state.equip||[]).filter(e=>isOwner||!e.clienteUid||e.clienteUid===fb().auth.currentUser?.uid);
      Array.from(box.children).forEach((card,i)=>{const e=equipment[i];if(!e)return;const info=node('div',null,'tj-preventive-info');info.style.cssText='margin-top:10px;overflow-wrap:anywhere';const p=planFor(e);info.append(node('p',error?'Revisão indisponível.':!ready?'Carregando revisão…':p?'Próxima revisão: '+label(p)+' • '+status(p):'Sem revisão programada.','list-meta'));if(p?.observacao)info.append(node('p',p.observacao));if(isOwner){const b=node('button','Definir / alterar revisão','btn-tj-secondary');b.type='button';b.addEventListener('click',ev=>{ev.stopPropagation();edit(e);});info.append(b);}card.append(info);});
    }
  }
  const section=node('section');section.id='tela-emp-preventiva';section.className='hidden';section.innerHTML='<button type="button" class="btn-voltar" data-action="voltar">‹ Voltar</button><div class="card-box"><h2>Manutenção preventiva</h2><p>Defina a próxima revisão de cada equipamento. Os avisos aparecem sete dias antes; a data não cria um agendamento de visita.</p><div class="admin-card-actions"><button type="button" class="btn-tj-secondary" id="tj-preventive-refresh">Atualizar revisões</button><button type="button" class="btn-tj" data-action="nav-tela" data-id="tela-emp-equipamentos">Programar em Equipamentos</button></div><label for="tj-preventive-filter">Situação</label><select class="form-select" id="tj-preventive-filter"><option value="">Todas</option><option>Vencida</option><option>Hoje</option><option>Próxima</option><option>Programada</option></select><p role="status" id="tj-preventive-status"></p><div id="tj-preventive-list"></div></div>';document.querySelector('main.content-area').append(section);
  function render(){if(!owner())return;const box=document.getElementById('tj-preventive-list');box.replaceChildren();document.getElementById('tj-preventive-status').textContent=error||(!ready?'Carregando revisões…':'');const filter=document.getElementById('tj-preventive-filter').value;const rows=plans.filter(p=>!filter||status(p)===filter).sort((a,b)=>a.dataRevisao.localeCompare(b.dataRevisao));if(ready&&!error&&!rows.length)box.append(node('p','Nenhuma revisão nesta situação.','list-meta'));rows.forEach(p=>{const card=node('article',null,'list-item');card.style.cssText='display:block;overflow-wrap:anywhere;margin-bottom:12px';card.append(node('strong',p.equipamentoNome+' — '+p.clienteNome),node('p',label(p)+' • '+status(p)),node('p',p.observacao||''));const e=(state.equip||[]).find(e=>e.clienteUid===p.clienteUid&&String(e.id)===p.equipamentoId)||{id:p.equipamentoId,nome:p.equipamentoNome,clienteUid:p.clienteUid,cliente:p.clienteNome};const b=node('button','Alterar revisão','btn-tj-secondary');b.type='button';b.addEventListener('click',()=>edit(e));card.append(b);box.append(card);});}
  document.getElementById('tj-preventive-filter').addEventListener('change',render);document.getElementById('tj-preventive-refresh').addEventListener('click',()=>start(true));const nav=node('button',null,'drawer-card');nav.type='button';nav.dataset.action='nav-tela';nav.dataset.id=section.id;nav.innerHTML='<span class="drawer-card-icon">📅</span><span class="drawer-card-content"><span class="drawer-card-title">Manutenção preventiva</span><span class="drawer-card-desc">Próximas revisões e vencimentos</span></span><span class="drawer-card-arrow">→</span>';document.getElementById('drawer-nav-empresa').append(nav);
  const ownerRender=renderizarEquipamentosEmpresa;renderizarEquipamentosEmpresa=function(){const r=ownerRender.apply(this,arguments);start();decorate();return r;};const clientRender=renderizarEquipamentosCliente;renderizarEquipamentosCliente=function(){const r=clientRender.apply(this,arguments);start();decorate();return r;};
  const navigate=abrirTela;abrirTela=function(id,history){if(id===section.id&&!owner())return;const r=navigate(id,history);start();if(id===section.id){atualizarBreadcrumb([{label:'Manutenção preventiva'}]);render();}const main=document.querySelector('#painel-principal .content-area');if(main)main.scrollTop=0;return r;};
  fb().auth.onAuthStateChanged(()=>{stopAll();document.getElementById('tj-preventive-list').replaceChildren();document.getElementById('tj-preventive-filter').value='';});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&account)update();});let lastDay=today();setInterval(()=>{if(account&&today()!==lastDay){lastDay=today();update();}},60000);
  window.TJPreventive={events,status,validDate,idFor};
})();
