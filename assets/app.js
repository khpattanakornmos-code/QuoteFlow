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
var READ_CACHE_TTL = 20000;
var _readCache = {};

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
  var cacheKey = action + '|' + email + '|' + JSON.stringify(data || {});
  var cached = _readCache[cacheKey];
  var now = Date.now();
  if (cached && now - cached.time < READ_CACHE_TTL) {
    return Promise.resolve(JSON.parse(JSON.stringify(cached.value)));
  }
  var qs  = 'action='+encodeURIComponent(action)
          + '&email='+encodeURIComponent(email)
          + '&data=' +encodeURIComponent(JSON.stringify(data));
  return fetch(CONFIG.API_URL+'?'+qs, {method:'GET',redirect:'follow'})
    .then(function(r){return r.text();})
    .then(function(t){
      try{
        var parsed = JSON.parse(t);
        if (parsed && parsed.success) {
          _readCache[cacheKey] = {time:now,value:parsed};
        }
        return parsed;
      }
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
    invalidateCache();
    return {success:true,id:clean.id||''};
  })
  .catch(function(e){return{success:false,error:e.message};});
}

function invalidateCache(action) {
  if (!action) {_readCache = {}; return;}
  Object.keys(_readCache).forEach(function(k){
    if (k.indexOf(action + '|') === 0) delete _readCache[k];
  });
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
function itemDimensionText(it){
  var d=(it&&it.dimensions)?it.dimensions:{};
  var parts=[];
  if(d.width!==''&&d.width!==undefined&&d.width!==null)parts.push('กว้าง '+Number(d.width).toLocaleString('th-TH'));
  if(d.length!==''&&d.length!==undefined&&d.length!==null)parts.push('ยาว '+Number(d.length).toLocaleString('th-TH'));
  if(d.height!==''&&d.height!==undefined&&d.height!==null)parts.push('สูง '+Number(d.height).toLocaleString('th-TH'));
  return parts.length?parts.join(' / ')+' '+(d.unit||'CM'):'';
}
function makeId(prefix){
  prefix = prefix || 'ID';
  var d = new Date();
  var pad = function(n){return String(n).padStart(2,'0');};
  var stamp = d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
  return prefix + '-' + stamp + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

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
  name      : 'ทองพิมพ์เฟอร์นิเจอร์',
  owner     : 'นางสาวสิราพร  กองหิน',
  address   : '185/7 หมู่5 ต.หัวฝาย อ.สูงเม่น จ.แพร่ 54130',
  phone     : 'โทร 0615942452',
  bank      : 'ธนาคารไทยพาณิชย์ เลขที่บัญชี 429-081520-1',
  promptpay : 'พร้อมเพย์ 0649591424 สิราพร กองหิน',
  logo      : 'data:image/jpeg;base64,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',
  scbLogo   : 'data:image/png;base64,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',
  colorPrimary : '#7c4a1e',
  colorAccent  : '#c8922a',
  colorLight   : '#fdf6ee',
  colorBorder  : '#d4b896',
  deposit1Pct  : 40,
  deposit2Pct  : 30,
  deposit3Pct  : 30,
  deliveryDays : 75,
  termsExtra   : 'ราคายังไม่รวมค่าส่ง (ค่าส่งลูกค้าจ่ายตามจริง)\nสีไม้สักทองธรรมชาติ เคลือบด้าน',
};

// ── คำนวณมัดจำอัตโนมัติ ──────────────────────────────────
function calcDeposits(total) {
  var d1 = Math.round(total * COMPANY.deposit1Pct / 100);
  var d2 = Math.round(total * COMPANY.deposit2Pct / 100);
  var d3 = total - d1 - d2;
  return { d1:d1, d2:d2, d3:d3 };
}

// ── PDF — ทองพิมพ์เฟอร์นิเจอร์ ─────────────────────────
// วิธี: สร้าง HTML ครบทั้ง images แล้วเปิด popup ที่มี font Prompt inline
function exportQuotationPDF(qt) {
  var C     = COMPANY;
  var items = Array.isArray(qt.items) ? qt.items : [];
  var total = Number(qt.total) || 0;
  var dep   = calcDeposits(total);
  var P = C.colorPrimary, A = C.colorAccent, L = C.colorLight, B = C.colorBorder;
  var PCA = '-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;';

  // ── rows สินค้า (รูปต้องเป็น base64 ที่มาจาก qt.items โดยตรง) ──
  var itemsHTML = '';
  for (var i = 0; i < items.length; i++) {
    var it  = items[i];
    var rowT = (Number(it.qty)||1) * (Number(it.price)||0);
    var dimText = itemDimensionText(it);
    var imgH = '';
    // ตรวจสอบว่ามีรูปจริง (base64)
    if (it.img && typeof it.img === 'string' && it.img.length > 500 && it.img.substring(0,5) === 'data:') {
      imgH = '<div style="margin-top:8px;">' +
               '<img src="' + it.img + '" width="90" height="90" ' +
                 'style="object-fit:cover;border-radius:8px;border:2px solid ' + B + ';display:block;">' +
             '</div>';
    }
    var bg = (i % 2 === 0) ? L : '#fff';
    itemsHTML +=
      '<tr style="background:' + bg + ';' + PCA + 'vertical-align:top;">' +
        '<td style="padding:12px 16px;font-size:13px;border-bottom:1px solid ' + B + ';line-height:1.7;">' +
          '<b>' + (i+1) + '. ' + (it.name||'-') + '</b>' +
          (dimText ? '<div style="font-size:11.5px;color:#6b4a2f;margin-top:4px;">ขนาด: ' + dimText + '</div>' : '') + imgH +
        '</td>' +
        '<td style="padding:12px 16px;text-align:center;border-bottom:1px solid ' + B + ';font-size:13px;vertical-align:middle;white-space:nowrap;">' +
          (it.qty||1) + ' ชิ้น' +
        '</td>' +
        '<td style="padding:12px 16px;text-align:right;border-bottom:1px solid ' + B + ';font-size:13px;vertical-align:middle;white-space:nowrap;">' +
          (Number(it.price)||0).toLocaleString('th-TH') + ' บาท' +
        '</td>' +
        '<td style="padding:12px 16px;text-align:right;border-bottom:1px solid ' + B + ';font-size:13.5px;font-weight:700;color:' + P + ';vertical-align:middle;white-space:nowrap;">' +
          rowT.toLocaleString('th-TH') + ' บาท' +
        '</td>' +
      '</tr>';
  }

  // ── VAT row ─────────────────────────────────────────────
  var vatRow = '';
  if (Number(qt.vat) > 0) {
    vatRow = '<tr><td style="padding:8px 14px;font-size:13px;color:#555;border-bottom:1px solid ' + B + ';">ภาษีมูลค่าเพิ่ม 7%</td>' +
      '<td style="padding:8px 14px;font-size:13px;text-align:right;border-bottom:1px solid ' + B + ';">' + Number(qt.vat).toLocaleString('th-TH') + ' บาท</td></tr>';
  }

  // ── เงื่อนไข ─────────────────────────────────────────────
  var termsHTML =
    '<li>' + C.termsExtra.replace(/\n/g, '</li><li>') + '</li>' +
    '<li>แบ่งชำระ 3 งวด<ul style="margin:6px 0 0 20px;">' +
      '<li>งวดที่ 1 มัดจำ ' + C.deposit1Pct + '% = <b>' + dep.d1.toLocaleString('th-TH') + ' บาท</b></li>' +
      '<li>งวดที่ 2 ตรวจเช็คงานก่อนทำสีชำระ ' + C.deposit2Pct + '% = <b>' + dep.d2.toLocaleString('th-TH') + ' บาท</b></li>' +
      '<li>งวดที่ 3 ตรวจเช็คงานก่อนแพ็คก่อนส่งขึ้นรถชำระส่วนที่เหลือ ' + C.deposit3Pct + '% = <b>' + dep.d3.toLocaleString('th-TH') + ' บาท</b></li>' +
    '</ul></li>' +
    '<li>กำหนดส่ง ' + C.deliveryDays + ' วัน หลังจากวันที่มัดจำ</li>';

  // ── HTML สมบูรณ์ ─────────────────────────────────────────
  // ฝัง Prompt font subset เพื่อให้ทำงานใน popup ได้ (ใช้ @import ธรรมดา)
  var html = '<!DOCTYPE html><html lang="th"><head>' +
    '<meta charset="UTF-8">' +
    '<title>ใบเสนอราคา ' + (qt.id||'') + '</title>' +
    '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap");' +
      '*{box-sizing:border-box;margin:0;padding:0;}' +
      'body{font-family:"Prompt","Sarabun",sans-serif;background:#fff;color:#2c1a0e;' + PCA + '}' +
      'table{border-collapse:collapse;}' +
      'ul{padding-left:22px;}li{line-height:1.9;font-size:13px;}' +
      '@media screen{body{padding:20px;}}' +
      '@media print{' +
        '@page{size:A4 portrait;margin:8mm 10mm 8mm 10mm;}' +
        'body{' + PCA + '}' +
        '.no-break{page-break-inside:avoid;}' +
      '}' +
    '</style></head><body>' +

    // ═══ HEADER ═══════════════════════════════════════════
    '<table width="100%" cellpadding="0" cellspacing="0" style="' + PCA + 'margin-bottom:0;">' +
      '<tr>' +
        // Logo + company info
        '<td style="background:' + P + ';padding:18px 22px;' + PCA + '">' +
          '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
              '<td style="padding-right:14px;vertical-align:middle;">' +
                '<img src="' + C.logo + '" height="50" style="display:block;height:50px;width:auto;">' +
              '</td>' +
              '<td style="vertical-align:middle;">' +
                '<div style="font-size:16px;font-weight:700;color:#fff;line-height:1.3;">' + C.name + '</div>' +
                '<div style="font-size:10.5px;color:rgba(255,255,255,.85);margin-top:5px;line-height:1.7;">' +
                  C.owner + '<br>' + C.address + '<br>' + C.phone +
                '</div>' +
              '</td>' +
            '</tr>' +
          '</table>' +
        '</td>' +
        // Document title
        '<td width="220" style="background:#5c3310;padding:18px 22px;text-align:right;vertical-align:middle;' + PCA + '">' +
          '<div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;">ใบเสนอราคา</div>' +
          '<div style="font-size:11.5px;color:rgba(255,255,255,.82);margin-top:8px;">วันที่ ' + fmtDate(qt.createdAt) + '</div>' +
        '</td>' +
      '</tr>' +
    '</table>' +
    // Gold accent bar
    '<div style="height:5px;background:linear-gradient(90deg,' + A + ',#e8b86d,' + A + ');' + PCA + '"></div>' +

    // ═══ CUSTOMER INFO ════════════════════════════════════
    '<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1.5px solid ' + B + ';">' +
      '<tr>' +
        '<td style="padding:14px 22px;">' +
          '<div style="font-size:10px;font-weight:600;color:' + A + ';letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">ลูกค้า / CUSTOMER</div>' +
          '<div style="font-size:15px;font-weight:700;color:' + P + ';margin-bottom:4px;">' + (qt.customerName||'-') + '</div>' +
          (qt.note ? '<div style="font-size:12px;color:#555;line-height:1.6;">' + qt.note + '</div>' : '') +
        '</td>' +
        '<td width="200" style="padding:14px 22px;text-align:right;vertical-align:top;">' +
          '<div style="font-size:10px;font-weight:600;color:' + A + ';letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">เลขที่ / NO.</div>' +
          '<div style="font-size:13.5px;font-weight:700;color:' + P + ';">' + (qt.id||'') + '</div>' +
        '</td>' +
      '</tr>' +
    '</table>' +

    // ═══ ITEMS TABLE ══════════════════════════════════════
    '<div style="padding:14px 22px 0;" class="no-break">' +
      '<table width="100%" cellpadding="0" cellspacing="0">' +
        '<thead>' +
          '<tr style="background:' + P + ';' + PCA + '">' +
            '<th style="padding:10px 14px;text-align:left;color:#fff;font-size:11.5px;font-weight:600;letter-spacing:.5px;">รายละเอียด</th>' +
            '<th width="80" style="padding:10px 14px;text-align:center;color:#fff;font-size:11.5px;font-weight:600;">จำนวน</th>' +
            '<th width="130" style="padding:10px 14px;text-align:right;color:#fff;font-size:11.5px;font-weight:600;">ราคา/หน่วย</th>' +
            '<th width="130" style="padding:10px 14px;text-align:right;color:#fff;font-size:11.5px;font-weight:600;">รวม</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + itemsHTML + '</tbody>' +
      '</table>' +
    '</div>' +

    // ═══ TOTALS ═══════════════════════════════════════════
    '<div style="padding:10px 22px;display:flex;justify-content:flex-end;" class="no-break">' +
      '<table cellpadding="0" cellspacing="0" style="min-width:300px;">' +
        '<tr><td style="padding:8px 14px;font-size:13px;color:#555;border-bottom:1px solid ' + B + ';">ยอดรวม :</td>' +
          '<td style="padding:8px 14px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid ' + B + ';">' + total.toLocaleString('th-TH') + ' บาท</td></tr>' +
        vatRow +
        '<tr style="background:' + P + ';' + PCA + '">' +
          '<td style="padding:12px 16px;font-size:15px;font-weight:700;color:#fff;border-radius:6px 0 0 6px;">รวม</td>' +
          '<td style="padding:12px 16px;font-size:16px;font-weight:700;color:#fff;text-align:right;border-radius:0 6px 6px 0;">' + total.toLocaleString('th-TH') + ' บาท</td>' +
        '</tr>' +
      '</table>' +
    '</div>' +

    // ═══ TERMS ════════════════════════════════════════════
    '<div style="margin:8px 22px;padding:14px 18px;background:' + L + ';border-left:4px solid ' + A + ';border-radius:4px;' + PCA + '" class="no-break">' +
      '<ul>' + termsHTML + '</ul>' +
    '</div>' +

    // ═══ SIGNATURE + BANK ═════════════════════════════════
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1.5px solid ' + B + ';" class="no-break">' +
      '<tr>' +
        // ลายเซ็น
        '<td width="45%" style="padding:20px 22px;text-align:center;vertical-align:bottom;">' +
          '<div style="font-size:13px;color:#666;margin-bottom:54px;">ผู้เสนอราคา</div>' +
          '<div style="border-top:1.5px solid #555;padding-top:8px;display:inline-block;min-width:190px;">' +
            '<div style="font-size:13px;font-weight:600;color:' + P + ';">(' + C.owner + ')</div>' +
          '</div>' +
        '</td>' +
        // ธนาคาร
        '<td style="padding:20px 22px;text-align:right;vertical-align:bottom;">' +
          '<table cellpadding="0" cellspacing="0" style="display:inline-table;">' +
            '<tr>' +
              '<td style="vertical-align:middle;padding-right:12px;">' +
                '<img src="' + C.scbLogo + '" width="52" height="52" style="border-radius:50%;display:block;">' +
              '</td>' +
              '<td style="vertical-align:middle;text-align:left;">' +
                '<div style="font-size:12.5px;font-weight:700;color:' + P + ';margin-bottom:4px;">ชื่อบัญชี ' + C.owner + '</div>' +
                '<div style="font-size:12px;color:#444;line-height:1.8;">' + C.bank + '</div>' +
                '<div style="font-size:12px;color:#444;">' + C.promptpay + '</div>' +
              '</td>' +
            '</tr>' +
          '</table>' +
        '</td>' +
      '</tr>' +
    '</table>' +

    // ═══ FOOTER ═══════════════════════════════════════════
    '<div style="margin-top:10px;padding:8px 22px;background:' + L + ';text-align:center;border-top:1px solid ' + B + ';' + PCA + '">' +
      '<span style="font-size:10px;color:#999;">' + C.name + '  •  ' + C.phone + '  •  QuoteFlow Business Suite</span>' +
    '</div>' +

    '</body></html>';

  // ── เปิด popup แล้ว print ─────────────────────────────
  var win = window.open('', '_blank', 'width=960,height=780');
  if (!win) {
    toast('กรุณาอนุญาต Popup ในเบราว์เซอร์ก่อน แล้วลองใหม่', 'warn');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // รอ font + รูปโหลดครบก่อน print
  win.onload = function() {
    setTimeout(function() { win.focus(); win.print(); }, 1800);
  };
  setTimeout(function() {
    try { if (win && !win.closed) { win.focus(); win.print(); } } catch(e) {}
  }, 4000);
}
function shareQuotation(qt){
  var text='📋 '+(qt.id||'')+'\n👤 '+(qt.customerName||'')+'\n💰 '+baht(qt.total)+'\n📅 '+fmtDate(qt.createdAt);
  if(navigator.share){navigator.share({title:'QT '+(qt.id||''),text:text});}
  else{navigator.clipboard.writeText(text).then(function(){toast('คัดลอกแล้ว!','info');});}
}

window.QuoteFlow={
  api,invalidateCache,getUser,setUser,logout,requireAuth,googleSignIn,
  baht,fmtDate,shortId,itemDimensionText,makeId,toast,openModal,closeModal,
  exportQuotationPDF,shareQuotation,
};
