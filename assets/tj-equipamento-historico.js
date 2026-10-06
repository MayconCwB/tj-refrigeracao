(function(){
  'use strict';
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  let selected=null,generation=0;
  const uidOf=e=>e.clienteUid||(state.perfilSessao==='cliente'?window.TJFB.auth.currentUser?.uid:'');
  function match(record,e,all){
    if(record.equipamentoId)return String(record.equipamentoId)===String(e.id);
    const name=record.equipamentoNome||record.equipamento?.nome||record.equip;
    return !!name&&name===e.nome&&all.filter(x=>x.nome===name).length===1;
  }
  function dateValue(s){const m=String(s||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?Date.UTC(+m[3],+m[2]-1,+m[1]):0;}
  function money(v){if(v==null||v==='')return 'Não informado';let s=String(v).replace(/R\$\s*/,'').trim();if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não informado';}
  function rows(box,title,list,draw){box.append(el('h3',title));if(!list.length){box.append(el('p','Nenhum registro vinculado a este equipamento.','list-meta'));return;}list.forEach(x=>{const card=el('article',null,'list-item');card.style.cssText='display:block;min-width:0;overflow-wrap:anywhere;margin-bottom:12px';draw(card,x);box.append(card);});}
  async function open(e){
    const auth=window.TJFB.auth,user=auth.currentUser,uid=uidOf(e);if(!user||!uid||state.perfilSessao!=='empresa'&&uid!==user.uid)return;
    document.querySelector('.tj-equipment-history')?.close();const token=++generation,account=user.uid;
    const d=el('dialog',null,'tj-equipment-history');d.style.cssText='box-sizing:border-box;margin:auto;width:min(760px,calc(100% - 24px));max-height:90dvh;overflow:auto;padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text);overflow-wrap:anywhere';d.setAttribute('aria-labelledby','tj-equipment-history-title');
    const h=el('h2','Histórico — '+e.nome);h.id='tj-equipment-history-title';const body=el('div'),close=el('button','Fechar','btn-tj-secondary');close.type='button';close.addEventListener('click',()=>d.close());d.append(h,body,close);d.addEventListener('close',()=>{generation++;d.remove();});document.body.append(d);d.showModal();body.append(el('p','Carregando histórico…','list-meta'));
    async function load(){
      body.replaceChildren(el('p','Carregando histórico…','list-meta'));
      try{
        const snap=await window.TJFB.db.collection('clientData').doc(uid).get();if(!d.isConnected||token!==generation||auth.currentUser?.uid!==account)return;
        const data=snap.data()||{},all=data.equip||[],fresh=all.find(x=>String(x.id)===String(e.id));body.replaceChildren();if(!fresh){body.append(el('p','Este equipamento não está mais cadastrado.'));return;}
        h.textContent='Histórico — '+fresh.nome;body.append(el('p',[e.cliente,fresh.marca,fresh.modelo,fresh.sn?'S/N: '+fresh.sn:'',fresh.local].filter(Boolean).join(' • '),'list-meta'));
        const calls=(data.chamados||[]).filter(c=>match(c,fresh,all)).sort((a,b)=>dateValue(b.data)-dateValue(a.data));
        const quotes=(data.orcamentos||[]).filter(q=>match(q,fresh,all)||!q.equipamentoId&&calls.some(c=>String(c.orcamentoNum||'')===String(q.num)||String(q.chamado||'')===String(c.num)||(data.agendamentos||[]).some(a=>String(a.chamado||'')===String(c.num)&&String(a.orcamentoNum||'')===String(q.num))));
        body.append(el('p',calls.length+' chamados • '+quotes.length+' orçamentos'));
        body.append(el('p','Valores de orçamento e peças utilizadas são apresentados separadamente. Não representam pagamentos recebidos.','list-meta'));
        rows(body,'Atendimentos e peças utilizadas',calls,(card,c)=>{
          const at=data.atendimentos?.[c.num]||{};card.append(el('strong','Chamado #'+c.num),criarBadge(c.status||'Sem status'),el('p','Data: '+(c.data||'Não informada')),el('p','Solicitação: '+(c.problema||'Não informada')),el('p','Diagnóstico / serviço realizado: '+(at.diag||'Ainda não registrado')));
          const parts=at.pecas||[];card.append(el('strong','Peças utilizadas'));if(!parts.length)card.append(el('p','Nenhuma peça registrada.','list-meta'));parts.forEach(p=>{const name=Array.isArray(p)?p[0]:p.descricao||p.nome||p.item,qty=Array.isArray(p)?p[1]:p.qtd||p.quantidade,value=Array.isArray(p)?p[2]:p.valor??p.preco;card.append(el('p',(name||'Peça')+' • Quantidade: '+(qty||'Não informada')+' • Valor unitário: '+money(value)));});
        });
        rows(body,'Orçamentos vinculados',quotes,(card,q)=>{card.append(el('strong','Orçamento #'+q.num),criarBadge(q.status||'Sem status'),el('p',q.servico||'Serviço não informado'),el('p','Total orçado: '+money(q.total)));});
      }catch(err){if(!d.isConnected||token!==generation||auth.currentUser?.uid!==account)return;body.replaceChildren(el('p','Não foi possível carregar o histórico. Confira sua conexão.'));const retry=el('button','Tentar novamente','btn-tj-secondary');retry.type='button';retry.addEventListener('click',load);body.append(retry);}
    }await load();
  }
  function add(id,list){const box=document.getElementById(id);if(!box)return;Array.from(box.children).forEach((card,i)=>{const e=list[i];if(!e)return;const b=el('button','Ver histórico do equipamento','btn-tj-secondary');b.type='button';b.style.marginTop='10px';b.addEventListener('click',event=>{event.stopPropagation();open(e);});card.append(b);});}
  const ownerRender=renderizarEquipamentosEmpresa;renderizarEquipamentosEmpresa=function(){const r=ownerRender.apply(this,arguments);if(state.perfilSessao==='empresa')add('lista-emp-equipamentos',state.equip||[]);return r;};
  const clientRender=renderizarEquipamentosCliente;renderizarEquipamentosCliente=function(){const r=clientRender.apply(this,arguments);if(state.perfilSessao==='cliente')add('lista-cli-equipamentos',(state.equip||[]).filter(e=>uidOf(e)===window.TJFB.auth.currentUser?.uid));return r;};
  document.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target)return;if(target.dataset.action==='abrir-equip'){const card=target.closest('#lista-emp-equipamentos > .list-item');selected=card?(state.equip||[])[Array.from(card.parentNode.children).indexOf(card)]:null;}
    if(['abrir-hist-equip','hist-equip'].includes(target.dataset.action)){event.preventDefault();event.stopImmediatePropagation();const matches=(state.equip||[]).filter(x=>String(x.id)===String(equipAtualId));const e=selected&&String(selected.id)===String(equipAtualId)?selected:matches.length===1?matches[0]:null;if(e)open(e);else toast('Abra o histórico pela lista de equipamentos para identificar o cliente correto.');}
  },true);
  window.TJFB.auth.onAuthStateChanged(()=>{selected=null;generation++;document.querySelector('.tj-equipment-history')?.close();});
})();
