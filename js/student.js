const API_BASE_URL = "http://127.0.0.1:8000/api/";
const REFRESH_URL = API_BASE_URL + "token/refresh/"; 
const $ = s => document.querySelector(s);

// ۱. توابع احراز هویت

// خواندن access و refresh token از localStorage
function tokens(){ 
    return { 
        access: localStorage.getItem('access'), 
        refresh: localStorage.getItem('refresh') 
    }; 
}

// تابع رفرش کردن توکن دسترسی
async function refreshAccess(){
    const t = tokens(); 
    if(!t.refresh) return null; // اگر refresh token نباشد، کاری نمی‌کنیم
    
    try {
        const r = await fetch(REFRESH_URL, { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ refresh: t.refresh }) 
        });
        
        if(!r.ok) return null;
        const j = await r.json();
        
        if(j.access){ 
            localStorage.setItem('access', j.access); 
            if(j.refresh) localStorage.setItem('refresh', j.refresh); // اگر refresh هم عوض شد
            return j.access; 
        }
    } catch(e){ 
        console.warn('Refresh failed:', e); 
    }
    return null;
}

// تابع اصلی fetch با قابلیت افزودن Authorization Header و رفرش توکن
async function fetchWithAuth(url, opts = {}, retry = true){
    opts.headers = opts.headers || {};
    let t = tokens(); 

    // اضافه کردن توکن دسترسی به هدر
    if(t.access) {
        opts.headers['Authorization'] = `Bearer ${t.access}`;
    }
    opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';

    let res = await fetch(url, opts);

    // اگر 401 بود و هنوز تلاش مجدد انجام نشده بود، توکن را رفرش کن
    if (res.status === 401 && retry) {
        const newAccess = await refreshAccess();
        if (newAccess) {
            // توکن جدید را اضافه کرده و دوباره تلاش کن (تلاش مجدد=false)
            opts.headers['Authorization'] = `Bearer ${newAccess}`;
            res = await fetch(url, opts); // فراخوانی مجدد
        } else {
            // اگر رفرش توکن شکست خورد، کاربر را خارج کن
            handleLogout(); 
            return;
        }
    }

    return res;
}

// ۲. منطق بارگذاری دروس (با توابع اصلاح شده)

let allCourses = []; 

function handleLogout() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('userRole'); // کلید نقش کاربر
    window.location.href = 'login.html';
}

async function loadCourses() {
    const access = tokens().access; // چک کردن access token
    const userRole = localStorage.getItem('userRole');

    // AUTH GAURD (TO BE USED LATER)
    // if (!access || userRole !== 'student') {
    //     handleLogout(); // خروج و هدایت به صفحه لاگین
    //     return;
    // }

    try {
        // استفاده از fetchWithAuth برای مدیریت توکن
        const res = await fetchWithAuth(API_BASE_URL + 'courses/');
        
        if (!res || !res.ok) { // اگر رسپانس نامعتبر بود یا 401 بعد از تلاش مجدد بود
            const body = await res.json().catch(()=>null);
            throw new Error((body && (body.message || body.detail)) || `HTTP ${res.status}`);
        }

        const data = await res.json();
        allCourses = data.courses || data || []; 
        renderCourses(allCourses);

    } catch (err) {
        console.error('Fetch error:', err);
        const tbody = $('#courses-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">خطا در دریافت لیست دروس: ${err.message}. لطفاً مجدداً وارد شوید.</td></tr>`;
        }
    }
}

// ۳. توابع رندر و جستجو (بدون تغییر در منطق)

function renderCourses(courses) {
    const tbody = $('#courses-table-body');
    const noResults = $('#no-results');
    if (!tbody) return; 

    tbody.innerHTML = ''; 
    noResults.style.display = (courses.length === 0) ? 'block' : 'none';

    courses.forEach(course => {
        const row = tbody.insertRow();
        row.dataset.code = course.code; 
        
        // ... (منطق ساده شده درج سلول‌ها همانند قبل)
        row.insertCell().textContent = course.title;
        row.insertCell().textContent = course.code;
        row.insertCell().textContent = course.units;
        row.insertCell().textContent = course.department; 
        
        const prereqs = course.prerequisites ? course.prerequisites.map(p => p.name).join(', ') : 'ندارد';
        row.insertCell().textContent = prereqs;

        const actionCell = row.insertCell();
        const registerBtn = document.createElement('button');
        registerBtn.textContent = 'اخذ درس';
        registerBtn.classList.add('register-btn');
        registerBtn.dataset.code = course.code;
        actionCell.appendChild(registerBtn);
    });
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (searchTerm === '') {
        renderCourses(allCourses);
        return;
    }

    const filteredCourses = allCourses.filter(course => {
        const nameMatch = course.name && course.name.toLowerCase().includes(searchTerm);
        const professorMatch = course.professorName && course.professorName.toLowerCase().includes(searchTerm);
        const codeMatch = course.code && course.code.toLowerCase().includes(searchTerm); 
        return nameMatch || professorMatch || codeMatch;
    });

    renderCourses(filteredCourses);
}

// ۴. رویدادها و شروع

document.addEventListener('DOMContentLoaded', () => {
    // اتصال event listener خروج
    const logoutBtn = $('#logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // اتصال event listener جستجو
    const searchInput = $('#course-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    loadCourses(); // بارگذاری دروس پس از اتصال رویدادها
});