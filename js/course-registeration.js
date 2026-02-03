(() => {
    const API_BASE = "http://127.0.0.1:8000/api/";

    // --- تنظیمات API ---
    const CURRENT_TERM = 1;

    // 1. لیست تمام دروس ارائه شده در ترم (برای انتخاب)
    const SECTIONS_API = API_BASE + `student-sections/?term=${CURRENT_TERM}`;

    // 2. لیست دروس اخذ شده توسط این دانشجو (GET برای مشاهده، POST برای اخذ، DELETE برای حذف)
    const ENROLL_URL = API_BASE + "enroll/";

    // 3. دیتای کمکی برای نام دروس و اساتید در جدول بالا
    const COURSES_LIST_API = API_BASE + "courses/list/";
    const INSTRUCTORS_LIST_API = API_BASE + "instructors/";

    const REFRESH_URL = API_BASE + "token/refresh/";

    const DayMap = {
        SA: "شنبه", SU: "یکشنبه", MO: "دوشنبه",
        TU: "سه‌شنبه", WE: "چهارشنبه", TH: "پنج‌شنبه", FR: "جمعه"
    };

    // --- Authentication Helpers ---
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
    const courseMap = {};
    const instructorMap = {};

    async function init() {
        await Promise.all([loadCoursesMeta(), loadInstructorsMeta()]);
        await Promise.all([loadOfferedSections(), loadEnrolledProgram()]);
    }

    async function loadCoursesMeta() {
        try {
            const res = await fetchWithAuth(COURSES_LIST_API);
            if (res.ok) {
                const data = await res.json();
                data.forEach(c => courseMap[c.code] = c.title);
            }
        } catch (e) { console.warn("Metadata error", e); }
    }

    async function loadInstructorsMeta() {
        try {
            const res = await fetchWithAuth(INSTRUCTORS_LIST_API);
            if (res.ok) {
                const data = await res.json();
                data.forEach(i => instructorMap[i.id] = `${i.f_name} ${i.l_name}`);
            }
        } catch (e) { console.warn("Metadata error", e); }
    }

    async function loadOfferedSections() {
        try {
            const res = await fetchWithAuth(SECTIONS_API);
            if (res.ok) {
                offeredSections = await res.json();
                renderOfferedTable();
            }
        } catch (e) { console.error(e); }
    }

    async function loadEnrolledProgram() {
        try {
            // دریافت لیست دروس اخذ شده از /api/enroll/
            const res = await fetchWithAuth(ENROLL_URL);
            if (res.ok) {
                enrolledProgram = await res.json();
                renderEnrolledTable();
                renderOfferedTable(); // بروزرسانی دکمه‌های جدول انتخاب واحد
            }
        } catch (e) { console.error(e); }
    }

    // --- Rendering ---
    function formatMeetings(meetings) {
        if (!meetings || !meetings.length) return "تعیین نشده";
        return meetings.map(m => {
            const day = DayMap[m.day] || m.day;
            return `<span class="badge-time">${day} ${m.time_slot}</span>`;
        }).join(' ');
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

        // پیدا کردن کدهای دروسی که قبلاً اخذ شده‌اند (برای غیرفعال کردن دکمه)
        const enrolledCodes = new Set(enrolledProgram.map(item => item.section.course.code));

        list.forEach(sec => {
            const isTaken = enrolledCodes.has(sec.course);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${courseMap[sec.course] || "در حال بارگذاری..."}</strong>
                    <br><small class="text-muted">کد: ${sec.course}</small>
                </td>
                <td>${instructorMap[sec.instructor] || "نامشخص"}</td>
                <td>گروه ${sec.group_number} <br> <small>ظرفیت: ${sec.capacity}</small></td>
                <td>${formatMeetings(sec.meetings)}</td>
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
            // طبق ساختار جدید: اطلاعات اصلی داخل item.section است
            const sec = item.section;
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>
                    <strong>${sec.course.title}</strong>
                    <br><small class="text-muted">کد: ${sec.course.code}</small>
                </td>
                <td>${sec.instructor.f_name} ${sec.instructor.l_name}</td>
                <td>${sec.course.units}</td>
                <td>${sec.group_number}</td>
                <td>${formatMeetings(sec.meetings)}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" onclick="handleDrop(${item.id})">حذف</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Actions ---

    // ۱. اخذ درس (POST)
    window.handleEnroll = async (sectionId) => {
        try {
            const res = await fetchWithAuth(ENROLL_URL, {
                method: "POST",
                body: JSON.stringify({ section: sectionId })
            });

            if (res.ok) {
                alert("درس با موفقیت به لیست شما اضافه شد.");
                loadEnrolledProgram();
            } else {
                const err = await res.json();
                alert(err.detail || "خطا در اخذ درس (احتمال تداخل زمانی یا پیش‌نیاز)");
            }
        } catch (e) { alert("خطا در ارتباط با سرور"); }
    };

    // ۲. حذف درس (DELETE) - اصلاح شده
    window.handleDrop = async (enrollmentId) => {
        if (!confirm("آیا از حذف این درس از برنامه خود مطمئن هستید؟")) return;

        try {
            // آدرس نهایی: /api/enroll/{id}/
            const url = `${ENROLL_URL}${enrollmentId}/`;
            const res = await fetchWithAuth(url, { method: "DELETE" });

            if (res.ok) {
                loadEnrolledProgram(); // لیست را مجدداً بارگذاری کن
            } else {
                alert("حذف درس با خطا مواجه شد.");
            }
        } catch (e) { alert("خطا در ارتباط با سرور"); }
    };

    // فیلتر جستجو
    document.getElementById("course-search").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = offeredSections.filter(sec => {
            const title = (courseMap[sec.course] || "").toLowerCase();
            const prof = (instructorMap[sec.instructor] || "").toLowerCase();
            return title.includes(q) || sec.course.includes(q) || prof.includes(q);
        });
        renderOfferedTable(filtered);
    });

    document.addEventListener("DOMContentLoaded", init);
})();