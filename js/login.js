document.addEventListener('DOMContentLoaded', () => {

    /* ------------------ CONFIG ------------------ */
    const API_LOGIN_ENDPOINT = 'http://127.0.0.1:8000/api/token/';
    const ADMIN_DASHBOARD_PAGE = 'admin-dashboard.html';
    const STUDENT_DASHBOARD_PAGE = 'student-dashboard.html';
    const INSTRUCTOR_DASHBOARD_PAGE = 'instructor-dashboard.html';

    const MSG_AUTH_FAILED = 'نام کاربری یا رمز عبور اشتباه است.';
    const MSG_GENERAL_ERROR = 'خطای غیرمنتظره‌ای رخ داد.';
    const MSG_INVALID_ROLE = 'نقش کاربر معتبر نیست.';
    const MSG_NETWORK = 'خطا در ارتباط با سرور.';

    /* ------------------ ELEMENTS ------------------ */
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const errorDisplay = document.getElementById('errorDisplay');
    const uErr = document.querySelector('.error-msg-username');
    const pErr = document.querySelector('.error-msg-password');

    /* ------------------ HELPERS ------------------ */

    function parseJwt(token) {
        try {
            const base64 = token.split('.')[1];
            return JSON.parse(atob(base64));
        } catch (e) {
            console.error('JWT parse error:', e);
            return null;
        }
    }

    function extractRole(payload) {
        if (!payload) return null;

        if (Array.isArray(payload.role) && payload.role.length > 0)
            return payload.role[0].toLowerCase();

        if (typeof payload.role === 'string')
            return payload.role.toLowerCase();

        if (Array.isArray(payload.roles) && payload.roles.length > 0)
            return payload.roles[0].toLowerCase();

        if (payload.is_superuser || payload.is_staff)
            return 'admin';

        return null;
    }

    function showError(msg) {
        if (errorDisplay) errorDisplay.textContent = msg;
    }

    /* ------------------ LOGIN ------------------ */

    async function handleLogin(event) {
        event.preventDefault();

        // reset errors
        if (uErr) uErr.textContent = '';
        if (pErr) pErr.textContent = '';
        showError('');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        let valid = true;
        if (!username) { uErr.textContent = 'نام کاربری را وارد کنید'; valid = false; }
        if (!password) { pErr.textContent = 'رمز عبور را وارد کنید'; valid = false; }
        if (!valid) return;

        try {
            const res = await fetch(API_LOGIN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            let data;
            try {
                data = await res.json();
            } catch {
                showError(MSG_GENERAL_ERROR);
                return;
            }

            if (!res.ok) {
                showError(data.detail || MSG_AUTH_FAILED);
                return;
            }

            const { access, refresh } = data;
            if (!access || !refresh) {
                showError(MSG_GENERAL_ERROR);
                return;
            }

            // save tokens
            localStorage.setItem('access', access);
            localStorage.setItem('refresh', refresh);

            const payload = parseJwt(access);
            const role = extractRole(payload);

            if (!role) {
                console.error('Invalid role payload:', payload);
                showError(MSG_INVALID_ROLE);
                return;
            }

            localStorage.setItem('role', role);

            /* ------------------ REDIRECT ------------------ */
            if (role === 'admin') {
                window.location.href = ADMIN_DASHBOARD_PAGE;
            } else if (role === 'student') {
                window.location.href = STUDENT_DASHBOARD_PAGE;
            } else if (role === 'instructor') {
                window.location.href = INSTRUCTOR_DASHBOARD_PAGE;
            } else {
                showError(MSG_INVALID_ROLE);
            }

        } catch (err) {
            console.error('Login error:', err);
            showError(MSG_NETWORK);
        }
    }

    /* ------------------ BIND ------------------ */
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

});
