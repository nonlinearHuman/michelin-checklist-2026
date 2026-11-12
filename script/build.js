// 构建「全国米其林指南 2026 · 打卡清单」单文件网页（开源版 · 纯本地）
// 数据源：data/michelin-guide-2026.json（1137 家名录，不含坐标/地址等第三方数据）
// 状态存储：全部保存在浏览器 localStorage，无服务器、无同步、无账号
// 产出：../index.html（单文件，双击即用）
const fs = require('fs');
const path = require('path');
const DATA = require('../data/michelin-guide-2026.json');

// ---- 城市元数据 ----
const AMAP_CITY = { "北京":"110000","上海":"310000","广州":"440100","深圳":"440300","成都":"510100","杭州":"330100","南京":"320100","苏州":"320500","天津":"120000","扬州":"321000","常州":"320400","台州":"331000","温州":"330300","福州":"350100","厦门":"350200","泉州":"350500","宁德":"350900","香港":"810000","澳门":"820000" };
const DP_CITY = { "北京":"2","上海":"1","广州":"4","深圳":"7","成都":"8","杭州":"3","南京":"5","苏州":"6","天津":"10","扬州":"12","福州":"14","厦门":"15" };
const DP_PY = { "常州":"changzhou","台州":"taizhou","温州":"wenzhou","泉州":"quanzhou","宁德":"ningde","香港":"hongkong","澳门":"macau" };

const rankOrder = { 3: 0, 2: 1, 1: 2, bib: 3, sel: 4 };
const rankLabel = r => r === 'bib' ? '必比登' : r === 'sel' ? '入选' : (r + '星');
const rankColor = r => r === 'bib' ? '#2e7d5b' : r === 'sel' ? '#2563eb' : (+r === 3 ? '#8e1c1c' : +r === 2 ? '#c0392b' : '#b8860b');

