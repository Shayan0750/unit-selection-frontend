(() => {
    const API_BASE = "http://127.0.0.1:8000/api/";

    // --- تنظیمات API ---
    const CURRENT_TERM = 1; // شماره ترم جاری (قابل تغییر)

    // 1. لیست دروس ارائه شده (شامل ID ها)
    const SECTIONS_API = API_BASE + `student-sections/?term=${CURRENT_TERM}`;

    // 2. لیست دروس اخذ شده (شامل آبجکت کامل)
    const PROGRAM_API = API_BASE + "student/program/";

    // 3. عملیات اخذ و حذف
    const ENROLL_API = API_BASE + "enroll/"; // POST & DELETE base

    // 4. دیتای کمکی (برای تبدیل ID به نام)
    const COURSES_LIST_API = API_BASE + "courses/list/"; // فرض بر این است که این لیست کل دروس را می‌دهد
    const INSTRUCTORS_LIST_API = API_BASE + "instructors/"; // فرض بر این است که لیست اساتید را می‌دهد

    const REFRESH_URL = API_BASE + "token/refresh/";

    const DayMap = {
        SA: "شنبه", SU: "یکشنبه", MO: "دوشنبه",
        TU: "سه‌شنبه", WE: "چهارشنبه", TH: "پنج‌شنبه", FR: "جمعه"
    };

    // --- توابع Auth (استاندارد) ---
    function tokens() { return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }

    async function fetchWithAuth(url, opts = {}, retry = true) {
        opts.headers = opts.headers || {};
        opts.headers['Content-Type'] = 'application/json';
        const t = tokens();
        if (t.access) opts.headers['Authorization'] = `Bearer ${t.access}`;

        let res = await fetch(url, opts);
        if (res.status === 401 && retry) {
            const refreshRes = await fetch(REFRESH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: t.refresh })
            });
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                localStorage.setItem('access', data.access);
                return fetchWithAuth(url, opts, false);
            }
        }
        return res;
    }

    // --- State & Maps ---
    let offeredSections = [];
    let enrolledProgram = [];

    // نگاشت‌ها برای تبدیل ID به نام (چون API سکشن‌ها فقط ID برمی‌گرداند)
    const courseMap = {};     // { "7777": "AI", "111": "CS101" }
    const instructorMap = {}; // { 1: "John prof" }

    async function init() {
        // ابتدا اطلاعات پایه (نام دروس و اساتید) را می‌گیریم
        await Promise.all([loadCoursesMeta(), loadInstructorsMeta()]);
        // سپس لیست‌های اصلی را بارگذاری می‌کنیم
        await Promise.all([loadOfferedSections(), loadEnrolledProgram()]);
    }

    // --- Load Metadata ---
    async function loadCoursesMeta() {
        try {
            const res = await fetchWithAuth(COURSES_LIST_API);
            if (res.ok) {
                const data = await res.json();
                // فرض: دیتا آرایه‌ای از { code: "...", title: "..." } است
                data.forEach(c => courseMap[c.code] = c.title);
            }
        } catch (e) { console.warn("Cannot load courses metadata"); }
    }

    async function loadInstructorsMeta() {
        try {
            const res = await fetchWithAuth(INSTRUCTORS_LIST_API);
            if (res.ok) {
                const data = await res.json();
                // فرض: دیتا آرایه‌ای از { id: 1, f_name: "...", l_name: "..." } است
                data.forEach(i => instructorMap[i.id] = `${i.f_name} ${i.l_name}`);
            }
        } catch (e) { console.warn("Cannot load instructors metadata"); }
    }

    // --- Load Main Data ---
    async function loadOfferedSections() {
        try {
            const res = await fetchWithAuth(SECTIONS_API);
            if (res.ok) {
                offeredSections = await res.json();
                renderOfferedTable();
            }
        } catch (e) { console.error("Error loading sections", e); }
    }

    async function loadEnrolledProgram() {
        try {
            const res = await fetchWithAuth(PROGRAM_API);
            if (res.ok) {
                enrolledProgram = await res.json();
                renderEnrolledTable();
                renderOfferedTable(); // برای آپدیت وضعیت دکمه‌ها
            }
        } catch (e) { console.error("Error loading program", e); }
    }

    // --- Rendering ---
    function formatMeetings(meetings) {
        if (!meetings || !meetings.length) return "تعیین نشده";
        return meetings.map(m => {
            const day = DayMap[m.day] || m.day;
            return `<span class="badge badge-info">${day} ${m.time_slot} (کلاس ${m.room_id})</span>`;
        }).join('<br>');
    }

    function renderOfferedTable(filterList = null) {
        const list = filterList || offeredSections;
        const tbody = document.getElementById("sections-table-body");
        tbody.innerHTML = "";

        if (!list.length) {
            document.getElementById("no-results").style.display = "block";
            return;
        }
        document.getElementById("no-results").style.display = "none";

        // استخراج کدهای دروس اخذ شده برای غیرفعال کردن دکمه اخذ
        const enrolledCodes = new Set(enrolledProgram.map(p => p.course.code));

        list.forEach(sec => {
            // تبدیل ID ها به نام با استفاده از Map ها
            const courseTitle = courseMap[sec.course] || "نامشخص";
            const instructorName = instructorMap[sec.instructor] || "نامشخص";
            const isTaken = enrolledCodes.has(sec.course);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${courseTitle}</strong>
                    <br><small class="text-muted">کد: ${sec.course}</small>
                </td>
                <td>${instructorName}</td>
                <td>
                    <span title="ظرفیت کل">${sec.capacity}</span>
                    <small class="text-muted">(گروه ${sec.group_number})</small>
                </td>
                <td style="font-size: 0.85rem;">${formatMeetings(sec.meetings)}</td>
                <td>
                    ${isTaken
                    ? '<button class="btn btn-secondary btn-sm" disabled>اخذ شده</button>'
                    : `<button class="btn btn-primary btn-sm" onclick="handleEnroll(${sec.id})">اخذ درس</button>`
                }
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderEnrolledTable() {
        const tbody = document.getElementById("enrolled-table-body");
        tbody.innerHTML = "";

        if (!enrolledProgram.length) {
            document.getElementById("no-enrolled").style.display = "block";
            return;
        }
        document.getElementById("no-enrolled").style.display = "none";

        enrolledProgram.forEach(item => {
            // در اینجا item شامل آبجکت‌های کامل است
            const tr = document.createElement("tr");

            // Enrollment ID for deletion is item.id
            tr.innerHTML = `
                <td>
                    <strong>${item.course.title}</strong>
                    <br><small class="text-muted">کد: ${item.course.code}</small>
                </td>
                <td>${item.instructor.f_name} ${item.instructor.l_name}</td>
                <td>${item.course.units}</td>
                <td>${item.group_number}</td>
                <td style="font-size: 0.85rem;">${formatMeetings(item.meetings)}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" onclick="handleDrop(${item.id})">حذف</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Actions ---

    // 1. اخذ درس (POST)
    window.handleEnroll = async (sectionId) => {
        try {
            // طبق درخواست شما، بادی باید {"section": 1} باشد
            const payload = { section: sectionId };

            const res = await fetchWithAuth(ENROLL_API, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("درس با موفقیت اخذ شد.");
                loadEnrolledProgram(); // رفرش لیست
            } else {
                const err = await res.json();
                // هندل کردن خطاهای بیزنس لاجیک (تداخل، ظرفیت و ...)
                alert(err.detail || err.message || "خطا در اخذ درس (تداخل یا تکمیل ظرفیت).");
            }
        } catch (e) {
            console.error(e);
            alert("خطا در برقراری ارتباط با سرور.");
        }
    };

    // 2. حذف درس (DELETE)
    window.handleDrop = async (enrollmentId) => {
        if (!confirm("آیا از حذف این درس اطمینان دارید؟")) return;

        try {
            // طبق درخواست: /api/enroll/{id}/
            const url = `${ENROLL_API}${enrollmentId}/`;

            const res = await fetchWithAuth(url, { method: "DELETE" });

            if (res.ok) {
                loadEnrolledProgram(); // رفرش لیست پس از حذف
            } else {
                const err = await res.json();
                alert(err.detail || "خطا در حذف درس.");
            }
        } catch (e) {
            console.error(e);
            alert("خطا در برقراری ارتباط.");
        }
    };

    // جستجو
    document.getElementById("course-search").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
            renderOfferedTable(offeredSections);
            return;
        }

        const filtered = offeredSections.filter(sec => {
            const title = (courseMap[sec.course] || "").toLowerCase();
            const code = sec.course.toLowerCase(); // course code is string
            const prof = (instructorMap[sec.instructor] || "").toLowerCase();
            return title.includes(q) || code.includes(q) || prof.includes(q);
        });
        renderOfferedTable(filtered);
    });

    document.addEventListener("DOMContentLoaded", init);

})();