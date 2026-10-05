(function(){
  'use strict';
  const style=document.createElement('style');style.id='tj-stable-layout';
  style.textContent=`
  @media screen {
    html,body{width:100%;height:100%;min-height:0!important;overflow:hidden!important;overscroll-behavior:none;touch-action:pan-y;-webkit-text-size-adjust:100%;text-size-adjust:100%}
    body{margin:0}
    #painel-principal.app-layout{position:fixed;inset:0;width:100%;height:100vh;height:100dvh;min-height:0!important;overflow:hidden!important}
    #painel-principal .main-wrapper{flex:1 1 0;height:100%;min-height:0!important;max-height:100%;overflow:hidden;padding-top:calc(56px + env(safe-area-inset-top));padding-bottom:0!important}
    #painel-principal .topbar{position:relative;top:auto!important;flex:0 0 auto;min-width:0;width:100%;z-index:50}
    #painel-principal .content-area{flex:1 1 0;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:none;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding-bottom:max(28px,env(safe-area-inset-bottom))!important}
    #painel-principal .content-area>section:not(.hidden){animation:none!important;min-width:0;max-width:100%;overflow-wrap:anywhere}
    #painel-principal .mobile-topbar-brand{min-width:0;overflow-wrap:anywhere}
    #painel-principal .breadcrumb-row{min-width:0;flex:1;overflow:hidden}
    #painel-principal .topbar-right{flex-shrink:0}
    .drawer-panel{top:calc(56px + env(safe-area-inset-top));min-height:0}
    .drawer-body{min-height:0;overflow-x:hidden;overscroll-behavior:none;touch-action:pan-y}
    #tj-landing,.auth-bg{overscroll-behavior:none;touch-action:pan-y;overflow-x:hidden}
    dialog{box-sizing:border-box!important;max-width:calc(100% - 24px)!important;max-height:calc(100vh - 24px)!important;max-height:calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:none;touch-action:pan-y;overflow-wrap:anywhere}
    dialog input,dialog select,dialog textarea{box-sizing:border-box;max-width:100%;min-width:0}
    .modal-overlay{overflow:hidden;z-index:3000;touch-action:pan-y}
    .modal-card{box-sizing:border-box;max-height:calc(100vh - 48px);max-height:calc(100dvh - 48px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:none}
    .chat-container{overflow-x:hidden;overscroll-behavior:none;touch-action:pan-y}
    button,[role="button"],[data-action],a,label{touch-action:pan-y}
  }
  @media screen and (max-width:767px){
    input,select,textarea{font-size:16px!important}
    #painel-principal .content-area .tj-table-shell,#painel-principal .content-area .tj-table-wrap{overflow-x:hidden!important;max-width:100%;min-width:0}
    #painel-principal .content-area table.table-custom{display:block!important;min-width:0!important;width:100%!important;max-width:100%!important;overflow:visible!important;white-space:normal!important}
    #painel-principal .content-area table.table-custom thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    #painel-principal .content-area table.table-custom tbody{display:block;width:100%}
    #painel-principal .content-area table.table-custom tbody tr{display:block;margin:0 0 12px;border-bottom:1px solid var(--border)}
    #painel-principal .content-area table.table-custom tbody td{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;box-sizing:border-box}
    #painel-principal .content-area table.table-custom tbody td[data-tj-column]::before{content:attr(data-tj-column);display:block;font-size:.75rem;font-weight:700;color:var(--text-muted);margin-bottom:4px}
    #painel-principal .content-area table.table-custom tbody td[colspan]::before{display:none}
  }`;
  document.head.append(style);
  function labelTable(table){
    const headings=Array.from(table.querySelectorAll('thead tr:first-child th')).map(h=>h.textContent.trim());
    if(!headings.length)return;
    table.querySelectorAll('tbody tr').forEach(row=>Array.from(row.cells).forEach((cell,index)=>{
      if(cell.tagName==='TD'&&cell.colSpan===1){const label=headings[index]||'';if(cell.dataset.tjColumn!==label)cell.dataset.tjColumn=label;}
    }));
  }
  function labels(root){if(root.nodeType!==1)return;if(root.matches('table.table-custom'))labelTable(root);root.querySelectorAll('table.table-custom').forEach(labelTable);const table=root.closest('table.table-custom');if(table)labelTable(table);}
  labels(document.body);
  const observer=new MutationObserver(changes=>changes.forEach(change=>{labels(change.target);change.addedNodes.forEach(labels);}));
  observer.observe(document.body,{childList:true,subtree:true});
  // Each navigation starts at the top of the actual scrolling area, rather than the locked page.
  if(typeof abrirTela==='function'){
    const navigate=abrirTela;abrirTela=function(){const result=navigate.apply(this,arguments),main=document.querySelector('#painel-principal .content-area');if(main){main.scrollTop=0;main.scrollLeft=0;}return result;};
  }
})();
