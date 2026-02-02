// ../js/instructor-courses.js
document.addEventListener('DOMContentLoaded', async function () {
  const API_BASE = 'http://127.0.0.1:8000/api/';
  const URLS = {
    INSTRUCTORS: API_BASE + 'instructors/',
    SECTIONS: API_BASE + 'student-sections/',
    COURSES: API_BASE + 'courses/',
    TERMS: API_BASE + 'terms/'
  };

  const tbody = document.getElementById('courses-table-body');
  const pageTitle = document.getElementById('page-title');
  const sectionCount = document.getElementById('section-count');
  const termSelect = document.getElementById('term-select');

  const token = localStorage.getItem('access');
  const userId = localStorage.getItem('user_id');
  if (!token || !userId) { window.location.href = '../login.html'; return; }

  let state = { instructor: null, courses: [], terms: [] };

  // =========================
  // UI Helpers
  // =========================
  function showLoading(msg = 'در حال بارگذاری...') {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">${msg}</td></tr>`;
  }

  function showMessage(msg, type = 'info') {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">
      <div class="alert alert-${type}">${msg}</div>
    </td></tr>`;
  }

  // =========================
  // Load Initial Data
  // =========================
  async function init() {
    await loadInstructor();
    await loadCourses();
    await loadTerms();
  }

  async function loadInstructor() {
    const res = await fetch(URLS.INSTRUCTORS, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) { showMessage('خطا در دریافت اطلاعات استاد', 'danger'); return; }
    const instructors = await res.json();
    state.instructor = instructors.find(i => i.user == userId);
    if (!state.instructor) { showMessage('استاد مربوطه یافت نشد', 'warning'); return; }
    pageTitle.textContent = `دروس استاد ${state.instructor.f_name} ${state.instructor.l_name}`;
  }

  async function loadCourses() {
    const res = await fetch(URLS.COURSES, { headers: { Authorization: 'Bearer ' + token } });
    if (res.ok) state.courses = await res.json();
  }

  async function loadTerms() {
    const res = await fetch(URLS.TERMS, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) {
      termSelect.innerHTML = '<option value="">خطا در دریافت نیمسال</option>';
      return;
    }
    state.terms = await res.json();
    termSelect.innerHTML = '<option value="">انتخاب نیمسال...</option>';
    state.terms.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.year} - ${t.semester === 'F' ? 'نیمسال اول' : 'نیمسال دوم'}`;
      termSelect.appendChild(opt);
    });
  }

  // =========================
  // Load Sections by Term
  // =========================
  async function loadSectionsByTerm(termId) {
    showLoading();
    const res = await fetch(`${URLS.SECTIONS}?term=${termId}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) { showMessage('خطا در دریافت سکشن‌ها', 'danger'); return; }

    const data = await res.json();
    const sections = Array.isArray(data) ? data : (data.results || []);
    const instructorSections = sections.filter(s => s.instructor == state.instructor.id);

    if (instructorSections.length === 0) {
      showMessage('در این نیمسال سکشنی برای شما ثبت نشده است');
      sectionCount.textContent = '۰ سکشن';
      return;
    }

    displaySections(instructorSections);
    sectionCount.textContent = `${instructorSections.length} سکشن`;
  }

  // =========================
  // Render Table
  // =========================
  function displaySections(sections) {
    tbody.innerHTML = ''; // پاک کردن محتوای قبلی
    sections.forEach(section => {
      const course = state.courses.find(c => c.code === section.course);
      const courseName = course ? course.title : section.course;

      const schedule = section.meetings?.length
        ? section.meetings.map(m => `${dayName(m.day)} ${timeName(m.time_slot)} (${m.room_id})`).join('<br>')
        : '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${section.id}</td>
        <td>
          <strong>${courseName}</strong><br>
          <small class="text-muted">${section.course}</small>
        </td>
        <td>${section.group_number ?? '-'}</td>
        <td>${section.capacity}</td>
        <td>${schedule}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewSection(${section.id})">مشاهده</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // =========================
  // Helpers
  // =========================
  function dayName(d) {
    return { SA: 'شنبه', SU: 'یکشنبه', MO: 'دوشنبه', TU: 'سه‌شنبه', WE: 'چهارشنبه', TH: 'پنجشنبه', FR: 'جمعه' }[d] || d;
  }

  function timeName(t) {
    return { '8-10': '۸-۱۰', '10-12': '۱۰-۱۲', '12-14': '۱۲-۱۴', '14-16': '۱۴-۱۶', '16-18': '۱۶-۱۸' }[t] || t;
  }

  window.viewSection = id => alert(`سکشن ${id}`);

  // =========================
  // Events
  // =========================
  termSelect.addEventListener('change', e => {
    const termId = e.target.value;
    if (termId) loadSectionsByTerm(termId);
    else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">لطفاً یک نیمسال انتخاب کنید</td></tr>`;
      sectionCount.textContent = '۰ سکشن';
    }
  });

  // Start
  init();
});
