// ============================================================
// QuoteFlow — app.js  v3
// ใช้ fetch GET (ไม่ใช่ JSONP, ไม่ใช่ POST) แก้ CORS + Ad Blocker
// ============================================================

var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz8Mq6xakjExjY-V11y76X4OKgkVIxznQcOF45YeDBOruIpCO5L0OdtAAxkUduudp4O/exec',
  GOOGLE_CLIENT_ID: '637690103992-85cf7gvvu6a57bbrnbga826oh0t4bvvi.apps.googleusercontent.com',
};

// ── Loading state — ป้องกันกด Save ซ้ำ ─────────────────────
var _loading = false;

function setLoading(state) {
  _loading = state;
  // dim ทุกปุ่ม submit ขณะ loading
  document.querySelectorAll('button.btn-primary, button.btn-ghost').forEach(function(btn) {
    if (state) {
      btn.setAttribute('disabled', 'disabled');
      btn.style.opacity = '0.6';
    } else {
      btn.removeAttribute('disabled');
      btn.style.opacity = '';
    }
  });
}

// ── API — ใช้ fetch GET ────────────────────────────────────
// Apps Script ไม่มีปัญหา CORS กับ GET จาก browser
function api(action, data) {
  data = data || {};
  var user  = getUser();
  var email = (user && user.email) ? user.email : '';

  // Build query string
  var params = new URLSearchParams({
    action : action,
    email  : email,
    data   : JSON.stringify(data),
  });
  var url = CONFIG.API_URL + '?' + params.toString();

  return fetch(url, {
    method   : 'GET',
    redirect : 'follow',
  })
  .then(function(res) {
    return res.text();
  })
  .then(function(text) {
    try {
      return JSON.parse(text);
    } catch(e) {
      // strip JSONP wrapper ถ้ามี
      var clean = text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
      return JSON.parse(clean);
    }
  })
  .catch(function(err) {
    console.error('API Error [' + action + ']:', err);
    QuoteFlow.toast('เชื่อมต่อ Server ไม่ได้ (' + action + ')', 'error');
    return { success: false, error: err.message };
  });
}

