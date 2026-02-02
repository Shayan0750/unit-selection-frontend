(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // 1. تشخیص فایل سایدبار بر اساس نقش کاربر
  function getSidebarPath() {
    const role = (localStorage.getItem('role') || 'guest').toLowerCase();
    // فرض بر این است که فایل‌های سایدبار در پوشه partials هستند
    switch (role) {
      case 'admin': return '../partials/admin-sidebar.html';
      case 'instructor': return '../partials/instructor-sidebar.html';
      case 'student': return '../partials/student-sidebar.html';
      default: return '../partials/sidebar.html';
    }
  }

  // 2. بارگذاری include ها با مدیریت سایدبار پویا
  async function loadIncludes() {
    const nodes = $$('[data-include]');

    // پیدا کردن نگهدارنده سایدبار و تنظیم مسیر داینامیک آن
    const sidebarPlaceholder = $('#sidebar-container');
    if (sidebarPlaceholder) {
      sidebarPlaceholder.dataset.include = getSidebarPath();
    }

    await Promise.all(nodes.map(async node => {
      try {
        const path = node.dataset.include;
        if (!path) return;

        const res = await fetch(path);
        if (res.ok) {
          node.innerHTML = await res.text();
        } else {
          node.innerHTML = ``;
        }
      } catch (err) {
        node.innerHTML = ``;
      }
    }));

    initParts();
  }

  // 3. تنظیم اجزای ثابت پس از بارگذاری HTML
  function initParts() {
    const file = (location.pathname.split('/').pop() || 'index.html');
    const name = file.replace('.html', '');

    // هایلایت کردن لینک فعال در سایدبار تازه بارگذاری شده
    $$('.sidebar a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.includes(file)) {
        a.classList.add('active');
      }
    });

    // سوییچ باز و بسته شدن سایدبار (Mobile Friendly)
    const toggle = $('#toggleSidebar') || $('.menu-toggle');
    const sidebar = $('#sidebar') || $('.sidebar');
    if (toggle && sidebar) {
      toggle.onclick = () => sidebar.classList.toggle('open');
    }

    // مدیریت دکمه خروج
    const logout = $('#logoutBtn') || $('#logout-btn');
    if (logout) {
      logout.onclick = (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '../login.html';
      };
    }

    updateUserRoleLabel();
  }

  // مدیریت نمایش نقش کاربر در Header
  function updateUserRoleLabel() {
    const role = (localStorage.getItem('role') || '').toLowerCase();
    const roleLabel = $('#userRoleLabel');
    if (!roleLabel) return;

    const roleMap = {
      'student': 'دانشجو',
      'instructor': 'استاد',
      'admin': 'مدیر سیستم'
    };
    roleLabel.textContent = roleMap[role] || 'کاربر';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadIncludes);
  else loadIncludes();

})();