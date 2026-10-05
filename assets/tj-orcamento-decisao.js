(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./tj-core.js'):root.TJCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.TJOwnerBudget=api;})(typeof window==='undefined'?globalThis:window,function(core){
  'use strict';
  function decide(data,uid,num,type,reason,actor,reviewed,date,iso){
    if(!['aprovado','recusado'].includes(type))throw Error('Decisão inválida.');
    const why=String(reason||'').trim();if(type==='recusado'&&(!why||why.length>500))throw Error('Informe o motivo da recusa em até 500 caracteres.');
    const quotes=data.orcamentos||[],matches=quotes.filter(q=>String(q.num)===String(num));
    if(matches.length!==1)throw Error('Orçamento removido ou com identificação duplicada. Atualize a lista.');
    const q=matches[0];if(q.clienteUid&&q.clienteUid!==uid)throw Error('O orçamento pertence a outro cliente.');
    if(q.status!=='Aguardando aprovação')throw Error('Este orçamento já recebeu uma decisão. Atualize a lista.');
    if(!core.equal(core.budgetReview(q),reviewed))throw Error('Os valores ou itens do orçamento mudaram. Feche e reabra a decisão para conferir.');
    if((data.historicoCliente||[]).length>=1000||(data.notificacoesCliente||[]).length>=500)throw Error('O histórico atingiu o limite permitido. Revise os registros antes de continuar.');
    const status=type==='aprovado'?'Aprovado':'Recusado',event=status+' pela TJ (proprietário)'+(type==='recusado'?' — '+why:'');
    const next={...q,status,[type==='aprovado'?'aprovadoEm':'recusadoEm']:date,hist:[...(q.hist||[]),{data:date,evento:event}],decisaoResponsavel:{uid:actor,perfil:'owner',tipo:type,data:iso,motivo:type==='recusado'?why:''}};
    return{orcamentos:quotes.map(item=>item===q?next:item),historicoCliente:[{data:date,tipo:'orcamento',titulo:'Orçamento #'+num+' '+status.toLowerCase()+' pela TJ',desc:event,status},...(data.historicoCliente||[])],notificacoesCliente:[{data:date,titulo:'Orçamento #'+num+' '+status.toLowerCase()+' pela TJ',desc:event,lida:false},...(data.notificacoesCliente||[])]};
  }
  return{decide};
});
(function(){
  'use strict';if(typeof module==='object'&&module.exports)return;
  const fb=()=>window.TJFB,owner=()=>state.perfilSessao==='empresa'&&fb()?.auth.currentUser;
  function button(label,fn,primary=false){const b=document.createElement('button');b.type='button';b.className=primary?'btn-tj':'btn-tj-secondary';b.textContent=label;b.onclick=fn;return b;}
  function text(tag,value){const el=document.createElement(tag);el.textContent=value;return el;}
  function actions(box,q){if(!box||!owner()||q.status!=='Aguardando aprovação'||!q.clienteUid)return;const approve=button('Aprovar orçamento',()=>open(q,'aprovado'),true),refuse=button('Recusar orçamento',()=>open(q,'recusado'));approve.dataset.tjOwnerDecision='approve';refuse.dataset.tjOwnerDecision='refuse';box.append(approve,refuse);}
  const list=renderizarOrcamentosEmpresa;renderizarOrcamentosEmpresa=function(){const result=list.apply(this,arguments);if(owner())document.querySelectorAll('#lista-emp-orcamentos .admin-record').forEach((card,index)=>{const q=(state.orcamentos||[])[index],ref=card.querySelector('[data-action="abrir-orc"]');if(q&&ref&&String(q.num)===ref.dataset.id)actions(card.querySelector('.admin-card-actions'),q);});return result;};
  const detail=renderizarDetalheOrcamento;renderizarDetalheOrcamento=function(){const result=detail.apply(this,arguments),matches=(state.orcamentos||[]).filter(q=>String(q.num)===String(orcamentoAtualNum));if(matches.length===1)actions(document.getElementById('det-orc-acoes-aprovacao'),matches[0]);return result;};
  function open(q,type){
    if(!owner()||q.status!=='Aguardando aprovação'||!q.clienteUid||document.querySelector('dialog.tj-owner-budget-dialog'))return;
    const uid=q.clienteUid,actor=fb().auth.currentUser.uid,reviewed=window.TJCore.budgetReview(q),d=document.createElement('dialog');d.className='tj-owner-budget-dialog';const form=document.createElement('form');form.append(text('h2',type==='aprovado'?'Aprovar orçamento pela TJ':'Recusar orçamento pela TJ'),text('p','Orçamento #'+q.num+' • '+q.cliente+' • '+formatarMoedaBR(q.total)),text('p',q.servico));
    form.append(text('p','A decisão será registrada como feita pelo proprietário e aparecerá no histórico do cliente.'));
    let reason=null;if(type==='recusado'){const label=text('label','Motivo da recusa');reason=document.createElement('textarea');reason.id='tj-owner-budget-reason';reason.name='motivo';reason.className='form-textarea';reason.required=true;reason.maxLength=500;reason.rows=3;label.htmlFor=reason.id;form.append(label,reason);}
    const error=text('p','');error.setAttribute('role','alert');const row=document.createElement('div');row.className='admin-card-actions';let busy=false;const save=button(type==='aprovado'?'Confirmar aprovação':'Confirmar recusa',null,true);save.type='submit';row.append(save,button('Cancelar',()=>{if(!busy)d.close();}));form.append(error,row);d.append(form);d.addEventListener('close',()=>d.remove());d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});document.body.append(d);d.showModal();
    form.onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;error.textContent='';form.querySelectorAll('button,textarea').forEach(el=>el.disabled=true);let patch;
      try{const when=new Date(),date=when.toLocaleDateString('pt-BR'),iso=when.toISOString();
        await fb().db.runTransaction(async tx=>{const db=fb().db,ref=db.collection('clientData').doc(uid),profile=await tx.get(db.collection('users').doc(actor)),customer=await tx.get(db.collection('users').doc(uid)),snapshot=await tx.get(ref);
          if(!owner()||fb().auth.currentUser.uid!==actor||profile.data()?.role!=='owner'||profile.data()?.active!==true)throw Error('Sessão administrativa inválida.');if(customer.data()?.active!==true)throw Error('Cliente inativo ou removido.');
          patch=window.TJOwnerBudget.decide(snapshot.data()||{},uid,q.num,type,reason?.value||'',actor,reviewed,date,iso);tx.set(ref,{...patch,atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        });
      }catch(e){error.textContent=e.code==='permission-denied'?'Conta sem autorização para registrar a decisão.':e.code==='unavailable'?'Sem conexão. Reconecte e tente novamente.':e.message||'Não foi possível salvar a decisão.';busy=false;form.querySelectorAll('button,textarea').forEach(el=>el.disabled=false);return;}
      d.close();if(!owner()||fb().auth.currentUser.uid!==actor)return;
      const decided=patch.orcamentos.find(item=>String(item.num)===String(q.num));state.orcamentos=(state.orcamentos||[]).map(item=>item.clienteUid===uid&&String(item.num)===String(q.num)?{...decided,clienteUid:uid,cliente:item.cliente}:item);
      toast(type==='aprovado'?'Orçamento aprovado pelo proprietário.':'Orçamento recusado pelo proprietário.');
      try{if(!await fb().carregarDadosEmpresaFirebase())throw Error('refresh');}catch(e){if(owner()&&fb().auth.currentUser.uid===actor)toast('Decisão salva. Atualize a lista para conferir todos os dados.');}
      if(owner()&&fb().auth.currentUser.uid===actor){renderizarOrcamentosEmpresa();renderizarDetalheOrcamento();window.dispatchEvent(new Event('tj-budgets-changed'));}
    };
  }
  const style=document.createElement('style');style.textContent='.tj-owner-budget-dialog{margin:auto;box-sizing:border-box;width:min(620px,calc(100% - 24px));padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--surface);color:var(--text);overflow-wrap:anywhere}.tj-owner-budget-dialog label{display:block;margin:14px 0 6px}';document.head.append(style);
  fb().auth.onAuthStateChanged(()=>document.querySelectorAll('dialog.tj-owner-budget-dialog').forEach(d=>d.close()));
})();
