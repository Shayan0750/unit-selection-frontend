(() => {
    const API_BASE_URL = "http://127.0.0.1:8000/api/";
    const SCHEDULE_API = API_BASE_URL + "student/program/"; // Endpoint شما
    const REFRESH_URL = API_BASE_URL + "token/refresh/";

    // توابع Auth (استاندارد پروژه)
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
    // تولید رنگ تصادفی ثابت برای هر درس بر اساس نام درس (برای زیبایی)
    function stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + "00000".substring(0, 6 - c.length) + c;
    }

    // انتخاب رنگ پس‌زمینه روشن و رنگ متن تیره
    function getCourseColors(title) {
        const colors = [
            { bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' }, // آبی
            { bg: '#e8f5e9', border: '#4caf50', text: '#1b5e20' }, // سبز
            { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }, // نارنجی
            { bg: '#f3e5f5', border: '#9c27b0', text: '#4a148c' }, // بنفش
            { bg: '#ffebee', border: '#f44336', text: '#b71c1c' }, // قرمز
            { bg: '#e0f7fa', border: '#00bcd4', text: '#006064' }  // فیروزه‌ای
        ];
        // انتخاب رنگ بر اساس طول رشته یا کاراکتر اول
        const index = title.length % colors.length;
        return colors[index];
    }

    // --- منطق اصلی ---
    async function loadSchedule() {
        try {
            const res = await fetchWithAuth(SCHEDULE_API);
            if (!res || !res.ok) throw new Error("خطا در دریافت برنامه");

            const program = await res.json();
            renderSchedule(program);

        } catch (err) {
            console.error(err);
            // نمایش خطا به کاربر (اختیاری)
        }
    }

    function renderSchedule(program) {
        // پاک کردن جدول (اگر دکمه رفرش داشتید)
        document.querySelectorAll('.schedule-table td:not(.time-col)').forEach(td => td.innerHTML = '');

        if (!program || program.length === 0) return;

        program.forEach(section => {
            const courseTitle = section.course.title;
            const instructorName = section.instructor ? `${section.instructor.f_name} ${section.instructor.l_name}` : 'نامشخص';
            const colorTheme = getCourseColors(courseTitle); // رنگ اختصاصی درس

            // هر درس ممکن است چندین جلسه (meeting) داشته باشد
            if (section.meetings && Array.isArray(section.meetings)) {
                section.meetings.forEach(meeting => {
                    const day = meeting.day;         // مثال: "SA"
                    const time = meeting.time_slot;  // مثال: "8-10"
                    const roomId = meeting.room_id;  // مثال: "203"

                    // ساخت ID سلول جدول: SA-8-10
                    const cellId = `${day}-${time}`;
                    const targetCell = document.getElementById(cellId);

                    if (targetCell) {
                        // ساخت کارت درس
                        const card = document.createElement('div');
                        card.className = 'class-card';

                        // اعمال رنگ‌ها
                        card.style.backgroundColor = colorTheme.bg;
                        card.style.borderLeftColor = colorTheme.border;
                        card.style.color = colorTheme.text;

                        card.innerHTML = `
                            <span class="class-title">${courseTitle}</span>
                            <span class="class-info">👨‍🏫 ${instructorName}</span>
                            <span class="class-info">🚪 کلاس ${roomId}</span>
                        `;

                        targetCell.appendChild(card);
                    }
                });
            }
        });
    }

    // اجرا هنگام لود صفحه
    document.addEventListener('DOMContentLoaded', loadSchedule);

})();