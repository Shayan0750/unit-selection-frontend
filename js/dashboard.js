// ../js/dashboard.js (نسخه اصلاح شده)
document.addEventListener("DOMContentLoaded", () => {
  const welcomeText = document.getElementById("welcomeText");
  
  // اگر المنت وجود نداشت، خطا نده
  if (!welcomeText) {
    console.warn('Element with id "welcomeText" not found');
    return;
  }

  try {
      const token = localStorage.getItem("access");
      if (!token) {
          welcomeText.textContent = "سلام! خوش آمدید.";
          return;
      }

      // decode JWT
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);

      console.log("JWT PAYLOAD:", payload);

      // اولویت: first_name → last_name → username
      const firstName = payload.first_name && payload.first_name.trim() !== "" ? payload.first_name.trim() : null;
      const lastName = payload.last_name && payload.last_name.trim() !== "" ? payload.last_name.trim() : null;
      
      let name = payload.username || "کاربر";
      
      if (firstName && lastName) {
          name = `${firstName} ${lastName}`;
      } else if (firstName) {
          name = firstName;
      } else if (lastName) {
          name = lastName;
      }

      welcomeText.textContent = `سلام ${name} جان! خوش آمدید.`;

      // ذخیره اطلاعات مفید
      if (payload.user_id) {
          localStorage.setItem('user_id', payload.user_id);
      }
      if (payload.instructor_id) {
          localStorage.setItem('instructor_id', payload.instructor_id);
          console.log('Stored instructor_id:', payload.instructor_id);
      }
      if (firstName) {
          localStorage.setItem('first_name', firstName);
      }
      if (lastName) {
          localStorage.setItem('last_name', lastName);
      }

  } catch (err) {
      console.error("Error in dashboard.js:", err);
      welcomeText.textContent = "سلام! خوش آمدید.";
  }
});