// ── AUTH ───────────────────────────────────────────────────
function getUser() {
  try {
    var raw = localStorage.getItem('qf_user');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function setUser(u) {
  localStorage.setItem('qf_user', JSON.stringify(u));
}

function logout() {
  localStorage.removeItem('qf_user');
  try { google.accounts.id.disableAutoSelect(); } catch(e) {}
  window.location.href = 'index.html';
}

function requireAuth() {
  var user = getUser();
  if (!user) { window.location.href = 'index.html'; return null; }
  return user;
}

function googleSignIn(callback) {
  if (typeof google === 'undefined') {
    console.error('Google Identity not loaded');
    return;
  }
  google.accounts.id.initialize({
    client_id   : CONFIG.GOOGLE_CLIENT_ID,
    callback    : function(response) {
      var payload = parseJwt(response.credential);
      api('login', {
        email : payload.email,
        name  : payload.name || payload.email.split('@')[0]
      }).then(function(result) {
        var user = (result && result.success && result.user)
          ? result.user
          : { email: payload.email, name: payload.name || payload.email.split('@')[0], role: 'admin' };
        setUser(user);
        if (callback) callback(user);
      });
    },
    auto_select : false,
  });

  var btnEl = document.getElementById('googleBtn');
  if (btnEl) {
    google.accounts.id.renderButton(btnEl, {
      theme: 'outline', size: 'large', shape: 'pill', width: 300
    });
    google.accounts.id.prompt();
  }
}

function parseJwt(token) {
  try {
    var b64  = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    var json = decodeURIComponent(
      atob(b64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(json);
  } catch(e) { return {}; }
}

// ── FORMAT ─────────────────────────────────────────────────
function baht(n) {
  return '฿' + (Number(n) || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function fmtDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch(e) { return '-'; }
}

function shortId(id) { return id ? String(id).substring(0, 12) : '-'; }

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type) {
  type = type || 'success';
  var container = document.getElementById('qf-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'qf-toast-container';
    container.style.cssText = [
      'position:fixed','bottom:24px','right:24px',
      'z-index:99999','display:flex','flex-direction:column',
      'gap:8px','pointer-events:none'
    ].join(';');
    document.body.appendChild(container);
  }

  var C = {
    success : { bg:'#d1fae5', bd:'#6ee7b7', tx:'#065f46', ic:'✅' },
    error   : { bg:'#fee2e2', bd:'#fca5a5', tx:'#991b1b', ic:'❌' },
    warn    : { bg:'#fef3c7', bd:'#fcd34d', tx:'#92400e', ic:'⚠️' },
    info    : { bg:'#dbeafe', bd:'#93c5fd', tx:'#1e40af', ic:'ℹ️' },
  };
  var c = C[type] || C.info;

  if (!document.getElementById('qf-toast-kf')) {
    var s = document.createElement('style');
    s.id  = 'qf-toast-kf';
    s.textContent = '@keyframes qfIn{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(s);
  }

  var el = document.createElement('div');
  el.style.cssText = [
    'background:'+c.bg, 'border:1.5px solid '+c.bd, 'color:'+c.tx,
    'padding:11px 18px', 'border-radius:12px',
    "font-family:'Prompt',sans-serif", 'font-size:13.5px', 'font-weight:500',
    'box-shadow:0 4px 20px rgba(59,130,246,.15)',
    'display:flex', 'align-items:center', 'gap:8px',
    'max-width:320px', 'pointer-events:auto',
    'animation:qfIn .3s cubic-bezier(.4,0,.2,1)',
  ].join(';');
  el.innerHTML = '<span style="font-size:16px;flex-shrink:0">'+c.ic+'</span><span>'+msg+'</span>';
  container.appendChild(el);

  setTimeout(function() {
    el.style.opacity   = '0';
    el.style.transform = 'translateX(110%)';
    el.style.transition= 'all .25s';
    setTimeout(function() { el.remove(); }, 260);
  }, 3500);
}

// ── MODAL ──────────────────────────────────────────────────
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ── PDF EXPORT ─────────────────────────────────────────────
function exportQuotationPDF(qt) {
  if (!window.jspdf) { toast('กำลังโหลด PDF...', 'info'); return; }
  var doc = new window.jspdf.jsPDF({ unit:'mm', format:'a4' });
  doc.setFillColor(59,130,246); doc.rect(0,0,210,36,'F');
  doc.setFillColor(96,165,250); doc.rect(0,30,210,6,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(22); doc.setFont('helvetica','bold');
  doc.text('QuoteFlow',14,15);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('QUOTATION',14,24);
  doc.text(qt.id||'',196,15,{align:'right'});
  doc.text(fmtDate(qt.createdAt),196,24,{align:'right'});
  doc.setTextColor(30,58,95);
  doc.setFontSize(9); doc.text('Customer:',14,50);
  doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text(qt.customerName||'-',14,60);
  doc.setFont('helvetica','normal');
  var items = Array.isArray(qt.items) ? qt.items : [];
  var y = 75;
  doc.setFillColor(236,245,255); doc.rect(12,y-5,186,10,'F');
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(74,111,165);
  doc.text('รายการ',15,y); doc.text('จำนวน',110,y);
  doc.text('ราคา/หน่วย',138,y); doc.text('รวม',196,y,{align:'right'});
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
  doc.text('สร้างโดย QuoteFlow Business Suite  •  '+new Date().toLocaleDateString('th-TH'),105,285,{align:'center'});
  doc.save('Quotation-'+(qt.id||'QT')+'.pdf');
}

// ── SHARE ──────────────────────────────────────────────────
function shareQuotation(qt) {
  var text = ['📋 ใบเสนอราคา '+(qt.id||''),
    '👤 ลูกค้า: '+(qt.customerName||'-'),
    '💰 ยอดรวม: '+baht(qt.total),
    '📅 วันที่: '+fmtDate(qt.createdAt)].join('\n');
  if (navigator.share) {
    navigator.share({ title:'Quotation '+(qt.id||''), text:text });
  } else {
    navigator.clipboard.writeText(text)
      .then(function(){ toast('คัดลอกแล้ว!','info'); })
      .catch(function(){ toast('ไม่สามารถคัดลอกได้','error'); });
  }
}

// ── EXPOSE ─────────────────────────────────────────────────
window.QuoteFlow = {
  api, getUser, setUser, logout, requireAuth, googleSignIn,
  baht, fmtDate, shortId,
  toast, openModal, closeModal,
  exportQuotationPDF, shareQuotation,
  setLoading,
};
