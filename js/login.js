document.addEventListener('DOMContentLoaded', () => {

    const API_LOGIN_ENDPOINT = 'http://127.0.0.1:8000/api/token/';
    const ADMIN_DASHBOARD_PAGE = 'dashboard.html';
    const GENERAL_ERROR_MESSAGE = 'خطایی در ارتباط با سرور رخ داد. دوباره تلاش کنید.';
    const AUTH_FAILED_MESSAGE = 'نام کاربری یا رمز عبور اشتباه است.';
    const GENERAL_MSG_ERR2 = 'شبکه در دسترس نیست.';

    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const errorDisplay = document.getElementById('errorDisplay');
    const uErr = document.querySelector('.error-msg-username');
    const pErr = document.querySelector('.error-msg-password');

    async function tryAdminLogin(event) {
        event.preventDefault();

        if (uErr) uErr.textContent = '';
        if (pErr) pErr.textContent = '';
        if (errorDisplay) errorDisplay.textContent = '';

        const enteredUsername = usernameInput.value.trim();
        const enteredPassword = passwordInput.value.trim();

        let isValid = true;

        if (!enteredUsername) {
            if (uErr) uErr.textContent = 'لطفا نام کاربری را وارد کنید';
            isValid = false;
        }
        if (!enteredPassword) {
            if (pErr) pErr.textContent = 'لطفا رمز عبور را وارد کنید';
            isValid = false;
        }

        if (isValid) {
            try {
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
                    // SimpleJWT → access + refresh
                    const token = data.access;

                    if (token) {
                        localStorage.setItem('access', data.access);
                        localStorage.setItem('refresh', data.refresh);
                        window.location.href = ADMIN_DASHBOARD_PAGE;
                    } else {
                        if (errorDisplay) errorDisplay.textContent = GENERAL_ERROR_MESSAGE;
                    }

                } else {
                    if (errorDisplay) {
                        errorDisplay.textContent = data.detail || AUTH_FAILED_MESSAGE;
                    }
                }

            } catch (error) {
                console.error('Login API Error:', error);
                if (errorDisplay) errorDisplay.textContent = GENERAL_MSG_ERR2;
            }
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', tryAdminLogin);
    }

});

