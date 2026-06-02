// ============================================================
// QuoteFlow — app.js  v6
// แก้: email ถูกส่งใน POST ทุกครั้ง
// แก้: หลัง write → GET ใหม่เพื่อ refresh ข้อมูล
// ============================================================

var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbw7sXiSrH96l2BnjGbG_hgLaFi7e9iTJ7skWByk5mI56YYXVrZNARoT1Z--PEGs5qLp/exec',
  GOOGLE_CLIENT_ID: '637690103992-85cf7gvvu6a57bbrnbga826oh0t4bvvi.apps.googleusercontent.com',
};

var READ_ACTIONS = [
  'ping','login','getProfile',
  'getQuotations','getActiveOrders',
  'getFinance','getPayroll','getReceivables','getDashboard',
];

function isRead(action) { return READ_ACTIONS.indexOf(action) >= 0; }

// ── API หลัก ───────────────────────────────────────────────
function api(action, data) {
  data = data || {};
  var user  = getUser();
  var email = (user && user.email) ? user.email : '';

  // ✅ ใส่ email ใน data เสมอ เพื่อให้ Apps Script บันทึกได้ถูกต้อง
  if (!data.email) data.email = email;

  if (isRead(action)) {
    return doGET(action, data, email);
  } else {
    return doPOST(action, data, email);
  }
}

// GET — อ่านข้อมูล
function doGET(action, data, email) {
  var qs  = 'action=' + encodeURIComponent(action)
          + '&email=' + encodeURIComponent(email)
          + '&data='  + encodeURIComponent(JSON.stringify(data || {}));
  var url = CONFIG.API_URL + '?' + qs;
  return fetch(url, { method:'GET', redirect:'follow' })
    .then(function(r) { return r.text(); })
    .then(function(t) {
      try { return JSON.parse(t); }
      catch(e) { console.error('GET parse fail:', t.slice(0,200)); return { success:false }; }
    })
    .catch(function(e) {
      console.error('GET err['+action+']:', e.message);
      return { success:false, error:e.message };
    });
}

// POST no-cors — เขียนข้อมูล
// หลัง POST เสร็จ รอ 2.5s แล้ว return { success:true }
// caller ต้อง GET ใหม่เองเพื่อ refresh UI
function doPOST(action, data, email) {
  var clean = stripImg(data);
  // ✅ ตรวจว่า email อยู่ใน clean ด้วย
  if (!clean.email) clean.email = email;
  var body = JSON.stringify({ action:action, data:clean, email:email });

  return fetch(CONFIG.API_URL, {
    method  : 'POST',
    mode    : 'no-cors',
    headers : { 'Content-Type':'text/plain' },
    body    : body,
  })
  .then(function() {
    return new Promise(function(resolve) {
      setTimeout(function() { resolve({ success:true }); }, 2500);
    });
  })
  .catch(function(e) {
    console.error('POST err['+action+']:', e.message);
    return { success:false, error:e.message };
  });
}

function stripImg(data) {
  if (!data) return {};
  var out = JSON.parse(JSON.stringify(data));
  if (Array.isArray(out.items)) {
    out.items = out.items.map(function(it) {
      var i = Object.assign({}, it);
      if (i.img && String(i.img).length > 500) i.img = '';
      return i;
    });
  }
  return out;
}

