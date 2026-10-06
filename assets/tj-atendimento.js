(function(){
  'use strict';
  const statuses=['Aguardando início','Em atendimento','Aguardando aprovação','Concluído','Cancelado'];
  const owner=()=>state.perfilSessao==='empresa'&&window.TJFB?.auth.currentUser;
  const selected=()=>state.chamados.find(c=>String(c.num)===String(chamadoAtualNum));
  function button(label,fn){const b=document.createElement('button');b.type='button';b.className='btn-tj';b.textContent=label;b.addEventListener('click',fn);return b;}
  async function save(review,status,diagnosis,warranty){
    if(!owner())throw Error('Acesso restrito ao proprietário.');
    const account=window.TJFB.auth.currentUser.uid,db=window.TJFB.db;
    const uid=review.clienteUid||((state.clientesFirebase||[]).filter(c=>c.nome===review.cliente).length===1?(state.clientesFirebase||[]).find(c=>c.nome===review.cliente).uid:'');
    if(!uid)throw Error('Cliente não identificado. Confira o cadastro.');
    if(!statuses.includes(status)&&status!==review.status)throw Error('Status inválido.');
    if(status==='Concluído'&&!diagnosis.trim())throw Error('Registre o diagnóstico antes de finalizar.');
    await db.runTransaction(async tx=>{
      const actor=await tx.get(db.collection('users').doc(account)),ref=db.collection('clientData').doc(uid),snap=await tx.get(ref);
      if(!owner()||window.TJFB.auth.currentUser.uid!==account||actor.data()?.role!=='owner'||actor.data()?.active!==true)throw Error('Sessão administrativa inválida.');
      const data=snap.data()||{},calls=data.chamados||[],idx=calls.findIndex(c=>String(c.num)===String(review.num));
      if(idx<0)throw Error('Chamado não encontrado. Atualize a lista.');
      const current=calls[idx],at=data.atendimentos?.[current.num]||{};
      if(current.status!==review.status||(at.diag||'')!==review.diag)throw Error('O atendimento foi alterado em outra sessão. Atualize a lista antes de salvar.');
      if(current.status===status&&(at.diag||'')===diagnosis)return;
      const date=new Date().toLocaleDateString('pt-BR'),nextCalls=calls.map((c,i)=>i===idx?{...c,status}:c);
      const patch={chamados:nextCalls,chamadoIds:nextCalls.map(c=>String(c.num)),atendimentos:{...(data.atendimentos||{}),[current.num]:{...at,diag:diagnosis}},historicoCliente:[{data:date,tipo:'atend',titulo:'Atendimento #'+current.num+' atualizado',desc:status==='Concluído'?'Atendimento concluído pela TJ.':'Status: '+status,status},...(data.historicoCliente||[])],notificacoesCliente:[{data:date,titulo:status==='Concluído'?'Atendimento concluído':'Atendimento atualizado',desc:'Chamado #'+current.num+' — '+status,lida:false},...(data.notificacoesCliente||[])],atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()};
      Object.assign(patch.historicoCliente[0],{referencia:String(current.num),responsavelUid:account,responsavelPerfil:'owner',responsavelNome:actor.data().nome||'Proprietário',dataHora:new Date().toISOString(),desc:(current.status!==status?'Status: '+current.status+' → '+status+'. ':'')+((at.diag||'')!==diagnosis?'Diagnóstico atualizado.':'')});
      if(status==='Concluído'&&current.status!=='Concluído'&&warranty?.dias){patch.atendimentos[current.num].garantia=window.TJWarranty.make(warranty.dias,warranty.condicoes,account);patch.historicoCliente[0].desc+=' Garantia definida por '+warranty.dias+' dias.';}
      if(status==='Concluído'||status==='Cancelado')patch.agendamentos=(data.agendamentos||[]).map(a=>String(a.chamado||'')===String(current.num)?{...a,status}:a);
      tx.set(ref,window.TJFirestoreSafe(patch),{merge:true});
    });
  }
  function edit(initialStatus){
    const call=selected();if(!owner()||!call||document.querySelector('dialog.tj-atendimento-dialog'))return;
    const review={...call,diag:state.atendimentos?.[call.num]?.diag||''};
    const dialog=document.createElement('dialog');dialog.className='tj-atendimento-dialog';dialog.setAttribute('aria-labelledby','tj-atendimento-title');dialog.style.cssText='margin:auto;width:min(560px,calc(100% - 24px));max-height:90dvh;overflow:auto;padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text)';
    dialog.innerHTML='<form><h2 id="tj-atendimento-title">Atualizar atendimento</h2><label for="tj-atendimento-status">Status</label><select id="tj-atendimento-status" class="form-select"></select><label for="tj-atendimento-diag">Diagnóstico técnico</label><textarea id="tj-atendimento-diag" class="form-textarea" rows="5" maxlength="5000"></textarea><p role="alert"></p><div class="admin-card-actions"><button type="submit" class="btn-tj">Salvar atendimento</button><button type="button" class="btn-tj-secondary">Cancelar</button></div></form>';
    const form=dialog.querySelector('form'),select=dialog.querySelector('select'),diag=dialog.querySelector('textarea'),error=dialog.querySelector('[role=alert]');
    const warrantyFields=document.createElement('div');warrantyFields.innerHTML='<label for="tj-att-warranty-days">Garantia do serviço</label><select id="tj-att-warranty-days" class="form-select"><option value="0">Não definir agora</option><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option><option value="180">180 dias</option><option value="365">365 dias</option></select><label for="tj-att-warranty-terms">Condições e cobertura da garantia</label><textarea id="tj-att-warranty-terms" class="form-textarea" maxlength="2000" rows="3" placeholder="Descreva os serviços e peças cobertos"></textarea>';form.insertBefore(warrantyFields,error);const warrantyDays=warrantyFields.querySelector('select'),warrantyTerms=warrantyFields.querySelector('textarea');select.addEventListener('change',()=>{warrantyFields.hidden=select.value!=='Concluído'||review.status==='Concluído';});
    [...new Set([...statuses,review.status].filter(Boolean))].forEach(s=>select.append(new Option(s,s)));select.value=initialStatus||review.status||'Aguardando início';diag.value=review.diag;
    warrantyFields.hidden=select.value!=='Concluído'||review.status==='Concluído';
    let busy=false;dialog.querySelector('[type=button]').addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
    form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;error.textContent='';form.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{if(select.value==='Concluído'&&review.status!=='Concluído'&&Number(warrantyDays.value)>0&&!warrantyTerms.value.trim())throw Error('Informe as condições da garantia.');await save(review,select.value,diag.value.trim(),{dias:Number(warrantyDays.value),condicoes:warrantyTerms.value.trim()});dialog.close();toast('Atendimento salvo.');try{if(await window.TJFB.carregarDadosEmpresaFirebase()===false)throw Error('Falha ao atualizar');renderizarAtendimentoEmpresa();window.dispatchEvent(new Event('tj-warranty-changed'));}catch(e){toast('Atendimento salvo. Atualize a lista para visualizar.');}}
      catch(e){error.textContent=e.message;busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
    });document.body.append(dialog);dialog.showModal();
  }
  const render=renderizarAtendimentoEmpresa;
  renderizarAtendimentoEmpresa=function(){const result=render.apply(this,arguments),box=document.getElementById('atend-emp-botoes-acoes'),call=selected();if(!box)return result;const parts=box.querySelector('[data-action="mostrar-form-peca"]');box.replaceChildren();if(!owner()||!call)return result;
    box.append(button('Alterar status / diagnóstico',()=>edit()));
    if(call.status!=='Concluído'&&call.status!=='Cancelado'){if(call.status!=='Em atendimento')box.append(button('Iniciar atendimento',()=>edit('Em atendimento')));box.append(button('Finalizar atendimento',()=>edit('Concluído')));}
    if(parts)box.append(parts);return result;
  };
})();
