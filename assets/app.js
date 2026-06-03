// ============================================================
// QuoteFlow — app.js  (Complete)
// READ → GET, WRITE → POST no-cors
// Email ถูกส่งไปใน payload เสมอ
// ============================================================

var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbw7sXiSrH96l2BnjGbG_hgLaFi7e9iTJ7skWByk5mI56YYXVrZNARoT1Z--PEGs5qLp/exec', // 🔴 ใส่ URL จาก Apps Script Deploy
  GOOGLE_CLIENT_ID: '637690103992-85cf7gvvu6a57bbrnbga826oh0t4bvvi.apps.googleusercontent.com', // 🔴
};

var READ_ACTIONS = [
  'ping','login','getQuotations','getActiveOrders',
  'getFinance','getPayroll','getReceivables','getDashboard',
];

function api(action, data) {
  data  = data  || {};
  var user  = getUser();
  var email = (user && user.email) ? user.email : '';
  // ใส่ email ใน data เสมอ
  if (!data.email) data.email = email;

  if (READ_ACTIONS.indexOf(action) >= 0) {
    return doGET(action, data, email);
  }
  return doPOST(action, data, email);
}

function doGET(action, data, email) {
  var qs  = 'action='+encodeURIComponent(action)
          + '&email='+encodeURIComponent(email)
          + '&data=' +encodeURIComponent(JSON.stringify(data));
  return fetch(CONFIG.API_URL+'?'+qs, {method:'GET',redirect:'follow'})
    .then(function(r){return r.text();})
    .then(function(t){
      try{return JSON.parse(t);}
      catch(e){console.error('GET parse:',t.slice(0,200));return{success:false};}
    })
    .catch(function(e){
      console.error('GET['+action+']:',e.message);
      return{success:false,error:e.message};
    });
}

function doPOST(action, data, email) {
  var clean = stripImg(data);
  if (!clean.email) clean.email = email;
  var body = JSON.stringify({action:action, data:clean, email:email});
  return fetch(CONFIG.API_URL, {
    method:'POST', mode:'no-cors',
    headers:{'Content-Type':'text/plain'}, body:body,
  })
  .then(function(){
    return new Promise(function(res){setTimeout(function(){res({success:true});},2500);});
  })
  .catch(function(e){return{success:false,error:e.message};});
}

function stripImg(data) {
  if (!data) return {};
  var out = JSON.parse(JSON.stringify(data));
  if (Array.isArray(out.items)) {
    out.items = out.items.map(function(it){
      var i=Object.assign({},it);
      if(i.img&&String(i.img).length>500)i.img='';
      return i;
    });
  }
  return out;
}

