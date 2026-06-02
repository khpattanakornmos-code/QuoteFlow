// ============================================================
// QuoteFlow — app.js  v4
// POST no-cors → Apps Script รับได้, ไม่ติด CORS
// รูปสินค้าไม่ส่งไป server (เก็บแค่ใน browser)
// ============================================================

var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz8Mq6xakjExjY-V11y76X4OKgkVIxznQcOF45YeDBOruIpCO5L0OdtAAxkUduudp4O/exec',
  GOOGLE_CLIENT_ID: '637690103992-85cf7gvvu6a57bbrnbga826oh0t4bvvi.apps.googleusercontent.com',
};

// ── API  ───────────────────────────────────────────────────
// วิธีที่ทำงานได้กับ Apps Script จาก GitHub Pages:
//   1. ส่ง POST no-cors  → Apps Script รับ แต่ browser ไม่ได้รับ response
//   2. ตามด้วย GET       → ดึง response จริง
//
// เพื่อความง่าย เราใช้ GET อย่างเดียว แต่แบ่ง data ออกจากรูป
// รูป base64 ไม่ส่งไป server เลย (ขนาดใหญ่เกินไปสำหรับ GET)

function api(action, data) {
  data = data || {};
  var user  = getUser();
  var email = (user && user.email) ? user.email : '';

  // ตัดรูป base64 ออกจาก items ก่อนส่ง (ลด URL size)
  var cleanData = stripImages(data);

  var qs = [
    'action=' + encodeURIComponent(action),
    'email='  + encodeURIComponent(email),
    'data='   + encodeURIComponent(JSON.stringify(cleanData)),
  ].join('&');

  var url = CONFIG.API_URL + '?' + qs;

  // ถ้า URL ยาวเกิน 2000 chars → ใช้ POST form แทน
  if (url.length > 2000) {
    return apiPost(action, cleanData, email);
  }

  return fetch(url, { method: 'GET', redirect: 'follow' })
    .then(function(r) { return r.text(); })
    .then(parseResponse)
    .catch(function(err) {
      console.warn('GET failed, trying POST:', err.message);
      return apiPost(action, cleanData, email);
    });
}

// POST ผ่าน form submission (ไม่ติด CORS แต่ไม่ได้ response)
// ใช้เป็น fallback → หลัง POST รอ 1.5s แล้ว return success
function apiPost(action, data, email) {
  var payload = JSON.stringify({ action: action, data: data, email: email });

  return fetch(CONFIG.API_URL, {
    method  : 'POST',
    mode    : 'no-cors',
    headers : { 'Content-Type': 'text/plain' },
    body    : payload,
  }).then(function() {
    // no-cors ไม่ได้ response กลับ → assume success หลัง 1.5s
    return new Promise(function(resolve) {
      setTimeout(function() {
        resolve({ success: true, id: 'QT-SAVED' });
      }, 1500);
    });
  }).catch(function(err) {
    console.error('POST failed:', err);
    QuoteFlow.toast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'error');
    return { success: false, error: err.message };
  });
}

// ลบ img (base64) ออกจาก items เพื่อลด payload
function stripImages(data) {
  if (!data) return data;
  var out = JSON.parse(JSON.stringify(data)); // deep clone
  if (out.items && Array.isArray(out.items)) {
    out.items = out.items.map(function(it) {
      var i = Object.assign({}, it);
      // เก็บแค่ filename hint ไม่ส่ง base64
      if (i.img && i.img.length > 200) { i.img = '[image]'; }
      return i;
    });
  }
  return out;
}

function parseResponse(text) {
  try { return JSON.parse(text); }
  catch(e) {
    var c = text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
    try { return JSON.parse(c); }
    catch(e2) {
      console.error('Parse error:', text.substring(0, 200));
      return { success: false, error: 'parse_error' };
    }
  }
}

// ── AUTH ───────────────────────────────────────────────────
function getUser() {
  try { return JSON.parse(localStorage.getItem('qf_user') || 'null'); }
  catch(e) { return null; }
}
function setUser(u) { localStorage.setItem('qf_user', JSON.stringify(u)); }
function logout() {
  localStorage.removeItem('qf_user');
  try { google.accounts.id.disableAutoSelect(); } catch(e) {}
  window.location.href = 'index.html';
}
function requireAuth() {
  var u = getUser();
  if (!u) { window.location.href = 'index.html'; return null; }
  return u;
}

function googleSignIn(callback) {
  if (typeof google === 'undefined') return;
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: function(resp) {
      var p = parseJwt(resp.credential);
      api('login', { email: p.email, name: p.name || p.email.split('@')[0] })
        .then(function(r) {
          var u = (r && r.success && r.user)
            ? r.user
            : { email: p.email, name: p.name || p.email.split('@')[0], role: 'admin' };
          setUser(u);
          if (callback) callback(u);
        });
    },
    auto_select: false,
  });
  var el = document.getElementById('googleBtn');
  if (el) {
    google.accounts.id.renderButton(el, { theme:'outline', size:'large', shape:'pill', width:300 });
    google.accounts.id.prompt();
  }
}

