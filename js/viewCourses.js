// viewCourses.js
console.log("viewCourses.js loaded");


document.addEventListener("DOMContentLoaded", () => {
    loadCourses();
});

async function loadCourses() {
    const API = "http://127.0.0.1:8000/api/courses/";
    const tbody = document.getElementById("coursesTable");

    tbody.innerHTML = `<tr><td colspan="5">در حال بارگذاری...</td></tr>`;

    try {
        const res = await fetch(API, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="5">خطا در دریافت اطلاعات (${res.status})</td></tr>`;
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">هیچ درسی ثبت نشده است.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";

        data.forEach(course => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${course.code}</td>
                <td>${course.title}</td>
                <td>${course.units}</td>
                <td>${course.department}</td>
                <td><button class="btn btn-outline">ویرایش</button></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5">خطای شبکه یا اتصال</td></tr>`;
    }
}