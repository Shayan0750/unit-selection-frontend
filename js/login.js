(function($) {
    "use strict";

    $('.login-form').submit(function(e) {
        e.preventDefault();

        var usernameInput = $('input[type="text"]');
        var passwordInput = $('input[type="password"]');
        var username = usernameInput.val().trim();
        var password = passwordInput.val().trim();

        // پاک کردن پیام‌های قبلی
        $('.error-msg-username').text('');
        $('.error-msg-password').text('');

        var hasError = false;

        if(username === '') {
            $('.error-msg-username').text('لطفا نام کاربری را وارد کنید');
            hasError = true;
        }

        if(password === '') {
            $('.error-msg-password').text('لطفا رمز عبور را وارد کنید');
            hasError = true;
        }

        if(!hasError) {
            alert('فرم درست است، ادامه دهید');
        }
    });

})(jQuery);
