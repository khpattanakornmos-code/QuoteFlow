// nav.js — Inject sidebar (Light Blue theme)
function injectSidebar(activePage) {
  const user = QuoteFlow.getUser();
  const initial = (user?.name || 'U')[0].toUpperCase();
  const name = user?.name || 'User';
  const email = user?.email || '';

  const navItems = [
    { page: 'dashboard', href: 'dashboard.html', icon: '📊', label: 'Dashboard',        section: 'หลัก' },
    { page: 'quotation', href: 'quotation.html', icon: '📋', label: 'ใบเสนอราคา',       section: 'การขาย' },
    { page: 'active',    href: 'active.html',    icon: '⚡', label: 'Active Orders',     section: null },
    { page: 'finance',   href: 'finance.html',   icon: '💰', label: 'รายรับ-รายจ่าย',   section: 'การเงิน' },
    { page: 'receivable',href: 'receivable.html',icon: '📌', label: 'ยอดค้างชำระ',       section: null },
    { page: 'payroll',   href: 'payroll.html',   icon: '👷', label: 'ค่าแรง & เช็คยอด', section: 'ทรัพยากร' },
  ];

  let navHTML = '';
  let lastSection = '';
  navItems.forEach(item => {
    if (item.section && item.section !== lastSection) {
      navHTML += `<div class="nav-section">${item.section}</div>`;
      lastSection = item.section;
    }
    navHTML += `
      <a href="${item.href}" class="nav-link ${activePage === item.page ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        ${item.label}
      </a>`;
  });

  const html = `
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

  document.body.insertAdjacentHTML('afterbegin', html);

  // Mobile toggle
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const menuBtn  = document.getElementById('mobileMenuBtn');

  menuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
  });
  backdrop?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
  });
}
