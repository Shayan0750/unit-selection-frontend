(function () {
  function init() {

    const form = document.querySelector('.login-form');
    if (!form) return;

    const user = form.querySelector('input[type="text"]');
    const pass = form.querySelector('input[type="password"]');
    const userErr = form.querySelector('.error-msg-username');
    const passErr = form.querySelector('.error-msg-password');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      userErr && (userErr.textContent = '');
      passErr && (passErr.textContent = '');

      const u = (user && user.value || '').trim();
      const p = (pass && pass.value || '').trim();

      if (!u || !p) {
        if (!u) userErr && (userErr.textContent = 'لطفا نام کاربری را وارد کنید');
        if (!p) passErr && (passErr.textContent = 'لطفا رمز عبور را وارد کنید');
        return;
      }

      // valid — replace this with real login logic
      alert('فرم درست است، ادامه دهید');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
