(() => {
    const API_BASE = "http://127.0.0.1:8000/api/";
    const CURRENT_TERM = 1;

    const SECTIONS_API = API_BASE + `student-sections/?term=${CURRENT_TERM}`;
    const COURSES_API = API_BASE + "courses/";
    const INSTRUCTORS_API = API_BASE + "instructors/";
    const PREREQ_API = API_BASE + "prerequisites/";
    const ENROLL_API = API_BASE + "enroll/";
    const REFRESH_API = API_BASE + "token/refresh/";

    const DayMap = {
        SA: "شنبه", SU: "یکشنبه", MO: "دوشنبه",
        TU: "سه‌شنبه", WE: "چهارشنبه", TH: "پنجشنبه", FR: "جمعه"
    };

    const TimeMap = {
        "8-10": "۰۸:۰۰ - ۱۰:۰۰",
        "10-12": "۱۰:۰۰ - ۱۲:۰۰",
        "12-14": "۱۲:۰۰ - ۱۴:۰۰",
        "14-16": "۱۴:۰۰ - ۱۶:۰۰",
        "16-18": "۱۶:۰۰ - ۱۸:۰۰"
    };

    function tokens() {
        return {
            access: localStorage.getItem("access"),
            refresh: localStorage.getItem("refresh")
        };
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
        if (!newAccess) {
            window.location.href = "login.html";
            return null;
        }
        opts.headers.Authorization = `Bearer ${newAccess}`;
        return fetch(url, opts);
    }

    let allSections = [];
    let enrolledSections = [];
    const courseMap = {};
    const instructorMap = {};
    const prereqMap = {}; // course -> [prereq1, prereq2...]

    async function loadCourses() {
        const res = await fetchWithAuth(COURSES_API);
        if (!res.ok) throw new Error("courses failed");
        const data = await res.json();
        data.forEach(c => courseMap[c.code] = c.title);
    }

    async function loadInstructors() {
        const res = await fetchWithAuth(INSTRUCTORS_API);
        if (!res.ok) throw new Error("instructors failed");
        const data = await res.json();
        data.forEach(i => instructorMap[i.id] = `${i.f_name} ${i.l_name}`.trim());
    }

    async function loadPrerequisites() {
        const res = await fetchWithAuth(PREREQ_API);
        if (!res.ok) throw new Error("prerequisites failed");
        const data = await res.json();
        data.forEach(p => {
            if (!prereqMap[p.course]) prereqMap[p.course] = [];
            prereqMap[p.course].push(p.prereq_course);
        });
    }

    function renderSections() {
        const tbody = document.getElementById("sections-table-body");
        tbody.innerHTML = "";
        if (!allSections.length) {
            document.getElementById("no-results").style.display = "block";
            return;
        }
        document.getElementById("no-results").style.display = "none";

        allSections.forEach(sec => {
            const tr = document.createElement("tr");

            const courseTitle = courseMap[sec.course] || sec.course;
            const instructorName = instructorMap[sec.instructor] || "-";
            const group = sec.group_number || "-";
            const meetings = sec.meetings?.map(m => {
                const day = DayMap[m.day] || m.day;
                const time = TimeMap[m.time_slot] || m.time_slot;
                return `${day} ${time} (کلاس ${m.room_id})`;
            }).join("<br>") || "---";

            const canEnroll = checkPrerequisites(sec.course);

            tr.innerHTML = `
                <td><strong>${courseTitle}</strong><br><small style="color:#777">(${sec.course})</small></td>
                <td>${instructorName}</td>
                <td>${group}</td>
                <td>${sec.capacity}</td>
                <td>${meetings}</td>
                <td>
                    <button ${!canEnroll ? "disabled" : ""} onclick="enrollCourse(${sec.id})">اخذ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderEnrolled() {
        const tbody = document.getElementById("enrolled-table-body");
        tbody.innerHTML = "";
        if (!enrolledSections.length) {
            document.getElementById("no-enrolled").style.display = "block";
            return;
        }
        document.getElementById("no-enrolled").style.display = "none";

        enrolledSections.forEach(sec => {
            const tr = document.createElement("tr");
            const courseTitle = courseMap[sec.course] || sec.course;
            const instructorName = instructorMap[sec.instructor] || "-";
            const group = sec.group_number || "-";
            const meetings = sec.meetings?.map(m => {
                const day = DayMap[m.day] || m.day;
                const time = TimeMap[m.time_slot] || m.time_slot;
                return `${day} ${time} (کلاس ${m.room_id})`;
            }).join("<br>") || "---";

            tr.innerHTML = `
                <td><strong>${courseTitle}</strong><br><small style="color:#777">(${sec.course})</small></td>
                <td>${instructorName}</td>
                <td>${group}</td>
                <td>${sec.term}</td>
                <td>${meetings}</td>
                <td><button onclick="dropCourse(${sec.id})">حذف</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function checkPrerequisites(courseCode) {
        const prereqs = prereqMap[courseCode] || [];
        return prereqs.every(pr => enrolledSections.some(s => s.course === pr));
    }

    async function loadSections() {
        await Promise.all([loadCourses(), loadInstructors(), loadPrerequisites()]);
        const res = await fetchWithAuth(SECTIONS_API);
        const data = await res.json();
        allSections = Array.isArray(data) ? data : (data.results || []);

        // load enrolled sections separately
        enrolledSections = allSections.filter(s => s.enrolled); // فرض می‌کنیم API این فیلد را می‌دهد
        renderSections();
        renderEnrolled();
    }

    window.enrollCourse = async (sectionId) => {
        try {
            const res = await fetchWithAuth(ENROLL_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section: sectionId })
            });
            if (!res.ok) throw new Error("Enroll failed");
            // اضافه کردن به لیست اخذ شده
            const enrolled = allSections.find(s => s.id === sectionId);
            if (enrolled) enrolledSections.push(enrolled);
            renderSections();
            renderEnrolled();
        } catch (e) {
            alert("اخذ درس موفقیت‌آمیز نبود!");
        }
    };

    window.dropCourse = async (enrolledId) => {
        try {
            const res = await fetchWithAuth(`${SECTIONS_API}${enrolledId}/`, { method: "DELETE" });
            if (!res.ok) throw new Error("Drop failed");
            enrolledSections = enrolledSections.filter(s => s.id !== enrolledId);
            renderSections();
            renderEnrolled();
        } catch (e) {
            alert("حذف درس موفقیت‌آمیز نبود!");
        }
    };

    document.addEventListener("DOMContentLoaded", () => {
        loadSections();
        document.getElementById("course-search")?.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            const filtered = allSections.filter(sec => {
                const courseCode = sec.course?.toLowerCase() || "";
                const instructorName = instructorMap[sec.instructor]?.toLowerCase() || "";
                return courseCode.includes(q) || instructorName.includes(q);
            });
            renderSections(filtered);
        });
    });

})();
