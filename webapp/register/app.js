const form = document.getElementById("registerForm");
const submitBtn = document.getElementById("submitBtn");
const errorBanner = document.getElementById("errorBanner");
const toast = document.getElementById("toast");

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

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

const AUTH_ERROR_MESSAGE = {
  "auth/email-already-in-use": "เบอร์โทรนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบแทน",
  "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
  "auth/configuration-not-found": "ยังไม่ได้เปิดใช้งาน Firebase Authentication (Email/Password) ใน Firebase Console — ดู README",
  "auth/operation-not-allowed": "ยังไม่ได้เปิด Email/Password provider ใน Firebase Console → Authentication → Sign-in method",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const fullName = fieldValue("full_name");
  const phone = fieldValue("phone");
  const password = fieldValue("password");
  const confirmPassword = fieldValue("confirm_password");

  const checks = [
    ["field-full_name", fullName.length > 0],
    ["field-phone", /^0\d{8,9}$/.test(phone.replace(/-/g, ""))],
    ["field-password", password.length >= 6],
    ["field-confirm_password", password === confirmPassword && confirmPassword.length > 0],
  ];
  checks.forEach(([fieldId, ok]) => setFieldError(fieldId, !ok));
  if (!checks.every(([, ok]) => ok)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังสมัคร...";

  try {
    const credential = await auth.createUserWithEmailAndPassword(phoneToEmail(phone), password);

    await db.collection("user_accounts").doc(credential.user.uid).set({
      full_name: fullName,
      phone_number: normalizePhone(phone),
      status: "active",
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast("สมัครเข้าใช้งานสำเร็จ");
    window.location.href = "../dashboard/index.html";
  } catch (err) {
    console.error(err);
    showError(AUTH_ERROR_MESSAGE[err.code] || "สมัครเข้าใช้งานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "สมัครเข้าใช้งาน";
  }
});