// ── AUTH ───────────────────────────────────────────────────
function getUser() {
  try { return JSON.parse(localStorage.getItem('qf_user')||'null'); }
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
function googleSignIn(cb) {
  if (typeof google === 'undefined') return;
  google.accounts.id.initialize({
    client_id  : CONFIG.GOOGLE_CLIENT_ID,
    callback   : function(resp) {
      var p = parseJwt(resp.credential);
      api('login', { email:p.email, name:p.name||p.email.split('@')[0] })
        .then(function(r) {
          var u = (r&&r.success&&r.user) ? r.user
            : { email:p.email, name:p.name||p.email.split('@')[0], role:'admin' };
          setUser(u);
          if (cb) cb(u);
        });
    },
    auto_select: false,
  });
  var el = document.getElementById('googleBtn');
  if (el) {
    google.accounts.id.renderButton(el,{theme:'outline',size:'large',shape:'pill',width:300});
    google.accounts.id.prompt();
  }
}
function parseJwt(token) {
  try {
    var b = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(
      atob(b).split('').map(function(c){return '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);}).join('')
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
  var wrap = document.getElementById('_tw');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = '_tw';
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
  if (!document.getElementById('_tkf')) {
    var s=document.createElement('style');s.id='_tkf';
    s.textContent='@keyframes _ti{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(s);
  }
  var el = document.createElement('div');
  el.style.cssText = 'background:'+c.bg+';border:1.5px solid '+c.bd+';color:'+c.tx+
    ';padding:11px 18px;border-radius:12px;font-family:Prompt,sans-serif;font-size:13.5px;'+
    'font-weight:500;box-shadow:0 4px 20px rgba(59,130,246,.15);display:flex;align-items:center;'+
    'gap:8px;max-width:320px;pointer-events:auto;animation:_ti .3s ease;';
  el.innerHTML = '<span style="font-size:16px;flex-shrink:0">'+c.ic+'</span><span>'+msg+'</span>';
  wrap.appendChild(el);
  setTimeout(function(){
    el.style.opacity='0';el.style.transform='translateX(110%)';el.style.transition='all .25s';
    setTimeout(function(){el.remove();},260);
  },3500);
}

// ── MODAL ──────────────────────────────────────────────────
function openModal(id)  { var e=document.getElementById(id); if(e) e.classList.add('open'); }
function closeModal(id) { var e=document.getElementById(id); if(e) e.classList.remove('open'); }

// ── PDF — ตรงตามตัวอย่าง ───────────────────────────────────
function exportQuotationPDF(qt) {
  if (!window.jspdf) { toast('กำลังโหลด PDF...','info'); return; }
  var doc = new window.jspdf.jsPDF({ unit:'mm', format:'a4' });
  var items = Array.isArray(qt.items) ? qt.items : [];

  // ── Header สีเข้ม ──────────────────────────────────────
  doc.setFillColor(30, 80, 120);
  doc.rect(0, 0, 210, 45, 'F');

  // Logo / ชื่อบริษัท
  doc.setTextColor(255,255,255);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text('QuoteFlow', 15, 18);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('thongpimfurniture@gmail.com', 15, 26);

  // ชื่อเอกสาร
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text('\u0E43\u0E1A\u0E40\u0E2A\u0E19\u0E2D\u0E23\u0E32\u0E04\u0E32', 195, 18, {align:'right'});
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48: ' + fmtDate(qt.createdAt), 195, 26, {align:'right'});

  // ── ลูกค้า ─────────────────────────────────────────────
  doc.setTextColor(30,58,95);
  doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text('\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32:', 15, 58);
  doc.setFont('helvetica','normal');
  doc.text(qt.customerName || '-', 35, 58);
  doc.text('\u0E40\u0E25\u0E02: ' + (qt.id||''), 195, 58, {align:'right'});

  if (qt.note) {
    doc.setFontSize(9); doc.setTextColor(80,80,80);
    doc.text(qt.note, 15, 65);
  }

  // ── ตารางสินค้า ────────────────────────────────────────
  var y = 75;

  // Header แถว
  doc.setFillColor(240, 245, 255);
  doc.rect(10, y-5, 190, 10, 'F');
  doc.setDrawColor(200,210,230);
  doc.line(10, y+5, 200, y+5);

  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(30,80,120);
  doc.text('\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14', 15, y);
  doc.text('\u0E08\u0E33\u0E19\u0E27\u0E19', 120, y, {align:'center'});
  doc.text('\u0E23\u0E32\u0E04\u0E32', 155, y, {align:'right'});
  doc.text('\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14', 198, y, {align:'right'});

  y += 8;
  doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40);

  items.forEach(function(it, i) {
    if (y > 250) { doc.addPage(); y = 20; }

    // สลับสีแถว
    if (i % 2 === 0) {
      doc.setFillColor(248,250,255);
      doc.rect(10, y-4, 190, 14, 'F');
    }

    doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text(String(it.name||'-').substring(0,45), 15, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(80,80,80);

    // specs ถ้ามี
    y += 5;
    doc.setFontSize(9); doc.setTextColor(40,40,40);
    doc.text(String(it.qty||1), 120, y, {align:'center'});
    doc.text(baht(it.price), 155, y, {align:'right'});
    doc.setFont('helvetica','bold');
    doc.text(baht((it.qty||1)*(it.price||0)), 198, y, {align:'right'});
    doc.setFont('helvetica','normal');

    doc.setDrawColor(220,228,240);
    doc.line(10, y+4, 200, y+4);
    y += 10;
  });

  // ── ยอดรวม ─────────────────────────────────────────────
  y += 5;
  doc.setDrawColor(30,80,120); doc.setLineWidth(0.5);
  doc.line(120, y, 200, y);
  y += 7;

  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
  doc.text('\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21:', 140, y);
  doc.text(baht(qt.subtotal), 198, y, {align:'right'});
  y += 7;

  if (qt.vat > 0) {
    doc.text('VAT 7%:', 140, y);
    doc.text(baht(qt.vat), 198, y, {align:'right'});
    y += 7;
  }

  // กล่องยอดรวมสุดท้าย
  doc.setFillColor(30,80,120);
  doc.roundedRect(120, y-5, 80, 14, 2, 2, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('\u0E23\u0E27\u0E21', 135, y+4);
  doc.text(baht(qt.total), 198, y+4, {align:'right'});

  // ── เงื่อนไข / หมายเหตุ ────────────────────────────────
  if (qt.note) {
    y += 22;
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40);
    doc.text(qt.note, 15, y, {maxWidth:120});
  }

  // ── ลายเซ็น ────────────────────────────────────────────
  y = 255;
  doc.setFontSize(9); doc.setTextColor(60,60,60); doc.setFont('helvetica','normal');
  doc.text('\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E23\u0E32\u0E04\u0E32', 155, y, {align:'center'});
  doc.line(130, y+15, 182, y+15);
  doc.text('(................................................)', 155, y+20, {align:'center'});

  // Footer
  doc.setFillColor(240,245,255);
  doc.rect(0,278,210,20,'F');
  doc.setTextColor(100,120,150); doc.setFontSize(7);
  doc.text('QuoteFlow Business Suite  •  ' + new Date().toLocaleDateString('th-TH'), 105, 287, {align:'center'});

  doc.save('QT-' + (qt.id||'') + '.pdf');
}

// ── SHARE ──────────────────────────────────────────────────
function shareQuotation(qt) {
  var text = '📋 '+(qt.id||'')+'\n👤 '+(qt.customerName||'')+'\n💰 '+baht(qt.total)+'\n📅 '+fmtDate(qt.createdAt);
  if (navigator.share) { navigator.share({title:'QT '+(qt.id||''),text:text}); }
  else { navigator.clipboard.writeText(text).then(function(){toast('คัดลอกแล้ว!','info');}); }
}

// ── EXPOSE ─────────────────────────────────────────────────
window.QuoteFlow = {
  api, getUser, setUser, logout, requireAuth, googleSignIn,
  baht, fmtDate, shortId, toast, openModal, closeModal,
  exportQuotationPDF, shareQuotation,
};
