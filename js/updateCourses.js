document.addEventListener('DOMContentLoaded', () => {

    const coursesTable = document.getElementById('coursesTable');
    const courseModal = document.getElementById('courseModal');
    const courseForm = document.getElementById('courseForm');
    const addBtn = document.getElementById('addBtn');
    const cancelCourseBtn = document.getElementById('cancelCourseBtn');
    const formMsg = document.getElementById('formMsg');
  
    const courseCode = document.getElementById('courseCode');
    const courseTitle = document.getElementById('courseTitle');
    const courseGroup = document.getElementById('courseGroup');
    const courseCredits = document.getElementById('courseCredits');
    const modalTitle = courseModal.querySelector('h3');
  
    let editingCourseId = null;
  
    function openModal() {
      courseModal.classList.remove('hide');
    }
  
    function closeModal() {
      courseModal.classList.add('hide');
      courseForm.reset();
      formMsg.textContent = '';
      editingCourseId = null;
      modalTitle.textContent = 'درج درس جدید';
    }
  
    cancelCourseBtn.addEventListener('click', closeModal);
  
    addBtn.addEventListener('click', () => {
      editingCourseId = null;
      modalTitle.textContent = 'درج درس جدید';
      openModal();
    });
  
    async function loadCourses() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/courses/');
        const data = await res.json();
  
        // پاک کردن tbody قبل از رندر
        coursesTable.innerHTML = '';
  
        data.forEach(course => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${course.code}</td>
            <td>${course.title}</td>
            <td>${course.units}</td>
            <td>${course.department}</td>
            <td>
              <button class="btn btn-outline editBtn" data-id="${course.id}">ویرایش</button>
            </td>
          `;
          coursesTable.appendChild(tr);
        });
  
      } catch (err) {
        console.error(err);
        coursesTable.innerHTML = '<tr><td colspan="5">خطا در بارگذاری دروس</td></tr>';
      }
    }
  
    loadCourses();
  
    // event delegation برای ویرایش
    coursesTable.addEventListener('click', async (e) => {
      if (e.target.classList.contains('editBtn')) {
        editingCourseId = e.target.dataset.id;
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/courses/${editingCourseId}/`);
          const course = await res.json();
  
          courseCode.value = course.code;
          courseTitle.value = course.title;
          courseGroup.value = course.department;
          courseCredits.value = course.units;
  
          modalTitle.textContent = 'ویرایش درس';
          openModal();
        } catch (err) {
          console.error(err);
          alert('خطا در دریافت اطلاعات درس');
        }
      }
    });
  
    courseForm.addEventListener('submit', async e => {
      e.preventDefault();
  
      const payload = {
        code: courseCode.value,
        title: courseTitle.value,
        department: courseGroup.value,
        units: parseInt(courseCredits.value)
      };
  
      try {
        let url = 'http://127.0.0.1:8000/api/courses/';
        let method = 'POST';
  
        if (editingCourseId) {
          url += `${editingCourseId}/`;
          method = 'PUT';
        }
  
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
  
        if (!res.ok) throw new Error('خطا در ذخیره سازی');
  
        closeModal();
        // فقط یک بار جدول را رفرش کن
        await loadCourses();
  
      } catch (err) {
        console.error(err);
        formMsg.textContent = 'خطا در ثبت درس!';
      }
    });
  
  });
  
  