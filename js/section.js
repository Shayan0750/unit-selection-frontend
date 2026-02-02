(() => {
    // ==========================================
    // 1. CONFIGURATION & HELPERS
    // ==========================================
    const API_BASE = "http://127.0.0.1:8000/api/";
    const URLS = {
        SECTIONS: API_BASE + "sections/",
        COURSES: API_BASE + "courses/",
        INSTRUCTORS: API_BASE + "instructors/",
        TERMS: API_BASE + "terms/",
        REFRESH: API_BASE + "token/refresh/"
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

    const $ = s => document.querySelector(s);
    const esc = s => String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let state = {
        courses: [],
        instructors: [],
        sections: [],
        terms: []
    };

    // ==========================================
    // 2. AUTH
    // ==========================================
    function tokens() {
        return {
            access: localStorage.getItem('access'),
            refresh: localStorage.getItem('refresh')
        };
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
            if (!res.ok) throw new Error();
            const data = await res.json();
            localStorage.setItem('access', data.access);
            if (data.refresh) localStorage.setItem('refresh', data.refresh);
            return data.access;
        } catch {
            return null;
        }
    }

    async function fetchWithAuth(url, options = {}, retry = true) {
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/json';

        const t = tokens();
        if (t.access) {
            options.headers['Authorization'] = `Bearer ${t.access}`;
        }

        let res = await fetch(url, options);

        if (res.status === 401 && retry) {
            const newAccess = await refreshAccess();
            if (!newAccess) {
                window.location.href = "login.html";
                return null;
            }
            options.headers['Authorization'] = `Bearer ${newAccess}`;
            res = await fetch(url, options);
        }

        return res;
    }

    // ==========================================
    // 3. UI HELPERS
    // ==========================================
    function addMeetingRow(data = null) {
        const tpl = $('#meetingRowTemplate').content.cloneNode(true);
        const row = tpl.querySelector('.meeting-row');

        const daySel = row.querySelector('select[name="day"]');
        const timeSel = row.querySelector('select[name="time_slot"]');
        const roomInp = row.querySelector('input[name="room_id"]');
        const idInp = row.querySelector('input[name="meeting_id"]');

        DayEnum.forEach(d => daySel.innerHTML += `<option value="${d.code}">${d.name}</option>`);
        TimeSlotEnum.forEach(t => timeSel.innerHTML += `<option value="${t.code}">${t.name}</option>`);

        if (data) {
            daySel.value = data.day;
            timeSel.value = data.time_slot;
            roomInp.value = data.room_id;
            if (data.id) idInp.value = data.id;
        }

        row.querySelector('.remove-meeting-btn').onclick = () => row.remove();
        $('#meetings-container').appendChild(row);
    }

    function populateInstructorSelect(selected = null) {
        const sel = $('#instructor-select');
        sel.innerHTML = '<option value="">انتخاب استاد...</option>';
        state.instructors.forEach(i => {
            const o = document.createElement('option');
            o.value = i.id;
            o.textContent = `${i.f_name} ${i.l_name}`;
            if (selected && i.id == selected) o.selected = true;
            sel.appendChild(o);
        });
    }

    function populateTermSelect(selected = null) {
        const sel = $('#term-select');
        sel.innerHTML = '<option value="">انتخاب نیمسال...</option>';

        state.terms.forEach(t => {
            const o = document.createElement('option');
            o.value = t.id;
            o.textContent = `${t.year} - ${t.semester === 'F' ? 'نیمسال اول' : 'نیمسال دوم'}`;
            if (selected && t.id == selected) o.selected = true;
            sel.appendChild(o);
        });
    }

    function openModal(mode, data = {}) {
        $('#sectionForm').reset();
        $('#meetings-container').innerHTML = '';
        $('#formMsg').style.display = 'none';

        $('#sectionForm').dataset.mode = mode;
        $('#modal-title').textContent = mode === 'add' ? 'افزودن سکشن جدید' : 'ویرایش سکشن';

        const courseSel = $('#course-select');
        courseSel.innerHTML = '<option value="">انتخاب درس...</option>';
        state.courses.forEach(c =>
            courseSel.innerHTML += `<option value="${c.code}">${c.title} (${c.code})</option>`
        );

        populateInstructorSelect(data.instructor);
        populateTermSelect(data.term);

        if (mode === 'edit') {
            $('#section-id').value = data.id;
            courseSel.value = data.course;
            $('#capacity-input').value = data.capacity;
            data.meetings.forEach(m => addMeetingRow(m));
        } else {
            addMeetingRow();
        }

        $('#sectionModal').classList.remove('hide');
    }

    // ==========================================
    // 4. DATA
    // ==========================================
    async function init() {
        const c = await fetchWithAuth(URLS.COURSES);
        if (c?.ok) state.courses = await c.json();

        const i = await fetchWithAuth(URLS.INSTRUCTORS);
        if (i?.ok) state.instructors = await i.json();

        const t = await fetchWithAuth(URLS.TERMS);
        if (t?.ok) state.terms = await t.json();

        loadSections();
    }

    async function loadSections() {
        const tbody = $('#sections-table-body');
        tbody.innerHTML = '<tr><td colspan="6">در حال بارگذاری...</td></tr>';

        const res = await fetchWithAuth(URLS.SECTIONS);
        if (!res?.ok) return;

        state.sections = await res.json();
        const list = state.sections.results || state.sections;

        tbody.innerHTML = '';
        list.forEach(s => {
            const c = state.courses.find(x => x.code === s.course);
            const i = state.instructors.find(x => x.id === s.instructor);
            const m = s.meetings.map(x => `${x.day} ${x.time_slot} (${x.room_id})`).join('<br>');

            tbody.innerHTML += `
                <tr>
                    <td>${s.id}</td>
                    <td>${esc(c?.title || s.course)}</td>
                    <td>${esc(i ? i.f_name + ' ' + i.l_name : s.instructor)}</td>
                    <td>${s.capacity}</td>
                    <td>${m}</td>
                    <td>
                        <button class="btn-edit" data-id="${s.id}">ویرایش</button>
                        <button class="btn-delete" data-id="${s.id}">حذف</button>
                    </td>
                </tr>`;
        });
    }

    async function onFormSubmit(e) {
        e.preventDefault();
        const msg = $('#formMsg');

        const mode = e.target.dataset.mode;
        const id = $('#section-id').value;
        const payload = {
            course: $('#course-select').value,
            instructor: parseInt($('#instructor-select').value),
            term: parseInt($('#term-select').value),
            capacity: parseInt($('#capacity-input').value),
            meetings: []
        };

        if (!payload.course || !payload.instructor || !payload.term) {
            msg.textContent = "همه فیلدها الزامی هستند";
            msg.style.display = 'block';
            return;
        }

        document.querySelectorAll('.meeting-row').forEach(r => {
            payload.meetings.push({
                day: r.querySelector('[name=day]').value,
                time_slot: r.querySelector('[name=time_slot]').value,
                room_id: r.querySelector('[name=room_id]').value
            });
        });

        const res = await fetchWithAuth(
            mode === 'edit' ? URLS.SECTIONS + id + '/' : URLS.SECTIONS,
            { method: mode === 'edit' ? 'PUT' : 'POST', body: JSON.stringify(payload) }
        );

        if (res?.ok) {
            $('#sectionModal').classList.add('hide');
            loadSections();
        }
    }

    async function deleteSection(id) {
        if (!confirm('حذف شود؟')) return;
        await fetchWithAuth(URLS.SECTIONS + id + '/', { method: 'DELETE' });
        loadSections();
    }

    // ==========================================
    // 5. EVENTS
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        init();
        $('#addSectionBtn').onclick = () => openModal('add');
        $('#cancelSectionBtn').onclick = () => $('#sectionModal').classList.add('hide');
        $('#addMeetingBtn').onclick = () => addMeetingRow();
        $('#sectionForm').onsubmit = onFormSubmit;

        $('#sections-table-body').onclick = e => {
            const btn = e.target;
            if (btn.classList.contains('btn-edit')) {
                const s = (state.sections.results || state.sections)
                    .find(x => x.id == btn.dataset.id);
                if (s) openModal('edit', s);
            }
            if (btn.classList.contains('btn-delete')) {
                deleteSection(btn.dataset.id);
            }
        };
    });
})();
