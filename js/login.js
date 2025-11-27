  const form = document.querySelector('.login-form');
  const user = form.querySelector('input[type="text"]');
  const pass = form.querySelector('input[type="password"]');
  const uErr = form.querySelector('.error-msg-username');
  const pErr = form.querySelector('.error-msg-password');

  // Handle login form submit
  form.addEventListener('submit', e => {
    e.preventDefault();

    uErr.textContent = '';
    pErr.textContent = '';

    const u = user.value.trim();
    const p = pass.value.trim();

    if (!u) uErr.textContent = 'لطفا نام کاربری را وارد کنید';
    if (!p) pErr.textContent = 'لطفا رمز عبور را وارد کنید';

    if (u && p) alert('فرم درست است، ادامه دهید');
  });