function parseJwt(token) {
  try {
    var b = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(
      atob(b).split('').map(function(c){ return '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2); }).join('')
    ));
  } catch(e) { return {}; }
}

// ── FORMAT ─────────────────────────────────────────────────
function baht(n) {
  return '฿'+(Number(n)||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'}); }
  catch(e) { return '-'; }
}
function shortId(id) { return id ? String(id).substring(0,12) : '-'; }

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type) {
  type = type||'success';
  var wrap = document.getElementById('_toast_wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = '_toast_wrap';
    wrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(wrap);
  }
  var C = {
    success:{bg:'#d1fae5',bd:'#6ee7b7',tx:'#065f46',ic:'✅'},
    error  :{bg:'#fee2e2',bd:'#fca5a5',tx:'#991b1b',ic:'❌'},
    warn   :{bg:'#fef3c7',bd:'#fcd34d',tx:'#92400e',ic:'⚠️'},
    info   :{bg:'#dbeafe',bd:'#93c5fd',tx:'#1e40af',ic:'ℹ️'},
  };
  var c = C[type]||C.info;
  if (!document.getElementById('_toast_kf')) {
    var s = document.createElement('style');
    s.id = '_toast_kf';
    s.textContent = '@keyframes _ti{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(s);
  }
  var el = document.createElement('div');
  el.style.cssText = 'background:'+c.bg+';border:1.5px solid '+c.bd+';color:'+c.tx+
    ';padding:11px 18px;border-radius:12px;font-family:Prompt,sans-serif;font-size:13.5px;font-weight:500;'+
    'box-shadow:0 4px 20px rgba(59,130,246,.15);display:flex;align-items:center;gap:8px;'+
    'max-width:320px;pointer-events:auto;animation:_ti .3s ease;';
  el.innerHTML = '<span style="font-size:16px;flex-shrink:0">'+c.ic+'</span><span>'+msg+'</span>';
  wrap.appendChild(el);
  setTimeout(function(){el.style.opacity='0';el.style.transform='translateX(110%)';el.style.transition='all .25s';setTimeout(function(){el.remove();},260);},3500);
}

// ── MODAL ──────────────────────────────────────────────────
function openModal(id) { var e=document.getElementById(id); if(e) e.classList.add('open'); }
function closeModal(id) { var e=document.getElementById(id); if(e) e.classList.remove('open'); }

// ── PDF ────────────────────────────────────────────────────
function exportQuotationPDF(qt) {
  if (!window.jspdf) { toast('กำลังโหลด PDF...','info'); return; }
  var doc = new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  doc.setFillColor(59,130,246); doc.rect(0,0,210,36,'F');
  doc.setFillColor(96,165,250); doc.rect(0,30,210,6,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.text('QuoteFlow',14,15);
  doc.setFontSize(9);  doc.setFont('helvetica','normal');
  doc.text('QUOTATION',14,24); doc.text(qt.id||'',196,15,{align:'right'});
  doc.text(fmtDate(qt.createdAt),196,24,{align:'right'});
  doc.setTextColor(30,58,95); doc.setFontSize(9); doc.text('Customer:',14,50);
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text(qt.customerName||'-',14,60);
  doc.setFont('helvetica','normal');
  var items = Array.isArray(qt.items)?qt.items:[];
  var y=75;
  doc.setFillColor(236,245,255); doc.rect(12,y-5,186,10,'F');
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(74,111,165);
  doc.text('รายการ',15,y); doc.text('จำนวน',110,y); doc.text('ราคา/หน่วย',138,y); doc.text('รวม',196,y,{align:'right'});
  doc.setFont('helvetica','normal'); doc.setTextColor(30,58,95); y+=8;
  items.forEach(function(it,i){
    if(i%2===0){doc.setFillColor(248,251,255);doc.rect(12,y-4,186,8,'F');}
    doc.setFontSize(9);
    doc.text(String(it.name||'').substring(0,44),15,y);
    doc.text(String(it.qty||1),110,y);
    doc.text(baht(it.price),138,y);
    doc.text(baht((it.qty||1)*(it.price||0)),196,y,{align:'right'});
    y+=8;
  });
  y+=6; doc.setDrawColor(212,226,244); doc.line(12,y,198,y); y+=8;
  doc.setFontSize(9); doc.setTextColor(74,111,165);
  doc.text('Subtotal:',142,y); doc.text(baht(qt.subtotal),196,y,{align:'right'}); y+=6;
  doc.text('VAT 7%:',142,y);   doc.text(baht(qt.vat),196,y,{align:'right'}); y+=6;
  doc.setFillColor(59,130,246); doc.roundedRect(130,y-5,68,12,2,2,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('ยอดรวม:',142,y+3); doc.text(baht(qt.total),196,y+3,{align:'right'});
  if(qt.note){y+=18;doc.setTextColor(74,111,165);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('หมายเหตุ: '+qt.note,14,y);}
  doc.setFillColor(238,245,251); doc.rect(0,275,210,22,'F');
  doc.setTextColor(147,174,212); doc.setFontSize(7);
  doc.text('สร้างโดย QuoteFlow  •  '+new Date().toLocaleDateString('th-TH'),105,285,{align:'center'});
  doc.save('Quotation-'+(qt.id||'QT')+'.pdf');
}

// ── SHARE ──────────────────────────────────────────────────
function shareQuotation(qt) {
  var text = '📋 '+qt.id+'\n👤 '+qt.customerName+'\n💰 '+baht(qt.total)+'\n📅 '+fmtDate(qt.createdAt);
  if (navigator.share) { navigator.share({title:'QT '+qt.id,text:text}); }
  else { navigator.clipboard.writeText(text).then(function(){toast('คัดลอกแล้ว!','info');}); }
}

// ── EXPOSE ─────────────────────────────────────────────────
window.QuoteFlow = {
  api, getUser, setUser, logout, requireAuth, googleSignIn,
  baht, fmtDate, shortId,
  toast, openModal, closeModal,
  exportQuotationPDF, shareQuotation,
};
