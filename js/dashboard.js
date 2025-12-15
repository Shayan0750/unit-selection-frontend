document.addEventListener("DOMContentLoaded", () => {
  const welcomeText = document.getElementById("welcomeText");

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
      const name =
          (payload.first_name && payload.first_name.trim() !== "" ? payload.first_name : null) ||
          (payload.last_name && payload.last_name.trim() !== "" ? payload.last_name : null) ||
          payload.username ||
          "کاربر";

      welcomeText.textContent = `سلام ${name} جان! خوش آمدید.`;

  } catch (err) {
      console.error(err);
      welcomeText.textContent = "سلام! خوش آمدید.";
  }
});