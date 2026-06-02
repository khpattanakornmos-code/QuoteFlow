// ============================================================
// QuoteFlow — app.js  (shared utilities)
// ============================================================

const CONFIG = {
  // 🔴 Replace with your deployed Apps Script Web App URL
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
};

// ── API ────────────────────────────────────────────────────
async function api(action, data = {}) {
  const user = getUser();
  const payload = { action, data, email: user?.email };
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' }
    });
    return await res.json();
  } catch (e) {
    console.error('API error:', e);
    return { success: false, error: e.message };
  }
}

// ── AUTH ───────────────────────────────────────────────────
function getUser() {
  try { return JSON.parse(localStorage.getItem('qf_user')); } catch { return null; }
}
function setUser(u) { localStorage.setItem('qf_user', JSON.stringify(u)); }
function logout() { localStorage.removeItem('qf_user'); window.location.href = 'index.html'; }

function requireAuth() {
  const user = getUser();
  if (!user) { window.location.href = 'index.html'; return null; }
  return user;
}

function googleSignIn(callback) {
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: async (response) => {
      const payload = parseJwt(response.credential);
      const result = await api('login', { email: payload.email, name: payload.name });
      if (result.success) {
        setUser(result.user);
        if (callback) callback(result.user);
      }
    }
  });
  google.accounts.id.renderButton(document.getElementById('googleBtn'), {
    theme: 'outline', size: 'large', shape: 'pill', width: 300
  });
}

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}

// ── FORMAT ─────────────────────────────────────────────────
function baht(n) {
  return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function shortId(id) { return id ? id.substring(0, 12) : '-'; }

// ── TOAST (Light Blue theme) ───────────────────────────────
function toast(msg, type = 'success') {
  let container = document.getElementById('qf-toast');
  if (!container) {
    container = document.createElement('div');
    container.id = 'qf-toast';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const colors = {
    success: { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46', icon: '✅' },
    error:   { bg: '#fee2e2', border: '#fecaca', text: '#991b1b', icon: '❌' },
    info:    { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af', icon: 'ℹ️' },
    warn:    { bg: '#fef3c7', border: '#fde68a', text: '#92400e', icon: '⚠️' },
  };
  const c = colors[type] || colors.info;

  const t = document.createElement('div');
  t.style.cssText = `
    background:${c.bg};
    border:1.5px solid ${c.border};
    color:${c.text};
    padding:12px 18px;
    border-radius:12px;
    font-size:13.5px;
    font-family:'Prompt',sans-serif;
    font-weight:500;
    box-shadow:0 4px 20px rgba(59,130,246,.15);
    animation:qfSlideIn .3s cubic-bezier(.4,0,.2,1);
    max-width:320px;
    word-wrap:break-word;
    display:flex;
    align-items:center;
    gap:8px;
  `;
  t.innerHTML = `
    <style>@keyframes qfSlideIn{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}</style>
    <span style="font-size:16px">${c.icon}</span>
    <span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'qfSlideIn .25s reverse ease';
    setTimeout(() => t.remove(), 240);
  }, 3200);
}

// ── MODAL ──────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── PDF EXPORT ─────────────────────────────────────────────
async function exportQuotationPDF(qt) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Header gradient band
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(96, 165, 250);
  doc.rect(0, 32, 210, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('QuoteFlow', 14, 16);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('ใบเสนอราคา / QUOTATION', 14, 24);
  doc.text(qt.id || '', 196, 16, { align: 'right' });
  doc.text(fmtDate(qt.createdAt), 196, 24, { align: 'right' });

  // Customer section
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('เรียน / To:', 14, 52);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(qt.customerName || '-', 14, 61);

  // Table header
  const items = Array.isArray(qt.items) ? qt.items : [];
  let y = 76;
  doc.setFillColor(236, 245, 255);
  doc.rect(12, y - 5, 186, 10, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(74, 111, 165);
  doc.text('รายการ', 15, y); doc.text('จำนวน', 110, y); doc.text('ราคา/หน่วย', 138, y); doc.text('รวม', 196, y, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 58, 95);
  y += 8;

  items.forEach((item, i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 251, 255); doc.rect(12, y - 4, 186, 8, 'F'); }
    doc.setFontSize(9);
    doc.text(String(item.name || '').substring(0, 44), 15, y);
    doc.text(String(item.qty || 1), 110, y);
    doc.text(baht(item.price), 138, y);
    doc.text(baht((item.qty || 1) * (item.price || 0)), 196, y, { align: 'right' });
    y += 8;
  });

  // Totals box
  y += 6;
  doc.setDrawColor(212, 226, 244); doc.setLineWidth(.3);
  doc.line(12, y, 198, y);
  y += 8;
  doc.setFontSize(9); doc.setTextColor(74, 111, 165);
  doc.text('Subtotal:', 142, y); doc.text(baht(qt.subtotal), 196, y, { align: 'right' }); y += 6;
  doc.text('VAT 7%:', 142, y); doc.text(baht(qt.vat), 196, y, { align: 'right' }); y += 6;
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(130, y - 5, 68, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('ยอดรวม:', 142, y + 3); doc.text(baht(qt.total), 196, y + 3, { align: 'right' });

  if (qt.note) {
    y += 18; doc.setTextColor(74, 111, 165); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('หมายเหตุ: ' + qt.note, 14, y);
  }

  // Footer
  doc.setFillColor(238, 245, 251);
  doc.rect(0, 275, 210, 22, 'F');
  doc.setTextColor(147, 174, 212); doc.setFontSize(7);
  doc.text('สร้างโดย QuoteFlow Business Suite  •  ' + new Date().toLocaleDateString('th-TH'), 105, 285, { align: 'center' });

  doc.save(`Quotation-${qt.id}.pdf`);
}

// ── SHARE ──────────────────────────────────────────────────
function shareQuotation(qt) {
  const text = `📋 ใบเสนอราคา ${qt.id}\n👤 ลูกค้า: ${qt.customerName}\n💰 ยอดรวม: ${baht(qt.total)}\n📅 วันที่: ${fmtDate(qt.createdAt)}`;
  if (navigator.share) {
    navigator.share({ title: `Quotation ${qt.id}`, text });
  } else {
    navigator.clipboard.writeText(text).then(() => toast('คัดลอกข้อมูลแล้ว!', 'info'));
  }
}

window.QuoteFlow = {
  api, getUser, setUser, logout, requireAuth, googleSignIn,
  baht, fmtDate, shortId,
  toast, openModal, closeModal,
  exportQuotationPDF, shareQuotation
};
