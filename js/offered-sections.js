(() => {
  const API_BASE = "http://127.0.0.1:8000/api/";
const CURRENT_TERM = 1;
const SECTIONS_API = API_BASE + `student-sections/?term=${CURRENT_TERM}`;
  const COURSES_API = API_BASE + "courses/";
  const INSTRUCTORS_API = API_BASE + "instructors/";
  const REFRESH_API = API_BASE + "token/refresh/";

  /* ------------------ Enums ------------------ */
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

  /* ------------------ Auth helpers ------------------ */
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

  /* ------------------ Data stores ------------------ */
  let allSections = [];
  const courseMap = {};      // code -> title
  const instructorMap = {}; // id -> "fname lname"

  /* ------------------ Load helpers ------------------ */
  async function loadCourses() {
    const res = await fetchWithAuth(COURSES_API);
    if (!res || !res.ok) throw new Error("courses failed");
    const data = await res.json();
    data.forEach(c => {
      courseMap[c.code] = c.title;
    });
  }

  async function loadInstructors() {
    const res = await fetchWithAuth(INSTRUCTORS_API);
    if (!res || !res.ok) throw new Error("instructors failed");
    const data = await res.json();
    data.forEach(i => {
      instructorMap[i.id] = `${i.f_name} ${i.l_name}`.trim();
    });
  }

  /* ------------------ Render ------------------ */
  function renderSections(sections) {
    const tbody = document.getElementById("sections-table-body");
    const noRes = document.getElementById("no-results");
    tbody.innerHTML = "";

    if (!sections.length) {
      noRes.style.display = "block";
      return;
    }
    noRes.style.display = "none";

    sections.forEach(sec => {
      const tr = document.createElement("tr");

      const courseTitle = courseMap[sec.course] || sec.course;
      const instructorName = instructorMap[sec.instructor] || "-";

      let meetingStr = "---";
      if (sec.meetings?.length) {
        meetingStr = sec.meetings.map(m => {
          const day = DayMap[m.day] || m.day;
          const time = TimeMap[m.time_slot] || m.time_slot;
          return `<div>${day} ${time} (کلاس ${m.room_id})</div>`;
        }).join("");
      }

      tr.innerHTML = `
        <td>
          <strong>${courseTitle}</strong><br>
          <span style="color:#777">(${sec.course})</span>
        </td>
        <td>${instructorName}</td>
        <td>${sec.term}</td>
        <td>${sec.capacity}</td>
        <td>${meetingStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ------------------ Load sections ------------------ */
  async function loadSections() {
    const tbody = document.getElementById("sections-table-body");
    tbody.innerHTML = `<tr><td colspan="5">در حال بارگذاری...</td></tr>`;

    try {
      await Promise.all([loadCourses(), loadInstructors()]);
      const res = await fetchWithAuth(SECTIONS_API);
const data = await res.json();

// سازگار با pagination و بدون pagination
allSections = Array.isArray(data) ? data : (data.results || []);

renderSections(allSections);

    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:red">خطای ارتباط با سرور</td></tr>`;
    }
  }

  /* ------------------ Search (course code + instructor name) ------------------ */
  function handleSearch(e) {
    const q = e.target.value.toLowerCase().trim();

    const filtered = allSections.filter(sec => {
      const courseCode = sec.course?.toLowerCase() || "";
      const instructorName = instructorMap[sec.instructor]?.toLowerCase() || "";
      return courseCode.includes(q) || instructorName.includes(q);
    });

    renderSections(filtered);
  }

  /* ------------------ Init ------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    loadSections();
    document
      .getElementById("course-search")
      ?.addEventListener("input", handleSearch);
  });
})();
