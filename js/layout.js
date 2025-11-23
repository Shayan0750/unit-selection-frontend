(async function () {
  const base = '/partials';
  const load = async name => (await fetch(`${base}/${name}.html`)).text().catch(() => '');
  
  // inject header/footer
  document.getElementById('header-placeholder').innerHTML = await load('header');
  document.getElementById('footer-placeholder').innerHTML = await load('footer');

  const userEl = document.getElementById('currentUser');
  const user = localStorage.getItem('loggedInUser') || 'Not signed in';
  if (userEl) userEl.textContent = user;

  // highlight active nav link
  const page = location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle(
    'active',
    a.getAttribute('href').split('/').pop() === page || (page === '' && a.getAttribute('href').endsWith('dashboard.html'))
  ));

  // logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = () => {
    localStorage.removeItem('loggedInUser');
    location.href = '/pages/login.html';
  };

  
})();
