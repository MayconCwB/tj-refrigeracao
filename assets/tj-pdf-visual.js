(function(){
  'use strict';
  const navy=[13,47,72],blue=[20,112,151],ink=[34,52,65],muted=[91,113,126],pale=[239,246,250];
  const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/μ/g,'µ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
  const company={nome:'TJ REFRIGERAÇÃO TECHNICAL ASSISTANCE LTDA',cnpj:'49.102.762/0001-98',telefone:'(41) 99749-7054',email:'refrigeracaotjcwba@gmail.com'};
  function build(kind,r,image){
    const pdf=new jspdf.jsPDF({unit:'mm',format:'a4',compress:true}),receipt=kind==='recibo',call=kind==='chamado',firm=receipt?r.empresa:company,number=String(receipt?r.numero:r.num),bottom=270;let y=0;
    function font(size=10,bold=false,color=ink){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);}
    function header(){
      pdf.setFillColor(...blue);pdf.rect(0,0,210,2,'F');
      if(pdf.getNumberOfPages()>1){font(10,true,navy);pdf.text('TJ REFRIGERAÇÃO',15,14);font(8,false,muted);pdf.text('Nº '+number,195,14,{align:'right'});pdf.setDrawColor(212,229,238);pdf.line(15,19,195,19);y=27;return;}
      if(image)pdf.addImage(image,'PNG',15,8,18,18,undefined,'FAST');
      const x=image?38:15;font(13,true,navy);pdf.text('TJ REFRIGERAÇÃO',x,13);font(7,false,muted);pdf.text(clean(firm.nome),x,18);pdf.text('CNPJ '+clean(firm.cnpj)+'  |  '+clean(firm.telefone),x,22);pdf.text(clean(firm.email),x,26);
      pdf.setDrawColor(212,229,238);pdf.line(15,30,195,30);font(16,true,navy);pdf.text(receipt?'RECIBO DE PAGAMENTO':call?'CHAMADO TÉCNICO':'ORÇAMENTO DE SERVIÇO',15,39);
      font(8,false,muted);pdf.text('Nº '+number,15,45);font(8,true,blue);pdf.text(clean(r.status||'Status não informado'),195,45,{align:'right'});y=52;
    }
    function page(){pdf.addPage();header();}
    function room(h){if(y+h>bottom)page();}
    function paragraph(raw,bold=false){font(10,bold);const lines=pdf.splitTextToSize(clean(raw),176);for(const line of lines){room(5);font(10,bold);pdf.text(line,17,y);y+=5;}y+=4;}
    function block(label,value){if(!value)return;font(10);const lines=pdf.splitTextToSize(clean(value),168);let pos=0;if(9+lines.length*4.4<=65&&y+9+lines.length*4.4>bottom)page();while(pos<lines.length){room(16);const take=Math.min(lines.length-pos,Math.max(1,Math.floor((bottom-y-10)/4.4))),h=9+take*4.4;pdf.setFillColor(...pale);pdf.roundedRect(15,y,180,h,2,2,'F');font(7.5,true,blue);pdf.text(label.toLocaleUpperCase('pt-BR')+(pos?' • CONTINUAÇÃO':''),20,y+4.5);font(10);pdf.text(lines.slice(pos,pos+take),20,y+9,{lineHeightFactor:1.25});y+=h+2;pos+=take;if(pos<lines.length)page();}}
    function grid(fields){const visible=fields.filter(f=>f[1]);for(let i=0;i<visible.length;i+=2){const pair=visible.slice(i,i+2);font(9.5);const lines=pair.map(f=>pdf.splitTextToSize(clean(f[1]),80));if(lines.some(t=>t.length>5)){pair.forEach(f=>block(f[0],f[1]));continue;}const h=9+Math.max(...lines.map(t=>t.length))*4.2;room(h+2);pair.forEach((f,j)=>{const x=15+j*92;pdf.setFillColor(...pale);pdf.roundedRect(x,y,88,h,2,2,'F');font(7.5,true,blue);pdf.text(f[0].toLocaleUpperCase('pt-BR'),x+4,y+4.5);font(9.5);pdf.text(lines[j],x+4,y+9,{lineHeightFactor:1.25});});y+=h+2;}}
    function tableHeader(){room(14);pdf.setFillColor(...navy);pdf.roundedRect(15,y,180,8,1,1,'F');font(7.5,true,[255,255,255]);pdf.text('DESCRIÇÃO',19,y+5.3);pdf.text('QTD.',122,y+5.3,{align:'center'});pdf.text('UNITÁRIO',155,y+5.3,{align:'right'});pdf.text('SUBTOTAL',190,y+5.3,{align:'right'});y+=8;}
    function items(title='PEÇAS E SERVIÇOS'){room(23);font(10,true,navy);pdf.text(title,15,y+4);y+=8;tableHeader();let index=0;for(const raw of r.itens||[]){const it=Array.isArray(raw)?{descricao:raw[0],qtd:raw[1],valor:raw[2]}:raw;const cents=TJFinanceCore.amount(it.valor??it.preco??'0'),qty=clean(it.qtd||it.quantidade||1),q=Number(qty.replace(',','.'));font(9);const desc=pdf.splitTextToSize(clean(it.descricao||it.item||it.nome||'Item'),95);let offset=0;while(offset<desc.length){if(bottom-y<10){page();tableHeader();}const take=Math.min(desc.length-offset,Math.max(1,Math.floor((bottom-y-3)/3.8))),h=3+take*3.8;pdf.setFillColor(...(index%2?[247,250,252]:[255,255,255]));pdf.rect(15,y,180,h,'F');font(9);pdf.text(desc.slice(offset,offset+take),19,y+4.6,{lineHeightFactor:1.2});if(!offset){pdf.text(qty,122,y+4.6,{align:'center'});pdf.text(cents===null?clean(it.valor||it.preco):money(cents),155,y+4.6,{align:'right'});pdf.text(cents!==null&&Number.isFinite(q)?money(Math.round(cents*q)):'—',190,y+4.6,{align:'right'});}pdf.setDrawColor(222,232,238);pdf.line(15,y+h,195,y+h);y+=h;offset+=take;if(offset<desc.length){page();tableHeader();}}index++;}y+=5;if(!index)paragraph('Nenhum item registrado.');}
    function total(value){room(50);y=Math.max(y,bottom-51);pdf.setFillColor(...navy);pdf.roundedRect(15,y,180,17,2,2,'F');font(9,true,[206,231,243]);pdf.text(receipt?'VALOR DO RECIBO':'TOTAL DO ORÇAMENTO',21,y+7);font(17,true,[255,255,255]);pdf.text(money(value),189,y+11,{align:'right'});y+=23;}
    header();grid([['Cliente',r.clienteNome||r.cliente||'Não informado'],['Equipamentos',receipt?r.equipamento:call?(r.equipamentos?.length&&window.TJEquipmentGroup?TJEquipmentGroup.names(r.equipamentos):r.equip):TJBudgetEquipment.describe(r)]]);
    if(receipt){if(!Number.isSafeInteger(r.valorCentavos)||r.valorCentavos<=0)throw Error('Valor do recibo inválido.');if(r.status==='Cancelado')block('Documento cancelado',r.motivoCancelamento||'Este recibo foi cancelado.');else paragraph('Recebemos de '+clean(r.clienteNome)+' a importância de '+money(r.valorCentavos)+', referente ao atendimento descrito neste documento.');grid([['CPF / CNPJ',r.documento],['Atendimento',r.chamadoNum?'Chamado #'+r.chamadoNum:'']]);block('Endereço',r.endereco);block('Serviço realizado',r.descricao);block('Pagamento',[r.dataPagamento?.split('-').reverse().join('/'),r.pagamento].filter(Boolean).join(' • '));block('Observações',r.observacoes);total(r.valorCentavos);}
    else if(call){
      const at=r.atendimento||{};
      grid([['Prioridade',r.prioridade||'Normal'],['Previsão / agendamento',r.agend||at.previsao]]);block('Endereço / local',at.endereco||r.endereco);
      block('Descrição do problema',r.problema||r.desc);block('Observações',r.observacoes);block('Diagnóstico técnico',at.diag||'Nenhum diagnóstico registrado.');
      if(at.deslocamentoKm!=null)block('Deslocamento registrado',String(at.deslocamentoKm)+' km (ida e volta)');
      const linked=r.orcamentoVinculado;
      block('Orçamento vinculado',linked?'#'+linked.num+' — '+(linked.servico||'')+(linked.total?' — Total: R$ '+linked.total:''):r.orcamentoNum?'#'+r.orcamentoNum:'');
      if(y>28)page();
      const original=r.itens;r.itens=at.pecas||[];items('PEÇAS UTILIZADAS NO ATENDIMENTO');r.itens=original;
      if(linked?.itens?.length){const original=r.itens;r.itens=linked.itens;items('SERVIÇOS E ITENS DO ORÇAMENTO #'+linked.num);r.itens=original;}
    }
    else{block('Serviço solicitado',r.servico);const first=(r.hist||[])[0];block('Emissão registrada',first?(Array.isArray(first)?first[0]:first.data):'');block('Observações',r.observacoes||r.obs);block('Validade',r.validade);items();const value=TJFinanceCore.amount(r.total);if(value===null)throw Error('Confira o valor total do orçamento antes de compartilhar.');total(value);}
    if(y+16>275)page();y=Math.max(y,249);y+=5;pdf.setDrawColor(154,181,196);pdf.line(55,y,155,y);font(9,true,navy);pdf.text('TJ Refrigeração',105,y+6,{align:'center'});font(8,false,muted);pdf.text('Responsável pelo atendimento',105,y+11,{align:'center'});
    const count=pdf.getNumberOfPages(),prepared=new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});for(let p=1;p<=count;p++){pdf.setPage(p);pdf.setDrawColor(218,231,237);pdf.line(15,279,195,279);font(7,false,muted);pdf.text('Preparado em '+prepared+' • TJ Refrigeração',15,285);pdf.text('Página '+p+' de '+count,195,285,{align:'right'});}return pdf;
  }
  window.TJPDFDesign={build};
})();

