(function(){
  'use strict';
  function mine(record){const uid=window.TJFB.auth.currentUser?.uid;return !!uid&&(record.clienteUid?record.clienteUid===uid:record.cliente===clienteAtualNome);}
  function terminal(status){return ['concluído','concluido','realizado','cancelado'].includes(String(status||'').toLowerCase());}
  function renderAgenda(){
    const box=document.getElementById('lista-agenda-completa');if(!box)return;box.replaceChildren();
    const calls=(state.chamados||[]).filter(mine),rows=[];
    (state.agendamentos||[]).filter(mine).forEach(a=>{const call=calls.find(c=>String(c.num)===String(a.chamado));rows.push({id:a.id,call:a.chamado,title:call?.equip||a.tipo||'Visita técnica',date:a.agend||[a.data,a.hora].filter(Boolean).join(' '),status:call&&terminal(call.status)?call.status:a.status||'Agendado',local:a.local});});
    calls.forEach(c=>{if(!c.agend||/^(aguardando|a definir|a confirmar|ainda)/i.test(c.agend)||rows.some(r=>String(r.call)===String(c.num)))return;rows.push({call:c.num,title:c.equip,date:c.agend,status:c.status});});
    if(!rows.length){box.textContent='Nenhum agendamento registrado nesta conta.';return;}
    for(const [completed,title] of [[false,'Próximos atendimentos'],[true,'Concluídos e cancelados']]){const list=rows.filter(r=>terminal(r.status)===completed);if(!list.length)continue;const h=document.createElement('h3');h.textContent=title;box.append(h);list.forEach(r=>{const card=document.createElement('div');card.className='list-item';const heading=document.createElement('div');heading.className='list-header';const label=document.createElement('span');label.className='list-title';label.textContent=r.title||'Atendimento';heading.append(label,criarBadge(r.status));const date=document.createElement('p');date.className='list-meta';date.textContent=r.date||'Data não informada';card.append(heading,date);if(r.local){const p=document.createElement('p');p.textContent=r.local;card.append(p);}if(r.call&&calls.some(c=>String(c.num)===String(r.call))){const b=document.createElement('button');b.type='button';b.className='btn-tj-secondary';b.dataset.action='abrir-chamado';b.dataset.id=r.call;b.textContent='Ver chamado e diagnóstico';card.append(b);}box.append(card);});}
  }
  renderizarAgendaCompleta=renderAgenda;
  let queue=Promise.resolve(),generation=0;
  const screens={'tela-cli-dash':()=>renderizarDashCliente(),'tela-cli-chamados':()=>renderizarChamadosCliente(),'tela-cli-agenda':renderAgenda,'tela-cli-historico':()=>renderizarHistoricoCliente(),'tela-cli-detalhe-chamado':()=>renderizarDetalheChamadoCliente()};
  const original=abrirTela;
  abrirTela=function(id,history){const result=original(id,history);if(state.perfilSessao!=='cliente'||!screens[id]||!window.TJFB.auth.currentUser)return result;
    const uid=window.TJFB.auth.currentUser.uid,token=++generation;
    queue=queue.catch(()=>{}).then(async()=>{if(token!==generation||state.perfilSessao!=='cliente'||window.TJFB.auth.currentUser?.uid!==uid)return;
      try{await window.TJFB.atualizarDadosCliente();if(token===generation&&state.perfilSessao==='cliente'&&window.TJFB.auth.currentUser?.uid===uid)screens[id]();}
      catch(e){if(window.TJFB.auth.currentUser?.uid===uid)toast('Não foi possível atualizar os dados. Confira a conexão e reabra esta aba.');}
    });return result;
  };
})();
