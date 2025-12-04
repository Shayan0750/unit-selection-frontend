const form = document.getElementById("loginForm");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const warningEl = document.getElementById("warning");

function showWarning(text) {
  warningEl.textContent = text;
  warningEl.hidden = false;
}

function hideWarning() {
  warningEl.hidden = true;
  warningEl.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideWarning();

  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();

  if (!username || !password) {
    showWarning("Please fill in all fields.");
    return;
  }
});