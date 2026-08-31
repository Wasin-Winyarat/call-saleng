const form = document.getElementById("loginForm");
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
  "auth/invalid-credential": "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง",
  "auth/wrong-password": "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบบัญชีนี้ในระบบ กรุณาสมัครสมาชิกก่อน",
  "auth/too-many-requests": "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งในอีกสักครู่",
  "auth/configuration-not-found": "ยังไม่ได้เปิดใช้งาน Firebase Authentication (Email/Password) ใน Firebase Console — ดู README",
  "auth/operation-not-allowed": "ยังไม่ได้เปิด Email/Password provider ใน Firebase Console → Authentication → Sign-in method",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const phone = fieldValue("phone");
  const password = fieldValue("password");

  const phoneOk = /^0\d{8,9}$/.test(phone.replace(/-/g, ""));
  const passwordOk = password.length > 0;
  setFieldError("field-phone", !phoneOk);
  setFieldError("field-password", !passwordOk);
  if (!phoneOk || !passwordOk) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังเข้าสู่ระบบ...";

  try {
    const credential = await auth.signInWithEmailAndPassword(phoneToEmail(phone), password);
    const profileSnap = await db.collection("user_accounts").doc(credential.user.uid).get();

    if (profileSnap.exists && profileSnap.data().status === "suspended") {
      await auth.signOut();
      showError("บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
      return;
    }

    showToast("เข้าสู่ระบบสำเร็จ");
    window.location.href = "../dashboard/index.html";
  } catch (err) {
    console.error(err);
    showError(AUTH_ERROR_MESSAGE[err.code] || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "เข้าสู่ระบบ";
  }
});
