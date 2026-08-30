const form = document.getElementById("adminLoginForm");
const submitBtn = document.getElementById("submitBtn");
const errorBanner = document.getElementById("errorBanner");

function fieldValue(id) {
  return document.getElementById(id).value.trim();
}

function setFieldError(fieldId, hasError) {
  document.getElementById(fieldId).classList.toggle("has-error", hasError);
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add("show");
}

function hideError() {
  errorBanner.classList.remove("show");
}

const AUTH_ERROR_MESSAGE = {
  "auth/invalid-credential": "login identifier หรือรหัสผ่านไม่ถูกต้อง",
  "auth/wrong-password": "login identifier หรือรหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบบัญชี admin นี้ในระบบ",
  "auth/configuration-not-found": "ยังไม่ได้เปิดใช้งาน Firebase Authentication (Email/Password) ใน Firebase Console — ดู README",
  "auth/operation-not-allowed": "ยังไม่ได้เปิด Email/Password provider ใน Firebase Console → Authentication → Sign-in method",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const loginIdentifier = fieldValue("login_identifier");
  const password = fieldValue("password");

  const checks = [
    ["field-login_identifier", loginIdentifier.length > 0],
    ["field-password", password.length > 0],
  ];
  checks.forEach(([fieldId, ok]) => setFieldError(fieldId, !ok));
  if (!checks.every(([, ok]) => ok)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังเข้าสู่ระบบ...";

  try {
    await auth.signInWithEmailAndPassword(adminIdToEmail(loginIdentifier), password);
    window.location.href = "dashboard/index.html";
  } catch (err) {
    console.error(err);
    showError(AUTH_ERROR_MESSAGE[err.code] || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "เข้าสู่ระบบ";
  }
});
