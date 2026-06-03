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

// ── ข้อมูลบริษัท (แก้ไขได้ตามต้องการ) ──────────────────────
var COMPANY = {
  name    : 'ทองพิมพ์เฟอร์นิเจอร์',
  owner   : 'นางสาวสิราพร  กองหิน',
  address : '185/7 หมู่5 ต.หัวฝาย อ.สูงเม่น จ.แพร่ 54130',
  phone   : 'โทร 0615942452',
  bank    : 'ธนาคารไทยพาณิชย์ เลขที่บัญชี 429-081520-1',
  promptpay: 'พร้อมเพย์ 0649591424 สิราพร กองหิน',
  // สีธีมร้าน (น้ำตาลทองแดง)
  colorPrimary : '#7c4a1e',
  colorAccent  : '#c8922a',
  colorLight   : '#f5ede0',
  colorBorder  : '#d4b896',
  // เงื่อนไขการชำระ (%)
  deposit1Pct  : 40,   // มัดจำงวดแรก
  deposit2Pct  : 30,   // งวด 2 (ตรวจงานก่อนทำสี)
  deposit3Pct  : 30,   // งวด 3 (ก่อนส่ง)
  deliveryDays : 75,   // กำหนดส่งกี่วัน
  termsExtra   : 'ราคายังไม่รวมค่าส่ง (ค่าส่งลูกค้าจ่ายตามจริง)\nสีไม้สักทองธรรมชาติ เคลือบด้าน',
};

// ── คำนวณมัดจำอัตโนมัติ ──────────────────────────────────
function calcDeposits(total) {
  var d1 = Math.round(total * COMPANY.deposit1Pct / 100);
  var d2 = Math.round(total * COMPANY.deposit2Pct / 100);
  var d3 = total - d1 - d2;
  return { d1:d1, d2:d2, d3:d3 };
}

