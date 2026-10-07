(function(){
  'use strict';
  const owner=()=>state.perfilSessao==='empresa'&&window.TJFB?.auth.currentUser;
  const current=()=>state.chamados.find(c=>String(c.num)===String(chamadoAtualNum));
  const normalize=p=>Array.isArray(p)?{descricao:String(p[0]||''),qtd:String(p[1]||''),valor:String(p[2]||'')}:{descricao:String(p.descricao||p.item||p.nome||''),qtd:String(p.qtd||p.quantidade||''),valor:String(p.valor||p.preco||''),...(p.pecaId?{pecaId:p.pecaId,estoqueQtd:p.estoqueQtd||0}:{})};
  const parts=num=>(state.atendimentos?.[num]?.pecas||[]).map(normalize);
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function money(raw){const s=String(raw).trim().replace(/^R\$\s*/,'');if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(s))throw Error('Informe o valor em reais, por exemplo 125,50.');const [w,f='']=s.replace(/\./g,'').split(',');const n=Number(w)*100+Number(f.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>99999999)throw Error('Valor acima do limite permitido.');return(n/100).toFixed(2).replace('.',',');}
  function button(label,fn){const b=document.createElement('button');b.type='button';b.className='btn-tj-secondary';b.textContent=label;b.addEventListener('click',fn);return b;}
  async function save(review,next,operation){
    if(!owner())throw Error('Acesso restrito ao proprietário.');
    const account=window.TJFB.auth.currentUser.uid,db=window.TJFB.db;
    const matches=(state.clientesFirebase||[]).filter(c=>c.nome===review.call.cliente),uid=review.call.clienteUid||(matches.length===1?matches[0].uid:'');
    if(!uid)throw Error('Cliente não identificado.');
    if(next.length>100)throw Error('Limite de 100 itens por atendimento.');
    await db.runTransaction(async tx=>{
      const actor=await tx.get(db.collection('users').doc(account)),ref=db.collection('clientData').doc(uid),snap=await tx.get(ref);
      if(!owner()||window.TJFB.auth.currentUser.uid!==account||actor.data()?.role!=='owner'||actor.data()?.active!==true)throw Error('Sessão administrativa inválida.');
      const data=snap.data()||{},call=(data.chamados||[]).find(c=>String(c.num)===String(review.call.num));
      if(!call)throw Error('Chamado removido. Atualize a lista.');
      const at=data.atendimentos?.[call.num]||{};
      if(call.status!==review.call.status||!equal((at.pecas||[]).map(normalize),review.parts))throw Error('As peças ou o chamado foram alterados em outra sessão. Atualize a lista antes de salvar.');
      await window.TJStock.changes(tx,review.parts,next,{uid,call:String(call.num),motivo:operation+' pelo proprietário.'});if(!owner()||window.TJFB.auth.currentUser.uid!==account)throw Error('Sua sessão mudou.');
      const patch={atendimentos:{...(data.atendimentos||{}),[call.num]:{...at,pecas:next}},historicoCliente:[{data:new Date().toLocaleDateString('pt-BR'),tipo:'atend',titulo:'Peças do chamado #'+call.num+' atualizadas',desc:operation+' pelo proprietário. Orçamentos preservados.',status:call.status},...(data.historicoCliente||[])],atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()};
      tx.set(ref,window.TJFirestoreSafe(patch),{merge:true});
    });
  }
  function edit(index,remove=false){
    const call=current();if(!owner()||!call||document.querySelector('dialog.tj-call-parts'))return;
    const review={call:{...call},parts:parts(call.num)},item=index==null?{descricao:'',qtd:'1',valor:'0,00'}:review.parts[index];if(!item)return;
    const d=document.createElement('dialog');d.className='tj-call-parts';d.style.cssText='box-sizing:border-box;margin:auto;width:min(560px,calc(100% - 24px));max-height:90dvh;overflow:auto;padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text)';d.setAttribute('aria-labelledby','tj-call-parts-title');
    d.innerHTML='<form><h2 id="tj-call-parts-title"></h2><p>Peças selecionadas no catálogo dão baixa ao salvar. Ao corrigir a quantidade ou remover a peça, o estoque é ajustado automaticamente. Peças informadas manualmente não movimentam estoque.</p><div class="tj-call-parts-fields"></div><p role="alert"></p><div class="admin-card-actions"><button type="submit" class="btn-tj"></button><button type="button" class="btn-tj-secondary">Cancelar</button></div></form>';
    d.querySelector('h2').textContent=remove?'Remover peça do chamado?':index==null?'Adicionar peça ao chamado':'Editar peça do chamado';
    const form=d.querySelector('form'),fields=d.querySelector('.tj-call-parts-fields'),error=d.querySelector('[role=alert]');form.querySelector('[type=submit]').textContent=remove?'Confirmar remoção':'Salvar peça';
    function field(name,label,type,value){const l=document.createElement('label');l.textContent=label;l.htmlFor='tj-call-part-'+name;l.style.cssText='display:block;margin:12px 0 5px';const input=document.createElement(type==='select'?'select':'input');input.id=l.htmlFor;input.name=name;input.className='form-input';input.style.cssText='width:100%;min-width:0;box-sizing:border-box';if(type!=='select'){input.type=type;input.value=value;}fields.append(l,input);return input;}
    let description,quantity,value,select;
    if(remove){const p=document.createElement('p');p.textContent=item.descricao+' — quantidade '+item.qtd+' — valor '+item.valor;fields.append(p);}
    else{
      select=field('catalogo','Selecionar peça cadastrada (opcional)','select');select.append(new Option('Informar manualmente — sem movimentar estoque',''));select.disabled=true;
      description=field('descricao','Peça / descrição','text',item.descricao);description.required=true;description.maxLength=200;
      quantity=field('qtd','Quantidade','number',item.qtd);quantity.required=true;quantity.min='0.001';quantity.max='1000000';quantity.step='0.001';
      value=field('valor','Valor unitário (R$)','text',item.valor);value.required=true;
      window.TJFB.db.collection('pecas').get().then(snap=>{if(!owner()||!d.isConnected)return;const catalog=snap.docs.map(doc=>({id:doc.id,...doc.data()})).filter(p=>p.ativo===true||p.id===item.pecaId);catalog.forEach(p=>select.append(new Option(p.codigo+' — '+p.nome+' • Estoque: '+p.estoque,p.id)));select.disabled=false;if(item.pecaId){if(!catalog.some(p=>p.id===item.pecaId))select.append(new Option('Peça vinculada removida do catálogo',item.pecaId));select.value=item.pecaId;}select.addEventListener('change',()=>{const p=catalog.find(p=>p.id===select.value);if(p){description.value=p.nome;value.value=(p.precoCentavos/100).toFixed(2).replace('.',',');}});}).catch(()=>{if(d.isConnected)error.textContent='Catálogo indisponível. Tente novamente antes de vincular uma peça.';});
    }
    let busy=false;d.querySelector('[type=button]').addEventListener('click',()=>{if(!busy)d.close();});d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});d.addEventListener('close',()=>d.remove());
    form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;error.textContent='';try{
      const next=review.parts.map(p=>({...p}));if(remove)next.splice(index,1);else{const q=Number(quantity.value);if(!description.value.trim()||!Number.isFinite(q)||q<=0||q>1000000)throw Error('Confira a descrição e a quantidade.');const rec={descricao:description.value.trim(),qtd:String(q),valor:money(value.value)};if(select.value){if(!Number.isInteger(q))throw Error('Para movimentar o estoque, use uma quantidade inteira.');rec.pecaId=select.value;rec.estoqueQtd=q;}else if(select.disabled&&item.pecaId){throw Error('Aguarde o catálogo antes de corrigir esta peça.');}if(index==null)next.push(rec);else next[index]=rec;}
      busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);await save(review,next,remove?'Peça removida':index==null?'Peça adicionada':'Peça corrigida');d.close();toast('Peças do chamado salvas.');try{if(await window.TJFB.carregarDadosEmpresaFirebase()===false)throw Error();renderizarAtendimentoEmpresa();}catch(e){toast('Peças salvas. Atualize a lista para visualizar.');}
    }catch(e){error.textContent=e.message;busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);}});
    document.body.append(d);d.showModal();
  }
  const original=renderizarAtendimentoEmpresa;
  renderizarAtendimentoEmpresa=function(){const result=original.apply(this,arguments);if(!owner()||!current())return result;const box=document.getElementById('atend-emp-botoes-acoes');box?.querySelector('[data-action="mostrar-form-peca"]')?.remove();if(box)box.append(button('Adicionar peça ao chamado',()=>edit(null)));
    const list=parts(current().num),rows=document.querySelectorAll('#atend-emp-pecas-body tr');list.forEach((p,i)=>{const cell=rows[i]?.lastElementChild;if(!cell)return;const actions=document.createElement('div');actions.className='admin-card-actions';actions.append(button('Editar peça',()=>edit(i)),button('Remover peça',()=>edit(i,true)));cell.append(actions);});
    document.getElementById('box-emp-peca')?.classList.add('hidden');return result;
  };
  document.addEventListener('click',e=>{if(!owner())return;const action=e.target.closest?.('[data-action]')?.dataset.action;if(['mostrar-form-peca','add-peca','salvar-peca'].includes(action)){e.preventDefault();e.stopImmediatePropagation();edit(null);}},true);
})();
