(() => {
  const $ = s => document.querySelector(s);
  const waitFor = (sel, tries = 20, d = 80) => new Promise(r => {
    let i = 0, t = setInterval(() => {
      const e = document.querySelector(sel);
      if (e || ++i >= tries) { clearInterval(t); r(e); }
    }, d);
  });

  const init = async () => {
    const modal = await waitFor('#courseModal');
    const form  = await waitFor('#courseForm');
    if (!form || !modal) return;

    const fld = id => document.getElementById(id);
    const code = fld('courseCode'), title = fld('courseTitle'),
          credits = fld('courseCredits'), teacher = fld('courseTeacher'),
          group = fld('courseGroup');
    const setErr = (id, txt) => { const e = fld(id); if (e) e.textContent = txt; };
    const clearErrs = () => ['errCode','errTitle','errCredits','errGroup'].forEach(id => setErr(id,''));

    const openBtn = fld('addBtn'), cancelBtn = fld('cancelCourseBtn'), msg = fld('formMsg');
    const api = 'http://127.0.0.1:8000/api/courses/';

    const validate = () => {
      clearErrs();
      let ok = true;
      if (!code || !code.value.trim()) { setErr('errCode','کد درس را وارد کنید.'); ok = false; }
      if (!title || !title.value.trim()) { setErr('errTitle','عنوان درس را وارد کنید.'); ok = false; }
      const cr = credits ? Number(credits.value) : NaN;
      if (!Number.isFinite(cr) || cr <= 0) { setErr('errCredits','تعداد واحد معتبر وارد کنید.'); ok = false; }
      if (!group || !group.value.trim()) { setErr('errGroup','گروه درسی را وارد کنید.'); ok = false; }
      return ok;
    };

    const close = () => modal.classList.add('hide');
    const open  = () => { form.reset && form.reset(); clearErrs(); msg && (msg.classList.remove('show'), msg.textContent=''); modal.classList.remove('hide'); setTimeout(()=> code && code.focus(),50); };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate()) return;
      const payload = {
        code: code.value.trim(),
        title: title.value.trim(),
        units: Number(credits.value),
        department: Number(group.value)
      };

      // show pending UI
      if (msg) { msg.textContent = 'در حال ارسال...'; msg.classList.add('show'); }

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (window.AUTH_TOKEN) headers['Authorization'] = 'Bearer ' + window.AUTH_TOKEN;
        const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify(payload) });

        if (!res.ok) {
          const err = await res.json().catch(()=>null);
          throw new Error((err && err.message) || `خطا: ${res.status}`);
        }

        const data = await res.json().catch(()=>null);
        if (msg) msg.textContent = 'ثبت با موفقیت انجام شد.';
        // اگر جدول دارید، اضافه کن (اختیاری)
        const tbody = document.querySelector('#coursesTable tbody');
        if (tbody) {
          const row = document.createElement('tr');
          row.innerHTML = `<td>${escape(payload.code)}</td><td>${escape(payload.title)}</td><td>${escape(payload.credits)}</td><td>${escape(payload.teacher||'—')}</td><td><button class="btn btn-outline">ویرایش</button></td>`;
          tbody.prepend(row);
        }
        setTimeout(close, 700);
      } catch (err) {
        if (msg) msg.textContent = (err.message || 'خطای شبکه');
        console.error(err);
      }
    });

    if (openBtn) openBtn.addEventListener('click', e => (e.preventDefault(), open()));
    if (cancelBtn) cancelBtn.addEventListener('click', e => (e.preventDefault(), close()));
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hide')) close(); });

    // small helper
    function escape(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
