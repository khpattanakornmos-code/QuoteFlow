function injectSidebar(activePage) {
  var user    = QuoteFlow.getUser();
  var initial = ((user&&user.name)?user.name[0]:'U').toUpperCase();
  var name    = (user&&user.name)?user.name:'User';
  var email   = (user&&user.email)?user.email:'';

  var sections = [
    {label:'หลัก',items:[{page:'dashboard',href:'dashboard.html',icon:'📊',label:'Dashboard'}]},
    {label:'การขาย',items:[
      {page:'quotation',href:'quotation.html',icon:'📋',label:'ใบเสนอราคา'},
      {page:'active',   href:'active.html',   icon:'⚡',label:'Active Orders'},
    ]},
    {label:'การเงิน',items:[
      {page:'finance',   href:'finance.html',   icon:'💰',label:'รายรับ-รายจ่าย'},
      {page:'receivable',href:'receivable.html',icon:'📌',label:'ยอดค้างชำระ'},
      {page:'report',    href:'report.html',    icon:'📑',label:'Report'},
    ]},
    {label:'ทรัพยากร',items:[
      {page:'payroll',href:'payroll.html',icon:'👷',label:'ค่าแรง & เช็คยอด'},
    ]},
  ];

  var navHTML = '';
  sections.forEach(function(sec){
    navHTML += '<div class="nav-section">'+sec.label+'</div>';
    sec.items.forEach(function(item){
      navHTML += '<a href="'+item.href+'" class="nav-link'+(activePage===item.page?' active':'')+'"><span class="nav-icon">'+item.icon+'</span>'+item.label+'</a>';
    });
  });

  var html = '<div class="sidebar-backdrop" id="sidebarBackdrop"></div>'+
    '<aside class="sidebar" id="sidebar">'+
      '<div class="sidebar-logo"><div class="logo-wrap">'+
        '<div class="logo-mark">📋</div>'+
        '<div><div class="logo-text">QuoteFlow</div><div class="logo-sub">Business Suite</div></div>'+
      '</div></div>'+
      '<nav style="padding:10px 0;flex:1;overflow-y:auto;">'+navHTML+'</nav>'+
      '<div class="sidebar-user">'+
        '<div class="user-avatar">'+initial+'</div>'+
        '<div class="user-info"><div class="user-name">'+name+'</div><div class="user-role">'+email+'</div></div>'+
        '<button class="logout-btn" onclick="QuoteFlow.logout()" title="ออกจากระบบ">⏻</button>'+
      '</div>'+
    '</aside>';

  document.body.insertAdjacentHTML('afterbegin', html);

  var sidebar  = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebarBackdrop');
  var menuBtn  = document.getElementById('mobileMenuBtn');
  if(menuBtn) menuBtn.addEventListener('click',function(){sidebar.classList.toggle('open');backdrop.classList.toggle('open');});
  if(backdrop) backdrop.addEventListener('click',function(){sidebar.classList.remove('open');backdrop.classList.remove('open');});
}
