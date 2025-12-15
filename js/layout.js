(function(){
  // تابع کمکی برای Query Selector
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // ------------------ بارگذاری include ها ------------------
  async function loadIncludes(){
    const nodes = $$('[data-include]');
    await Promise.all(nodes.map(async node => {
      try {
        const res = await fetch(node.dataset.include);
        node.innerHTML = res.ok ? await res.text() : `<!-- include failed: ${res.status} ${node.dataset.include} -->`;
      } catch (err) {
        node.innerHTML = `<!-- include failed: ${err.message} -->`;
      }
    }));
    initParts();
  }

  // ------------------ تنظیم اجزای ثابت ------------------
  function initParts(){
    const file = (location.pathname.split('/').pop() || 'dashboard.html');
    const name = file.replace('.html','');

    // mark active link (tries data-link first, then href)
    $$('.sidebar a').forEach(a => {
      const linkName = a.dataset.link || a.getAttribute('href') || '';
      a.classList.toggle('active', linkName === name || linkName === file);
    });

    // sidebar toggle
    const toggle = $('#toggleSidebar') || $('.menu-toggle');
    const sidebar = $('#sidebar') || $('#sidebarFragment') || $('.sidebar');
    if (toggle && sidebar) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    // logout (placeholder)
    const logout = $('#logoutBtn') || $('#logout-btn');
    if (logout) logout.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });

    updateDashboardLink();
    updateUserRoleLabel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadIncludes);
  else loadIncludes();

  // ------------------ مدیریت لینک داشبورد بر اساس نقش ------------------
  function updateDashboardLink() {
    let userRole = localStorage.getItem('role') || '';
    userRole = userRole.toLowerCase();

    const dashboardLink = $('#dashboard-link');
    if (!dashboardLink) return;

    let targetHref = 'login.html';
    if (userRole === 'student') targetHref = 'student-dashboard.html';
    else if (userRole === 'instructor') targetHref = 'instructor-dashboard.html';
    else if (userRole === 'admin') targetHref = 'admin-dashboard.html';

    dashboardLink.setAttribute('href', targetHref);
    dashboardLink.textContent = userRole === 'instructor' ? 'پنل استاد' : 'داشبورد';
  }

    roleLabel.textContent = displayText;
  }

)();

