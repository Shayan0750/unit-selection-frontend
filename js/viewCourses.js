// ../js/viewCourses.js — minimal: list + edit + delete using course code in URLs
(() => {
  const API = "http://127.0.0.1:8000/api/courses/";
  const REFRESH = "http://127.0.0.1:8000/api/token/refresh/";
  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

  /* auth helpers */
  function tokens(){ return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }
  async function refreshAccess(){
    const t = tokens(); if(!t.refresh) return null;
    try {
      const r = await fetch(REFRESH, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refresh: t.refresh }) });
      if(!r.ok) return null;
      const j = await r.json();
      if(j.access){ localStorage.setItem('access', j.access); if(j.refresh) localStorage.setItem('refresh', j.refresh); return j.access; }
    } catch(e){ console.warn('refresh failed', e); }
    return null;
  }
  async function fetchWithAuth(url, opts = {}, retry = true){
    opts.headers = opts.headers || {};
    const t = tokens(); if(t.access) opts.headers['Authorization'] = 'Bearer ' + t.access;
    let res = await fetch(url, opts);
    if(res.status !== 401) return res;
    if(!retry) return res;
    const na = await refreshAccess();
    if(!na) return res;
    opts.headers['Authorization'] = 'Bearer ' + na;
    return fetch(url, opts);
  }

  /* load list (uses course.code as identifier) */
  async function loadCourses(){
    const tbody = $("#coursesTable"); if(!tbody) return;
    tbody.innerHTML = "<tr><td colspan=5>در حال بارگذاری...</td></tr>";
    try {
      const res = await fetchWithAuth(API);
      if(!res.ok){ tbody.innerHTML = `<tr><td colspan=5>خطا (${res.status})</td></tr>`; return; }
      const data = await res.json();
      if(!Array.isArray(data) || data.length===0){ tbody.innerHTML = "<tr><td colspan=5>هیچ درسی ثبت نشده است.</td></tr>"; return; }
      tbody.innerHTML = "";
      data.forEach(c => {
        const code = c.code ?? "";
        const tr = document.createElement("tr"); tr.dataset.code = code;
        tr.innerHTML = `
          <td>${esc(code)}</td>
          <td>${esc(c.title ?? "")}</td>
          <td>${esc(c.units ?? c.credits ?? "")}</td>
          <td>${esc(c.department ?? c.group ?? "")}</td>
          <td>
            <button class="btn btn-outline btn-edit" type="button" data-code="${esc(code)}">ویرایش</button>
            <button class="btn btn-outline btn-delete" type="button" data-code="${esc(code)}">حذف</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll(".btn-edit").forEach(b => b.addEventListener("click", onEditClick));
      tbody.querySelectorAll(".btn-delete").forEach(b => b.addEventListener("click", onDeleteClick));
    } catch (err) {
      console.error(err);
      tbody.innerHTML = "<tr><td colspan=5>خطای شبکه</td></tr>";
    }
  }

  /* edit */
  async function onEditClick(e){
    const btn = e.currentTarget;
    const code = btn.dataset.code || btn.closest("tr")?.dataset?.code;
    if(!code) return console.warn("missing code");
    try{
      const res = await fetchWithAuth(API + encodeURIComponent(code) + "/");
      if(!res.ok) throw new Error(res.status);
      const c = await res.json();
      $("#courseCode").value = c.code ?? "";
      $("#courseTitle").value = c.title ?? "";
      $("#courseGroup").value = c.department ?? c.group ?? "";
      $("#courseCredits").value = c.units ?? c.credits ?? "";
      const form = $("#courseForm"); if(form) form.dataset.editCode = code;
      $("#modalTitle") && ($("#modalTitle").textContent = "ویرایش درس");
      $("#saveCourseBtn") && ($("#saveCourseBtn").textContent = "بروزرسانی");
      $("#courseModal") && $("#courseModal").classList.remove("hide");
      setTimeout(()=> $("#courseCode")?.focus(), 50);
    } catch (err) { console.error("open edit error:", err); alert("خطا در دریافت جزئیات درس"); }
  }

  async function onFormSubmit(e){
    e.preventDefault();
    const form = e.target;
    const originalCode = form.dataset.editCode;
    if(!originalCode) return;
    const code = ($("#courseCode")?.value||"").trim();
    const title = ($("#courseTitle")?.value||"").trim();
    const dept = ($("#courseGroup")?.value||"").trim();
    const units = Number($("#courseCredits")?.value);
    let ok = true;
    if(!code){ $("#errCode").textContent = "کد درس را وارد کنید."; ok=false } else $("#errCode").textContent = "";
    if(!title){ $("#errTitle").textContent = "عنوان درس را وارد کنید."; ok=false } else $("#errTitle").textContent = "";
    if(!dept){ $("#errGroup").textContent = "گروه درسی را وارد کنید."; ok=false } else $("#errGroup").textContent = "";
    if(!Number.isFinite(units) || units<=0){ $("#errCredits").textContent = "تعداد واحد معتبر وارد کنید."; ok=false } else $("#errCredits").textContent = "";
    if(!ok) return;

    const payload = { code, title, units, department: dept };
    try {
      const res = await fetchWithAuth(API + encodeURIComponent(originalCode) + "/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if(!res.ok){
        const body = await res.json().catch(()=>null);
        throw new Error((body && (body.detail||body.message)) || `HTTP ${res.status}`);
      }
      // update row: find row by original code and update dataset/code buttons
      const tr = document.querySelector(`#coursesTable tr[data-code="${CSS.escape(originalCode)}"]`) || Array.from(document.querySelectorAll('#coursesTable tr')).find(r => r.dataset.code === originalCode);
      if(tr){
        tr.dataset.code = code;
        tr.children[0].textContent = payload.code;
        tr.children[1].textContent = payload.title;
        tr.children[2].textContent = String(payload.units);
        tr.children[3].textContent = payload.department;
        // update buttons' data-code
        tr.querySelectorAll('button[data-code]').forEach(b => b.dataset.code = code);
      }
      delete form.dataset.editCode;
      $("#modalTitle") && ($("#modalTitle").textContent = "درج درس جدید");
      $("#saveCourseBtn") && ($("#saveCourseBtn").textContent = "ثبت");
      const msg = $("#formMsg"); if(msg){ msg.textContent = "بروزرسانی انجام شد."; setTimeout(()=> msg.textContent = "",800); }
      $("#courseModal") && $("#courseModal").classList.add("hide");
    } catch (err) {
      console.error("update error:", err);
      $("#formMsg") && ($("#formMsg").textContent = "خطا در بروز رسانی");
    }
  }

  /* delete */
  async function onDeleteClick(e){
    const btn = e.currentTarget;
    const code = btn.dataset.code || btn.closest("tr")?.dataset?.code;
    if(!code) return console.warn("missing code");
    if(!confirm("آیا از حذف این درس مطمئن هستید؟")) return;
    try {
      const res = await fetchWithAuth(API + encodeURIComponent(code) + "/", { method: "DELETE" });
      if (res.status === 204 || res.ok) {
        btn.closest("tr")?.remove();
      } else {
        const body = await res.json().catch(()=>null);
        throw new Error((body && (body.detail||body.message)) || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("delete error:", err);
      alert("خطا در حذف درس");
    }
  }

  /* bindings */
  document.addEventListener("DOMContentLoaded", () => {
    loadCourses();
    $("#courseForm")?.addEventListener("submit", onFormSubmit);
    $("#cancelCourseBtn")?.addEventListener("click", ()=> $("#courseModal")?.classList.add("hide"));
    $("#courseModal")?.addEventListener("click", e => { if(e.target.id === "courseModal") $("#courseModal")?.classList.add("hide"); });
    document.addEventListener("keydown", e => { if(e.key === "Escape") $("#courseModal")?.classList.add("hide"); });
  });
})();
