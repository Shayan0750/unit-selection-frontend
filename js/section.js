(() => {
    // ==========================================
    // 1. CONFIGURATION & HELPERS
    // ==========================================
    const API_BASE = "http://127.0.0.1:8000/api/";
    const URLS = {
        SECTIONS: API_BASE + "sections/",
        COURSES: API_BASE + "courses/",
        REFRESH: API_BASE + "token/refresh/"
    };

    // Constants Locked
    const CONSTANTS = {
        INSTRUCTOR_ID: 1, // Locked
        TERM_ID: 1        // Locked
    };

    const DayEnum = [
        { code: 'SA', name: 'شنبه' }, { code: 'SU', name: 'یکشنبه' },
        { code: 'MO', name: 'دوشنبه' }, { code: 'TU', name: 'سه‌شنبه' },
        { code: 'WE', name: 'چهارشنبه' }, { code: 'TH', name: 'پنجشنبه' },
        { code: 'FR', name: 'جمعه' }
    ];

    const TimeSlotEnum = [
        { code: '8-10', name: '08:00 - 10:00' },
        { code: '10-12', name: '10:00 - 12:00' },
        { code: '12-14', name: '12:00 - 14:00' },
        { code: '14-16', name: '14:00 - 16:00' },
        { code: '16-18', name: '16:00 - 18:00' }
    ];

    // Helper Selectors
    const $ = s => document.querySelector(s);
    const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Global State
    let state = {
        courses: [], // To map Code -> Title
        sections: []
    };

    // ==========================================
    // 2. AUTHENTICATION (Standardized)
    // ==========================================
    function tokens() {
        return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') };
    }

    async function refreshAccess() {
        const t = tokens();
        if (!t.refresh) return null;
        try {
            const res = await fetch(URLS.REFRESH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: t.refresh })
            });
            if (!res.ok) throw new Error('Refresh failed');
            const data = await res.json();
            localStorage.setItem('access', data.access);
            if (data.refresh) localStorage.setItem('refresh', data.refresh);
            return data.access;
        } catch (e) {
            console.warn(e);
            return null;
        }
    }

    async function fetchWithAuth(url, options = {}, retry = true) {
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/json';

        let t = tokens();
        if (t.access) options.headers['Authorization'] = `Bearer ${t.access}`;

        let response = await fetch(url, options);

        if (response.status === 401 && retry) {
            const newAccess = await refreshAccess();
            if (newAccess) {
                options.headers['Authorization'] = `Bearer ${newAccess}`;
                response = await fetch(url, options);
            } else {
                window.location.href = 'login.html';
                return null;
            }
        }
        return response;
    }

    // ==========================================
    // 3. UI LOGIC (Modal & Meetings)
    // ==========================================

    // Generate a single meeting row from Template
    function addMeetingRow(data = null) {
        const template = $('#meetingRowTemplate');
        const clone = template.content.cloneNode(true);
        const container = $('#meetings-container');

        const row = clone.querySelector('.meeting-row');
        const daySelect = row.querySelector('select[name="day"]');
        const timeSelect = row.querySelector('select[name="time_slot"]');
        const roomInput = row.querySelector('input[name="room_id"]');
        const idInput = row.querySelector('input[name="meeting_id"]');

        // Populate Enums
        DayEnum.forEach(d => {
            daySelect.innerHTML += `<option value="${d.code}">${d.name}</option>`;
        });
        TimeSlotEnum.forEach(t => {
            timeSelect.innerHTML += `<option value="${t.code}">${t.name}</option>`;
        });

        // Fill Data if Edit Mode
        if (data) {
            daySelect.value = data.day;
            timeSelect.value = data.time_slot;
            roomInput.value = data.room_id;
            if (data.id) idInput.value = data.id;
        }

        // Remove Button Logic
        row.querySelector('.remove-meeting-btn').addEventListener('click', () => {
            row.remove();
        });

        container.appendChild(row);
    }

    // Open Modal
    function openModal(mode, data = {}) {
        const modal = $('#sectionModal');
        const form = $('#sectionForm');

        // Reset Form
        form.reset();
        $('#meetings-container').innerHTML = '';
        $('#formMsg').style.display = 'none';

        $('#sectionForm').dataset.mode = mode;
        $('#modal-title').textContent = mode === 'add' ? 'افزودن سکشن جدید' : 'ویرایش سکشن';

        // Load Course Options
        const courseSelect = $('#course-select');
        courseSelect.innerHTML = '<option value="">انتخاب درس...</option>';
        state.courses.forEach(c => {
            courseSelect.innerHTML += `<option value="${c.code}">${c.title} (${c.code})</option>`;
        });

        if (mode === 'edit') {
            $('#section-id').value = data.id;
            $('#course-select').value = data.course; // Uses Course Code
            $('#capacity-input').value = data.capacity;

            // Populate meetings
            if (data.meetings && data.meetings.length > 0) {
                data.meetings.forEach(m => addMeetingRow(m));
            } else {
                addMeetingRow(); // Always show at least one
            }
        } else {
            addMeetingRow(); // Default empty row for new section
        }

        modal.classList.remove('hide');
    }

    // ==========================================
    // 4. DATA LOGIC (Load, Submit, Delete)
    // ==========================================

    async function init() {
        try {
            // 1. Fetch Courses for Dropdown
            const cRes = await fetchWithAuth(URLS.COURSES);
            if (cRes.ok) state.courses = await cRes.json();

            // 2. Fetch Sections for Table
            await loadSections();

        } catch (e) {
            console.error("Init failed", e);
        }
    }

    async function loadSections() {
        const tbody = $('#sections-table-body');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">در حال بارگذاری...</td></tr>';

        const res = await fetchWithAuth(URLS.SECTIONS);
        if (!res || !res.ok) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">خطا در دریافت اطلاعات</td></tr>';
            return;
        }

        state.sections = await res.json(); // Usually an array, or { results: [] }
        const list = Array.isArray(state.sections) ? state.sections : (state.sections.results || []);

        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">هیچ سکشنی یافت نشد</td></tr>';
            return;
        }

        list.forEach(item => {
            // Find Course Title based on Code
            const courseObj = state.courses.find(c => c.code === item.course);
            const courseTitle = courseObj ? courseObj.title : item.course;

            // Format Meetings string
            const meetingsStr = item.meetings.map(m =>
                `${m.day} ${m.time_slot} (${m.room_id})`
            ).join(' <br> ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td><b>${esc(courseTitle)}</b><br><small>${esc(item.course)}</small></td>
                <td>${esc(item.capacity)}</td>
                <td style="font-size:0.9em">${meetingsStr}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${item.id}">ویرایش</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${item.id}">حذف</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Submit Handler
    async function onFormSubmit(e) {
        e.preventDefault();
        const msg = $('#formMsg');
        msg.style.display = 'none';

        // 1. Collect Basic Data
        const mode = $('#sectionForm').dataset.mode;
        const id = $('#section-id').value;
        const course = $('#course-select').value;
        const capacity = parseInt($('#capacity-input').value);

        // 2. Collect Meetings Data
        const meetingRows = document.querySelectorAll('.meeting-row');
        let meetings = [];
        meetingRows.forEach(row => {
            const day = row.querySelector('select[name="day"]').value;
            const time = row.querySelector('select[name="time_slot"]').value;
            const room = row.querySelector('input[name="room_id"]').value;
            const mid = row.querySelector('input[name="meeting_id"]').value;

            if (day && time && room) {
                let mObj = { day: day, time_slot: time, room_id: room };
                if (mid && mode === 'edit') mObj.id = parseInt(mid); // Send ID only if editing
                meetings.push(mObj);
            }
        });

        // 3. Validation
        if (!course || isNaN(capacity)) {
            msg.textContent = "لطفا درس و ظرفیت را انتخاب کنید";
            msg.style.display = 'block';
            return;
        }
        if (meetings.length === 0) {
            msg.textContent = "حداقل یک زمان‌بندی وارد کنید";
            msg.style.display = 'block';
            return;
        }

        // 4. Construct Payload (Locked fields are hardcoded here)
        const payload = {
            course: course,           // string code
            capacity: capacity,       // integer
            instructor: CONSTANTS.INSTRUCTOR_ID, // Locked to 1
            term: CONSTANTS.TERM_ID,             // Locked to 1
            meetings: meetings        // array of objects
        };

        // 5. Send Request
        const url = mode === 'edit' ? `${URLS.SECTIONS}${id}/` : URLS.SECTIONS;
        const method = mode === 'edit' ? 'PUT' : 'POST';

        try {
            const res = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                $('#sectionModal').classList.add('hide');
                loadSections(); // Refresh Table
            } else {
                const errData = await res.json().catch(() => ({}));
                msg.textContent = JSON.stringify(errData) || "خطا در برقراری ارتباط با سرور";
                msg.style.display = 'block';
            }
        } catch (err) {
            msg.textContent = "خطای غیرمنتظره رخ داد";
            msg.style.display = 'block';
            console.error(err);
        }
    }

    // Delete Handler
    async function deleteSection(id) {
        if (!confirm("آیا از حذف این سکشن مطمئن هستید؟")) return;

        const res = await fetchWithAuth(`${URLS.SECTIONS}${id}/`, { method: 'DELETE' });
        if (res.ok) {
            loadSections();
        } else {
            alert("خطا در حذف آیتم");
        }
    }

    // ==========================================
    // 5. EVENT BINDINGS
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        init();

        // Open Add Modal
        $('#addSectionBtn').addEventListener('click', () => openModal('add'));

        // Close Modal
        $('#cancelSectionBtn').addEventListener('click', () => $('#sectionModal').classList.add('hide'));

        // Submit Form
        $('#sectionForm').addEventListener('submit', onFormSubmit);

        // Add Meeting Row Button
        $('#addMeetingBtn').addEventListener('click', () => addMeetingRow());

        // Edit/Delete Buttons in Table (Delegation)
        $('#sections-table-body').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;

            if (btn.classList.contains('btn-edit')) {
                // Find data in local state to populate form
                const item = (state.sections.results || state.sections).find(s => s.id == id);
                if (item) openModal('edit', item);
            }
            else if (btn.classList.contains('btn-delete')) {
                deleteSection(id);
            }
        });
    });

})();