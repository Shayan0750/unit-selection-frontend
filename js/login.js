// login.js

document.addEventListener('DOMContentLoaded', () => {
    
  // ۱. داده‌های ساختگی (Mock Data)
  const ADMIN_USERNAME_SECRET = 'admin'; // نام کاربری صحیح
  const ADMIN_PASSWORD_SECRET = '12345'; // رمز عبور صحیح
  const FAKE_TOKEN = 'token-admin-12345-access'; 
  const ADMIN_DASHBOARD_PAGE = 'dashboard.html'; 
  const LOGIN_ERROR_MESSAGE = 'نام کاربری یا رمز عبور اشتباه است.';

  // ۲. پیدا کردن المان‌ها با ID و کلاس‌ها
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const errorDisplay = document.getElementById('errorDisplay'); 
  
  // پیدا کردن محل خطاهای فیلدی با کلاس
  const uErr = document.querySelector('.error-msg-username'); 
  const pErr = document.querySelector('.error-msg-password');

  // ۳. تابع اصلی لاگین
  function tryAdminLogin(event) {
      // جلوگیری از رفرش صفحه
      event.preventDefault(); 
      
      // الف. پاک کردن خطاهای قبلی
      if (uErr) uErr.textContent = ''; 
      if (pErr) pErr.textContent = ''; 
      if (errorDisplay) errorDisplay.textContent = ''; 

      const enteredUsername = usernameInput.value.trim();
      const enteredPassword = passwordInput.value.trim();

      let isValid = true; 

      // ب. اعتبارسنجی: بررسی خالی نبودن فیلدها
      if (!enteredUsername) {
          if (uErr) uErr.textContent = 'لطفا نام کاربری را وارد کنید';
          isValid = false;
      }
      if (!enteredPassword) {
          if (pErr) pErr.textContent = 'لطفا رمز عبور را وارد کنید';
          isValid = false;
      }

      // ج. منطق لاگین ساختگی (فقط اگر اعتبارسنجی اولیه موفق بود)
      if (isValid) {
          
          // مقایسه ورودی کاربر با رمزهای مخفی
          if (enteredUsername === ADMIN_USERNAME_SECRET && enteredPassword === ADMIN_PASSWORD_SECRET) {
              
              // --- موفقیت ---
              localStorage.setItem('adminToken', FAKE_TOKEN);
              window.location.href = ADMIN_DASHBOARD_PAGE;
              
          } else {
              
              // --- خطا ---
              if (errorDisplay) {
                  errorDisplay.textContent = LOGIN_ERROR_MESSAGE;
              }
          }
      }
  }

  // ۴. اتصال تابع اصلی به فرم
  if (loginForm) {
      loginForm.addEventListener('submit', tryAdminLogin);
  }

});
