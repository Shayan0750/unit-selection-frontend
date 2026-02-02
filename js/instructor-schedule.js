(() => {
    // --- تنظیمات API ---
    const API_BASE_URL = "http://127.0.0.1:8000/api/";
    const SCHEDULE_API = API_BASE_URL + "instructor/program/";
    const REFRESH_URL = API_BASE_URL + "token/refresh/";

    // --- توابع احراز هویت (Authentication) ---
    function tokens() {
        return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') };
    }

    async function refreshAccess() {
        const t = tokens();
        if (!t.refresh) return null;
        try {
            const r = await fetch(REFRESH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: t.refresh })
            });
            if (!r.ok) return null;
            const j = await r.json();
            if (j.access) {
                localStorage.setItem('access', j.access);
                if (j.refresh) localStorage.setItem('refresh', j.refresh);
                return j.access;
            }
        } catch (e) { console.warn(e); }
        return null;
    }

    async function fetchWithAuth(url, opts = {}, retry = true) {
        opts.headers = opts.headers || {};
        const t = tokens();
        if (t.access) opts.headers['Authorization'] = `Bearer ${t.access}`;

        let res = await fetch(url, opts);

        if (res.status === 401 && retry) {
            const newAccess = await refreshAccess();
            if (newAccess) {
                opts.headers['Authorization'] = `Bearer ${newAccess}`;
                res = await fetch(url, opts);
            } else {
                window.location.href = 'login.html';
                return null;
            }
        }
        return res;
    }

    // --- منطق رنگ‌بندی درس‌ها ---
    // تولید تم رنگی ثابت بر اساس نام درس
    function getCourseColors(title) {
        // لیست پالت‌های رنگی (پس‌زمینه، بوردر/نوار، متن)
        const colors = [
            { bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' }, // آبی
            { bg: '#f1f8e9', border: '#8bc34a', text: '#33691e' }, // سبز روشن
            { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }, // نارنجی
            { bg: '#f3e5f5', border: '#9c27b0', text: '#4a148c' }, // بنفش
            { bg: '#ffebee', border: '#f44336', text: '#b71c1c' }, // قرمز
            { bg: '#e0f7fa', border: '#00bcd4', text: '#006064' }, // فیروزه‌ای
            { bg: '#fff8e1', border: '#ffc107', text: '#ff6f00' }, // زرد/طلایی
            { bg: '#eceff1', border: '#607d8b', text: '#263238' }  // خاکستری
        ];

        // یک عدد هش ساده از روی رشته می‌سازیم تا همیشه همان رنگ برای همان درس انتخاب شود
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            hash = title.charCodeAt(i) + ((hash << 5) - hash);
        }

        // انتخاب رنگ از آرایه با استفاده از باقیمانده تقسیم
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    // --- منطق اصلی برنامه ---
    async function loadSchedule() {
        try {
            // نمایش لودینگ (اختیاری) در تمام سلول‌ها
            // ...

            const res = await fetchWithAuth(SCHEDULE_API);
            if (!res || !res.ok) throw new Error("خطا در دریافت برنامه");

            const program = await res.json();
            renderSchedule(program);

        } catch (err) {
            console.error(err);
        }
    }

    function renderSchedule(program) {
        // ۱. ابتدا تمام سلول‌های جدول را پاک می‌کنیم (برای جلوگیری از تکرار در صورت رفرش)
        document.querySelectorAll('.schedule-cell').forEach(td => td.innerHTML = '');

        if (!program || program.length === 0) return;

        // ۲. حلقه روی هر بخش (درس اخذ شده)
        program.forEach(section => {
            const courseTitle = section.course.title;
            const courseCode = section.course.code;

            // چک کردن وجود استاد
            const instructorName = section.instructor
                ? `${section.instructor.f_name} ${section.instructor.l_name}`
                : 'استاد نامشخص';

            const colorTheme = getCourseColors(courseTitle); // رنگ اختصاصی درس

            // هر درس ممکن است چندین جلسه (meeting) داشته باشد
            if (section.meetings && Array.isArray(section.meetings)) {
                section.meetings.forEach(meeting => {
                    const day = meeting.day;         // مثال: "SA"
                    const time = meeting.time_slot;  // مثال: "8-10"
                    const roomId = meeting.room_id;  // مثال: "203"

                    // ۳. یافتن سلول جدول با ID ترکیبی (ساختار جدید: Day-Time)
                    // در HTML جدید، IDها به صورت SA-8-10 هستند
                    const cellId = `${day}-${time}`;
                    const targetCell = document.getElementById(cellId);

                    if (targetCell) {
                        // ۴. ساخت کارت درس
                        const card = document.createElement('div');
                        card.className = 'class-card';

                        // اعمال رنگ‌ها
                        card.style.backgroundColor = colorTheme.bg;
                        card.style.borderRightColor = colorTheme.border; // در RTL بوردر راست مهم است
                        card.style.color = colorTheme.text;

                        card.innerHTML = `
                            <span class="class-title">${courseTitle}</span>
                            <span class="class-info">🚪 کلاس ${roomId}</span>
                            <span class="class-info" style="font-size:0.7em; opacity:0.7">(${courseCode})</span>
                        `;

                        targetCell.appendChild(card);
                    } else {
                        console.warn(`Cell not found for ${cellId}`);
                    }
                });
            }
        });
    }

    // اجرا به محض لود شدن صفحه
    document.addEventListener('DOMContentLoaded', loadSchedule);

})();