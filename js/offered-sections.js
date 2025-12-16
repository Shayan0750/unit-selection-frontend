(() => {
    const API_BASE_URL = "http://127.0.0.1:8000/api/";
    // to be changed later into "student-sections/"
    const SECTIONS_API = API_BASE_URL + "sections/";
    const REFRESH_URL = API_BASE_URL + "token/refresh/";

    // 1. دیکشنری برای ترجمه Enums به متن فارسی
    const DayMap = {
        'SA': 'شنبه', 'SU': 'یکشنبه', 'MO': 'دوشنبه',
        'TU': 'سه‌شنبه', 'WE': 'چهارشنبه', 'TH': 'پنجشنبه', 'FR': 'جمعه'
    };

    const TimeMap = {
        '8-10': '۰۸:۰۰ - ۱۰:۰۰',
        '10-12': '۱۰:۰۰ - ۱۲:۰۰',
        '12-14': '۱۲:۰۰ - ۱۴:۰۰',
        '14-16': '۱۴:۰۰ - ۱۶:۰۰',
        '16-18': '۱۶:۰۰ - ۱۸:۰۰'
    };

    // 2. توابع کمکی Auth (استاندارد پروژه شما)
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
                window.location.href = 'login.html'; // ریدایرکت در صورت عدم اعتبار
                return null;
            }
        }
        return res;
    }

    // 3. منطق دریافت و نمایش بخش‌ها
    let allSections = []; // ذخیره برای جستجو

    async function loadSections() {
        const tbody = document.getElementById('sections-table-body');
        const noRes = document.getElementById('no-results');

        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">در حال بارگذاری...</td></tr>';

        try {
            const res = await fetchWithAuth(SECTIONS_API);
            if (!res || !res.ok) throw new Error("خطا در دریافت اطلاعات");

            const data = await res.json();
            allSections = data.results || data || []; // هندل کردن صفحه‌بندی احتمالی

            renderSections(allSections);

        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">خطا در برقراری ارتباط با سرور</td></tr>';
        }
    }

    function renderSections(sections) {
        const tbody = document.getElementById('sections-table-body');
        const noRes = document.getElementById('no-results');
        tbody.innerHTML = '';

        if (sections.length === 0) {
            noRes.style.display = 'block';
            return;
        } else {
            noRes.style.display = 'none';
        }

        sections.forEach(sec => {
            const tr = document.createElement('tr');

            // فرمت کردن Meetings
            // مثال خروجی: شنبه ۰۸:۰۰ - ۱۰:۰۰ (کلاس 101)
            let meetingStr = '---';
            if (sec.meetings && sec.meetings.length > 0) {
                meetingStr = sec.meetings.map(m => {
                    const day = DayMap[m.day] || m.day;
                    const time = TimeMap[m.time_slot] || m.time_slot;
                    return `<div style="margin-bottom:4px;">${day} ${time} <span style="color:#666; font-size:0.9em;">(کلاس ${m.room_id})</span></div>`;
                }).join('');
            }

            tr.innerHTML = `
                <td>${sec.id}</td>
                <td style="font-weight:bold;">${sec.course}</td>
                <td>${sec.instructor || '-'}</td>
                <td>${sec.capacity}</td>
                <td style="font-size: 0.9em;">${meetingStr}</td>
                <td>
                    <button class="btn btn-sm btn-success" id="saveSectionBtn" onclick="alert('اخذ درس ${sec.id} انجام شد (شبیه‌سازی)')">اخذ درس</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 4. منطق جستجو (فیلتر کلاینت‌ساید)
    function handleSearch(e) {
        const term = e.target.value.toLowerCase();

        const filtered = allSections.filter(sec => {
            // جستجو در نام درس (Course String)
            return (sec.course && sec.course.toLowerCase().includes(term));
        });

        renderSections(filtered);
    }

    // 5. اجرا هنگام لود
    document.addEventListener('DOMContentLoaded', () => {
        loadSections();

        const searchInput = document.getElementById('course-search');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
    });

})();