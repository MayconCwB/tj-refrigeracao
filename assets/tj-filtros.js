(function(){
  'use strict';
  const owner=()=>state.perfilSessao==='empresa'&&window.TJFB?.auth.currentUser;
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const configs=[{id:'chamados',list:'lista-emp-chamados',data:'chamados',render:'renderizarChamadosEmpresa'}, {id:'orcamentos',list:'lista-emp-orcamentos',data:'orcamentos',render:'renderizarOrcamentosEmpresa'}];
  function clientKey(r){return r.clienteUid||'nome:'+String(r.cliente||'Cliente não informado');}
  function equipment(r,c){
    const e=c.id==='orcamentos'?window.TJBudgetEquipment.resolve(r):(state.equip||[]).find(e=>e.clienteUid===r.clienteUid&&(r.equipamentoId?e.id===r.equipamentoId:e.nome===r.equip));
    const id=r.equipamentoId||e?.id||'',name=e?.nome||r.equipamentoNome||r.equip||'Equipamento não informado';
    return{key:JSON.stringify([clientKey(r),id||name]),name,label:name+' — '+(r.cliente||'Cliente não informado'),detail:[name,e?.marca,e?.modelo,e?.sn,e?.local].filter(Boolean).join(' ')};
  }
  function equipments(r,c){return r.equipamentos?.length?r.equipamentos.map(e=>equipment({...r,equipamentos:null,equipamentoId:e.id,equipamento:e,equip:e.nome,equipamentoNome:e.nome},c)):[equipment(r,c)];}
  function options(select,choices,placeholder){
    const old=select.value,oldLabel=select.selectedOptions[0]?.textContent;
    select.replaceChildren(new Option(placeholder,''));
    [...new Map(choices).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')).forEach(([value,label])=>select.append(new Option(label,value)));
    if(old&&!Array.from(select.options).some(o=>o.value===old))select.append(new Option((oldLabel||old)+' (sem registros)',old));
    select.value=old;
  }
  function setup(c){
    const list=document.getElementById(c.list);if(!list)return;
    const panel=document.createElement('div');panel.className='tj-list-filters';panel.id='tj-filters-'+c.id;
    const field=(label,name,type)=>{const group=document.createElement('div');group.className='form-group';const l=document.createElement('label');l.className='form-label';l.textContent=label;l.htmlFor=panel.id+'-'+name;const input=document.createElement(type);input.id=l.htmlFor;input.className=type==='select'?'form-select':'form-input';if(type==='input'){input.type='search';input.placeholder='Número, cliente, equipamento ou descrição';}group.append(l,input);panel.append(group);return input;};
    c.search=field('Buscar '+(c.id==='chamados'?'chamados':'orçamentos'),'search','input');
    c.client=field('Filtrar por cliente','client','select');c.equipment=field('Filtrar por equipamento','equipment','select');c.status=field('Filtrar por status','status','select');
    const actions=document.createElement('div');actions.className='admin-card-actions';const clear=document.createElement('button');clear.type='button';clear.className='btn-tj-secondary';clear.textContent='Limpar filtros';clear.onclick=()=>{c.search.value=c.client.value=c.equipment.value=c.status.value='';refresh(c);};
    c.count=document.createElement('p');c.count.setAttribute('role','status');c.count.setAttribute('aria-live','polite');c.count.className='tj-filter-count';actions.append(clear);panel.append(actions,c.count);list.before(panel);c.panel=panel;
    c.search.oninput=()=>apply(c);c.status.onchange=c.equipment.onchange=()=>apply(c);c.client.onchange=()=>{c.equipment.value='';refresh(c);};
    const original=window[c.render];window[c.render]=function(){const result=original.apply(this,arguments);refresh(c);return result;};
    refresh(c);
  }
  function refresh(c){
    if(!c.panel)return;c.panel.hidden=!owner();if(!owner())return;
    const rows=state[c.data]||[];
    options(c.client,rows.map(r=>[clientKey(r),r.cliente||'Cliente não informado']),'Todos os clientes');
    options(c.equipment,rows.filter(r=>!c.client.value||clientKey(r)===c.client.value).flatMap(r=>equipments(r,c).map(e=>[e.key,e.label])),'Todos os equipamentos');
    options(c.status,rows.map(r=>[r.status||'Aguardando início',r.status||'Aguardando início']),'Todos os status');
    apply(c);
  }
  function apply(c){
    if(!owner())return;
    const rows=state[c.data]||[],cards=Array.from(document.getElementById(c.list).querySelectorAll(':scope > .admin-record')),terms=normalize(c.search.value).trim().split(/\s+/).filter(Boolean);let count=0;
    rows.forEach((r,index)=>{const es=equipments(r,c),haystack=normalize([r.num,r.cliente,r.problema,r.servico,r.status,es.map(e=>e.detail).join(" ")].filter(Boolean).join(' '));const visible=(!c.client.value||clientKey(r)===c.client.value)&&(!c.equipment.value||es.some(e=>e.key===c.equipment.value))&&(!c.status.value||(r.status||'Aguardando início')===c.status.value)&&terms.every(t=>haystack.includes(t));if(visible)count++;if(cards[index]){cards[index].hidden=!visible;cards[index].classList.toggle('tj-filter-hidden',!visible);}});
    c.count.textContent=rows.length?(count?'Exibindo '+count+' de '+rows.length+' '+(c.id==='chamados'?'chamados':'orçamentos')+'.':'Nenhum resultado para os filtros selecionados. Toque em Limpar filtros para ver todos.'):'Nenhum '+(c.id==='chamados'?'chamado':'orçamento')+' cadastrado.';
  }
  const style=document.createElement('style');style.textContent='.tj-list-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0;padding:16px;border:1px solid var(--border);border-radius:12px}.tj-list-filters[hidden]{display:none!important}.tj-list-filters .form-group{margin:0;min-width:0}.tj-list-filters input,.tj-list-filters select{box-sizing:border-box;max-width:100%;min-width:0;width:100%}.tj-list-filters .admin-card-actions,.tj-filter-count{grid-column:1/-1}.tj-filter-count{margin:0;overflow-wrap:anywhere}.content-area #lista-emp-chamados>.tj-filter-hidden,.content-area #lista-emp-orcamentos>.tj-filter-hidden{display:none!important}@media(max-width:600px){.tj-list-filters{grid-template-columns:minmax(0,1fr);padding:12px}}';document.head.append(style);
  configs.forEach(setup);
  window.TJFB.auth.onAuthStateChanged(()=>{configs.forEach(c=>{if(!c.panel)return;c.search.value=c.client.value=c.equipment.value=c.status.value='';c.client.replaceChildren(new Option('Todos os clientes',''));c.equipment.replaceChildren(new Option('Todos os equipamentos',''));c.status.replaceChildren(new Option('Todos os status',''));c.count.textContent='';c.panel.hidden=true;});});
})();
