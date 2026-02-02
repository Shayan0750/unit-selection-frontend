(() => {
  const API = "http://127.0.0.1:8000/api/courses/";
  const DEPT_API = "http://127.0.0.1:8000/api/departments/";
  const REFRESH = "http://127.0.0.1:8000/api/token/refresh/";
  let departments = [];

  const $ = s => document.querySelector(s);

  // --- Auth fetch ---
  async function fetchWithAuth(url, opts = {}, retry = true){
    opts.headers = opts.headers || {};
    const access = localStorage.getItem('access');
    if(access) opts.headers['Authorization'] = 'Bearer ' + access;

    let res = await fetch(url, opts);
    if(res.status !== 401) return res;
    if(!retry) return res;

    const refresh = localStorage.getItem('refresh');
    if(!refresh) return res;

    try {
      const r = await fetch(REFRESH, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({refresh})
      });
      if(!r.ok) return res;
      const j = await r.json();
      if(j.access) localStorage.setItem('access', j.access);
      if(j.refresh) localStorage.setItem('refresh', j.refresh);
      opts.headers['Authorization'] = 'Bearer ' + j.access;
      return fetch(url, opts);
    } catch(e){ return res; }
  }

  // --- Load departments ---
  async function loadDepartments(){
    try{
      const res = await fetchWithAuth(DEPT_API);
      if(!res.ok) return;
      departments = await res.json();
      const select = document.getElementById("courseGroup");
      if(!select) return;
      select.innerHTML = '<option value="">انتخاب دپارتمان...</option>';
      departments.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.dep_name;
        select.appendChild(opt);
      });
    }catch(e){}
  }

  // --- Convert department id to name ---
  function getDepartmentName(id){
    const dep = departments.find(d => d.id == id); // == مهم است
    return dep ? dep.dep_name : id;
  }

  // --- Add course row to table ---
  function addCourseToTable(course){
    const tbody = document.getElementById("coursesTable");
    if(!tbody) return;

    const deptName = getDepartmentName(course.department);

    const tr = document.createElement("tr");
    tr.dataset.code = course.code ?? "";
    tr.innerHTML = `
      <td>${course.code ?? ""}</td>
      <td>${course.title ?? ""}</td>
      <td>${course.units ?? course.credits ?? ""}</td>
      <td>${deptName}</td>
      <td>
        <button class="btn btn-outline btn-edit" data-code="${course.code}">ویرایش</button>
        <button class="btn btn-outline btn-delete" data-code="${course.code}">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // --- Load courses table initially ---
  async function loadCoursesTable(){
    const res = await fetchWithAuth(API);
    if(!res.ok) return;
    const courses = await res.json();
    const tbody = document.getElementById("coursesTable");
    if(!tbody) return;
    tbody.innerHTML = "";

    courses.forEach(course => addCourseToTable(course));
  }

  // --- Initialize form and modal ---
  async function init(){
    await loadDepartments();
    await loadCoursesTable(); // <== بارگذاری اولیه جدول

    const modal = document.getElementById("courseModal");
    const form = document.getElementById("courseForm");
    if(!form) return;

    const codeEl = document.getElementById("courseCode");
    const titleEl = document.getElementById("courseTitle");
    const groupEl = document.getElementById("courseGroup");
    const creditsEl = document.getElementById("courseCredits");
    const msg = document.getElementById("formMsg");
    const openBtn = document.getElementById("addBtn");
    const cancelBtn = document.getElementById("cancelCourseBtn");

    function clearErrors(){
      ["errCode","errTitle","errGroup","errCredits"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = "";
      });
    }

    function open(){ form.reset(); clearErrors(); if(msg) msg.textContent=""; modal.classList.remove("hide"); codeEl.focus(); }
    function close(){ modal.classList.add("hide"); }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      clearErrors();

      const code = (codeEl.value||"").trim();
      const title = (titleEl.value||"").trim();
      const group = groupEl.value;
      const units = Number(creditsEl.value);

      let ok = true;
      if(!code){ document.getElementById("errCode").textContent="کد درس را وارد کنید."; ok=false; }
      if(!title){ document.getElementById("errTitle").textContent="عنوان درس را وارد کنید."; ok=false; }
      if(!group){ document.getElementById("errGroup").textContent="دپارتمان را انتخاب کنید."; ok=false; }
      if(!Number.isFinite(units) || units <=0){ document.getElementById("errCredits").textContent="تعداد واحد معتبر وارد کنید."; ok=false; }
      if(!ok) return;

      const payload = { code, title, units, department: Number(group) };
      if(msg) msg.textContent="در حال ارسال...";

      try{
        const res = await fetchWithAuth(API, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        });
        if(res.ok){
          const created = await res.json().catch(()=>null);
          addCourseToTable(created || payload);
          if(msg){ msg.textContent="درج با موفقیت انجام شد."; setTimeout(()=>msg.textContent="",700); }
          setTimeout(close,700);
          return;
        }
        const body = await res.json().catch(()=>null);
        if(msg) msg.textContent = (body && (body.detail||body.message)) || `خطا: ${res.status}`;
      }catch(e){
        if(msg) msg.textContent="خطای شبکه یا ارتباط";
      }
    });

    openBtn && openBtn.addEventListener("click", e => { e.preventDefault(); open(); });
    cancelBtn && cancelBtn.addEventListener("click", e => { e.preventDefault(); close(); });
    modal && modal.addEventListener("click", e => { if(e.target===modal) close(); });
    document.addEventListener("keydown", e => { if(e.key==="Escape") close(); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
