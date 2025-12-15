document.addEventListener('DOMContentLoaded', () => {

    // ------------------ تنظیمات ------------------
    const API_LOGIN_ENDPOINT = 'http://127.0.0.1:8000/api/token/';
    const ADMIN_DASHBOARD_PAGE = 'admin-dashboard.html';
    const STUDENT_DASHBOARD_PAGE = 'student-dashboard.html';
    const INSTRUCTOR_DASHBOARD_PAGE = 'instructor-dashboard.html';

    const GENERAL_ERROR_MESSAGE = 'خطایی در ارتباط با سرور رخ داد. دوباره تلاش کنید.';
    const AUTH_FAILED_MESSAGE = 'نام کاربری یا رمز عبور اشتباه است.';
    const GENERAL_MSG_ERR2 = 'شبکه در دسترس نیست.';

    // ------------------ گرفتن عناصر HTML ------------------
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const errorDisplay = document.getElementById('errorDisplay');
    const uErr = document.querySelector('.error-msg-username');
    const pErr = document.querySelector('.error-msg-password');

    // ------------------ توابع کمکی ------------------

    /**
     * تابع parseJwt
     * توضیح: توکن JWT را decode می‌کند و payload آن را به صورت آبجکت باز می‌گرداند
     * @param {string} token - JWT دریافتی از سرور
     * @returns {Object|null} payload - آبجکت شامل اطلاعات کاربر و نقش، یا null در صورت خطا
     */
    function parseJwt(token) {
        try {
            const base64Payload = token.split('.')[1]; // بخش Payload
            const payload = JSON.parse(atob(base64Payload)); // decode Base64
            return payload;
        } catch (e) {
            console.error('Invalid JWT:', e);
            return null;
        }
    }

    // ------------------ تابع اصلی لاگین ------------------

    /**
     * تابع tryAdminLogin
     * توضیح: مدیریت ارسال فرم لاگین، اعتبارسنجی ورودی‌ها، ارسال درخواست POST به API
     * و ریدایرکت کاربر بر اساس نقش داخل JWT
     * @param {Event} event - رویداد submit فرم
     * @returns {Promise<void>}
     */
    async function tryAdminLogin(event) {
        event.preventDefault();

        // پاک کردن پیام‌های خطا
        if (uErr) uErr.textContent = '';
        if (pErr) pErr.textContent = '';
        if (errorDisplay) errorDisplay.textContent = '';

        const enteredUsername = usernameInput.value.trim();
        const enteredPassword = passwordInput.value.trim();

        let isValid = true;

        // اعتبارسنجی نام کاربری
        if (!enteredUsername) {
            if (uErr) uErr.textContent = 'لطفا نام کاربری را وارد کنید';
            isValid = false;
        }

        // اعتبارسنجی رمز عبور
        if (!enteredPassword) {
            if (pErr) pErr.textContent = 'لطفا رمز عبور را وارد کنید';
            isValid = false;
        }

        if (!isValid) return; // اگر ورودی‌ها معتبر نیستند، ادامه نده

        try {
            // ارسال درخواست POST به API لاگین
            const response = await fetch(API_LOGIN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: enteredUsername,
                    password: enteredPassword,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                const { access, refresh } = data;

                if (!access || !refresh) {
                    if (errorDisplay) errorDisplay.textContent = GENERAL_ERROR_MESSAGE;
                    return;
                }

                // ذخیره توکن‌ها در localStorage
                localStorage.setItem('access', access);
                localStorage.setItem('refresh', refresh);

                // استخراج Payload از access token
                const payload = parseJwt(access);
                if (!payload || !payload.role) {
                    if (errorDisplay) errorDisplay.textContent = 'نقش کاربر معتبر نیست';
                    return;
                }

                const role = payload.role;
                localStorage.setItem('role', role);

                // ریدایرکت بر اساس نقش کاربر
                switch (role) {
                    case 'admin':
                        window.location.href = ADMIN_DASHBOARD_PAGE;
                        break;
                    case 'student':
                        window.location.href = STUDENT_DASHBOARD_PAGE;
                        break;
                    case 'instructor':
                        window.location.href = INSTRUCTOR_DASHBOARD_PAGE;
                        break;
                    default:
                        if (errorDisplay) errorDisplay.textContent = 'نقش کاربر معتبر نیست';
                }

            } else {
                // مدیریت خطای احراز هویت
                if (errorDisplay) {
                    errorDisplay.textContent = data.detail || AUTH_FAILED_MESSAGE;
                }
            }

        } catch (error) {
            // مدیریت خطای شبکه یا سرور
            console.error('Login API Error:', error);
            if (errorDisplay) errorDisplay.textContent = GENERAL_MSG_ERR2;
        }
    }

    // ------------------ اتصال تابع به فرم ------------------
    if (loginForm) {
        loginForm.addEventListener('submit', tryAdminLogin);
    }

});