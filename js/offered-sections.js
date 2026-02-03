(() => {
    const API_BASE = "http://127.0.0.1:8000/api/";
    const TERMS_API = API_BASE + "terms/";
    const SECTIONS_API = API_BASE + "student-sections/";
    const COURSES_API = API_BASE + "courses/";
    const INSTRUCTORS_API = API_BASE + "instructors/";
    const REFRESH_API = API_BASE + "token/refresh/";

    const DayMap = { SA: "شنبه", SU: "یکشنبه", MO: "دوشنبه", TU: "سه‌شنبه", WE: "چهارشنبه", TH: "پنجشنبه", FR: "جمعه" };
    const TimeMap = { "8-10": "۰۸:۰۰ - ۱۰:۰۰", "10-12": "۱۰:۰۰ - ۱۲:۰۰", "12-14": "۱۲:۰۰ - ۱۴:۰۰", "14-16": "۱۴:۰۰ - ۱۶:۰۰", "16-18": "۱۶:۰۰ - ۱۸:۰۰" };

    let courseMap = {};
    let instructorMap = {};
    let currentTermId = null;
    let allSections = [];

    function tokens() {
        return { access: localStorage.getItem("access"), refresh: localStorage.getItem("refresh") };
    }

    async function refreshAccess() {
        const t = tokens();
        if (!t.refresh) return null;
        const r = await fetch(REFRESH_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: t.refresh })
        });
        if (!r.ok) return null;
        const j = await r.json();
        if (j.access) {
            localStorage.setItem("access", j.access);
            if (j.refresh) localStorage.setItem("refresh", j.refresh);
            return j.access;
        }
        return null;
    }

    async function fetchWithAuth(url, opts = {}, retry = true) {
        opts.headers = opts.headers || {};
        const t = tokens();
        if (t.access) opts.headers.Authorization = `Bearer ${t.access}`;
        let res = await fetch(url, opts);
        if (res.status !== 401 || !retry) return res;
        const newAccess = await refreshAccess();
        if (!newAccess) { window.location.href = "login.html"; return null; }
        opts.headers.Authorization = `Bearer ${newAccess}`;
        return fetch(url, opts);
    }

    async function loadCourses() {
        const res = await fetchWithAuth(COURSES_API);
        const data = await res.json();
        data.forEach(c => courseMap[c.code] = c.title);
    }

    async function loadInstructors() {
        const res = await fetchWithAuth(INSTRUCTORS_API);
        const data = await res.json();
        data.forEach(i => instructorMap[i.id] = `${i.f_name} ${i.l_name}`.trim());
    }

    async function loadTerms() {
        const res = await fetchWithAuth(TERMS_API);
        const data = await res.json();
        if (!data.length) return;

        // آخرین نیمسال (id بزرگترین)
        let lastTerm = data.reduce((max, t) => t.id > max.id ? t : max, data[0]);
        currentTermId = lastTerm.id;

        const select = document.getElementById("termSelect");
        select.innerHTML = data.map(t => {
            return `<option value="${t.id}">${t.year} - ${t.semester === "F" ? "نیمسال اول" : "نیمسال دوم"}</option>`;
        }).join("");
        select.value = currentTermId;

        // تغییر نیمسال
        select.addEventListener("change", e => {
            currentTermId = Number(e.target.value);
            fetchSections();
        });
    }

    async function fetchSections() {
        const tbody = document.getElementById("sections-table-body");
        tbody.innerHTML = `<tr><td colspan="6">در حال بارگذاری...</td></tr>`;
        try {
            await Promise.all([loadCourses(), loadInstructors()]);
            const url = `${SECTIONS_API}?term=${currentTermId}`;
            const res = await fetchWithAuth(url);
            allSections = await res.json();
            applyFilters();
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="color:red">خطای ارتباط با سرور</td></tr>`;
            console.error(e);
        }
    }

    function renderSections(sections) {
        const tbody = document.getElementById("sections-table-body");
        const noRes = document.getElementById("no-results");
        tbody.innerHTML = "";
        if (!sections.length) {
            noRes.style.display = "block";
            noRes.textContent = "برای این نیمسال درسی ارائه نشده است.";
            return;
        }
        noRes.style.display = "none";

        sections.forEach(sec => {
            const tr = document.createElement("tr");
            const courseCode = sec.course || "-";
            const courseTitle = courseMap[sec.course] || "-";
            const groupNumber = sec.group_number != null ? sec.group_number : "-";
            const instructorName = instructorMap[sec.instructor] || "-";
            const capacity = sec.capacity || "-";
            let meetingStr = "---";
            if (Array.isArray(sec.meetings) && sec.meetings.length) {
                meetingStr = sec.meetings.map(m => {
                    const day = DayMap[m.day] || m.day;
                    const time = TimeMap[m.time_slot] || m.time_slot;
                    const room = m.room_id || "-";
                    return `<div>${day} ${time} (کلاس ${room})</div>`;
                }).join("");
            }
            tr.innerHTML = `
                <td>${courseCode}</td>
                <td>${courseTitle}</td>
                <td>${groupNumber}</td>
                <td>${instructorName}</td>
                <td>${capacity}</td>
                <td>${meetingStr}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function applyFilters() {
        const q = document.getElementById("course-search")?.value.toLowerCase().trim() || "";
        const filtered = allSections.filter(sec => {
            const codeMatch = sec.course?.toLowerCase().includes(q);
            const instructorMatch = instructorMap[sec.instructor]?.toLowerCase().includes(q);
            return codeMatch || instructorMatch;
        });
        renderSections(filtered);
    }

    document.addEventListener("DOMContentLoaded", async () => {
        await loadTerms();
        fetchSections();
        document.getElementById("course-search").addEventListener("input", applyFilters);
    });

})();
