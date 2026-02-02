// ../js/instructor-courses.js
document.addEventListener('DOMContentLoaded', async function() {
    console.log('صفحه دروس استاد بارگذاری شد');
    
    const tbody = document.getElementById('courses-table-body');
    const pageTitle = document.getElementById('page-title');
    const sectionCount = document.getElementById('section-count');
    
    if (!tbody) return;
    
    const token = localStorage.getItem('access');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }
    
    function showLoading() {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">در حال بارگذاری...</span>
                    </div>
                    <div class="mt-2">در حال بارگذاری اطلاعات...</div>
                </td>
            </tr>
        `;
    }
    
    function showMessage(message, type = 'info') {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="alert alert-${type}" role="alert">
                        ${message}
                    </div>
                </td>
            </tr>
        `;
    }
    
    async function loadInstructorCourses() {
        showLoading();
        
        try {
            // 1. دریافت user_id
            const userId = localStorage.getItem('user_id');
            
            // 2. دریافت لیست اساتید
            const instructorsRes = await fetch('http://127.0.0.1:8000/api/instructors/', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!instructorsRes.ok) throw new Error(`خطا در دریافت اساتید: ${instructorsRes.status}`);
            
            const instructors = await instructorsRes.json();
            const currentInstructor = instructors.find(inst => inst.user == userId);
            
            if (!currentInstructor) {
                showMessage('اطلاعات استاد مربوطه یافت نشد', 'warning');
                return;
            }
            
            const instructorName = `${currentInstructor.f_name} ${currentInstructor.l_name}`;
            console.log(`استاد: ${instructorName} (ID: ${currentInstructor.id})`);
            
            if (pageTitle) pageTitle.textContent = `دروس استاد ${instructorName}`;
            
            // 3. دریافت همه سکشن‌های ترم 1
            console.log('دریافت سکشن‌های ترم 1...');
            const sectionsRes = await fetch('http://127.0.0.1:8000/api/student-sections/?term=1', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!sectionsRes.ok) {
                throw new Error(`خطا در دریافت سکشن‌ها: ${sectionsRes.status}`);
            }
            
            const sectionsData = await sectionsRes.json();
            const allSections = Array.isArray(sectionsData) ? sectionsData : (sectionsData.results || []);
            
            console.log(`کل سکشن‌های ترم 1: ${allSections.length}`);
            
            // 4. فیلتر سکشن‌های این استاد
            const instructorSections = allSections.filter(section => 
                section.instructor == currentInstructor.id
            );
            
            console.log(`سکشن‌های استاد: ${instructorSections.length}`);
            
            // 5. دریافت نام دروس
            let courses = [];
            try {
                const coursesRes = await fetch('http://127.0.0.1:8000/api/courses/', {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (coursesRes.ok) {
                    courses = await coursesRes.json();
                }
            } catch (e) {
                console.warn('خطا در دریافت دروس:', e);
            }
            
            // 6. نمایش
            if (instructorSections.length === 0) {
                showMessage(
                    `هیچ سکشنی برای استاد ${instructorName} در ترم جاری ثبت نشده است`,
                    'info'
                );
                if (sectionCount) sectionCount.textContent = '۰ سکشن';
            } else {
                displaySections(instructorSections, courses);
                if (sectionCount) {
                    sectionCount.textContent = `${instructorSections.length} سکشن`;
                }
            }
            
        } catch (error) {
            console.error('خطا:', error);
            showMessage(`خطا در بارگذاری: ${error.message}`, 'danger');
        }
    }
    
    function displaySections(sections, courses) {
        tbody.innerHTML = '';
        
        sections.forEach(section => {
            // پیدا کردن نام درس
            const course = Array.isArray(courses) 
                ? courses.find(c => c.code === section.course)
                : null;
            
            const courseName = course ? course.title : section.course;
            const courseUnits = course ? (course.units || course.credits || '') : '';
            
            // زمان‌بندی
            let scheduleHtml = '<span class="text-muted">تعیین نشده</span>';
            if (section.meetings && section.meetings.length > 0) {
                scheduleHtml = section.meetings.map(meeting => {
                    const dayName = getDayName(meeting.day);
                    const timeName = getTimeName(meeting.time_slot);
                    return `
                        <div class="mb-1">
                            <span class="badge bg-light text-dark">${dayName}</span>
                            <span class="mx-1">${timeName}</span>
                            <small class="text-muted">(${meeting.room_id})</small>
                        </div>
                    `;
                }).join('');
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="align-middle">
                    <span class="badge bg-secondary">${section.id}</span>
                </td>
                <td class="align-middle">
                    <div class="fw-bold">${escapeHtml(courseName)}</div>
                    <div class="small text-muted">
                        کد: ${escapeHtml(section.course)}
                        ${courseUnits ? ` | ${courseUnits} واحد` : ''}
                    </div>
                </td>
                <td class="align-middle">
                    <span class="badge bg-primary">${section.capacity} نفر</span>
                </td>
                <td class="align-middle">
                    ${scheduleHtml}
                </td>
                <td class="align-middle">
                    <button class="btn btn-primary btn-sm" onclick="viewSection(${section.id})">
                        مشاهده
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }
    
    // توابع کمکی
    function getDayName(dayCode) {
        const days = {
            'SA': 'شنبه', 'SU': 'یکشنبه', 'MO': 'دوشنبه',
            'TU': 'سه‌شنبه', 'WE': 'چهارشنبه', 'TH': 'پنجشنبه', 'FR': 'جمعه'
        };
        return days[dayCode] || dayCode;
    }
    
    function getTimeName(timeCode) {
        const times = {
            '8-10': '۸-۱۰', '10-12': '۱۰-۱۲',
            '12-14': '۱۲-۱۴', '14-16': '۱۴-۱۶',
            '16-18': '۱۶-۱۸'
        };
        return times[timeCode] || timeCode;
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    window.viewSection = function(sectionId) {
        alert(`سکشن ${sectionId}`);
    };
    
    // شروع
    loadInstructorCourses();
});