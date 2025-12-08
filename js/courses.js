(() => {
  const $ = s => document.querySelector(s);

  // wait for selector (poll) — returns element or null
  const waitFor = (sel, tries = 20, delay = 80) => new Promise(resolve => {
    let i = 0;
    const t = setInterval(() => {
      const el = document.querySelector(sel);
      if (el || ++i >= tries) { clearInterval(t); resolve(el); }
    }, delay);
  });

  const init = async () => {
    const modal = await waitFor('#courseModal');
    const form  = await waitFor('#courseForm');

    // if no modal/form found, nothing to init
    if (!form || !modal) return console.warn('courses.js: form/modal not found');

    // elements (may be null-safe)
    const fld = id => document.getElementById(id);
    const openBtn = fld('addBtn');
    const cancelBtn = fld('cancelCourseBtn');
    const msg = fld('formMsg');

    const code = fld('courseCode'), title = fld('courseTitle'),
          credits = fld('courseCredits'), teacher = fld('courseTeacher'),
          group = fld('courseGroup');

    const e = id => { const el = fld(id); return el ? (val => el[val]) : (()=>undefined); };

    // helpers
    const setText = (id, txt) => { const el = fld(id); if (el) el.textContent = txt; };
    const clearErrors = () => { ['errCode','errTitle','errCredits','errGroup'].forEach(id => setText(id,'')); };

    const validate = () => {
      clearErrors(); let ok = true;
      if (!code || !code.value.trim()) { setText('errCode','کد درس را وارد کنید.'); ok = false; }
      if (!title || !title.value.trim()) { setText('errTitle','عنوان درس را وارد کنید.'); ok = false; }
      const cr = credits ? Number(credits.value) : NaN;
      if (!Number.isFinite(cr) || cr <= 0) { setText('errCredits','تعداد واحد معتبر وارد کنید.'); ok = false; }
      if (!group || !group.value.trim()) { setText('errGroup','گروه درسی را وارد کنید.'); ok = false; }
      return ok;
    };

    const openModal = () => { form.reset(); clearErrors(); if(msg){ msg.classList.remove('show'); msg.textContent=''; } modal.classList.remove('hide'); setTimeout(()=> code && code.focus(),50); };
    const closeModal = () => { modal.classList.add('hide'); };

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      if (!validate()) return;
      if (msg) { msg.textContent = 'فرم معتبر است — بک‌اند آماده نیست؛ ارسال انجام نمی‌شود.'; msg.classList.add('show'); }
      console.log('Course (UI-only):', {
        code: code && code.value.trim(),
        title: title && title.value.trim(),
        credits: credits && Number(credits.value),
        teacher: teacher && teacher.value.trim(),
        group: group && group.value.trim()
      });
      setTimeout(closeModal, 800);
    });

    if (openBtn) openBtn.addEventListener('click', e => { e.preventDefault(); openModal(); });
    if (cancelBtn) cancelBtn.addEventListener('click', e => { e.preventDefault(); closeModal(); });
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hide')) closeModal(); });

    console.info('courses.js initialized');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
