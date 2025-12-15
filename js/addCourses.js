// ../js/addCourses.js — minimal create-course (uses fetchWithAuth, no noisy console errors)
(() => {
  const API = "http://127.0.0.1:8000/api/courses/";
  const REFRESH = "http://127.0.0.1:8000/api/token/refresh/";
  const $ = s => document.querySelector(s);

  // --- auth helper (attach Bearer and refresh once) ---
  function tokens(){ return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }
  async function refreshAccess(){
    const t = tokens(); if(!t.refresh) return null;
    try{
      const r = await fetch(REFRESH, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refresh: t.refresh }) });
      if(!r.ok) return null;
      const j = await r.json().catch(()=>null);
      if(j && j.access){ localStorage.setItem('access', j.access); if(j.refresh) localStorage.setItem('refresh', j.refresh); return j.access; }
    } catch(e) { /* silent */ }
    return null;
  }
  async function fetchWithAuth(url, opts = {}, retry = true){
    opts.headers = opts.headers || {};
    const t = tokens(); if (t.access) opts.headers['Authorization'] = 'Bearer ' + t.access;
    let res = await fetch(url, opts);
    if (res.status !== 401) return res;
    if (!retry) return res;
    const newAccess = await refreshAccess();
    if (!newAccess) return res;
    opts.headers['Authorization'] = 'Bearer ' + newAccess;
    return fetch(url, opts);
  }

  // --- UI helpers ---
  function addCourseToTable(course){
    const tbody = document.getElementById("coursesTable");
    if(!tbody) return;
    const code = course.code ?? "";
    const tr = document.createElement("tr");
    tr.dataset.code = code;
    tr.innerHTML = `
      <td>${code}</td>
      <td>${course.title ?? ""}</td>
      <td>${course.units ?? course.credits ?? ""}</td>
      <td>${course.department ?? course.group ?? ""}</td>
      <td>
        <button class="btn btn-outline btn-edit" type="button" data-code="${code}">ویرایش</button>
        <button class="btn btn-outline btn-delete" type="button" data-code="${code}">حذف</button>
      </td>
    `;
    tbody.prepend(tr);
  }

  // --- form logic ---
  async function init(){
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
      ["errCode","errTitle","errGroup","errCredits"].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = ""; });
    }

    function open(){
      form.reset && form.reset();
      clearErrors();
      if(msg){ msg.textContent = ""; }
      modal && modal.classList.remove("hide");
      setTimeout(()=> codeEl && codeEl.focus(), 40);
    }
    function close(){
      modal && modal.classList.add("hide");
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      clearErrors();
      const code = (codeEl.value||"").trim();
      const title = (titleEl.value||"").trim();
      const group = (groupEl.value||"").trim();
      const units = Number(creditsEl.value);

      let ok = true;
      if(!code){ document.getElementById("errCode").textContent = "کد درس را وارد کنید."; ok=false }
      if(!title){ document.getElementById("errTitle").textContent = "عنوان درس را وارد کنید."; ok=false }
      if(!group){ document.getElementById("errGroup").textContent = "گروه درسی را وارد کنید."; ok=false }
      if(!Number.isFinite(units) || units <= 0){ document.getElementById("errCredits").textContent = "تعداد واحد معتبر وارد کنید."; ok=false }
      if(!ok) return;

      const payload = { code, title, units, department: group };

      if(msg){ msg.textContent = "در حال ارسال..."; }

      try {
        const res = await fetchWithAuth(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        // handle responses cleanly — DO NOT throw to console
        if (res.ok) {
          const created = await res.json().catch(()=>null);
          addCourseToTable(created || payload);
          if(msg){ msg.textContent = "درج با موفقیت انجام شد."; setTimeout(()=> msg.textContent = "",700); }
          setTimeout(close, 700);
          // optionally refresh list or re-bind buttons elsewhere
          return;
        }

        // non-ok (including 401) — show user-friendly message, do not log stack
        let body = await res.json().catch(()=>null);
        const serverMsg = (body && (body.detail || body.message)) || `خطا: ${res.status}`;
        if(msg) msg.textContent = serverMsg;
      } catch (err) {
        // network or unexpected error — show friendly message, keep console quiet
        if(msg) msg.textContent = "خطای شبکه یا ارتباط";
      }
    });

    openBtn && openBtn.addEventListener("click", e => { e.preventDefault(); open(); });
    cancelBtn && cancelBtn.addEventListener("click", e => { e.preventDefault(); close(); });

    // optional: close modal by backdrop / ESC
    modal && modal.addEventListener("click", e => { if(e.target === modal) close(); });
    document.addEventListener("keydown", e => { if(e.key === "Escape") close(); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
