// ============================================================
// QuoteFlow — nav.js  (Bulletproof sidebar injection)
// ============================================================

function injectSidebar(activePage) {
  const user    = QuoteFlow.getUser();
  const initial = ((user && user.name) ? user.name[0] : 'U').toUpperCase();
  const name    = (user && user.name)  ? user.name  : 'User';
  const email   = (user && user.email) ? user.email : '';

  // ── Nav items ─────────────────────────────────────────────
  const sections = [
    {
      label: 'หลัก',
      items: [
        { page:'dashboard',  href:'dashboard.html',  icon:'📊', label:'Dashboard' },
      ]
    },
    {
      label: 'การขาย',
      items: [
        { page:'quotation',  href:'quotation.html',  icon:'📋', label:'ใบเสนอราคา' },
        { page:'active',     href:'active.html',     icon:'⚡', label:'Active Orders' },
      ]
    },
    {
      label: 'การเงิน',
      items: [
        { page:'finance',    href:'finance.html',    icon:'💰', label:'รายรับ-รายจ่าย' },
        { page:'receivable', href:'receivable.html', icon:'📌', label:'ยอดค้างชำระ' },
      ]
    },
    {
      label: 'ทรัพยากร',
      items: [
        { page:'payroll',    href:'payroll.html',    icon:'👷', label:'ค่าแรง & เช็คยอด' },
      ]
    },
  ];

  let navHTML = '';
  sections.forEach(sec => {
    navHTML += `<div class="nav-section">${sec.label}</div>`;
    sec.items.forEach(item => {
      const isActive = activePage === item.page;
      navHTML += `
        <a href="${item.href}" class="nav-link${isActive ? ' active' : ''}">
          <span class="nav-icon">${item.icon}</span>
          ${item.label}
        </a>`;
    });
  });

  // ── Build HTML ────────────────────────────────────────────
  const sidebarHTML = `
<div class="sidebar-backdrop" id="sidebarBackdrop"></div>
<aside class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <div class="logo-wrap">
      <div class="logo-mark">📋</div>
      <div>
        <div class="logo-text">QuoteFlow</div>
        <div class="logo-sub">Business Suite</div>
      </div>
    </div>
  </div>
  <nav style="padding:10px 0;flex:1;overflow-y:auto;">${navHTML}</nav>
  <div class="sidebar-user">
    <div class="user-avatar">${initial}</div>
    <div class="user-info">
      <div class="user-name">${name}</div>
      <div class="user-role">${email}</div>
    </div>
    <button class="logout-btn" onclick="QuoteFlow.logout()" title="ออกจากระบบ">⏻</button>
  </div>
</aside>`;

  // ── Inject into body ──────────────────────────────────────
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  // ── Mobile toggle ─────────────────────────────────────────
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const menuBtn  = document.getElementById('mobileMenuBtn');

  function openSidebar() {
    if (sidebar)  sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }
  function closeSidebar() {
    if (sidebar)  sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  if (menuBtn)  menuBtn.addEventListener('click', openSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Close sidebar when nav link clicked on mobile
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
}
