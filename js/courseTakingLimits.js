(() => {
  const API = "http://127.0.0.1:8000/api/unit_limits/";
  let recordId = null;

  const $ = s => document.querySelector(s);

  async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("access");
    options.headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: "Bearer " + token })
    };
    return fetch(url, options);
  }

  async function loadLimits() {
    const res = await fetchWithAuth(API);
    if (!res.ok) return;

    const data = await res.json();
    if (data.length) {
      recordId = data[0].id;
      $("#minUnits").value = data[0].min_units;
      $("#maxUnits").value = data[0].max_units;
    }
  }

  async function submitLimits(e) {
    e.preventDefault();

    const payload = {
      min_units: Number($("#minUnits").value),
      max_units: Number($("#maxUnits").value)
    };

    const method = recordId ? "PUT" : "POST";
    const url = recordId ? API + recordId + "/" : API;

    const res = await fetchWithAuth(url, {
      method,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      $("#unitLimitsMsg").textContent = "خطا در ثبت";
      return;
    }

    const data = await res.json();
    recordId = data.id;
    $("#unitLimitsMsg").textContent = "ذخیره شد";
    $("#unitLimitsMsg").style.color = "green";
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadLimits();
    $("#unitLimitsForm").addEventListener("submit", submitLimits);
  });
})();