// ── PDF Template — ทองพิมพ์เฟอร์นิเจอร์ ─────────────────
function exportQuotationPDF(qt) {
  var items = Array.isArray(qt.items) ? qt.items : [];
  var total = Number(qt.total) || 0;
  var dep   = calcDeposits(total);
  var C     = COMPANY;

  // แปลงรูป items ให้ embed ได้
  var itemsHTML = items.map(function(it, i) {
    var rowTotal = (Number(it.qty)||1) * (Number(it.price)||0);
    var imgTag   = (it.img && it.img.length > 100)
      ? '<br><img src="'+it.img+'" style="width:80px;height:80px;object-fit:cover;border-radius:6px;margin-top:6px;border:1.5px solid '+C.colorBorder+';display:block;">'
      : '';
    return '<tr style="background:'+(i%2===0?C.colorLight:'#fff')+';vertical-align:top;">' +
      '<td style="padding:10px 14px;font-size:13px;border-bottom:1px solid '+C.colorBorder+';line-height:1.6;">' +
        '<strong>'+( i+1)+'. '+(it.name||'-')+'</strong>'+imgTag+
      '</td>' +
      '<td style="padding:10px 14px;text-align:center;border-bottom:1px solid '+C.colorBorder+';font-size:13px;white-space:nowrap;">'+(it.qty||1)+' ชิ้น</td>' +
      '<td style="padding:10px 14px;text-align:right;border-bottom:1px solid '+C.colorBorder+';font-size:13px;white-space:nowrap;">'+
        (Number(it.price)||0).toLocaleString('th-TH')+' บาท</td>' +
      '<td style="padding:10px 14px;text-align:right;border-bottom:1px solid '+C.colorBorder+';font-size:13px;font-weight:700;white-space:nowrap;color:'+C.colorPrimary+';">'+
        rowTotal.toLocaleString('th-TH')+' บาท</td>' +
    '</tr>';
  }).join('');

  // เงื่อนไขการชำระ
  var termsRows =
    '<li>'+C.termsExtra.replace(/\n/g,'</li><li>')+'</li>' +
    '<li>แบ่งชำระ 3 งวด<ul style="margin:4px 0 4px 20px;">' +
      '<li>งวดที่ 1 มัดจำ '+C.deposit1Pct+'% = '+dep.d1.toLocaleString('th-TH')+' บาท</li>' +
      '<li>งวดที่ 2 ตรวจเช็คงานก่อนทำสีชำระ '+C.deposit2Pct+'% = '+dep.d2.toLocaleString('th-TH')+' บาท</li>' +
      '<li>งวดที่ 3 ตรวจเช็คงานก่อนแพ็คก่อนส่งขึ้นรถชำระส่วนที่เหลือ '+C.deposit3Pct+'% = '+dep.d3.toLocaleString('th-TH')+' บาท</li>' +
    '</ul></li>' +
    '<li>กำหนดส่ง '+C.deliveryDays+' วัน หลังจากวันที่มัดจำ</li>';

  var html = '<!DOCTYPE html><html><head>' +
  '<meta charset="UTF-8">' +
  '<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
  '<style>' +
    '@media print{@page{size:A4;margin:0;} body{margin:0;}}' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:"Prompt",sans-serif;background:#fff;color:#2c1a0e;width:794px;margin:0 auto;}' +
    'table{border-collapse:collapse;width:100%;}' +
    'ul{padding-left:20px;} li{margin-bottom:4px;line-height:1.7;font-size:13px;}' +
  '</style></head><body>' +

  '<div style="width:794px;background:#fff;padding-bottom:40px;">' +

  // ── Header ──────────────────────────────────────────────
  '<div style="background:'+C.colorPrimary+';padding:0;display:flex;align-items:stretch;">' +
    // ซ้าย: โลโก้ + ข้อมูลบริษัท
    '<div style="padding:20px 24px;flex:1;display:flex;align-items:center;gap:16px;">' +
      // วงกลมโลโก้ (แทนรูป)
      '<div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<span style="font-size:28px;">🪑</span>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-.3px;">'+C.name+'</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.85);margin-top:3px;">'+C.owner+'</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:2px;">'+C.address+'</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.75);">'+C.phone+'</div>' +
      '</div>' +
    '</div>' +
    // ขวา: ชื่อเอกสาร
    '<div style="background:rgba(0,0,0,.25);padding:20px 24px;text-align:right;display:flex;flex-direction:column;justify-content:center;min-width:200px;">' +
      '<div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">ใบเสนอราคา</div>' +
      '<div style="color:rgba(255,255,255,.85);font-size:12px;margin-top:6px;">วันที่: '+fmtDate(qt.createdAt)+'</div>' +
    '</div>' +
  '</div>' +

  // ── แถบสีทอง ─────────────────────────────────────────────
  '<div style="background:'+C.colorAccent+';height:4px;"></div>' +

  // ── ข้อมูลลูกค้า ──────────────────────────────────────────
  '<div style="padding:16px 24px;border-bottom:2px solid '+C.colorBorder+';display:flex;justify-content:space-between;align-items:flex-start;">' +
    '<div>' +
      '<div style="font-size:11px;font-weight:600;color:'+C.colorAccent+';text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">ลูกค้า</div>' +
      '<div style="font-size:15px;font-weight:700;color:'+C.colorPrimary+';">'+(qt.customerName||'-')+'</div>' +
      (qt.note ? '<div style="font-size:12px;color:#666;margin-top:4px;max-width:400px;">'+qt.note+'</div>' : '') +
    '</div>' +
    '<div style="text-align:right;">' +
      '<div style="font-size:11px;font-weight:600;color:'+C.colorAccent+';text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">เลขที่</div>' +
      '<div style="font-size:14px;font-weight:700;color:'+C.colorPrimary+';">'+(qt.id||'')+'</div>' +
    '</div>' +
  '</div>' +

  // ── ตารางสินค้า ────────────────────────────────────────────
  '<div style="padding:0 24px;margin-top:16px;">' +
    '<table>' +
      '<thead>' +
        '<tr style="background:'+C.colorPrimary+';">' +
          '<th style="padding:10px 14px;text-align:left;color:#fff;font-size:12px;font-weight:600;">รายละเอียด</th>' +
          '<th style="padding:10px 14px;text-align:center;color:#fff;font-size:12px;font-weight:600;white-space:nowrap;">จำนวน</th>' +
          '<th style="padding:10px 14px;text-align:right;color:#fff;font-size:12px;font-weight:600;white-space:nowrap;">ราคา</th>' +
          '<th style="padding:10px 14px;text-align:right;color:#fff;font-size:12px;font-weight:600;white-space:nowrap;">ทั้งหมด</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>'+itemsHTML+'</tbody>' +
    '</table>' +
  '</div>' +

  // ── ยอดรวม ──────────────────────────────────────────────
  '<div style="padding:0 24px;margin-top:12px;display:flex;justify-content:flex-end;">' +
    '<div style="min-width:300px;">' +
      '<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid '+C.colorBorder+';">' +
        '<span style="font-size:13px;color:#666;">ยอดรวม :</span>' +
        '<span style="font-size:13px;font-weight:600;">'+total.toLocaleString('th-TH')+' บาท</span>' +
      '</div>' +
      (Number(qt.vat)>0?
        '<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid '+C.colorBorder+';">' +
          '<span style="font-size:13px;color:#666;">ภาษีมูลค่าเพิ่ม 7%</span>' +
          '<span style="font-size:13px;">'+Number(qt.vat).toLocaleString('th-TH')+' บาท</span>' +
        '</div>' : '') +
      '<div style="background:'+C.colorPrimary+';padding:12px 16px;display:flex;justify-content:space-between;margin-top:8px;border-radius:6px;">' +
        '<span style="font-size:15px;font-weight:700;color:#fff;">รวม</span>' +
        '<span style="font-size:16px;font-weight:700;color:#fff;">'+total.toLocaleString('th-TH')+' บาท</span>' +
      '</div>' +
    '</div>' +
  '</div>' +

  // ── เงื่อนไข / การชำระเงิน ─────────────────────────────────
  '<div style="padding:16px 24px;margin-top:12px;border-top:1.5px solid '+C.colorBorder+';">' +
    '<ul style="color:#2c1a0e;">'+termsRows+'</ul>' +
  '</div>' +

  // ── ลายเซ็น + บัญชีธนาคาร ─────────────────────────────────
  '<div style="padding:16px 24px;margin-top:8px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1.5px solid '+C.colorBorder+';">' +
    // ลายเซ็น
    '<div style="text-align:center;">' +
      '<div style="font-size:13px;color:#666;margin-bottom:52px;">ผู้เสนอราคา</div>' +
      '<div style="border-top:1.5px solid #333;padding-top:6px;min-width:180px;">' +
        '<div style="font-size:13px;font-weight:600;color:'+C.colorPrimary+';">('+C.owner+')</div>' +
      '</div>' +
    '</div>' +
    // บัญชีธนาคาร
    '<div style="text-align:right;">' +
      '<div style="font-size:12px;font-weight:600;color:'+C.colorPrimary+';margin-bottom:4px;">ชื่อบัญชี '+C.owner+'</div>' +
      '<div style="font-size:12px;color:#444;">'+C.bank+'</div>' +
      '<div style="font-size:12px;color:#444;">'+C.promptpay+'</div>' +
    '</div>' +
  '</div>' +

  '</div></body></html>';

  // เปิด popup แล้วพิมพ์
  var win = window.open('', '_blank', 'width=900,height:780,scrollbars=yes');
  if (!win) {
    toast('กรุณาอนุญาต Popup ในเบราว์เซอร์ก่อน แล้วลองใหม่', 'warn');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  win.onload = function() {
    setTimeout(function() {
      win.focus();
      win.print();
    }, 1500);
  };
  // fallback ถ้า onload ไม่ fire
  setTimeout(function() {
    if (win && !win.closed) {
      try { win.focus(); win.print(); } catch(e) {}
    }
  }, 3000);
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