/* Shared A4 preview: the canvases are rendered from the exact PDF offered for download. */
(function(){
'use strict';
const $=id=>document.getElementById(id), make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let rendererPromise,opened=null;
function renderer(){if(!rendererPromise)rendererPromise=import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';return lib;}).catch(e=>{rendererPromise=null;throw e;});return rendererPromise;}
const style=make('style');style.textContent=`
.tj-document-preview{margin:auto;width:min(1140px,calc(100% - 16px));height:94dvh;max-height:94dvh;padding:0;border:1px solid var(--border,#31516a);border-radius:16px;background:var(--surface,#fff);color:var(--text,#172033);overflow:hidden;box-sizing:border-box}
.tj-document-preview::backdrop{background:#041522bd}.tj-document-layout{height:100%;display:flex;flex-direction:column;min-height:0}.tj-document-toolbar{padding:14px 18px;border-bottom:1px solid var(--border,#ddd);flex:0 0 auto;background:var(--surface,#fff)}.tj-document-toolbar h2{font-size:1.12rem;margin:0 0 6px;overflow-wrap:anywhere}.tj-document-toolbar p{font-size:.86rem;line-height:1.5;margin:6px 0;color:var(--text-muted,#526778)}.tj-document-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.tj-document-actions button{min-height:44px;white-space:normal}.tj-document-pages{flex:1;min-height:0;overflow:auto;background:#dbe3ea;padding:18px;overscroll-behavior:contain;touch-action:pan-x pan-y}.tj-document-sheet{margin:0 auto 20px;max-width:none}.tj-document-sheet figcaption{font-size:12px;font-weight:700;color:#354f62;padding:6px 0}.tj-document-sheet canvas{display:block;background:white;width:100%;height:auto;box-shadow:0 3px 15px #0003}.tj-document-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:500px){.tj-document-toolbar{padding:12px}.tj-document-actions button{font-size:.82rem;flex:1 1 90px}.tj-document-pages{padding:10px}.tj-document-preview{height:96dvh;max-height:96dvh}}
@media print{html:has(body.tj-document-printing),body.tj-document-printing{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;display:block!important;position:static!important}body.tj-document-printing #tj-print-root{display:block!important;position:static!important;height:auto!important;max-height:none!important;overflow:visible!important}body.tj-document-printing>*:not(#tj-print-root){display:none!important}body.tj-document-printing #tj-print-root{margin:0!important;padding:0!important;width:210mm!important}body.tj-document-printing #tj-print-root .tj-document-print-page{display:block!important;margin:0!important;padding:0!important;width:210mm!important;height:297mm!important;break-inside:avoid;break-after:page;page-break-after:always}body.tj-document-printing #tj-print-root .tj-document-print-page:last-child{break-after:auto;page-break-after:auto}body.tj-document-printing #tj-print-root img{display:block!important;width:210mm!important;height:297mm!important;margin:0!important;max-width:none!important}body.tj-document-printing{margin:0!important;padding:0!important}}
`;document.head.append(style);
function allowed(kind,r,actor){const user=window.TJFB?.auth.currentUser;return !!user&&user.uid===actor&&(state.perfilSessao==='empresa'||state.perfilSessao==='cliente'&&kind!=='recibo'&&(!r.clienteUid||r.clienteUid===actor));}
async function open(kind,source){
const actor=window.TJFB?.auth.currentUser?.uid;if(!actor||!allowed(kind,source,actor))return;
if(opened){opened.focus();return;}
const d=make('dialog');opened=d;d.className='tj-document-preview';d.setAttribute('aria-label','Visualização A4 do documento');const layout=make('div');layout.className='tj-document-layout';const bar=make('div');bar.className='tj-document-toolbar';const title=make('h2','Visualização A4 — '+(kind==='recibo'?'Recibo':kind==='chamado'?'Chamado':'Orçamento')+' #'+(source.numero||source.num));const status=make('p','Preparando todas as páginas do documento…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const actions=make('div');actions.className='tj-document-actions';const pages=make('div');pages.className='tj-document-pages';pages.setAttribute('aria-label','Páginas do documento');pages.tabIndex=0;bar.append(title,status,actions);layout.append(bar,pages);d.append(layout);
let task=null,pdfObject=null,record=null,url=null,printing=false,zoom=1,closed=false;const canvases=[];
const active=()=>!closed&&d.isConnected&&allowed(kind,source,actor);
function button(text,fn,primary=false){const b=make('button',text);b.type='button';b.className=primary?'btn-tj':'btn-tj-secondary';b.onclick=fn;actions.append(b);return b;}
function resize(){const width=Math.min(794,Math.max(200,pages.clientWidth-36))*zoom;pages.querySelectorAll('.tj-document-sheet').forEach(el=>el.style.width=width+'px');}
const printButton=button('Imprimir',async()=>{
if(!active()||printing||!canvases.length)return;printing=true;printButton.disabled=true;
try{
$('tj-print-root')?.remove();const root=make('div');root.id='tj-print-root';const images=canvases.map(c=>{const page=make('div');page.className='tj-document-print-page';const img=make('img');img.src=c.toDataURL('image/png');img.alt='Página do documento';page.append(img);root.append(page);return img;});document.body.append(root);await Promise.all(images.map(i=>i.decode()));if(!active()){root.remove();return;}
const oldTitle=document.title;document.title=title.textContent;document.body.classList.add('tj-document-printing');const pageStyle=make('style');pageStyle.textContent='@media print{@page{size:A4;margin:0}}';document.head.append(pageStyle);let clean=false;const cleanup=()=>{if(clean)return;clean=true;root.remove();pageStyle.remove();document.body.classList.remove('tj-document-printing');document.title=oldTitle;};window.addEventListener('afterprint',cleanup,{once:true});window.print();
}catch(e){if(active())status.textContent='Não foi possível abrir a impressão. Baixe o PDF e imprima pelo leitor do seu aparelho.';}
finally{printing=false;if(active())printButton.disabled=false;}
},true);printButton.disabled=true;
const download=button('Baixar PDF',()=>{if(!active()||!url)return;const link=make('a');link.href=url;link.download=(kind+'-'+(record.numero||record.num)).replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';document.body.append(link);link.click();link.remove();});download.disabled=true;
button('Ampliar +',()=>{zoom=Math.min(2,zoom+.25);resize();});button('Reduzir −',()=>{zoom=Math.max(.75,zoom-.25);resize();});button('Fechar',()=>d.close());
d.addEventListener('close',()=>{closed=true;task?.destroy();pdfObject?.destroy();if(url)URL.revokeObjectURL(url);opened=null;d.remove();});document.body.append(d);d.showModal();
try{
record=structuredClone(source);
if(kind==='chamado'){record.atendimento=structuredClone(state.atendimentos?.[source.num]||{});const linked=record.orcamentoNum||(state.agendamentos||[]).find(a=>String(a.chamado)===String(source.num)&&(!source.clienteUid||a.clienteUid===source.clienteUid))?.orcamentoNum;record.orcamentoVinculado=structuredClone((state.orcamentos||[]).find(q=>String(q.num)===String(linked)&&(!source.clienteUid||q.clienteUid===source.clienteUid))||null);}
const logo=new Image();logo.src='assets/tj-logo.png';await Promise.race([logo.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2500))]);if(!active())return;
const doc=TJPDFDesign.build(kind,record,logo.complete&&logo.naturalWidth?logo:null),bytes=doc.output('arraybuffer');url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));download.disabled=false;
const lib=await renderer();if(!active())return;task=lib.getDocument({data:new Uint8Array(bytes),isEvalSupported:false});pdfObject=await task.promise;task=null;
for(let n=1;n<=pdfObject.numPages;n++){
if(!active())return;status.textContent='Preparando página '+n+' de '+pdfObject.numPages+'…';const pdfPage=await pdfObject.getPage(n),viewport=pdfPage.getViewport({scale:1.6}),figure=make('figure');figure.className='tj-document-sheet';figure.append(make('figcaption','Página '+n+' de '+pdfObject.numPages));const canvas=make('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Página '+n+' do documento');figure.append(canvas);pages.append(figure);resize();await pdfPage.render({canvasContext:canvas.getContext('2d'),viewport}).promise;canvases.push(canvas);const content=await pdfPage.getTextContent(),accessible=make('p',content.items.map(i=>i.str).join(' '));accessible.className='tj-document-accessible';figure.append(accessible);pdfPage.cleanup();}
if(active()){status.textContent=pdfObject.numPages+' página(s) A4. Role para conferir: a prévia e o PDF têm o mesmo conteúdo.';printButton.disabled=false;}
}catch(e){if(active())status.textContent=url?'A prévia não carregou. Você ainda pode baixar o PDF completo para visualizar e imprimir.':'Não foi possível preparar o documento. Atualize os dados e tente novamente.';console.error('[TJ prévia]',e);}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-tj-print]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const kind=b.dataset.tjPrint==='orcamento'?'orcamento':'chamado',record=(kind==='orcamento'?state.orcamentos:state.chamados||[]).find(r=>String(r.num)===String(kind==='orcamento'?orcamentoAtualNum:chamadoAtualNum));if(record)open(kind,record);else toast('Documento não encontrado. Atualize a lista.');},true);
window.TJDocumentPreview={open};
window.TJFB?.auth.onAuthStateChanged(()=>{if(opened)opened.close();});
})();