// ---- 组装数据 ----
const items = DATA.map(d => {
  return { c: d.c, n: d.n, r: d.r, t: d.t || '', w: d.w || 0, g: d.g || 0, a: '' };
});
const cities = [...new Set(items.map(d => d.c))].sort((x, y) => {
  const cx = items.filter(i => i.c === x).length, cy = items.filter(i => i.c === y).length;
  return cy - cx;
});
const counts = {
  total: items.length,
  star: items.filter(i => typeof i.r === 'number').length,
  bib: items.filter(i => i.r === 'bib').length,
  sel: items.filter(i => i.r === 'sel').length,
  byCity: Object.fromEntries(cities.map(c => [c, items.filter(i => i.c === c).length])),
};

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escJs(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>全国米其林指南 2026 · 打卡清单</title>
<meta name="description" content="全国米其林指南 2026 打卡清单：1137 家餐厅，星级 / 必比登 / 入选一目了然，支持「想去 / 吃过 / 值得二访」三态标记，纯本地存储，免注册、无需登录。">
<meta name="theme-color" content="#26211A">
<meta property="og:title" content="全国米其林指南 2026 · 打卡清单">
<meta property="og:description" content="1137 家米其林餐厅，按城市和评级整理成一份能打卡的清单。记录只存在你自己的浏览器里。">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%2326211A'/%3E%3Ctext x='50' y='73' font-size='64' text-anchor='middle' fill='%23D8C08A'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E">
<style>
  :root{
    --bg:#F8F6F1; --card:#FFFFFF; --ink:#221D17; --sub:#8C8577;
    --red:#9E2A25; --gold:#A98035; --gold-ink:#7E6220; --line:#E9E3D7;
    --green:#5F7D62; --blue:#3D6FB4;
  }
  *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  body{background:var(--bg);color:var(--ink);font-family:-apple-system,"PingFang SC","Helvetica Neue",sans-serif;padding-bottom:86px;overflow-x:clip;}
  header{background:#26211A;color:#F2EDE2;padding:22px 18px 19px;position:relative;border-bottom:3px solid var(--gold);}
  header h1{font-size:21px;letter-spacing:.06em;font-family:Georgia,"Songti SC","STSong",serif;}
  header p{font-size:12px;color:#B7AE9D;margin-top:7px;line-height:1.7;}
  .progress-wrap{margin-top:15px;background:rgba(255,255,255,.14);border-radius:3px;height:5px;overflow:hidden;}
  .progress-bar{height:100%;width:0;background:var(--gold);border-radius:3px;transition:width .4s;}
  .progress-text{font-size:12px;color:#C9C0AE;margin-top:7px;letter-spacing:.03em;font-variant-numeric:tabular-nums;}
  #stick{position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--line);}
  #stick>*{max-width:768px;margin-left:auto;margin-right:auto;}
  main{max-width:768px;margin:0 auto;}
  .searchbox{padding:10px 12px 0;}
  .searchbox input{width:100%;border:1px solid var(--line);border-radius:12px;padding:9px 13px;font-size:14px;background:var(--card);color:var(--ink);outline:none;}
  .searchbox input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(169,128,53,.12);}
  nav{padding:10px 12px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;}
  nav::-webkit-scrollbar{display:none;}
  nav button{border:1px solid var(--line);background:var(--card);border-radius:3px;padding:7px 13px;font-size:13px;color:var(--sub);white-space:nowrap;flex:none;transition:background .2s ease,color .2s ease,border-color .2s ease;}
  nav button.active{background:var(--ink);color:#F2EDE2;border-color:var(--ink);}
  #citybar{display:flex;gap:8px;overflow-x:auto;padding:0 12px 10px;scrollbar-width:none;}
  #citybar::-webkit-scrollbar{display:none;}
  #citybar button{border:1px solid var(--line);background:var(--card);border-radius:3px;padding:6px 12px;font-size:12.5px;color:var(--sub);white-space:nowrap;flex:none;transition:background .2s ease,color .2s ease,border-color .2s ease;}
  #citybar button.active{background:var(--gold-ink);color:#F2EDE2;border-color:var(--gold-ink);}
  section{margin:14px 12px 0;}
  .sec-title{font-size:15.5px;font-weight:700;margin:4px 2px 10px;display:flex;align-items:baseline;gap:8px;font-family:Georgia,"Songti SC","STSong",serif;letter-spacing:.03em;}
  .sec-title .tag{font-size:11px;font-weight:400;color:var(--sub);}
  .card{background:var(--card);border:1px solid #F0EBE0;border-radius:6px;padding:12px 14px;margin-bottom:9px;box-shadow:0 1px 2px rgba(34,29,23,.04);display:flex;align-items:center;gap:10px;transition:transform .2s ease,box-shadow .2s ease,opacity .3s ease;}
  .card:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(34,29,23,.08);}
  .card.done{opacity:1;background:#FFFDF6;border-color:#EBD79B;}
  .card.done:hover{transform:none;box-shadow:0 1px 2px rgba(34,29,23,.04);}
  .check:focus-visible{outline:2px solid var(--gold);outline-offset:3px;}
  .ditem:focus-visible,.card:focus-within{outline:1px solid var(--gold);}
  .check{width:24px;height:24px;border:1.5px solid #C9C1B0;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:13px;color:transparent;cursor:default;transition:background .2s ease,border-color .2s ease;}
  .card.done .check{background:var(--green);border-color:var(--green);color:#F2EDE2;animation:checkpop .35s cubic-bezier(.34,1.56,.64,1);}
  @keyframes checkpop{0%{transform:scale(.6)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
  .info{flex:1;min-width:0;}
  .name{font-size:15px;font-weight:600;line-height:1.35;}
  .name .new{display:inline-block;font-size:10px;color:#fff;background:var(--red);border-radius:2px;padding:1.5px 6px;margin-left:6px;vertical-align:2px;letter-spacing:.05em;}
  .name .gstar{display:inline-block;font-size:10px;color:#fff;background:var(--green);border-radius:2px;padding:1.5px 6px;margin-left:4px;vertical-align:2px;letter-spacing:.05em;}
  .rbadge{display:inline-block;font-size:10px;color:#fff;border-radius:2px;padding:2px 7px;margin-right:6px;vertical-align:1px;font-weight:500;letter-spacing:.06em;}
  .meta{font-size:12px;color:var(--sub);margin-top:3px;line-height:1.5;}
  .addr{font-size:11px;color:#a89f90;margin-top:2px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;}
  .litdate{color:var(--gold);font-weight:600;}
  .btns{display:flex;gap:6px;flex:none;}
  .btns a{font-size:12px;text-decoration:none;padding:7px 11px;border-radius:3px;color:#fff;line-height:1;transition:opacity .2s ease;}
  .btns a:active{opacity:.85;}
  .btn-amap{background:var(--blue);}
  .btn-dp{background:#C96A3B;}
  footer{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);padding:10px 16px;display:flex;gap:10px;align-items:center;z-index:20;flex-wrap:wrap;}
  footer button{flex:1;border:none;border-radius:3px;padding:10px 0;font-size:14px;}
  footer .f-btn{flex:0 0 auto;border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:9px 16px;}
  footer .f-btn:active{background:var(--line);}
  footer .f-reset{flex:0 0 auto;color:var(--red);background:none;border:1px solid transparent;padding:9px 4px;}
  @media (max-width:420px){footer .f-tip{display:none;}}
  @media (max-width:480px){
    .btns{flex-direction:column;gap:5px;}
    .btns a{padding:6px 10px;font-size:11px;text-align:center;min-width:46px;}
  }
  .f-tip{font-size:11px;color:var(--sub);line-height:1.5;flex:none;width:158px;}
  .empty{text-align:center;color:var(--sub);font-size:13px;padding:40px 0;}
  .sharebtn{position:absolute;top:20px;right:14px;font-size:12px;color:#D8C08A;border:1px solid rgba(216,192,138,.45);border-radius:3px;padding:7px 11px;background:rgba(216,192,138,.1);letter-spacing:.04em;cursor:pointer;font-family:inherit;transition:background .2s ease;}
  .sharebtn:active{background:rgba(216,192,138,.24);}
  #pmodal{display:none;position:fixed;inset:0;z-index:2000;background:rgba(24,16,8,.78);overflow-y:auto;padding:18px 12px;}
  #pmodal.open{display:flex;flex-direction:column;align-items:center;}
  #pinner{background:#fff;border-radius:8px;padding:12px 12px 14px;max-width:min(94vw,460px);box-shadow:0 24px 70px rgba(0,0,0,.35);}
  .phead{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 10px;font-family:Georgia,"Songti SC","STSong",serif;font-weight:700;font-size:15px;color:#2B2118;}
  #pclose{cursor:pointer;color:#999;font-size:20px;line-height:1;padding:2px 6px;}
  #pimgwrap{text-align:center;}
  #pimgwrap img{max-width:100%;max-height:62vh;border-radius:4px;box-shadow:0 4px 16px rgba(34,29,23,.14);}
  .pfoot{display:flex;justify-content:space-between;align-items:center;padding-top:10px;gap:10px;flex-wrap:wrap;}
  .phint{font-size:11.5px;color:#A08A50;line-height:1.5;}
  #pdl,#pdlall{background:var(--gold);color:#FBF7EC;border:none;border-radius:3px;padding:9px 16px;font-size:13px;font-weight:600;letter-spacing:.04em;cursor:pointer;white-space:nowrap;}
  #toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%) translateY(20px);z-index:3000;background:#2B2118;color:#FFF8EC;padding:12px 22px;border-radius:24px;font-size:13px;font-weight:600;box-shadow:0 8px 28px rgba(43,33,24,.3);opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;max-width:88vw;text-align:center;}
  #toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
</style>
</head>
<body>
<header>
  <h1>全国米其林指南 2026</h1>
  <button class="sharebtn" id="posterbtn">✦ 战绩海报</button>
  <p>${counts.total} 家餐厅 · ${cities.length} 座城市 · 星级 ${counts.star} / 必比登 ${counts.bib} / 入选 ${counts.sel}<br>✦ 吃过 = 点亮；吃过之中 ◎ 标记值得二访；○ 想去 = 还没吃。打卡记录只保存在你的浏览器本地，不上传任何服务器</p>
  <div class="progress-wrap"><div class="progress-bar" id="bar"></div></div>
  <div class="progress-text" id="ptext">吃过 0 / ${counts.total} 家</div>
</header>
<div id="stick">
  <div class="searchbox"><input type="search" id="q" placeholder="搜索餐厅名 / 菜系 / 城市…"></div>
  <nav id="nav">
    <button data-f="all" class="active">全部 ${counts.total}</button>
    <button data-f="star">星级 ${counts.star}</button>
    <button data-f="bib">必比登 ${counts.bib}</button>
    <button data-f="sel">入选 ${counts.sel}</button>
    <button data-f="done" id="donebtn">只看吃过的</button>
    <button data-f="todo" id="todobtn">只看没吃过</button>
  </nav>
  <div id="citybar"></div>
</div>
<main id="list"></main>
<footer>
  <button class="f-btn" id="backup">备份</button>
  <button class="f-btn" id="restore">恢复</button>
  <input type="file" id="restorefile" accept=".xlsx,.json" style="display:none">
  <button class="f-reset" id="reset">清空打卡记录</button>
  <div class="f-tip">记录仅保存在本机浏览器；换设备或清除浏览器数据前，先「备份」导出 Excel，再到新设备「恢复」导入。</div>
</footer>
<div id="pmodal">
  <div id="pinner">
    <div class="phead"><span>我的米其林战绩 · 分享海报</span><span id="pclose">✕</span></div>
    <div id="pimgwrap"></div>
    <div class="pfoot"><span class="phint">手机长按图片保存到相册<br>两张 1080×1440（3:4），适合小红书 / 朋友圈</span><button id="pdl">下载本张</button></div>
  </div>
</div>
<script>
const DATA=${JSON.stringify(items)};
const CITIES=${JSON.stringify(cities)};
const BYCITY=${JSON.stringify(counts.byCity)};
const AMAP_CITY=${JSON.stringify(AMAP_CITY)};
const DP_CITY=${JSON.stringify(DP_CITY)};
const DP_PY=${JSON.stringify(DP_PY)};
const LSKEY='michelin-lit-v2';
let filter='all', city='all', q='';
let litData={};
try{litData=JSON.parse(localStorage.getItem(LSKEY)||'{}')||{};}catch(e){litData={};}
// 兜底：若旧键为空，回退到三态键里的 lit，避免历史记录因单键丢失而清零
if(!Object.keys(litData).length){
  try{const s3=JSON.parse(localStorage.getItem('michelin-state-v3')||'null');if(s3&&s3.lit&&Object.keys(s3.lit).length)litData=s3.lit;}catch(e){}
}
// ===== 打卡键：同名不同城用「城市｜名称」区分；兼容旧的名称键 =====
const KSEP='｜';
const NAME_CNT={};DATA.forEach(d=>NAME_CNT[d.n]=(NAME_CNT[d.n]||0)+1);
function keyOf(d){return NAME_CNT[d.n]>1?d.c+KSEP+d.n:d.n;}
const CITY_SET=new Set(DATA.map(d=>d.c));
function keyFrom(n,c){return NAME_CNT[n]>1&&CITY_SET.has(c)?c+KSEP+n:n;}
function nameOfKey(k){const i=String(k).indexOf(KSEP);return i>-1?String(k).slice(i+KSEP.length):String(k);}
function cityOfKey(k){const i=String(k).indexOf(KSEP);return i>-1?String(k).slice(0,i):'';}
const VALID_KEYS=new Set(DATA.map(keyOf));
// 归一化：丢弃不在指南中的脏数据；旧的重名名称键展开为各城市复合键（保留旧行为，不丢记录）
function normalizeIncoming(inc){
  const out={};
  Object.entries(inc||{}).forEach(([k,v])=>{
    if(!k||typeof k!=='string')return;
    if(VALID_KEYS.has(k)){out[k]=v||'';return;}
    if(NAME_CNT[k]>1){DATA.forEach(d=>{if(d.n===k)out[keyOf(d)]=v||'';});}
  });
  return out;
}
litData=normalizeIncoming(litData);
try{localStorage.setItem(LSKEY,JSON.stringify(litData));}catch(e){}
const lit=new Set(Object.keys(litData));
function saveLit(){localStorage.setItem(LSKEY,JSON.stringify(litData));}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function rankLabel(r){return r==='bib'?'必比登':r==='sel'?'入选':(r+'星');}
function rankColor(r){return r==='bib'?'#5F7D62':r==='sel'?'#55677E':(+r===3?'#8E2A25':+r===2?'#B0713B':'#A98035');}
function rankOrder(r){return r==='bib'?3:r==='sel'?4:3-(+r);}
function amapUrl(d){return 'https://uri.amap.com/search?keyword='+encodeURIComponent(d.n)+'&city='+(AMAP_CITY[d.c]||'')+'&src=myapp';}
function dpUrl(d){
  if(DP_CITY[d.c])return 'https://m.dianping.com/searchlist?cityId='+DP_CITY[d.c]+'&keyword='+encodeURIComponent(d.n);
  return 'https://www.dianping.com/'+(DP_PY[d.c]||'')+(DP_PY[d.c]?'':'/search');
}
function matchQ(d){
  if(!q)return true;
  return (d.n+' '+d.t+' '+d.c+' '+(d.a||'')).toLowerCase().indexOf(q)>-1;
}
function visibleList(){
  return DATA.filter(d=>{
    if(filter==='star'&&typeof d.r!=='number')return false;
    if(filter==='bib'&&d.r!=='bib')return false;
    if(filter==='sel'&&d.r!=='sel')return false;
    if(filter==='todo'&&lit.has(keyOf(d)))return false;
    if(filter==='done'&&!lit.has(keyOf(d)))return false;
    if(city!=='all'&&d.c!==city)return false;
    return matchQ(d);
  }).sort((a,b)=>rankOrder(a.r)-rankOrder(b.r)||a.n.localeCompare(b.n,'zh'));
}
function cardHtml(d){
  const isDone=lit.has(keyOf(d));
  return '<div class="card'+(isDone?' done':'')+'">'
    +'<div class="check" aria-hidden="true">'+(isDone?'✦':'')+'</div>'
    +'<div class="info"><div class="name">'+esc(d.n)
      +(d.w?'<span class="new">NEW</span>':'')+(d.g?'<span class="gstar">绿星</span>':'')
    +'</div><div class="meta"><span class="rbadge" style="background:'+rankColor(d.r)+'">'+rankLabel(d.r)+'</span>'+esc(d.t)
      +(isDone&&litData[keyOf(d)]?' · <span class="litdate">✦ '+litData[keyOf(d)]+'</span>':'')
    +'</div>'+(d.a?'<div class="addr">📍 '+esc(d.a)+'</div>':'')
    +'</div>'
    +'<div class="btns"><a class="btn-amap" href="'+amapUrl(d)+'">高德</a><a class="btn-dp" href="'+dpUrl(d)+'">点评</a></div>'
    +'</div>';
}
function render(){
  const el=document.getElementById('list');
  const list=visibleList();
  let html='';
  if(city==='all'){
    CITIES.forEach(c=>{
      const arr=list.filter(d=>d.c===c);
      if(!arr.length)return;
      const dn=arr.filter(d=>lit.has(keyOf(d))).length;
      html+='<section><div class="sec-title">'+esc(c)+'<span class="tag">'+arr.length+' 家'+(dn?' · 吃过 '+dn:'')+'</span></div>'
        +arr.map(cardHtml).join('')+'</section>';
    });
  }else{
    const groups=[['star','⭐ 星级餐厅'],['bib','🍜 必比登推介'],['sel','🍽️ 指南入选']];
    groups.forEach(g=>{
      const arr=list.filter(d=>g[0]==='star'?typeof d.r==='number':d.r===g[0]);
      if(!arr.length)return;
      html+='<section><div class="sec-title">'+g[1]+'<span class="tag">'+arr.length+' 家</span></div>'
        +arr.map(cardHtml).join('')+'</section>';
    });
  }
  if(!html)html='<div class="empty">没有符合条件的餐厅</div>';
  el.innerHTML=html;
  const total=DATA.length,cnt=lit.size;
  document.getElementById('bar').style.width=(cnt/total*100)+'%';
  document.getElementById('ptext').textContent='吃过 '+cnt+' / '+total+' 家';
}
function toggle(n){
  if(lit.has(n)){lit.delete(n);delete litData[n];}
  else{const t=new Date();litData[n]=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');lit.add(n);}
  saveLit();render();
}
document.getElementById('nav').addEventListener('click',e=>{
  if(e.target.tagName!=='BUTTON')return;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.remove('active'));
  e.target.classList.add('active');
  filter=e.target.dataset.f;
  render();
});
const citybar=document.getElementById('citybar');
citybar.innerHTML='<button data-c="all" class="active">全部城市</button>'
  +CITIES.map(c=>'<button data-c="'+esc(c)+'">'+esc(c)+' '+BYCITY[c]+'</button>').join('');
citybar.addEventListener('click',e=>{
  if(e.target.tagName!=='BUTTON')return;
  citybar.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
  e.target.classList.add('active');
  city=e.target.dataset.c;
  window.scrollTo({top:0});
  render();
});
let qTimer=null;
document.getElementById('q').addEventListener('input',e=>{
  clearTimeout(qTimer);
  qTimer=setTimeout(()=>{q=e.target.value.trim().toLowerCase();render();},180);
});
document.getElementById('reset').addEventListener('click',()=>{
  if(confirm('确定清空全部集章记录？（吃过、想去、想再去都会清掉）')){
    lit.clear();litData={};saveLit();render();
  }
});
// Excel 库按需加载：点备份/恢复才加载 xlsx.full.min.js（本地 vendor 优先，完全离线可用；
// 若把 index.html 单独拷走导致 vendor 缺失，才回落到官方 CDN）。页面本体保持轻量（手机秒开）
let _xlsxP=null;
function loadScriptOnce(src){
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=()=>res();
    s.onerror=()=>{s.remove();rej(new Error('load failed: '+src));};
    document.head.appendChild(s);
  });
}
function ensureXLSX(){
  if(typeof XLSX!=='undefined')return Promise.resolve();
  if(_xlsxP)return _xlsxP;
  _xlsxP=loadScriptOnce('vendor/xlsx.full.min.js')
    .catch(()=>loadScriptOnce('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'))
    .catch(e=>{_xlsxP=null;throw e;});
  return _xlsxP;
}
// 备份：导出规范命名的 Excel（列：餐厅名称/城市/评级/吃过日期/菜系）
document.getElementById('backup').addEventListener('click',()=>ensureXLSX().then(()=>{
  const RN=r=>r==='bib'?'必比登':r==='sel'?'入选':(+r===3?'三星':+r===2?'二星':'一星');
  const rows=[['餐厅名称','城市','评级','吃过日期','菜系']];
  Object.entries(litData)
    .sort((a,b)=>String(b[1]||'').localeCompare(String(a[1]||'')))
    .forEach(([n,dt])=>{
      const d=DATA.find(x=>keyOf(x)===n)||{};
      rows.push([nameOfKey(n),cityOfKey(n)||d.c||'',RN(d.r)||'',dt||'',d.t||'']);
    });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:28},{wch:10},{wch:8},{wch:12},{wch:14}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'打卡记录');
  const t=new Date();
  const pad=v=>String(v).padStart(2,'0');
  const fname='米其林打卡备份_'+t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())+'_'+pad(t.getHours())+pad(t.getMinutes())+'.xlsx';
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}).catch(()=>alert('备份组件加载失败，请检查网络后重试。')));
// 恢复：支持 Excel 与旧版 JSON，合并导入（并集，不覆盖已有日期）
document.getElementById('restore').addEventListener('click',()=>document.getElementById('restorefile').click());
document.getElementById('restorefile').addEventListener('change',function(){
  const f=this.files[0];this.value='';if(!f)return;
  const merge=inc=>{
    let n=0;
    Object.entries(normalizeIncoming(inc)).forEach(([k,v])=>{
      if(!litData[k]){litData[k]=v||'';n++;}
      lit.add(k);
    });
    saveLit();render();
    alert('已恢复 '+n+' 条新记录（现有 '+lit.size+' 条）。');
  };
  if(/\.json$/i.test(f.name)){
    const rd=new FileReader();
    rd.onload=()=>{
      try{
        const j=JSON.parse(rd.result);
        const inc=j&&typeof j==='object'?(j.lit&&typeof j.lit==='object'?j.lit:j):null;
        if(!inc)throw 0;
        merge(inc);
      }catch(e){alert('文件格式不对，请选择之前导出的「米其林打卡备份_….xlsx」或旧版 JSON 备份');}
    };
    rd.readAsText(f,'utf-8');
    return;
  }
  const rd=new FileReader();
  rd.onload=()=>{
    ensureXLSX().then(()=>{
      try{
        const wb=XLSX.read(new Uint8Array(rd.result),{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const grid=XLSX.utils.sheet_to_json(ws,{header:1,raw:false});
        if(!grid.length)throw 0;
        const head=grid[0].map(x=>String(x||'').trim());
        const iN=head.indexOf('餐厅名称')>-1?head.indexOf('餐厅名称'):0;
        const iD=head.indexOf('吃过日期')>-1?head.indexOf('吃过日期'):(head.indexOf('点亮日期')>-1?head.indexOf('点亮日期'):3);
        const iC=head.indexOf('城市')>-1?head.indexOf('城市'):1;
        const inc={};
        grid.slice(1).forEach(row=>{
          const n=String(row&&row[iN]||'').trim();
          if(n)inc[keyFrom(n,String(row[iC]||'').trim())]=String(row[iD]||'').trim();
        });
        if(!Object.keys(inc).length)throw 0;
        merge(inc);
      }catch(e){alert('文件格式不对，请选择之前导出的「米其林打卡备份_….xlsx」或旧版 JSON 备份');}
    }).catch(()=>alert('恢复组件加载失败，请检查网络后重试。'));
  };
  rd.readAsArrayBuffer(f);
});
render();
/* ===== 集章卡三态增强层 · 清单版 ===== */
(function(){
var SK='michelin-state-v3';
function today(){var t=new Date();return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');}
function daysBetween(a,b){if(!a)return -1;var x=new Date(a+'T00:00:00'),y=new Date(b+'T00:00:00');if(isNaN(x)||isNaN(y))return -1;return Math.round((y-x)/86400000);}
var st={};try{st=JSON.parse(localStorage.getItem(SK)||'null')||{};}catch(e){}
var WD=normalizeIncoming((st&&typeof st.wish==='object'&&st.wish)||{});
var AD=normalizeIncoming((st&&typeof st.again==='object'&&st.again)||{});
var PD=normalizeIncoming((st&&typeof st.pulled==='object'&&st.pulled)||{});
var WS=new Set(Object.keys(WD)),AS=new Set(Object.keys(AD));
window.wishData=WD;window.againData=AD;window.pulledData=PD;window.wish=WS;window.again=AS;

var css=document.createElement('style');
css.textContent=''
+'.mini2{font-size:10px;padding:2px 7px;border-radius:10px;margin-left:6px;white-space:nowrap;vertical-align:2px}'
+'.mini2.w{background:#FFF1EA;color:#C23B2E}.mini2.a{background:#EAF3EC;color:#39644A}'
+'.tri2{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}'
+'.tri2 button{font-size:11px;padding:5px 9px;border-radius:14px;border:1px solid #E9E3D7;background:#fff;color:#6B6357;cursor:pointer;font-weight:600;white-space:nowrap;line-height:1.3}'
+'.tri2 button.on{background:#2B2118;color:#FFF8EC;border-color:#2B2118}'
+'.tri2 button.w.on{background:#E2483C;border-color:#E2483C;color:#fff}'
+'.tri2 button.a.on{background:#F5C542;border-color:#F5C542;color:#2B2118}'
+'#stnote{font-size:12px;color:#7A6A56;padding:4px 12px 8px;text-align:center}'
+'.card.wish{box-shadow:inset 3px 0 0 #E2483C}.card.again{box-shadow:inset 3px 0 0 #4E8B72}';
document.head.appendChild(css);

var nav=document.getElementById('nav');
['wish','again'].forEach(function(f,i){
  var b=document.createElement('button');b.dataset.f=f;b.id='nav-'+f;
  b.textContent=i?'◎ 想再去':'○ 想去';
  nav.appendChild(b);
});
function refreshNav(){
  var w=document.getElementById('nav-wish'),a=document.getElementById('nav-again');
  if(w)w.textContent='○ 想去 '+WS.size;
  if(a)a.textContent='◎ 值得二访 '+AS.size;
}
var note=document.createElement('div');note.id='stnote';
document.getElementById('stick').appendChild(note);

window.saveState=function(){try{localStorage.setItem(SK,JSON.stringify({lit:litData,wish:WD,again:AD,pulled:PD}));localStorage.setItem('michelin-lit-v2',JSON.stringify(litData));}catch(e){}};
saveLit=window.saveState;

function badge(k){return (WS.has(k)?'<span class="mini2 w">想去</span>':'')+(AS.has(k)?'<span class="mini2 a">想再去</span>':'');}
function tri(k){
  var w=WS.has(k),l=lit.has(k),a=AS.has(k);
  return '<div class="tri2">'
   +'<button class="w'+(w?' on':'')+'" data-act="wish" data-k="'+esc(k)+'" aria-pressed="'+(w?'true':'false')+'">'+(w?'○ 已圈':'○ 想去')+'</button>'
   +'<button class="'+(l?'on':'')+'" data-act="lit" data-k="'+esc(k)+'" aria-pressed="'+(l?'true':'false')+'">'+(l?'✦ 已吃过':'✦ 吃过')+'</button>'
   +'<button class="a'+(a?' on':'')+'" data-act="again" data-k="'+esc(k)+'" aria-pressed="'+(a?'true':'false')+'">'+(a?'◎ 值得二访':'◎ 想再去')+'</button>'
   +'</div>';
}
cardHtml=function(d){
  var isDone=lit.has(keyOf(d)),k=keyOf(d);
  var stamp=AS.has(k)?'◎':isDone?'✦':WS.has(k)?'○':'';
  var stampTxt=AS.has(k)?'值得二访':isDone?'吃过':WS.has(k)?'想去':'还没盖章';
  return '<div class="card'+(isDone?' done':'')+(WS.has(k)?' wish':'')+(AS.has(k)?' again':'')+'">'
    +'<div class="check" aria-hidden="true" title="'+stampTxt+'">'+stamp+'</div>'
    +'<div class="info"><div class="name">'+esc(d.n)+badge(k)
      +(d.w?'<span class="new">NEW</span>':'')+(d.g?'<span class="gstar">绿星</span>':'')
    +'</div><div class="meta"><span class="rbadge" style="background:'+rankColor(d.r)+'">'+rankLabel(d.r)+'</span>'+esc(d.t)
      +(isDone&&litData[k]?' · <span class="litdate">✦ '+litData[k]+'</span>':'')
      +(WD[k]&&WD[k].note?' · 「'+esc(WD[k].note)+'」':'')
    +'</div>'+(d.a?'<div class="addr">📍 '+esc(d.a)+'</div>':'')
    +tri(k)
    +'</div>'
    +'<div class="btns"><a class="btn-amap" href="'+amapUrl(d)+'">高德</a><a class="btn-dp" href="'+dpUrl(d)+'">点评</a></div>'
    +'</div>';
};
visibleList=function(){
  return DATA.filter(function(d){var k=keyOf(d);
    if(filter==='star'&&typeof d.r!=='number')return false;
    if(filter==='bib'&&d.r!=='bib')return false;
    if(filter==='sel'&&d.r!=='sel')return false;
    if(filter==='todo'&&lit.has(k))return false;
    if(filter==='done'&&!lit.has(k))return false;
    if(filter==='wish'&&!WS.has(k))return false;
    if(filter==='again'&&!AS.has(k))return false;
    if(city!=='all'&&d.c!==city)return false;
    return matchQ(d);
  }).sort(function(a,b){var ka=keyOf(a),kb=keyOf(b);
    return ((AS.has(kb)?2:0)+(WS.has(kb)?1:0)+(lit.has(kb)?1:0))-((AS.has(ka)?2:0)+(WS.has(ka)?1:0)+(lit.has(ka)?1:0))
      ||rankOrder(a.r)-rankOrder(b.r)||a.n.localeCompare(b.n,'zh');});
};
var _render=render;
render=function(){_render();refreshNav();
  var none=lit.size===0&&WS.size===0&&AS.size===0&&Object.keys(PD).length===0;
  note.textContent=none
    ? '点卡片上的 ○ 想去 收藏心愿、✦ 吃过 盖章打卡 · 记录只保存在这台设备的浏览器里'
    : '✦ 吃过 '+lit.size+' 家 · 其中 ◎ 值得二访 '+AS.size+' · ○ 想去 '+WS.size+' · 已拔草 '+Object.keys(PD).length;
};

window.setWish=function(k){
  if(WS.has(k)){WS.delete(k);delete WD[k];}
  else{if(lit.has(k)){alert('已经吃过啦，直接标记「想再去」吧');return;}
    WS.add(k);WD[k]={since:today(),note:''};
    var txt=prompt('想吃哪道菜 / 和谁去？（可留空）','');if(txt!==null)WD[k].note=String(txt).slice(0,60);}
  saveState();render();
};
window.setAgain=function(k){
  if(AS.has(k)){AS.delete(k);delete AD[k];}
  else{
    if(!lit.has(k)){alert('吃过之后才能标记「想再去」，先去吃吧');return;}
    AS.add(k);AD[k]=today();alert('◎ 已标记为值得二访');
  }
  saveState();render();
};
toggle=function(k){
  if(lit.has(k)){lit.delete(k);delete litData[k];AS.delete(k);delete AD[k];}
  else{litData[k]=today();lit.add(k);
    if(WS.has(k)){var w=WD[k]||{},dd=daysBetween(w.since,today());
      PD[k]={since:w.since||'',until:today(),days:Math.max(0,dd),note:w.note||'',name:nameOfKey(k)};
      delete WD[k];WS.delete(k);
      if(dd>=0)alert('拔草啦 · 惦记了 '+dd+' 天，终于吃到了');}}
  saveState();render();
};
document.addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('button[data-act]'):null;if(!b)return;
  var k=b.getAttribute('data-k'),act=b.getAttribute('data-act');
  if(act==='wish')setWish(k);else if(act==='lit')toggle(k);else if(act==='again')setAgain(k);
});

var resetBtn=document.getElementById('reset');
if(resetBtn)resetBtn.onclick=function(){
  if(!confirm('确定清空全部记录？（吃过 '+lit.size+' · 想去 '+WS.size+' · 想再去 '+AS.size+' · 拔草 '+Object.keys(PD).length+'）'))return;
  lit.clear();litData={};WS.clear();WD={};AS.clear();AD={};PD={};
  saveState();render();
};

/* ===== 战绩海报 · 对外分享 =====
   只呈现「吃过」与「值得二访」两类事实及其派生数据；
   心愿、惦记、拔草、进度自谦、界面说明一律不进海报。
   两张 1080×1440（3:4），固定网格：页眉 / 主角区 / 内容区 / 收尾区 / 页脚。 */
var PW=1080,PH=1440,SAFE=88;
var PAPER='#FFF8EC',INK='#2B2118',INK2='#7A6A56',RED='#EF3B2C',TEAL='#4E8B72',LINE='#EADCC2';
var FS='"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
var GX=SAFE,GW=PW-2*SAFE,GR=PW-SAFE;
var HERO_TOP=190,BODY_TOP=640,BODY_BOT=1150,END_TOP=1190,FOOT_LINE=1326;
var PAGE_TOTAL=2;

function newPage(){
  var c=document.createElement('canvas');c.width=PW;c.height=PH;var x=c.getContext('2d');
  x.fillStyle=PAPER;x.fillRect(0,0,PW,PH);
  x.strokeStyle='rgba(122,106,86,.05)';x.lineWidth=1;
  for(var yy=BODY_TOP+16;yy<BODY_BOT;yy+=34){x.beginPath();x.moveTo(GX,yy);x.lineTo(GR,yy);x.stroke();}
  return {c:c,x:x};
}
function rr2(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
function cut(x,s,maxW){if(x.measureText(s).width<=maxW)return s;while(s.length>1&&x.measureText(s+'…').width>maxW)s=s.slice(0,-1);return s+'…';}
function wrapText(x,s,maxW){var out=[],cur='';for(var i=0;i<s.length;i++){var t=cur+s[i];if(x.measureText(t).width>maxW&&cur){out.push(cur);cur=s[i];}else cur=t;}if(cur)out.push(cur);return out;}
function head(x,tag){
  x.fillStyle=RED;rr2(x,GX,SAFE-30,58,58,10);x.fill();
  x.fillStyle='#fff';x.textAlign='center';x.font='800 32px '+FS;x.fillText('米',GX+29,SAFE+12);x.textAlign='left';
  x.fillStyle=INK;x.font='800 30px '+FS;x.fillText(tag,GX+76,SAFE+11);
  x.textAlign='right';x.fillStyle=INK2;x.font='600 17px '+FS;x.fillText('中国内地及港澳 · 2026',GR,SAFE+9);x.textAlign='left';
  x.strokeStyle=LINE;x.lineWidth=2;x.beginPath();x.moveTo(GX,SAFE+56);x.lineTo(GR,SAFE+56);x.stroke();
}
function foot(x,n){
  x.strokeStyle=LINE;x.lineWidth=2;x.beginPath();x.moveTo(GX,FOOT_LINE);x.lineTo(GR,FOOT_LINE);x.stroke();
  x.fillStyle=INK2;x.font='600 16px '+FS;x.textAlign='left';x.fillText('米其林指南 2026 · 中国内地及港澳',GX,FOOT_LINE+34);
  x.textAlign='right';x.fillStyle=RED;x.font='800 18px '+FS;x.fillText('0'+n+' / 0'+PAGE_TOTAL,GR,FOOT_LINE+34);x.textAlign='left';
}
/* 主角区：淡朱红光斑 + 巨型数字 + 一笔手绘圈 + 收据撕票边 */
function scribble(x,cx,cy,rx,ry,col){
  x.save();x.translate(cx,cy);x.rotate(-0.13);
  x.strokeStyle=col;x.lineWidth=5;x.lineCap='round';x.lineJoin='round';
  x.beginPath();
  x.moveTo(rx*0.86,-ry*0.54);
  x.bezierCurveTo(rx*0.30,-ry*1.26,-rx*0.98,-ry*1.08,-rx*1.04,-ry*0.14);
  x.bezierCurveTo(-rx*1.18,ry*0.64,-rx*0.70,ry*1.22,-rx*0.10,ry*1.05);
  x.bezierCurveTo(rx*0.60,ry*1.18,rx*1.16,ry*0.68,rx*1.01,ry*0.08);
  x.bezierCurveTo(rx*0.98,-ry*0.18,rx*0.92,-ry*0.50,rx*0.76,-ry*0.68);
  x.stroke();x.restore();
}
function tearEdge(x,y){
  x.beginPath();x.moveTo(GX,y);
  for(var px=GX;px<GR-16;px+=16){x.lineTo(px+8,y+8);x.lineTo(px+16,y);}
  x.strokeStyle='#E6D5B8';x.lineWidth=2;x.stroke();
  x.strokeStyle=RED;x.lineWidth=6;x.lineCap='round';x.beginPath();x.moveTo(GX,y);x.lineTo(GX+112,y);x.stroke();
}
function hero(x,lead,line1,line2,num){
  var nBase=HERO_TOP+330,right=GR-64,nStr=String(num);
  x.textAlign='right';x.font='800 232px '+FS;
  var nw=x.measureText(nStr).width,ncx=right-nw/2,ncy=nBase-84;
  var rad=Math.max(nw/2+52,132);
  var g=x.createRadialGradient(ncx,ncy,8,ncx,ncy,rad);
  g.addColorStop(0,'rgba(239,59,44,.14)');g.addColorStop(1,'rgba(239,59,44,0)');
  x.fillStyle=g;x.beginPath();x.arc(ncx,ncy,rad,0,Math.PI*2);x.fill();
  x.textAlign='left';
  var y=HERO_TOP+56;
  if(lead){x.fillStyle=INK2;x.font='700 34px '+FS;x.fillText(lead,GX,y);y+=112;}
  x.fillStyle=INK;x.font='800 84px '+FS;x.fillText(line1,GX,y);
  y+=104;x.fillStyle=INK;x.font='800 84px '+FS;x.fillText(line2,GX,y);
  x.textAlign='right';x.font='800 232px '+FS;x.fillStyle=RED;x.fillText(nStr,right,nBase);x.textAlign='left';
  scribble(x,ncx,ncy,nw/2+34,116,RED);
  tearEdge(x,HERO_TOP+394);
}
function ending(x,txt){
  x.fillStyle=INK;x.font='600 31px '+FS;
  wrapText(x,txt,GW).forEach(function(s2,i){x.fillText(s2,GX,END_TOP+22+i*46);});
}
function sectionLabel(x,txt,right,y){
  x.fillStyle=INK;x.font='800 28px '+FS;x.fillText(txt,GX+30,y);
  if(right){x.textAlign='right';x.fillStyle=INK2;x.font='600 19px '+FS;x.fillText(right,GR-30,y);x.textAlign='left';}
}
function card(x,y,h){
  x.fillStyle='#fff';x.strokeStyle=LINE;x.lineWidth=2;rr2(x,GX,y,GW,h,16);x.fill();x.stroke();
}
function thinLine(x,y){
  x.strokeStyle=LINE;x.lineWidth=1.5;x.beginPath();x.moveTo(GX+30,y);x.lineTo(GR-30,y);x.stroke();
}

function buildPosterSet(){
  PAGE_TOTAL=2;
  var litArr=DATA.filter(function(d){return lit.has(keyOf(d));});
  var total=DATA.length;
  var starTotal=DATA.filter(function(d){return typeof d.r==='number';}).length;
  var starLit=litArr.filter(function(d){return typeof d.r==='number';}).length;
  var guideStarPct=Math.round(starTotal/total*1000)/10;
  var myStarPct=litArr.length?Math.round(starLit/litArr.length*1000)/10:0;
  var cityCnt={},cuiCnt={},rankCnt={'三星':0,'二星':0,'一星':0,'必比登':0,'入选':0};
  litArr.forEach(function(d){
    cityCnt[d.c]=(cityCnt[d.c]||0)+1;
    var cu=(d.t||'其他').replace(/·绿星/g,'').replace(/·/g,' / ')||'其他';cuiCnt[cu]=(cuiCnt[cu]||0)+1;
    var rk=typeof d.r==='number'?(['','一星','二星','三星'][d.r]||'一星'):(d.r==='bib'?'必比登':'入选');
    rankCnt[rk]=(rankCnt[rk]||0)+1;
  });
  var cityN=Object.keys(cityCnt).length;
  var cities=Object.entries(cityCnt).sort(function(a,b){return b[1]-a[1];});
  var cuis=Object.entries(cuiCnt).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
  var cY=BODY_TOP+18,cH=BODY_BOT-BODY_TOP-36;
  var pages=[];

  /* ---- P1 战绩：吃过多少、都是什么级别 ---- */
  var p1=newPage(),x=p1.x;head(x,'吃过的');
  hero(x,'2026 米其林指南 · '+total+' 家',litArr.length?'也没吃':'还没开始',litArr.length?'几家':'第一顿',litArr.length);
  card(x,cY,cH);
  sectionLabel(x,'吃过的是什么级别','星级 '+starLit+' 家',cY+52);
  thinLine(x,cY+74);
  var ranks=['三星','二星','一星','必比登','入选'].filter(function(r){return rankCnt[r]>0;});
  if(ranks.length){
    var maxRank=Math.max.apply(null,ranks.map(function(r){return rankCnt[r];}).concat([1]));
    var rowTop=cY+96,rowH=(cH-120)/ranks.length,barX=GX+172,barW=GW-172-124;
    ranks.forEach(function(r,i){
      var yy=rowTop+rowH*(i+0.5);
      if(i){x.strokeStyle='#F2E9D8';x.lineWidth=1.5;x.beginPath();x.moveTo(GX+30,yy-rowH/2+4);x.lineTo(GR-30,yy-rowH/2+4);x.stroke();}
      x.fillStyle=INK;x.font='700 26px '+FS;x.fillText(r,GX+30,yy+9);
      x.fillStyle='#F2E9D8';rr2(x,barX,yy-9,barW,18,9);x.fill();
      x.fillStyle=(['三星','二星','一星'].indexOf(r)>=0?RED:'#D8B24A');rr2(x,barX,yy-9,Math.max(18,barW*rankCnt[r]/maxRank),18,9);x.fill();
      x.textAlign='right';x.fillStyle=INK;x.font='800 30px '+FS;x.fillText(rankCnt[r]+' 家',GR-30,yy+10);x.textAlign='left';
    });
  }else{
    x.fillStyle=INK2;x.font='500 26px '+FS;x.textAlign='center';
    x.fillText('名单还空着，先从第一顿开始。',GX+GW/2,cY+cH/2);x.textAlign='left';
  }
  ending(x,litArr.length?'也没特意挑，吃着吃着就这些了。':'名单还空着，先从第一顿开始。');
  foot(x,1);pages.push(p1.c.toDataURL('image/png'));

  /* ---- P2 履历：走过哪些城、眼光准不准 ---- */
  var p2=newPage();x=p2.x;head(x,'走过的地方');
  hero(x,litArr.length?'':'还没出门',litArr.length?'顺便':'等第一座',litArr.length?'走了几座城':'城市',cityN);
  card(x,BODY_TOP+10,200);
  sectionLabel(x,'星级占比','对比全指南',BODY_TOP+50);
  var half=GW/2;
  x.strokeStyle=LINE;x.lineWidth=1.5;x.beginPath();x.moveTo(GX+half,BODY_TOP+76);x.lineTo(GX+half,BODY_TOP+192);x.stroke();
  [[guideStarPct,'全指南',INK2],[myStarPct,'我吃过的',RED]].forEach(function(o,i){
    var cx=GX+half*i+30;
    x.fillStyle=o[2];x.font='800 68px '+FS;x.fillText(o[0]+'%',cx,BODY_TOP+146);
    x.fillStyle=INK2;x.font='600 20px '+FS;x.fillText(o[1],cx,BODY_TOP+182);
  });
  var labY=BODY_TOP+252,colW=(GW-40)/2,colX=[GX,GX+colW+40],barW2=colW-90;
  x.fillStyle=INK;x.font='800 27px '+FS;x.fillText('走过这些城',colX[0],labY);x.fillText('偏爱的口味',colX[1],labY);
  var tc=cities.slice(0,4),tg=cuis;
  [tc,tg].forEach(function(arr,i){
    var px=colX[i];
    if(!arr.length){x.fillStyle=INK2;x.font='500 21px '+FS;x.fillText('还没有记录',px,labY+62);return;}
    arr.forEach(function(p,j){
      var yy=labY+56+j*56;
      x.fillStyle=i?TEAL:RED;x.font='700 24px '+FS;x.fillText(cut(x,p[0],colW-96),px,yy);
      x.textAlign='right';x.fillStyle=INK2;x.font='600 19px '+FS;x.fillText(p[1]+' 家',px+colW,yy);x.textAlign='left';
      x.fillStyle='#EFE4CF';rr2(x,px,yy+12,barW2,9,5);x.fill();
      x.fillStyle=i?TEAL:RED;rr2(x,px,yy+12,Math.max(8,barW2*p[1]/Math.max(1,arr[0][1])),9,5);x.fill();
    });
  });
  ending(x,litArr.length?'没什么目标，走到哪吃到哪。':'名单还空着，先从第一顿开始。');
  foot(x,2);pages.push(p2.c.toDataURL('image/png'));
  return pages;
}

/* ---- 海报弹窗：翻页 / 下载 ---- */
window.buildPosterSet=buildPosterSet;
var posterImgs=[],posterIdx=0;
var toastEl=document.createElement('div');toastEl.id='toast';document.body.appendChild(toastEl);
var toastT=null;
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show');},2600);}
function closePoster(){
  document.getElementById('pmodal').classList.remove('open');
  document.body.style.overflow='';
}
document.getElementById('posterbtn').onclick=function(){
  if(!lit.size){toast('先打卡几家，再来生成战绩海报');return;}
  try{posterImgs=buildPosterSet();}catch(e){alert('海报生成失败：'+e.message);return;}
  posterIdx=0;
  document.getElementById('pmodal').classList.add('open');
  document.body.style.overflow='hidden';
  showPage();
};
document.getElementById('pclose').onclick=closePoster;
document.getElementById('pmodal').addEventListener('click',function(e){if(e.target.id==='pmodal')closePoster();});
function dlPage(i){
  var a=document.createElement('a');a.href=posterImgs[i];
  a.download='米其林战绩-'+(i+1)+'-'+today()+'.png';a.click();
}
function navPage(d){
  if(posterImgs.length<2)return;
  posterIdx=(posterIdx+d+posterImgs.length)%posterImgs.length;showPage();
}
function showPage(){
  var wrapEl=document.getElementById('pimgwrap');
  wrapEl.innerHTML='';
  var im=document.createElement('img');
  im.id='pimg';im.src=posterImgs[posterIdx];im.alt='米其林战绩 第'+(posterIdx+1)+'张';
  im.style.cssText='display:block;margin:0 auto';
  wrapEl.appendChild(im);
  var sx=null;
  im.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
  im.addEventListener('touchend',function(e){
    if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;sx=null;
    if(dx<-40)navPage(1);else if(dx>40)navPage(-1);
  });
  im.addEventListener('click',function(){navPage(1);});
  if(posterImgs.length>1){
    var navRow=document.createElement('div');
    navRow.style.cssText='display:flex;align-items:center;justify-content:center;gap:16px;margin:12px 0 2px';
    var mk=function(txt,d){
      var b=document.createElement('button');b.textContent=txt;
      b.style.cssText='padding:6px 18px;font-size:16px;line-height:1;border:1px solid #E9E3D7;background:#fff;border-radius:3px;cursor:pointer;color:#6B6357';
      b.onclick=function(){navPage(d);};return b;
    };
    navRow.appendChild(mk('‹',-1));
    var ind=document.createElement('span');
    ind.style.cssText='font-size:13px;font-weight:600;color:#7A6A56;letter-spacing:.1em;min-width:44px;text-align:center';
    ind.textContent=(posterIdx+1)+' / '+posterImgs.length;
    navRow.appendChild(ind);
    navRow.appendChild(mk('›',1));
    wrapEl.appendChild(navRow);
  }
  var hint=document.createElement('div');
  hint.style.cssText='font-size:11.5px;color:#7A6A56;margin-top:6px;line-height:1.6;text-align:center';
  hint.textContent=posterImgs.length>1
    ? '左右滑动或点箭头翻页 · '+posterImgs.length+' 张 1080×1440（3:4）适合小红书轮播'
    : '1080×1440（3:4），适合小红书首图';
  wrapEl.appendChild(hint);
  var pdl=document.getElementById('pdl');
  pdl.textContent='下载本张';
  pdl.onclick=function(){dlPage(posterIdx);};
  var pdlAll=document.getElementById('pdlall');
  if(posterImgs.length>1){
    if(!pdlAll){pdlAll=document.createElement('button');pdlAll.id='pdlall';pdl.parentNode.appendChild(pdlAll);}
    pdlAll.textContent='下载全部';
    pdlAll.onclick=function(){posterImgs.forEach(function(_,i){setTimeout(function(){dlPage(i);},i*400);});};
  }else if(pdlAll){pdlAll.remove();}
}
document.addEventListener('keydown',function(e){
  var m=document.getElementById('pmodal');
  if(!m||!m.classList.contains('open'))return;
  if(e.key==='ArrowRight')navPage(1);
  else if(e.key==='ArrowLeft')navPage(-1);
  else if(e.key==='Escape')closePoster();
});

render();
})();
</script>
</body>
</html>`;

const out = path.join(__dirname, '..', 'index.html');
fs.writeFileSync(out, html);
console.log('构建完成:', out, (fs.statSync(out).size / 1024).toFixed(1) + 'KB');
console.log('总数', counts.total, '星级', counts.star, '必比登', counts.bib, '入选', counts.sel);
console.log('城市', cities.map(c => c + ' ' + counts.byCity[c]).join(' | '));
