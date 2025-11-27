(function(){
      const path = location.pathname.split('/').pop() || 'dashboard.html';
      const map = { 'dashboard.html':'link-dashboard', 'courses.html':'link-courses' };
      const activeId = map[path] || 'link-courses';
      const el = document.getElementById(activeId);
      if(el) el.classList.add('active');

      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('toggleSidebar');
      if(toggle && sidebar){
        toggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));
        document.addEventListener('click', (e)=> {
          if(window.innerWidth <= 900){
            if(!sidebar.contains(e.target) && !toggle.contains(e.target)) sidebar.classList.remove('open');
          }
        });
      }
    })();