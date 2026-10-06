(function(){
  'use strict';
  const ids=r=>Array.isArray(r?.equipamentos)&&r.equipamentos.length?r.equipamentos.map(e=>String(e.id)):r?.equipamentoId?[String(r.equipamentoId)]:[];
  function list(r){if(Array.isArray(r?.equipamentos)&&r.equipamentos.length)return r.equipamentos;const e=r?.equipamento;return e?[e]:r?.equipamentoId?[{id:r.equipamentoId,nome:r.equipamentoNome||r.equip||''}]:[];}
  const names=es=>es.map(e=>e.nome).filter(Boolean).join(' / ');
  function mount(sel,equipment,selected=[]){
    document.getElementById(sel.id+'-extras')?.remove();sel._tjGroupList=equipment;sel._tjGroupSelected=new Set(selected.map(String));
    const box=document.createElement('fieldset');box.id=sel.id+'-extras';box.style.cssText='min-width:0;margin:12px 0;padding:10px;border:1px solid var(--border);border-radius:8px';const legend=document.createElement('legend');legend.textContent='Adicionar outros equipamentos (opcional)';box.append(legend);
    const note=document.createElement('p');note.textContent='Selecione até 10 equipamentos do mesmo cliente. O valor e o status são do atendimento em conjunto.';note.className='list-meta';box.append(note);
    equipment.forEach(e=>{const label=document.createElement('label');label.style.cssText='display:flex;align-items:flex-start;gap:8px;margin:10px 0;overflow-wrap:anywhere';const check=document.createElement('input');check.type='checkbox';check.value=String(e.id);check.style.cssText='width:20px;min-width:20px;height:20px';check.checked=sel._tjGroupSelected.has(check.value);const sync=()=>{const primary=sel.selectedOptions?.[0]?.dataset.equipId||sel.value;check.disabled=check.value===primary;if(check.disabled)check.checked=true;else check.checked=sel._tjGroupSelected.has(check.value);};sel.addEventListener('change',sync);sync();check.addEventListener('change',()=>{if(check.checked)sel._tjGroupSelected.add(check.value);else sel._tjGroupSelected.delete(check.value);sel.dispatchEvent(new Event('change',{bubbles:true}));});const text=document.createElement('span');text.textContent=[e.nome,e.marca,e.modelo,e.sn&&'S/N: '+e.sn].filter(Boolean).join(' • ');label.append(check,text);box.append(label);});sel.after(box);
  }
  function selected(sel){const primary=sel.selectedOptions?.[0]?.dataset.equipId||sel.value,extras=Array.from(sel._tjGroupSelected||[]),valid=sel._tjGroupList||sel._tjEquipment||[];return [...new Set([primary,...extras].filter(Boolean))].map(id=>valid.find(e=>String(e.id)===String(id))).filter(Boolean);}
  function validate(es,live){if(!es.length||es.length>10)throw Error('Selecione de 1 a 10 equipamentos.');return es.map(e=>{const found=live.find(x=>String(x.id)===String(e.id));if(!found)throw Error('Um equipamento foi removido ou não pertence a este cliente. Atualize e selecione novamente.');return found;});}
  function same(a,b){const x=ids(a).sort(),y=ids(b).sort();return x.length===y.length&&x.every((id,i)=>id===y[i]);}
  window.TJEquipmentGroup={ids,list,names,mount,selected,validate,same};
})();
