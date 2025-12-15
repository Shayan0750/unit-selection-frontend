(() => {
    // ===================================
    // ثابت‌ها، توابع کمکی و Enums
    // ===================================
    const API_BASE_URL = "http://127.0.0.1:8000/api/";
    const SECTIONS_API = API_BASE_URL + "sections/";
    const COURSES_LIST_API = API_BASE_URL + "courses/list/";
    const INSTRUCTORS_API = API_BASE_URL + "users/instructors/";
    const TERMS_API = API_BASE_URL + "terms/";
    const REFRESH_URL = API_BASE_URL + "token/refresh/";

    // Enums مطابق با Schema شما
    const DayEnum = [
        { code: 'SA', name: 'شنبه' }, { code: 'SU', name: 'یکشنبه' },
        { code: 'MO', name: 'دوشنبه' }, { code: 'TU', name: 'سه‌شنبه' },
        { code: 'WE', name: 'چهارشنبه' }, { code: 'TH', name: 'پنجشنبه' },
        { code: 'FR', name: 'جمعه' }
    ];
    const TimeSlotEnum = [
        { code: '8-10', name: '۰۸:۰۰ – ۱۰:۰۰' }, { code: '10-12', name: '۱۰:۰۰ – ۱۲:۰۰' },
        { code: '12-14', name: '۱۲:۰۰ – ۱۴:۰۰' }, { code: '14-16', name: '۱۴:۰۰ – ۱۶:۰۰' },
        { code: '16-18', name: '۱۶:۰۰ – ۱۸:۰۰' }
    ];

    const $ = s => document.querySelector(s);
    const esc = s => String(s == null ? "" : s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    let dropdownData = {};
    let allSections = [];

    // توابع Auth (فرض می‌شود که fetchWithAuth و refreshAccess همانند قبل کار می‌کنند)
    function tokens() { return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }

    // ... (توابع fetchWithAuth و refreshAccess همانند کد قبلی شما) ...
    // [BEGIN fetchWithAuth and refreshAccess functions - Keep them from the previous correct version]
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
    // [END fetchWithAuth and refreshAccess functions]


    // ===================================
    // توابع مودال، فرم و Meetings
    // ===================================

    // تابع کمکی: ساخت یک ردیف جدید زمان‌بندی
    function createMeetingRow(meeting = {}) {
        const template = $('#meetingRowTemplate');
        if (!template) return;

        const row = template.content.cloneNode(true);
        const container = row.querySelector('.meeting-row');

        // پر کردن فیلدهای روز و ساعت
        const daySelect = container.querySelector('select[name="day"]');
        const timeSelect = container.querySelector('select[name="time_slot"]');

        DayEnum.forEach(d => {
            daySelect.innerHTML += `<option value="${esc(d.code)}">${esc(d.name)}</option>`;
        });
        TimeSlotEnum.forEach(t => {
            timeSelect.innerHTML += `<option value="${esc(t.code)}">${esc(t.name)}</option>`;
        });

        // پر کردن داده‌ها در حالت ویرایش
        if (meeting.room_id) {
            container.querySelector('input[name="room_id"]').value = meeting.room_id;
            daySelect.value = meeting.day;
            timeSelect.value = meeting.time_slot;
            // اگر ID وجود داشت آن را در یک input hidden برای ویرایش ذخیره می‌کنیم
            if (meeting.id) {
                container.innerHTML += `<input type="hidden" name="meeting_id" value="${esc(meeting.id)}">`;
            }
        }

        // اتصال دکمه حذف
        container.querySelector('.remove-meeting-btn').addEventListener('click', (e) => {
            e.currentTarget.closest('.meeting-row')?.remove();
        });

        return row;
    }

    function openSectionModal(mode = 'add', sectionData = {}) {
        const modal = $("#sectionModal");
        if (!modal) return;

        $("#sectionForm").reset();
        $("#formMsg").textContent = '';

        $("#modal-title").textContent = (mode === 'add') ? 'افزودن بخش درسی جدید' : 'ویرایش بخش';
        $("#sectionForm").dataset.mode = mode;

        // پاک کردن ردیف‌های زمان‌بندی قدیمی
        const meetingsContainer = $('#meetings-container');
        meetingsContainer.innerHTML = '';

        if (mode === 'edit' && sectionData.id) {
            $("#section-id").value = sectionData.id;
            $("#course-select").value = sectionData.course; // توجه: از 'course' استفاده می‌کنیم
            $("#instructor-select").value = sectionData.instructor;
            $("#term-select").value = sectionData.term;
            $("#capacity-input").value = sectionData.capacity;

            // پر کردن ردیف‌های زمان‌بندی
            if (sectionData.meetings && sectionData.meetings.length > 0) {
                sectionData.meetings.forEach(m => {
                    meetingsContainer.appendChild(createMeetingRow(m));
                });
            } else {
                // اگر ویرایش است و میتینگ ندارد، یک ردیف خالی اضافه شود
                meetingsContainer.appendChild(createMeetingRow());
            }
        } else {
            // در حالت افزودن، یک ردیف خالی اضافه شود
            meetingsContainer.appendChild(createMeetingRow());
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

            dropdownData.courses = courses;
            dropdownData.instructors = instructors;
            dropdownData.terms = terms;

            // پر کردن لیست‌های کشویی (بدون تغییر)
            const courseSelect = $('#course-select');
            courseSelect.innerHTML = '<option value="">انتخاب درس...</option>';
            courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${esc(c.code)}">${esc(c.title)} (${esc(c.code)})</option>`;
            });
            // ... (سایر select ها مانند قبل)
            const instructorSelect = $('#instructor-select');
            instructorSelect.innerHTML = '<option value="">انتخاب استاد...</option>';
            instructors.forEach(i => {
                instructorSelect.innerHTML += `<option value="${esc(i.id)}">${esc(i.name)}</option>`;
            });

            const termSelect = $('#term-select');
            termSelect.innerHTML = '<option value="">انتخاب ترم...</option>';
            terms.forEach(t => {
                termSelect.innerHTML += `<option value="${esc(t.id)}">${esc(t.name)}</option>`;
            });


        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }


    // ===================================
    // تابع Read (مشاهده لیست و رندر)
    // ===================================

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

    // تابع کمکی: نمایش زمان‌بندی‌ها به صورت یک رشته
    function formatMeetings(meetings) {
        if (!meetings || meetings.length === 0) return '---';

        const dayMap = DayEnum.reduce((acc, d) => ({ ...acc, [d.code]: d.name.slice(0, 2) }), {}); // SA -> شن

        return meetings.map(m => {
            const day = dayMap[m.day] || m.day;
            const time = m.time_slot;
            return `${day} ${time} (${m.room_id})`;
        }).join(' / ');
    }


    async function loadSections() {
        const tbody = $("#sections-table-body");
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">در حال بارگذاری...</td></tr>';

        try {
            const res = await fetchWithAuth(SECTIONS_API);
            if (!res || !res.ok) throw new Error(`HTTP ${res?.status || 500}`);

            const data = await res.json();
            allSections = data.sections || data || [];
            tbody.innerHTML = '';

            if (allSections.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">بخشی یافت نشد.</td></tr>';
                return;
            }

            allSections.forEach(s => {
                const id = s.id;
                const tr = document.createElement("tr"); tr.dataset.id = id;

                // توجه: در Schema، course کد رشته‌ای است (s.course)
                const courseTitle = getDropdownName('courses', s.course);
                const instructorName = getDropdownName('instructors', s.instructor);
                const termName = getDropdownName('terms', s.term);
                const meetingSummary = formatMeetings(s.meetings); // خلاصه زمان‌بندی‌ها

                tr.innerHTML = `
                    <td>${esc(id)}</td>
                    <td>${esc(courseTitle)}</td>
                    <td>${esc(instructorName)}</td>
                    <td>${esc(termName)}</td>
                    <td>${esc(s.capacity)}</td>
                    <td>${esc(meetingSummary)}</td>
                    <td>
                        <button class="btn btn-outline btn-edit" type="button" data-id="${esc(id)}">ویرایش</button>
                        <button class="btn btn-outline btn-delete" type="button" data-id="${esc(id)}">حذف</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error('Load sections error:', err);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: red;">خطا در بارگذاری لیست بخش‌ها.</td></tr>`;
        }
    }

    // ===================================
    // توابع Create, Update, Delete
    // ===================================

    // تابع کمکی: جمع‌آوری داده‌های Meetings از فرم
    function collectMeetingsData() {
        const meetingRows = $('#meetings-container').querySelectorAll('.meeting-row');
        const meetings = [];

        meetingRows.forEach(row => {
            const room_id = row.querySelector('input[name="room_id"]').value;
            const day = row.querySelector('select[name="day"]').value;
            const time_slot = row.querySelector('select[name="time_slot"]').value;
            const idInput = row.querySelector('input[name="meeting_id"]');

            if (room_id && day && time_slot) {
                const meeting = {
                    room_id: room_id,
                    day: day,
                    time_slot: time_slot
                };
                // اگر در حالت ویرایش، ID جلسه (Meeting) وجود داشت، آن را هم می‌فرستیم
                if (idInput && idInput.value) {
                    meeting.id = parseInt(idInput.value);
                }
                meetings.push(meeting);
            }
        });
        return meetings;
    }

    // افزودن و ویرایش
    async function onFormSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const mode = form.dataset.mode || 'add';

        const sectionId = $("#section-id").value;
        const url = (mode === 'edit' && sectionId) ? SECTIONS_API + encodeURIComponent(sectionId) + "/" : SECTIONS_API;
        const method = (mode === 'edit' && sectionId) ? 'PUT' : 'POST';

        // جمع‌آوری داده‌های اصلی
        const payload = {
            course: $('#course-select').value, // مطابق با Schema (course*string)
            instructor: parseInt($('#instructor-select').value) || null, // nullable: true
            term: parseInt($('#term-select').value),
            capacity: parseInt($('#capacity-input').value),
            meetings: collectMeetingsData() // جمع‌آوری داده‌های زمان‌بندی
        };

        // اعتبار سنجی ساده
        if (!payload.course || isNaN(payload.term) || isNaN(payload.capacity) || payload.capacity < 0) {
            $("#formMsg").textContent = 'لطفا فیلدهای درس، ترم و ظرفیت را به درستی پر کنید.';
            $("#formMsg").style.display = 'block';
            return;
        }

        // چک کردن حداقل یک زمان‌بندی
        if (payload.meetings.length === 0) {
            $("#formMsg").textContent = 'باید حداقل یک زمان‌بندی برای برگزاری درس اضافه کنید.';
            $("#formMsg").style.display = 'block';
            return;
        }

        // پاک کردن پیام خطا قبل از ارسال
        $("#formMsg").textContent = '';
        $("#formMsg").style.display = 'none';

        try {
            const res = await fetchWithAuth(url, { method: method, body: JSON.stringify(payload) });

            if (!res || !res.ok) {
                const body = await res.json().catch(() => ({}));
                const msg = body.message || body.detail || (mode === 'add' ? 'خطا در افزودن بخش.' : 'خطا در ویرایش بخش.');
                $("#formMsg").textContent = msg;
                $("#formMsg").style.display = 'block';
                throw new Error(`HTTP ${res?.status || 500}`);
            }

            closeSectionModal();
            alert((mode === 'add' ? 'بخش درسی با موفقیت افزوده شد.' : 'بخش درسی با موفقیت ویرایش شد.'));
            loadSections();

        } catch (err) {
            console.error(`${mode} section error:`, err);
        }
    }

    // حذف (بدون تغییر در منطق)
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
        // ۱. بارگذاری داده‌ها و لیست بخش‌ها
        loadDropdownData().then(loadSections);

        // ۲. اتصال رویدادهای مودال و فرم
        $("#addSectionBtn")?.addEventListener('click', () => openSectionModal('add'));
        $("#cancelSectionBtn")?.addEventListener('click', closeSectionModal);
        $("#sectionForm")?.addEventListener('submit', onFormSubmit);

        // ۳. اتصال دکمه افزودن زمان‌بندی
        $("#addMeetingBtn")?.addEventListener('click', () => {
            $('#meetings-container').appendChild(createMeetingRow());
        });

        // ۴. فعال کردن رویدادهای Edit و Delete روی جدول
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