// ── AUTH ──────────────────────────────────────────────────
function getUser(){
  try{return JSON.parse(localStorage.getItem('qf_user')||'null');}catch(e){return null;}
}
function setUser(u){localStorage.setItem('qf_user',JSON.stringify(u));}
function logout(){
  localStorage.removeItem('qf_user');
  try{google.accounts.id.disableAutoSelect();}catch(e){}
  window.location.href='index.html';
}
function requireAuth(){
  var u=getUser(); if(!u){window.location.href='index.html';return null;} return u;
}
function googleSignIn(cb){
  if(typeof google==='undefined')return;
  google.accounts.id.initialize({
    client_id:CONFIG.GOOGLE_CLIENT_ID,
    callback:function(resp){
      var p=parseJwt(resp.credential);
      api('login',{email:p.email,name:p.name||p.email.split('@')[0]}).then(function(r){
        var u=(r&&r.success&&r.user)?r.user:{email:p.email,name:p.name||p.email.split('@')[0],role:'admin'};
        setUser(u); if(cb)cb(u);
      });
    },
    auto_select:false,
  });
  var el=document.getElementById('googleBtn');
  if(el){google.accounts.id.renderButton(el,{theme:'outline',size:'large',shape:'pill',width:300});google.accounts.id.prompt();}
}
function parseJwt(token){
  try{
    var b=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(atob(b).split('').map(function(c){return'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);}).join('')));
  }catch(e){return{};}
}

// ── FORMAT ────────────────────────────────────────────────
function baht(n){return'฿'+(Number(n)||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDate(d){if(!d)return'-';try{return new Date(d).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'});}catch(e){return'-';}}
function shortId(id){return id?String(id).substring(0,12):'-';}

// ── TOAST ─────────────────────────────────────────────────
function toast(msg,type){
  type=type||'success';
  var wrap=document.getElementById('_tw');
  if(!wrap){wrap=document.createElement('div');wrap.id='_tw';
    wrap.style.cssText='position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(wrap);}
  var C={success:{bg:'#d1fae5',bd:'#6ee7b7',tx:'#065f46',ic:'✅'},error:{bg:'#fee2e2',bd:'#fca5a5',tx:'#991b1b',ic:'❌'},warn:{bg:'#fef3c7',bd:'#fcd34d',tx:'#92400e',ic:'⚠️'},info:{bg:'#dbeafe',bd:'#93c5fd',tx:'#1e40af',ic:'ℹ️'}};
  var c=C[type]||C.info;
  if(!document.getElementById('_tkf')){var s=document.createElement('style');s.id='_tkf';s.textContent='@keyframes _ti{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}';document.head.appendChild(s);}
  var el=document.createElement('div');
  el.style.cssText='background:'+c.bg+';border:1.5px solid '+c.bd+';color:'+c.tx+';padding:11px 18px;border-radius:12px;font-family:Prompt,sans-serif;font-size:13.5px;font-weight:500;box-shadow:0 4px 20px rgba(59,130,246,.15);display:flex;align-items:center;gap:8px;max-width:320px;pointer-events:auto;animation:_ti .3s ease;';
  el.innerHTML='<span style="font-size:16px;flex-shrink:0">'+c.ic+'</span><span>'+msg+'</span>';
  wrap.appendChild(el);
  setTimeout(function(){el.style.opacity='0';el.style.transform='translateX(110%)';el.style.transition='all .25s';setTimeout(function(){el.remove();},260);},3500);
}
function openModal(id){var e=document.getElementById(id);if(e)e.classList.add('open');}
function closeModal(id){var e=document.getElementById(id);if(e)e.classList.remove('open');}

// ── PDF — ตรงตามใบจริง ────────────────────────────────────
function exportQuotationPDF(qt, companyInfo) {
  if(!window.jspdf){toast('กำลังโหลด PDF...','info');return;}
  companyInfo = companyInfo || {};
  var doc = new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  var items = Array.isArray(qt.items)?qt.items:[];
  var W=210, margin=15;

  // ── Header ─────────────────────────────────────────────
  doc.setFillColor(26,76,113);
  doc.rect(0,0,W,50,'F');

  // Logo placeholder
  doc.setFillColor(255,255,255,0.2);
  doc.setDrawColor(255,255,255);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin,8,28,28,3,3,'S');
  doc.setTextColor(255,255,255);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('LOGO',margin+14,25,{align:'center'});

  // ชื่อบริษัท
  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text(companyInfo.name||'QuoteFlow', 50, 18);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  if(companyInfo.address) doc.text(companyInfo.address, 50, 25);
  if(companyInfo.phone)   doc.text(companyInfo.phone,   50, 31);
  if(companyInfo.email)   doc.text(companyInfo.email,   50, 37);

  // ชื่อเอกสาร (ขวา)
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text('QUOTATION', W-margin, 18, {align:'right'});
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('เลขที่: '+( qt.id||''), W-margin, 26, {align:'right'});
  doc.text('วันที่: '+fmtDate(qt.createdAt), W-margin, 32, {align:'right'});

  // ── ลูกค้า ────────────────────────────────────────────
  var y = 60;
  doc.setDrawColor(200,210,230);
  doc.setFillColor(245,248,255);
  doc.roundedRect(margin, y-5, W-margin*2, 22, 2, 2, 'FD');
  doc.setTextColor(80,80,80); doc.setFontSize(8);
  doc.text('ลูกค้า / Customer', margin+3, y+1);
  doc.setTextColor(20,20,20); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text(qt.customerName||'-', margin+3, y+9);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(80,80,80);
  if(qt.note) doc.text(qt.note, margin+3, y+15, {maxWidth:W-margin*2-6});

  // ── ตารางสินค้า ────────────────────────────────────────
  y = 92;
  // Header
  doc.setFillColor(26,76,113);
  doc.rect(margin, y, W-margin*2, 8, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('รายละเอียด', margin+3, y+5.5);
  doc.text('จำนวน', 130, y+5.5, {align:'center'});
  doc.text('ราคา', 158, y+5.5, {align:'right'});
  doc.text('ทั้งหมด', W-margin, y+5.5, {align:'right'});
  y += 8;

  doc.setTextColor(30,30,30); doc.setFont('helvetica','normal');
  items.forEach(function(it, i) {
    if(y > 230){doc.addPage(); y=20;}
    var rowH = 12;
    // สลับสี
    if(i%2===0){doc.setFillColor(249,251,255);doc.rect(margin,y,W-margin*2,rowH,'F');}
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
    doc.text(String(it.name||'-').substring(0,45), margin+3, y+5);
    doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60); doc.setFontSize(8);
    doc.text(String(it.qty||1), 130, y+5, {align:'center'});
    doc.text(baht(it.price), 158, y+5, {align:'right'});
    doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
    doc.text(baht((it.qty||1)*(it.price||0)), W-margin, y+5, {align:'right'});
    // เส้นคั่น
    doc.setDrawColor(220,228,240); doc.setLineWidth(0.3);
    doc.line(margin, y+rowH, W-margin, y+rowH);
    y += rowH;
  });

  // ── ยอดรวม ────────────────────────────────────────────
  y += 5;
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
  doc.text('ยอดรวม:', 145, y); doc.text(baht(qt.subtotal), W-margin, y, {align:'right'}); y+=7;
  if(Number(qt.vat)>0){
    doc.text('ภาษีมูลค่าเพิ่ม 7%:', 130, y); doc.text(baht(qt.vat), W-margin, y, {align:'right'}); y+=7;
  }
  // กล่องรวมสุดท้าย
  doc.setFillColor(26,76,113);
  doc.roundedRect(125, y-5, W-margin-125, 12, 2,2,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('รวม', 135, y+3.5);
  doc.text(baht(qt.total), W-margin, y+3.5, {align:'right'});

  // ── เงื่อนไขการชำระเงิน ──────────────────────────────
  if(qt.note){
    y += 20;
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(26,76,113);
    doc.text('หมายเหตุ / เงื่อนไข:', margin, y);
    doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50); y+=6;
    var lines = doc.splitTextToSize(qt.note, W-margin*2-5);
    doc.text(lines, margin+3, y);
  }

  // ── ลายเซ็น ───────────────────────────────────────────
  var sigY = 255;
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
  doc.text('ผู้เสนอราคา', W/2, sigY, {align:'center'});
  doc.setLineWidth(0.5); doc.setDrawColor(100,100,100);
  doc.line(W/2-30, sigY+18, W/2+30, sigY+18);
  doc.setFontSize(8);
  doc.text('(........................................)', W/2, sigY+23, {align:'center'});

  // ── Footer ────────────────────────────────────────────
  doc.setFillColor(240,245,252);
  doc.rect(0,279,W,18,'F');
  doc.setFontSize(7); doc.setTextColor(120,140,170);
  doc.text('QuoteFlow Business Suite  •  '+new Date().toLocaleDateString('th-TH'), W/2, 287, {align:'center'});

  doc.save('QT-'+(qt.id||'quotation')+'.pdf');
}

function shareQuotation(qt){
  var text='📋 '+(qt.id||'')+'\n👤 '+(qt.customerName||'')+'\n💰 '+baht(qt.total)+'\n📅 '+fmtDate(qt.createdAt);
  if(navigator.share){navigator.share({title:'QT '+(qt.id||''),text:text});}
  else{navigator.clipboard.writeText(text).then(function(){toast('คัดลอกแล้ว!','info');});}
}

window.QuoteFlow={
  api,getUser,setUser,logout,requireAuth,googleSignIn,
  baht,fmtDate,shortId,toast,openModal,closeModal,
  exportQuotationPDF,shareQuotation,
};
