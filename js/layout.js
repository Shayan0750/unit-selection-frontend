(function(){
  // تابع کمکی برای Query Selector
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

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
    const logout = $('#logoutBtn');
    if (logout) logout.addEventListener('click', () => console.log('logout clicked (implement auth/logout logic)'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadIncludes);
  else loadIncludes();

  // js/layout.js - مدیریت تغییر لینک داشبورد بر اساس نقش کاربر


function updateDashboardLink() {
    const userRole = localStorage.getItem('role');
    const dashboardLink = $('#dashboard-link');

    if (dashboardLink) {
        let targetHref = 'login.html'; // پیش‌فرض: اگر نقش نامشخص بود

        if (userRole === 'student') {
            targetHref = 'student-dashboard.html';
        } else if (userRole === 'instructor') { // یا professor، بر اساس نامی که در localStorage ذخیره می‌کنید
            targetHref = 'instructor-dashboard.html';
        } else if (userRole === 'admin') {
            targetHref = 'admin-dashboard.html';
        }
        
        // تنظیم ویژگی href جدید
        dashboardLink.setAttribute('href', targetHref);
        
        // اگر لازم بود، متن دکمه هم تغییر کند
        dashboardLink.textContent = userRole === 'instructor' ? 'پنل استاد' : 'داشبورد'; 
    }
}

// اجرای تابع پس از بارگذاری کامل DOM
document.addEventListener('DOMContentLoaded', updateDashboardLink);
})();
