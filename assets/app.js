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

// ── PDF — ใช้ HTML template + html2canvas ─────────────────
// วิธีนี้แสดงภาษาไทยได้ถูกต้อง 100% และรองรับรูปภาพ
function exportQuotationPDF(qt) {
  // สร้าง HTML template สำหรับ render
  var items = Array.isArray(qt.items) ? qt.items : [];

  var itemsHTML = items.map(function(it, i) {
    var total = (Number(it.qty)||1) * (Number(it.price)||0);
    return '<tr style="background:'+(i%2===0?'#f8fbff':'#fff')+'">' +
      '<td style="padding:10px 12px;font-weight:600;font-size:13px;border-bottom:1px solid #e8f0fb;">' +
        (it.name||'-') +
        (it.img && it.img.length > 5 && it.img !== '' ?
          '<br><img src="'+it.img+'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-top:6px;border:1px solid #d4e2f4;">'
          : '') +
      '</td>' +
      '<td style="padding:10px 12px;text-align:center;border-bottom:1px solid #e8f0fb;font-size:13px;">'+(it.qty||1)+'</td>' +
      '<td style="padding:10px 12px;text-align:right;border-bottom:1px solid #e8f0fb;font-size:13px;">'+baht(it.price)+'</td>' +
      '<td style="padding:10px 12px;text-align:right;border-bottom:1px solid #e8f0fb;font-size:13px;font-weight:700;color:#1e4e78;">'+baht(total)+'</td>' +
    '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html><head>' +
    '<meta charset="UTF-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:"Prompt",sans-serif;background:#fff;color:#1e3a5f;width:794px;}' +
    '</style></head><body>' +
    '<div style="width:794px;min-height:1123px;background:#fff;position:relative;">' +

    // Header
    '<div style="background:#1e4e78;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div>' +
        '<div style="font-size:24px;font-weight:700;color:#fff;">QuoteFlow</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px;">ใบเสนอราคา / Quotation</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="font-size:20px;font-weight:700;color:#fff;">ใบเสนอราคา</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px;">เลขที่: '+(qt.id||'')+'</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.75);">วันที่: '+fmtDate(qt.createdAt)+'</div>' +
      '</div>' +
    '</div>' +

    // Customer box
    '<div style="margin:20px 32px 0;background:#f0f7ff;border:1px solid #d4e2f4;border-radius:10px;padding:16px 20px;">' +
      '<div style="font-size:11px;color:#4a6fa5;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">ลูกค้า / Customer</div>' +
      '<div style="font-size:18px;font-weight:700;color:#1e3a5f;">'+(qt.customerName||'-')+'</div>' +
      (qt.note ? '<div style="font-size:12px;color:#4a6fa5;margin-top:6px;">'+qt.note+'</div>' : '') +
    '</div>' +

    // Table
    '<div style="margin:20px 32px 0;">' +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<thead>' +
          '<tr style="background:#1e4e78;">' +
            '<th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">รายละเอียดสินค้า / บริการ</th>' +
            '<th style="padding:10px 12px;text-align:center;color:#fff;font-size:12px;font-weight:600;">จำนวน</th>' +
            '<th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600;">ราคา/หน่วย</th>' +
            '<th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600;">ทั้งหมด</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + itemsHTML + '</tbody>' +
      '</table>' +
    '</div>' +

    // Totals
    '<div style="margin:16px 32px 0;display:flex;justify-content:flex-end;">' +
      '<div style="min-width:280px;">' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e8f0fb;">' +
          '<span style="font-size:13px;color:#4a6fa5;">ยอดก่อนภาษี</span>' +
          '<span style="font-size:13px;font-weight:600;">'+baht(qt.subtotal)+'</span>' +
        '</div>' +
        (Number(qt.vat)>0 ?
          '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e8f0fb;">' +
            '<span style="font-size:13px;color:#4a6fa5;">ภาษีมูลค่าเพิ่ม 7%</span>' +
            '<span style="font-size:13px;color:#4a6fa5;">'+baht(qt.vat)+'</span>' +
          '</div>' : '') +
        '<div style="background:#1e4e78;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;margin-top:8px;">' +
          '<span style="font-size:15px;font-weight:700;color:#fff;">ยอดรวมทั้งสิ้น</span>' +
          '<span style="font-size:15px;font-weight:700;color:#fff;">'+baht(qt.total)+'</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Note / terms
    (qt.note ?
      '<div style="margin:20px 32px 0;padding:12px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;">' +
        '<div style="font-size:11px;font-weight:600;color:#92400e;margin-bottom:4px;">หมายเหตุ / เงื่อนไข</div>' +
        '<div style="font-size:13px;color:#78350f;">'+qt.note+'</div>' +
      '</div>' : '') +

    // Signature
    '<div style="margin:32px 32px 0;display:flex;justify-content:flex-end;">' +
      '<div style="text-align:center;min-width:200px;">' +
        '<div style="font-size:13px;color:#4a6fa5;margin-bottom:48px;">ผู้เสนอราคา</div>' +
        '<div style="border-top:1.5px solid #1e3a5f;padding-top:8px;">' +
          '<div style="font-size:12px;color:#4a6fa5;">(........................................)</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Footer
    '<div style="position:absolute;bottom:0;left:0;right:0;background:#f0f7ff;padding:10px 32px;display:flex;justify-content:center;">' +
      '<span style="font-size:10px;color:#93aed4;">QuoteFlow Business Suite  •  '+new Date().toLocaleDateString('th-TH')+'</span>' +
    '</div>' +
  '</div></body></html>';

  // เปิด popup window แล้ว print เป็น PDF
  var win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    toast('กรุณาอนุญาต Popup ในเบราว์เซอร์ก่อน แล้วลองใหม่', 'warn');
    return;
  }
  win.document.write(html);
  win.document.close();

  // รอ font โหลดแล้ว print
  win.onload = function() {
    setTimeout(function() {
      win.focus();
      win.print();
    }, 1200);
  };
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
