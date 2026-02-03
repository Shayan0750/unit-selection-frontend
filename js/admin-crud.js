(() => {
  const API = "http://127.0.0.1:8000/api/courses/";
  const DEPT_API = "http://127.0.0.1:8000/api/departments/";
  const REFRESH = "http://127.0.0.1:8000/api/token/refresh/";

  const $ = s => document.querySelector(s);

  let departments = [];
  let editCode = null;

  /* ================= AUTH ================= */
  async function fetchWithAuth(url, options = {}, retry = true) {
    options.headers = options.headers || {};
    const access = localStorage.getItem("access");
    if (access) options.headers.Authorization = "Bearer " + access;

    let res = await fetch(url, options);
    if (res.status !== 401 || !retry) return res;

    const refresh = localStorage.getItem("refresh");
    if (!refresh) return res;

    const r = await fetch(REFRESH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh })
    });

    if (!r.ok) return res;
    const j = await r.json();
    localStorage.setItem("access", j.access);
    options.headers.Authorization = "Bearer " + j.access;
    return fetch(url, options);
  }

  /* ================= DEPARTMENTS ================= */
  async function loadDepartments() {
    const res = await fetchWithAuth(DEPT_API);
    if (!res.ok) return;
    departments = await res.json();
    const select = $("#courseGroup");
    select.innerHTML = `<option value="">انتخاب دپارتمان...</option>`;
    departments.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.dep_name;
      select.appendChild(opt);
    });
  }

  const depName = id =>
    departments.find(d => d.id == id)?.dep_name || id;

  /* ================= TABLE ================= */
  async function loadCourses() {
    const tbody = $("#coursesTable");
    tbody.innerHTML = "";

    const res = await fetchWithAuth(API);
    if (!res.ok) return;

    const data = await res.json();
    data.forEach(c => {
      const tr = document.createElement("tr");
      tr.dataset.code = c.code;
      tr.innerHTML = `
        <td>${c.code}</td>
        <td>${c.title}</td>
        <td>${c.units}</td>
        <td>${depName(c.department)}</td>
        <td>
          <button class="btn btn-outline btn-edit" data-code="${c.code}">ویرایش</button>
          <button class="btn btn-outline btn-delete" data-code="${c.code}">حذف</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ================= MODAL ================= */
  function openModal() {
    $("#courseModal").classList.remove("hide");
    $("#courseCode").focus();
  }

  function closeModal() {
    $("#courseModal").classList.add("hide");
    $("#courseForm").reset();
    $("#courseCode").readOnly = false;
    $("#saveCourseBtn").textContent = "ثبت";
    editCode = null;
  }

  /* ================= FORM SUBMIT ================= */
  async function submitCourse(e) {
    e.preventDefault();

    const payload = {
      code: $("#courseCode").value.trim(),
      title: $("#courseTitle").value.trim(),
      units: Number($("#courseCredits").value),
      department: Number($("#courseGroup").value)
    };

    const isEdit = editCode !== null;
    const url = isEdit ? API + editCode + "/" : API;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetchWithAuth(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      $("#formMsg").textContent = "خطا در ثبت اطلاعات";
      return;
    }

    $("#formMsg").textContent = isEdit ? "ویرایش انجام شد" : "درس ثبت شد";
    await loadCourses();
    setTimeout(closeModal, 600);
  }

  /* ================= TABLE EVENTS ================= */
  $("#coursesTable").addEventListener("click", async e => {
    const btn = e.target;
    const code = btn.dataset.code;

    if (btn.classList.contains("btn-delete")) {
      if (!confirm("حذف شود؟")) return;
      await fetchWithAuth(API + code + "/", { method: "DELETE" });
      btn.closest("tr").remove();
    }

    if (btn.classList.contains("btn-edit")) {
      const res = await fetchWithAuth(API + code + "/");
      const c = await res.json();

      $("#courseCode").value = c.code;
      $("#courseCode").readOnly = true;
      $("#courseTitle").value = c.title;
      $("#courseCredits").value = c.units;
      $("#courseGroup").value = c.department;

      $("#saveCourseBtn").textContent = "بروزرسانی";
      editCode = c.code;
      openModal();
    }
  });

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", async () => {
    await loadDepartments();
    await loadCourses();

    $("#addBtn").addEventListener("click", openModal);
    $("#cancelCourseBtn").addEventListener("click", closeModal);
    $("#courseForm").addEventListener("submit", submitCourse);
    $("#courseModal").addEventListener("click", e => {
      if (e.target.id === "courseModal") closeModal();
    });
  });
})();
