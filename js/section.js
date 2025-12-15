(() => {
    // ===================================
    // ثابت‌ها و توابع کمکی
    // ===================================
    const API_BASE_URL = "http://127.0.0.1:8000/api/"; // آدرس پایه API
    const SECTIONS_API = API_BASE_URL + "sections/";
    const COURSES_LIST_API = API_BASE_URL + "courses/list/"; // Endpoint لیست دروس
    const INSTRUCTORS_API = API_BASE_URL + "users/instructors/"; // Endpoint لیست اساتید
    const TERMS_API = API_BASE_URL + "terms/"; // Endpoint لیست ترم‌ها
    const REFRESH_URL = API_BASE_URL + "token/refresh/";

    const $ = s => document.querySelector(s);
    const esc = s => String(s == null ? "" : s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    // توابع احراز هویت
    function tokens() { return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }

    async function refreshAccess() {
        const t = tokens(); if (!t.refresh) return null;
        try {
            const r = await fetch(REFRESH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: t.refresh }) });
            if (!r.ok) return null;
            const j = await r.json();
            if (j.access) { localStorage.setItem('access', j.access); if (j.refresh) localStorage.setItem('refresh', j.refresh); return j.access; }
        } catch (e) { console.warn('refresh failed', e); }
        return null;
    }

    async function fetchWithAuth(url, opts = {}, retry = true) {
        opts.headers = opts.headers || {};
        let t = tokens(); if (t.access) opts.headers['Authorization'] = `Bearer ${t.access}`;
        opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';

        let res = await fetch(url, opts);

        if (res.status === 401 && retry) {
            const newAccess = await refreshAccess();
            if (newAccess) {
                opts.headers['Authorization'] = `Bearer ${newAccess}`;
                // تلاش مجدد با توکن جدید
                res = await fetchWithAuth(url, opts, false); 
            } else {
                // اگر رفرش شکست خورد، خروج اجباری
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
        }
        return res;
    }

    // ===================================
    // توابع مودال و فرم
    // ===================================

    // دیکشنری برای نگهداری داده‌های لیست‌های کشویی (برای ویرایش)
    let dropdownData = {}; 

    function openSectionModal(mode = 'add', sectionData = {}) {
        const modal = $("#sectionModal");
        if (!modal) return;
        
        // پاکسازی
        $("#sectionForm").reset();
        $("#formMsg").textContent = ''; 
        
        // تنظیمات حالت (Add/Edit)
        $("#modal-title").textContent = (mode === 'add') ? 'افزودن بخش درسی جدید' : 'ویرایش بخش';
        $("#sectionForm").dataset.mode = mode;
        
        // پر کردن فیلدهای ویرایش
        if (mode === 'edit' && sectionData.id) {
            $("#section-id").value = sectionData.id;
            $("#course-select").value = sectionData.course_code;
            $("#instructor-select").value = sectionData.instructor_id;
            $("#term-select").value = sectionData.term_id;
            $("#capacity-input").value = sectionData.capacity;
        }

        modal.classList.remove('hide');
    }

    function closeSectionModal() {
        $("#sectionModal")?.classList.add('hide');
    }

    async function loadDropdownData() {
        try {
            const [coursesRes, instructorsRes, termsRes] = await Promise.all([
                fetchWithAuth(COURSES_LIST_API),
                fetchWithAuth(INSTRUCTORS_API),
                fetchWithAuth(TERMS_API)
            ]);

            const courses = await coursesRes.json();
            const instructors = await instructorsRes.json();
            const terms = await termsRes.json();
            
            // ذخیره داده‌ها
            dropdownData.courses = courses;
            dropdownData.instructors = instructors;
            dropdownData.terms = terms;
            
            // پر کردن لیست دروس
            const courseSelect = $('#course-select');
            courseSelect.innerHTML = '<option value="">انتخاب درس...</option>';
            courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${esc(c.code)}">${esc(c.name)} (${esc(c.code)})</option>`;
            });

            // پر کردن لیست اساتید
            const instructorSelect = $('#instructor-select');
            instructorSelect.innerHTML = '<option value="">انتخاب استاد...</option>';
            instructors.forEach(i => {
                instructorSelect.innerHTML += `<option value="${esc(i.id)}">${esc(i.name)}</option>`;
            });

            // پر کردن لیست ترم‌ها
            const termSelect = $('#term-select');
            termSelect.innerHTML = '<option value="">انتخاب ترم...</option>';
            terms.forEach(t => {
                termSelect.innerHTML += `<option value="${esc(t.id)}">${esc(t.name)}</option>`;
            });

        } catch (error) {
            console.error('Error loading dropdown data:', error);
            alert('خطا در بارگذاری داده‌های فرم بخش‌ها. (دروس، اساتید، ترم‌ها)');
        }
    }

    // ===================================
    // توابع CRUD
    // ===================================

    async function loadSections() {
        // ... (منطق نمایش جدول بخش‌ها - فقط لیست)
        // این قسمت برای اسپرینت ۲ لازم نیست، اما ساختار آن همانند loadCourses خواهد بود.
        console.log("Sections list loaded.");
    }
    
    // افزودن و ویرایش
    async function onFormSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const mode = form.dataset.mode || 'add';
        
        const sectionId = $("#section-id").value;
        const url = (mode === 'edit' && sectionId) ? SECTIONS_API + encodeURIComponent(sectionId) + "/" : SECTIONS_API;
        const method = (mode === 'edit' && sectionId) ? 'PUT' : 'POST';

        const payload = {
            course_code: $('#course-select').value,
            instructor_id: parseInt($('#instructor-select').value),
            term_id: parseInt($('#term-select').value),
            capacity: parseInt($('#capacity-input').value),
        };
        
        // اعتبار سنجی ساده
        if (!payload.course_code || isNaN(payload.instructor_id) || isNaN(payload.term_id) || isNaN(payload.capacity)) {
            $("#formMsg").textContent = 'لطفا تمام فیلدها را به درستی پر کنید.';
            return;
        }

        try {
            const res = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (!res || !res.ok) {
                const body = await res.json().catch(() => ({}));
                $("#formMsg").textContent = body.message || body.detail || (mode === 'add' ? 'خطا در افزودن بخش.' : 'خطا در ویرایش بخش.');
                throw new Error(`HTTP ${res.status}`);
            }

            closeSectionModal();
            alert((mode === 'add' ? 'بخش درسی با موفقیت افزوده شد.' : 'بخش درسی با موفقیت ویرایش شد.'));
            // loadSections(); // رفرش لیست پس از عملیات
            
        } catch (err) {
            console.error(`${mode} section error:`, err);
        }
    }

    // حذف
    async function onDeleteClick(e) {
        const btn = e.currentTarget;
        const id = btn.dataset.id || btn.closest("tr")?.dataset?.id;
        if (!id) return console.warn("missing section id");
        if (!confirm("آیا از حذف این بخش مطمئن هستید؟")) return;

        try {
            const res = await fetchWithAuth(SECTIONS_API + encodeURIComponent(id) + "/", { method: "DELETE" });
            if (res.status === 204 || res.ok) {
                btn.closest("tr")?.remove();
                alert("بخش با موفقیت حذف شد.");
            } else {
                const body = await res.json().catch(() => null);
                throw new Error((body && (body.detail || body.message)) || `HTTP ${res.status}`);
            }
        } catch (err) {
            console.error("delete error:", err);
            alert("خطا در حذف بخش");
        }
    }


    // ===================================
    // رویدادها و شروع
    // ===================================

    document.addEventListener("DOMContentLoaded", () => {
        // بارگذاری داده‌ها برای فیلدهای کشویی
        loadDropdownData();
        
        // اتصال رویدادهای مودال
        $("#addSectionBtn")?.addEventListener('click', () => openSectionModal('add'));
        $("#cancelSectionBtn")?.addEventListener('click', closeSectionModal);
        
        // اتصال ارسال فرم
        $("#sectionForm")?.addEventListener('submit', onFormSubmit);
        
        // loadSections(); // اگر جدول نمایش بخش‌ها را دارید، اینجا فراخوانی کنید
        
        // اتصال رویدادهای Edit/Delete (باید روی دکمه‌های جدول تعریف شود)
        // document.getElementById('sections-table-body')?.addEventListener('click', (e) => {
        //     if (e.target.classList.contains('edit-btn')) {
        //         const id = e.target.dataset.id;
        //         const section = allSections.find(s => s.id == id);
        //         openSectionModal('edit', section);
        //     } else if (e.target.classList.contains('delete-btn')) {
        //         onDeleteClick(e);
        //     }
        // });
    });

})();