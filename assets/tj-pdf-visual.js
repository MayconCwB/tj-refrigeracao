(function(){
  'use strict';
  const navy=[13,47,72],blue=[20,112,151],ink=[34,52,65],muted=[91,113,126],pale=[239,246,250];
  const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/μ/g,'µ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
  const company={nome:'TJ REFRIGERAÇÃO TECHNICAL ASSISTANCE LTDA',cnpj:'49.102.762/0001-98',telefone:'(41) 99749-7054',email:'refrigeracaotjcwba@gmail.com'};
  function build(kind,r,image){
    const pdf=new jspdf.jsPDF({unit:'mm',format:'a4',compress:true}),receipt=kind==='recibo',firm=receipt?r.empresa:company,number=String(receipt?r.numero:r.num),bottom=270;let y=0;
    function font(size=10,bold=false,color=ink){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);}
    function header(){
      pdf.setFillColor(...blue);pdf.rect(0,0,210,3,'F');
      if(image)pdf.addImage(image,'PNG',15,10,23,23,undefined,'FAST');
      const x=image?43:15;font(15,true,navy);pdf.text('TJ REFRIGERAÇÃO',x,17);font(7.5,false,muted);
      pdf.text(clean(firm.nome),x,23);pdf.text('CNPJ '+clean(firm.cnpj)+'  |  '+clean(firm.telefone),x,28);pdf.text(clean(firm.email),x,33);
      pdf.setDrawColor(212,229,238);pdf.line(15,39,195,39);font(19,true,navy);pdf.text(receipt?'RECIBO DE PAGAMENTO':'ORÇAMENTO DE SERVIÇO',15,50);
      font(9,false,muted);const ids=pdf.splitTextToSize('Nº '+number,180);pdf.text(ids,15,57);y=57+ids.length*4+3;
      const cancelled=r.status==='Cancelado'||r.status==='Recusado',approved=r.status==='Aprovado'||r.status==='Emitido';pdf.setFillColor(...(cancelled?[255,235,234]:approved?[226,246,235]:pale));pdf.roundedRect(15,y,180,9,2,2,'F');font(9,true,cancelled?[163,38,38]:approved?[27,112,72]:blue);pdf.text(clean(r.status||'Status não informado'),19,y+6);y+=15;
    }
    function page(){pdf.addPage();header();}
    function room(h){if(y+h>bottom)page();}
    function paragraph(raw,bold=false){font(10,bold);const lines=pdf.splitTextToSize(clean(raw),176);for(const line of lines){room(5);font(10,bold);pdf.text(line,17,y);y+=5;}y+=4;}
    function block(label,value){if(!value)return;font(10);const lines=pdf.splitTextToSize(clean(value),168);let pos=0;while(pos<lines.length){room(18);let take=Math.min(lines.length-pos,Math.max(1,Math.floor((bottom-y-11)/5))),h=10+take*5;pdf.setFillColor(...pale);pdf.roundedRect(15,y,180,h,2,2,'F');font(7.5,true,blue);pdf.text(label.toLocaleUpperCase('pt-BR')+(pos?' • CONTINUAÇÃO':''),21,y+5);font(10);pdf.text(lines.slice(pos,pos+take),21,y+10,{lineHeightFactor:1.42});y+=h+3;pos+=take;if(pos<lines.length)page();}}
    function tableHeader(){room(16);pdf.setFillColor(...navy);pdf.roundedRect(15,y,180,10,1,1,'F');font(8,true,[255,255,255]);pdf.text('DESCRIÇÃO',19,y+6.5);pdf.text('QTD.',146,y+6.5,{align:'center'});pdf.text('VALOR',190,y+6.5,{align:'right'});y+=10;}
    function items(){room(25);font(10,true,navy);pdf.text('PEÇAS E SERVIÇOS',15,y+4);y+=9;tableHeader();let index=0;for(const raw of r.itens||[]){const it=Array.isArray(raw)?{descricao:raw[0],qtd:raw[1],valor:raw[2]}:raw;const cents=TJFinanceCore.amount(it.valor??it.preco??'0');font(9);const desc=pdf.splitTextToSize(clean(it.descricao||it.item||it.nome||'Item'),116),qty=pdf.splitTextToSize(clean(it.qtd||it.quantidade||1),15),value=pdf.splitTextToSize(cents===null?clean(it.valor||it.preco):money(cents),35);let offset=0;
        while(offset<desc.length){const minimum=offset?1:Math.max(1,qty.length,value.length);if(bottom-y<8+minimum*4.5){page();tableHeader();}const take=Math.min(desc.length-offset,Math.max(1,Math.floor((bottom-y-8)/4.5))),h=8+Math.max(take,offset?1:minimum)*4.5;pdf.setFillColor(...(index%2?[247,250,252]:[255,255,255]));pdf.rect(15,y,180,h,'F');font(9);pdf.text(desc.slice(offset,offset+take),19,y+6,{lineHeightFactor:1.42});if(!offset){pdf.text(qty,146,y+6,{align:'center',lineHeightFactor:1.42});pdf.text(value,190,y+6,{align:'right',lineHeightFactor:1.42});}pdf.setDrawColor(222,232,238);pdf.line(15,y+h,195,y+h);y+=h;offset+=take;if(offset<desc.length){page();tableHeader();}}
        index++;}y+=7;if(!index)paragraph('Nenhum item registrado.');}
    function total(value){room(58);pdf.setFillColor(...navy);pdf.roundedRect(15,y,180,23,3,3,'F');font(9,true,[206,231,243]);pdf.text(receipt?'VALOR DO RECIBO':'TOTAL DO ORÇAMENTO',21,y+8);font(19,true,[255,255,255]);pdf.text(money(value),189,y+16,{align:'right'});y+=30;}
    header();block('Cliente',r.clienteNome||r.cliente||'Não informado');
    if(receipt){if(!Number.isSafeInteger(r.valorCentavos)||r.valorCentavos<=0)throw Error('Valor do recibo inválido.');if(r.status==='Cancelado')block('Documento cancelado',r.motivoCancelamento||'Este recibo foi cancelado.');else paragraph('Recebemos de '+clean(r.clienteNome)+' a importância de '+money(r.valorCentavos)+', referente ao atendimento descrito neste documento.');block('CPF / CNPJ',r.documento);block('Atendimento',r.chamadoNum?'Chamado #'+r.chamadoNum:'');block('Equipamentos',r.equipamento);block('Endereço',r.endereco);block('Serviço realizado',r.descricao);block('Pagamento',[r.dataPagamento?.split('-').reverse().join('/'),r.pagamento].filter(Boolean).join(' • '));block('Observações',r.observacoes);total(r.valorCentavos);}
    else{block('Equipamentos',TJBudgetEquipment.describe(r));block('Serviço solicitado',r.servico);const first=(r.hist||[])[0];block('Emissão registrada',first?(Array.isArray(first)?first[0]:first.data):'');items();const value=TJFinanceCore.amount(r.total);if(value===null)throw Error('Confira o valor total do orçamento antes de compartilhar.');total(value);}
    room(28);y+=8;pdf.setDrawColor(154,181,196);pdf.line(55,y,155,y);font(9,true,navy);pdf.text('TJ Refrigeração',105,y+6,{align:'center'});font(8,false,muted);pdf.text('Responsável pelo atendimento',105,y+11,{align:'center'});
    const count=pdf.getNumberOfPages(),prepared=new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});for(let p=1;p<=count;p++){pdf.setPage(p);pdf.setDrawColor(218,231,237);pdf.line(15,279,195,279);font(7,false,muted);pdf.text('Preparado em '+prepared+' • TJ Refrigeração',15,285);pdf.text('Página '+p+' de '+count,195,285,{align:'right'});}return pdf;
  }
  window.TJPDFDesign={build};
})();
