// auth helper
const REFRESH_URL = "http://127.0.0.1:8000/api/token/refresh/";

function tokens(){ return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }

async function refreshAccess(){
  const t = tokens();
  if(!t.refresh) return null;
  try {
    const r = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: t.refresh })
    });
    if(!r.ok) return null;
    const j = await r.json();
    if (j.access) {
      localStorage.setItem('access', j.access);
      if (j.refresh) localStorage.setItem('refresh', j.refresh);
      return j.access;
    }
  } catch(e){ console.warn('refresh failed', e); }
  return null;
}

async function fetchWithAuth(url, opts = {}, retry = true){
  opts.headers = opts.headers || {};
  const t = tokens();
  if (t.access) opts.headers['Authorization'] = 'Bearer ' + t.access;
  let res = await fetch(url, opts);
  if (res.status !== 401) return res;
  if (!retry) return res;
  const newAccess = await refreshAccess();
  if (!newAccess) return res;
  opts.headers['Authorization'] = 'Bearer ' + newAccess;
  return fetch(url, opts);
}




console.log("viewCourses.js loaded");


document.addEventListener("DOMContentLoaded", () => {
    loadCourses();
});

async function loadCourses() {
    const API = "http://127.0.0.1:8000/api/courses/";
    const tbody = document.getElementById("coursesTable");

    tbody.innerHTML = `<tr><td colspan="5">در حال بارگذاری...</td></tr>`;

    try {
        const res = await fetchWithAuth(API, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="5">خطا در دریافت اطلاعات (${res.status})</td></tr>`;
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">هیچ درسی ثبت نشده است.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";

        data.forEach(course => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${course.code}</td>
                <td>${course.title}</td>
                <td>${course.units}</td>
                <td>${course.department}</td>
                <td><button class="btn btn-outline">ویرایش</button></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5">خطای شبکه یا اتصال</td></tr>`;
    }
}