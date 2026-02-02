(() => {
  const BASE_URL = "http://127.0.0.1:8000/api/unit_limits/";
  let unitLimitId = null;

  const minInput = document.getElementById("minUnits");
  const maxInput = document.getElementById("maxUnits");
  const errMin = document.getElementById("errMinUnits");
  const errMax = document.getElementById("errMaxUnits");
  const msg = document.getElementById("unitLimitsMsg");
  const form = document.getElementById("unitLimitsForm");

  function resetMessages() {
    errMin.textContent = "";
    errMax.textContent = "";
    msg.textContent = "";
    msg.style.color = "red";
  }

  function showSuccess(text) {
    msg.textContent = text;
    msg.style.color = "green";
  }

  function showError(text) {
    msg.textContent = text;
    msg.style.color = "red";
  }

  async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("access");
    options.headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: "Bearer " + token }),
    };
    return fetch(url, options);
  }

  // ---------- LOAD ----------
  async function loadUnitLimits() {
    try {
      const res = await fetchWithAuth(BASE_URL);

      if (!res.ok) return;

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        unitLimitId = data[0].id;
        minInput.value = data[0].min_units;
        maxInput.value = data[0].max_units;
      }
    } catch {
      showError("خطا در بارگذاری محدودیت‌ها");
    }
  }

  // ---------- SUBMIT ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetMessages();

    const payload = {
      min_units: Number(minInput.value),
      max_units: Number(maxInput.value),
    };

    const isUpdate = unitLimitId !== null;
    const url = isUpdate ? `${BASE_URL}${unitLimitId}/` : BASE_URL;
    const method = isUpdate ? "PUT" : "POST";

    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}

      // ---------- خطا ----------
      if (!res.ok) {
        if (res.status === 401) {
          showError("احراز هویت نامعتبر است. دوباره وارد شوید.");
          return;
        }

        if (data.min_units) errMin.textContent = data.min_units.join("، ");
        if (data.max_units) errMax.textContent = data.max_units.join("، ");

        if (!data.min_units && !data.max_units) {
          showError("ثبت اطلاعات با خطا مواجه شد.");
        }
        return;
      }

      // ---------- موفقیت ----------
      unitLimitId = data.id;
      showSuccess("محدودیت واحدها با موفقیت ذخیره شد.");
    } catch {
      showError("خطای ارتباط با سرور");
    }
  });

  loadUnitLimits();
})();
