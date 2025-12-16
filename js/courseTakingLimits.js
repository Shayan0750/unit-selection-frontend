(() => {
  const API_URL = "http://127.0.0.1:8000/api/unit_limits/1/"; // چون همیشه id=1 است
  const REFRESH_URL = "http://127.0.0.1:8000/api/token/refresh/";

  const minInput = document.getElementById("minUnits");
  const maxInput = document.getElementById("maxUnits");
  const errMin = document.getElementById("errMinUnits");
  const errMax = document.getElementById("errMaxUnits");
  const formMsg = document.getElementById("unitLimitsMsg");
  const form = document.getElementById("unitLimitsForm");

  // --- توابع کمکی ---
  function getToken() {
    return localStorage.getItem("access");
  }

  function setToken(token) {
    localStorage.setItem("access", token);
  }

  function showMsg(msg, isError = true) {
    formMsg.textContent = msg;
    formMsg.style.color = isError ? "red" : "green";
    formMsg.classList.add("show");
  }

  function clearMsg() {
    formMsg.textContent = "";
    formMsg.classList.remove("show");
  }

  function clearFieldErrors() {
    errMin.textContent = "";
    errMax.textContent = "";
  }

// fetch با اتچ کردن توکن و رفرش اتوماتیک
async function fetchWithAuth(url, options = {}) {
    const accessToken = localStorage.getItem("access");
    if (!options.headers) options.headers = {};
    options.headers["Content-Type"] = "application/json";
    if (accessToken) options.headers["Authorization"] = "Bearer " + accessToken;

    let response = await fetch(url, options);

    if (response.status === 401) { // Unauthorized
        // تلاش برای رفرش توکن
        const refreshToken = localStorage.getItem("refresh");
        if (refreshToken) {
            const refreshRes = await fetch("/api/token/refresh/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh: refreshToken })
            });
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                localStorage.setItem("access", data.access);
                options.headers["Authorization"] = "Bearer " + data.access;
                response = await fetch(url, options); // دوباره تلاش
            }
        }
    }
    return response;
}



  // --- بارگذاری مقادیر اولیه ---
  async function loadUnitLimits() {
    try {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error("Failed to fetch unit limits");
      const data = await res.json();
      minInput.value = data.min_units;
      maxInput.value = data.max_units;
    } catch (err) {
      showMsg("خطا در بارگذاری محدودیت‌ها: " + err.message);
    }
  }

  // --- ثبت فرم ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    clearFieldErrors();

    const payload = {
      min_units: Number(minInput.value),
      max_units: Number(maxInput.value),
    };

    try {
      const res = await fetchWithAuth(API_URL, {
        method: "PUT", // چون id=1 همیشه
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // نمایش پیام خطای فیلدها
        if (data.min_units) errMin.textContent = data.min_units.join(", ");
        if (data.max_units) errMax.textContent = data.max_units.join(", ");
        // نمایش پیام کلی فرم
        const msgParts = [];

        if (msgParts.length) showMsg(msgParts.join(" | "));
      } else {
        showMsg("محدودیت‌ها با موفقیت ثبت شدند.", false);
      }
    } catch (err) {
      showMsg("خطا در ثبت محدودیت‌ها: " + err.message);
    }
  });

  // --- پاک کردن فرم ---
  form.addEventListener("reset", () => {
    clearMsg();
    clearFieldErrors();
  });

  // بارگذاری اولیه
  loadUnitLimits();
})();
