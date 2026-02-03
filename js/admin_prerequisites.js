(() => {
    const API_BASE = "http://127.0.0.1:8000/api/";
    const PREREQ_API = API_BASE + "prerequisites/";
    const COURSES_API = API_BASE + "courses/";
    const REFRESH_URL = API_BASE + "token/refresh/";

    const $ = s => document.querySelector(s);
    let allCourses = [];

    // --- Auth Helpers ---
    function tokens() { return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }

    async function fetchWithAuth(url, opts = {}, retry = true) {
        opts.headers = opts.headers || {};
        opts.headers['Content-Type'] = 'application/json';
        const t = tokens();
        if (t.access) opts.headers['Authorization'] = `Bearer ${t.access}`;

        let res = await fetch(url, opts);
        if (res.status === 401 && retry) {
            // منطق Refresh Token (خلاصه شده)
            const refreshRes = await fetch(REFRESH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: t.refresh })
            });
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                localStorage.setItem('access', data.access);
                return fetchWithAuth(url, opts, false);
            }
        }
        return res;
    }

    // --- Load Data ---
    async function init() {
        try {
            const cRes = await fetchWithAuth(COURSES_API);
            if (cRes.ok) {
                allCourses = await cRes.json();
                populateDropdowns();
                loadPrerequisites();
            }
        } catch (e) { console.error("Initialization failed", e); }
    }

    function populateDropdowns() {
        const selects = [$('#course-select'), $('#prereq-select')];
        selects.forEach(s => {
            s.innerHTML = '<option value="">انتخاب کنید...</option>';
            allCourses.forEach(c => {
                s.innerHTML += `<option value="${c.code}">${c.title} (${c.code})</option>`;
            });
        });
    }

    async function loadPrerequisites() {
        const tbody = $('#prereq-table-body');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">در حال بارگذاری...</td></tr>';

        try {
            const res = await fetchWithAuth(PREREQ_API);
            if (!res.ok) throw new Error();

            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.results || []);

            tbody.innerHTML = '';
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">هیچ پیش‌نیازی تعریف نشده است.</td></tr>';
                return;
            }

            list.forEach(item => {
                const courseTitle = allCourses.find(c => c.code === item.course)?.title || item.course;
                const prereqTitle = allCourses.find(c => c.code === item.prereq_course)?.title || item.prereq_course;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><b>${courseTitle}</b><br><small>${item.course}</small></td>
                    <td><b>${prereqTitle}</b><br><small>${item.prereq_course}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${item.id}">حذف</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:red;">خطا در دریافت لیست</td></tr>';
        }
    }

    // --- Form Actions ---
    $('#prereqForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = $('#formMsg');
        msg.style.display = 'none';

        const payload = {
            course: $('#course-select').value,
            prereq_course: $('#prereq-select').value
        };

        if (payload.course === payload.prereq_course) {
            msg.textContent = "یک درس نمی‌تواند پیش‌نیاز خودش باشد!";
            msg.style.display = 'block';
            return;
        }

        const res = await fetchWithAuth(PREREQ_API, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            $('#prereqModal').classList.add('hide');
            loadPrerequisites();
        } else {
            const err = await res.json();
            msg.textContent = err.detail || "خطا در ثبت (احتمالاً تکراری است)";
            msg.style.display = 'block';
        }
    });

    // --- Events ---
    $('#addPrereqBtn').addEventListener('click', () => {
        $('#prereqForm').reset();
        $('#formMsg').style.display = 'none';
        $('#prereqModal').classList.remove('hide');
    });

    $('#cancelPrereqBtn').addEventListener('click', () => $('#prereqModal').classList.add('hide'));

    $('#prereq-table-body').addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            if (!confirm(`آیا از حذف پیش‌نیاز مطمئن هستید؟`)) return;

            const res = await fetchWithAuth(`${PREREQ_API}${id}/`, { method: 'DELETE' });
            if (res.ok) {
                loadPrerequisites();
            } else {
                alert("حذف ناموفق بود.");
            }
        }
    });

    document.addEventListener('DOMContentLoaded', init);
})();