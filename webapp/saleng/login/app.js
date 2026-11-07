// ซาเล้งเข้าสู่ระบบด้วยเบอร์โทร + รหัสผ่าน (synthetic email domain ของซาเล้ง — ดู salengPhoneToEmail)
// สถานะอนุมัติ/ระงับ ตรวจที่หน้างาน (saleng/jobs) ไม่ใช่ที่นี่ — ซาเล้งที่รออนุมัติยัง login ได้

const form = document.getElementById("loginForm");
const submitBtn = document.getElementById("submitBtn");
const errorBanner = document.getElementById("errorBanner");

const AUTH_ERROR_MESSAGE = {
  "auth/invalid-credential": "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง (บัญชีลูกค้าใช้เข้าหน้านี้ไม่ได้)",
  "auth/wrong-password": "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบบัญชีซาเล้งนี้ — สมัครเป็นซาเล้งก่อน",
  "auth/too-many-requests": "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งในอีกสักครู่",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBanner.classList.remove("show");

  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const phoneOk = /^0\d{8,9}$/.test(phone.replace(/[\s-]/g, ""));
  document.getElementById("field-phone").classList.toggle("has-error", !phoneOk);
  document.getElementById("field-password").classList.toggle("has-error", !password);
  if (!phoneOk || !password) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังเข้าสู่ระบบ...";
  try {
    await auth.signInWithEmailAndPassword(salengPhoneToEmail(phone), password);
    window.location.href = "../jobs/index.html";
  } catch (err) {
    console.error(err);
    errorBanner.textContent = AUTH_ERROR_MESSAGE[err.code] || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    errorBanner.classList.add("show");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "เข้าสู่ระบบ";
  }
});
