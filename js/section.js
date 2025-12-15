(() => {
    // ثابت‌ها و توابع کمکی
    const API_BASE_URL = "http://127.0.0.1:8000/api/";
    const SECTIONS_API = API_BASE_URL + "sections/";
    const COURSES_LIST_API = API_BASE_URL + "courses/list/";
    const INSTRUCTORS_API = API_BASE_URL + "users/instructors/";
    const TERMS_API = API_BASE_URL + "terms/";
    const REFRESH_URL = API_BASE_URL + "token/refresh/";

    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s); // اضافه شده
    const esc = s => String(s == null ? "" : s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    // متغیرهای سراسری برای نگهداری داده‌ها
    let dropdownData = {}; // داده‌های لیست‌های کشویی
    let allSections = []; // لیست تمام بخش‌ها

    // توابع احراز هویت (مطابق با viewCourses.js)
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
        opts.headers['Content-Type'] = opts.headers['Content-type'] || 'application/json';

        let res = await fetch(url, opts);

        if (res.status === 401 && retry) {
            const newAccess = await refreshAccess();
            if (newAccess) {
                opts.headers['Authorization'] = `Bearer ${newAccess}`;
                res = await fetchWithAuth(url, opts, false);
            } else {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
        }
        return res;
    }

    // توابع مودال و فرم

    function openSectionModal(mode = 'add', sectionData = {}) {
        const modal = $("#sectionModal");
        if (!modal) return;

        $("#sectionForm").reset();
        $("#formMsg").textContent = '';

        $("#modal-title").textContent = (mode === 'add') ? 'افزودن بخش درسی جدید' : 'ویرایش بخش';
        $("#sectionForm").dataset.mode = mode;

        if (mode === 'edit' && sectionData.id) {
            $("#section-id").value = sectionData.id;
            // توجه: فیلدهای Select باید با مقادیر value (کد یا ID) پر شوند
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
        // ... (همان منطق قبلی برای پر کردن select ها) ...
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
                courseSelect.innerHTML += `<option value="${esc(c.code)}">${esc(c.title)} (${esc(c.code)})</option>`;
            });

            // پر کردن لیست اساتید
            const instructorSelect = $('#instructor-select');
            instructorSelect.innerHTML = '<option value="">انتخاب استاد...</option>';
            instructors.forEach(i => {
                // فرض می‌کنیم داده استاد شامل id و name است
                instructorSelect.innerHTML += `<option value="${esc(i.id)}">${esc(i.name)}</option>`;
            });

            // پر کردن لیست ترم‌ها
            const termSelect = $('#term-select');
            termSelect.innerHTML = '<option value="">انتخاب ترم...</option>';
            terms.forEach(t => {
                // فرض می‌کنیم داده ترم شامل id و name است
                termSelect.innerHTML += `<option value="${esc(t.id)}">${esc(t.name)}</option>`;
            });

        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }


    // تابع Read (مشاهده لیست و رندر)

    // تابع کمکی برای یافتن نام بر اساس ID/Code
    function getDropdownName(type, value) {
        if (!value) return '';
        const list = dropdownData[type];
        if (!list) return value;

        if (type === 'courses') {
            return list.find(item => item.code === value)?.title || value;
        } else {
            return list.find(item => item.id == value)?.name || value;
        }
    }


    async function loadSections() {
        const tbody = $("#sections-table-body"); // فرض می‌کنیم ID جدول بخش‌ها این است
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">در حال بارگذاری...</td></tr>';

        try {
            const res = await fetchWithAuth(SECTIONS_API);
            if (!res || !res.ok) throw new Error(`HTTP ${res?.status || 500}`);

            const data = await res.json();
            allSections = data.sections || data || []; // ذخیره لیست بخش‌ها
            tbody.innerHTML = '';

            if (allSections.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">بخشی یافت نشد.</td></tr>';
                return;
            }

            // رندرینگ مطابق با الگوی viewCourses.js
            allSections.forEach(s => {
                const id = s.id; // فرض می‌کنیم ID بخش، کلید اصلی است
                const tr = document.createElement("tr"); tr.dataset.id = id;

                // استفاده از توابع کمکی برای نمایش نام به جای ID/Code
                const courseTitle = getDropdownName('courses', s.course_code);
                const instructorName = getDropdownName('instructors', s.instructor_id);
                const termName = getDropdownName('terms', s.term_id);

                tr.innerHTML = `
                    <td>${esc(s.id)}</td>
                    <td>${esc(courseTitle)}</td>
                    <td>${esc(instructorName)}</td>
                    <td>${esc(termName)}</td>
                    <td>${esc(s.capacity)}</td>
                    <td>
                        <button class="btn btn-outline btn-edit" type="button" data-id="${esc(id)}">ویرایش</button>
                        <button class="btn btn-outline btn-delete" type="button" data-id="${esc(id)}">حذف</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error('Load sections error:', err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: red;">خطا در بارگذاری لیست بخش‌ها.</td></tr>`;
        }
    }

    // توابع Create, Update, Delete

    // افزودن و ویرایش (بدون تغییر در منطق قبلی)
    async function onFormSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const mode = form.dataset.mode || 'add';

        const sectionId = $("#section-id").value;
        const url = (mode === 'edit' && sectionId) ? SECTIONS_API + encodeURIComponent(sectionId) + "/" : SECTIONS_API;
        const method = (mode === 'edit' && sectionId) ? 'PUT' : 'POST';

        // ... (اعتبار سنجی و ساخت payload همانند قبل)
        const payload = {
            course_code: $('#course-select').value,
            instructor_id: parseInt($('#instructor-select').value),
            term_id: parseInt($('#term-select').value),
            capacity: parseInt($('#capacity-input').value),
        };

        if (!payload.course_code || isNaN(payload.instructor_id) || isNaN(payload.term_id) || isNaN(payload.capacity) || payload.capacity <= 0) {
            $("#formMsg").textContent = 'لطفا تمام فیلدها را به درستی پر کنید.';
            return;
        }

        try {
            const res = await fetchWithAuth(url, { method: method, body: JSON.stringify(payload) });

            if (!res || !res.ok) {
                const body = await res.json().catch(() => ({}));
                $("#formMsg").textContent = body.message || body.detail || (mode === 'add' ? 'خطا در افزودن بخش.' : 'خطا در ویرایش بخش.');
                throw new Error(`HTTP ${res.status}`);
            }

            closeSectionModal();
            alert((mode === 'add' ? 'بخش درسی با موفقیت افزوده شد.' : 'بخش درسی با موفقیت ویرایش شد.'));
            loadSections(); // رفرش لیست

        } catch (err) {
            console.error(`${mode} section error:`, err);
        }
    }

    // حذف (کمی اصلاح شده برای استفاده از ID)
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
                // اگر دکمه حذف به درستی کار کند نیازی به loadSections نیست اما برای اطمینان:
                // loadSections(); 
            } else {
                const body = await res.json().catch(() => null);
                throw new Error((body && (body.detail || body.message)) || `HTTP ${res.status}`);
            }
        } catch (err) {
            console.error("delete error:", err);
            alert("خطا در حذف بخش");
        }
    }


    // رویدادها و شروع

    document.addEventListener("DOMContentLoaded", () => {
        // ۱. بارگذاری داده‌ها و لیست بخش‌ها
        loadDropdownData().then(loadSections); // ابتدا داده‌های کشویی، سپس لیست بخش‌ها

        // ۲. اتصال رویدادهای مودال و فرم
        $("#addSectionBtn")?.addEventListener('click', () => openSectionModal('add'));
        $("#cancelSectionBtn")?.addEventListener('click', closeSectionModal);
        $("#sectionForm")?.addEventListener('submit', onFormSubmit);

        // ۳. فعال کردن رویدادهای Edit و Delete روی جدول
        const sectionsTableBody = $('#sections-table-body');
        if (sectionsTableBody) {
            sectionsTableBody.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-edit')) {
                    const id = e.target.dataset.id;
                    const section = allSections.find(s => s.id == id);
                    if (section) openSectionModal('edit', section);
                } else if (e.target.classList.contains('btn-delete')) {
                    onDeleteClick(e);
                }
            });
        }
    });

})();