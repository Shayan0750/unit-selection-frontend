(function(){
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
})();
