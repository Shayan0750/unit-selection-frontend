(() => {
  const API_BASE = "http://127.0.0.1:8000/api/";
  const ENROLLMENTS_API = API_BASE + "instructor/enrollments/";
  const REFRESH_URL = API_BASE + "token/refresh/";

  // --- توابع Auth (مشابه قبل) ---
  function tokens() { return { access: localStorage.getItem('access'), refresh: localStorage.getItem('refresh') }; }

  async function fetchWithAuth(url, opts = {}, retry = true) {
    opts.headers = opts.headers || {};
    opts.headers['Content-Type'] = 'application/json';
    const t = tokens();
    if (t.access) opts.headers['Authorization'] = `Bearer ${t.access}`;

    let res = await fetch(url, opts);
    if (res.status === 401 && retry) {
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

  // --- منطق اصلی ---

  async function init() {
    await loadEnrollments();
  }

  async function loadEnrollments() {
    const container = document.querySelector('#courses-container');
    try {
      const res = await fetchWithAuth(ENROLLMENTS_API);
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات");

      const enrollments = await res.json();
      renderCourses(enrollments, container);
    } catch (e) {
      console.error(e);
      container.innerHTML = `<div class="empty-state" style="color:red">خطا در برقراری ارتباط با سرور.</div>`;
    }
  }

  function renderCourses(enrollments, container) {
    if (!enrollments || enrollments.length === 0) {
      container.innerHTML = '<div class="empty-state">هیچ دانشجویی در دروس شما ثبت‌نام نکرده است.</div>';
      return;
    }

    // 1. گروه‌بندی رکوردها بر اساس کد درس (و شماره گروه)
    // ساختار خروجی: { "111-1": [record1, record2], "7777-1": [record3] }
    const grouped = {};
    enrollments.forEach(item => {
      // کلید منحصر به فرد برای گروه‌بندی: کد درس + شماره گروه
      const key = `${item.course_code}_${item.group_number}`;
      if (!grouped[key]) {
        grouped[key] = {
          code: item.course_code,
          group: item.group_number,
          term: item.term,
          students: []
        };
      }
      grouped[key].students.push(item);
    });

    // 2. ساخت HTML برای هر گروه
    container.innerHTML = '';

    Object.values(grouped).forEach(courseData => {
      const section = document.createElement('div');
      section.className = 'course-card';

      // مرتب‌سازی دانشجویان بر اساس نام خانوادگی
      courseData.students.sort((a, b) => a.student.l_name.localeCompare(b.student.l_name, 'fa'));

      let rowsHTML = '';
      courseData.students.forEach((item, index) => {
        const st = item.student;
        // تاریخ ثبت‌نام را فرمت می‌کنیم (اختیاری)
        const date = new Date(item.created_at).toLocaleDateString('fa-IR');

        rowsHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${st.f_name} ${st.l_name}</td>
                        <td>${st.email || '-'}</td>
                        <td>${st.id}</td>
                        <td>${date}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger btn-remove" 
                                data-enroll-id="${item.id}"
                                data-fullname="${st.f_name} ${st.l_name}">
                                حذف از درس
                            </button>
                        </td>
                    </tr>
                `;
      });

      section.innerHTML = `
                <div class="course-header">
                    <span class="course-title">
                        📚 کد درس: ${courseData.code} <small>(گروه ${courseData.group})</small>
                        <span style="font-size:0.8em; color:#777; margin-right:10px">
                             ترم: ${courseData.term.semester} ${courseData.term.year}
                        </span>
                    </span>
                    <span class="student-count">${courseData.students.length} دانشجو</span>
                </div>
                <div class="table-responsive">
                    <table class="students-table">
                        <thead>
                            <tr>
                                <th style="width:50px">#</th>
                                <th>نام و نام‌خانوادگی</th>
                                <th>ایمیل</th>
                                <th>شماره دانشجویی</th>
                                <th>تاریخ ثبت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHTML}
                        </tbody>
                    </table>
                </div>
            `;
      container.appendChild(section);
    });
  }

  // --- مدیریت حذف دانشجو ---
  // استفاده از Event Delegation برای دکمه‌های حذف
  document.querySelector('#courses-container').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-remove')) {
      const enrollId = e.target.dataset.enrollId;
      const fullname = e.target.dataset.fullname;

      if (confirm(`آیا مطمئن هستید که می‌خواهید "${fullname}" را از این درس حذف کنید؟\nاین عملیات قابل بازگشت نیست.`)) {
        try {
          const deleteUrl = `${ENROLLMENTS_API}${enrollId}/`;
          const res = await fetchWithAuth(deleteUrl, { method: 'DELETE' });

          if (res.ok) {
            // بارگذاری مجدد لیست پس از حذف موفق
            loadEnrollments();
          } else {
            alert("خطا در حذف دانشجو. ممکن است دسترسی لازم را نداشته باشید.");
          }
        } catch (err) {
          console.error(err);
          alert("خطا در ارتباط با سرور");
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();