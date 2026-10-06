(function(){
  'use strict';
  let generation=0;
  function snapshot(e){return e?{id:e.id||'',nome:e.nome||'',marca:e.marca||'',modelo:e.modelo||'',sn:e.sn||'',local:e.local||''}:null;}
  function resolve(q){
    if(q.equipamento?.nome)return q.equipamento;
    const uid=q.clienteUid||(state.perfilSessao==='cliente'?window.TJFB?.auth.currentUser?.uid:'');
    const matches=(state.equip||[]).filter(e=>e.id===q.equipamentoId&&(e.clienteUid===uid||state.perfilSessao==='cliente'&&!e.clienteUid));
    if(q.equipamentoId&&matches.length===1)return matches[0];
    return q.equipamentoNome?{nome:q.equipamentoNome}:null;
  }
  function describe(q){if(q.equipamentos?.length>1)return q.equipamentos.map(e=>describe({equipamento:e})).join(" | ");const e=resolve(q);return e?[e.nome,e.marca&&'Marca: '+e.marca,e.modelo&&'Modelo: '+e.modelo,e.sn&&'S/N: '+e.sn,e.local&&'Local: '+e.local].filter(Boolean).join(' • '):'Equipamento não informado neste orçamento';}
  async function fill(uid,id,groupIds=[]){
    const token=++generation,sel=document.getElementById('novo-orc-equipamento'),actor=window.TJFB.auth.currentUser?.uid;
    document.getElementById(sel.id+'-extras')?.remove();sel._tjGroupList=[];sel._tjGroupSelected=new Set();sel.replaceChildren(new Option('Carregando equipamentos…',''));sel.disabled=true;sel._tjEquipment=[];
    if(!uid){sel.replaceChildren(new Option('Selecione o cliente primeiro',''));return;}
    try{const doc=await window.TJFB.db.collection('clientData').doc(uid).get();if(token!==generation||window.TJFB.auth.currentUser?.uid!==actor||document.getElementById('novo-orc-cli').value!==uid)return;
      const list=doc.exists&&Array.isArray(doc.data().equip)?doc.data().equip:[];
      sel._tjEquipment=list;sel.replaceChildren(new Option(list.length?'Selecione o equipamento':'Nenhum equipamento cadastrado',''));
      for(const e of list)sel.append(new Option([e.nome,e.marca,e.modelo,e.sn&&'S/N: '+e.sn].filter(Boolean).join(' • '),e.id));
      if(id){sel.value=id;if(!sel.value){sel.append(new Option('Equipamento anterior (não consta mais no cadastro)',id));sel.value=id;}}
      window.TJEquipmentGroup.mount(sel,list,groupIds);sel.disabled=false;
    }catch(e){if(token===generation){sel.replaceChildren(new Option('Falha ao carregar. Selecione novamente o cliente.',''));toast('Não foi possível carregar os equipamentos do orçamento.');}}
  }
  document.addEventListener('change',e=>{if(e.target.id==='novo-orc-cli')fill(e.target.value,'');});
  window.TJBudgetEquipment={snapshot,resolve,describe,fill};
})();
