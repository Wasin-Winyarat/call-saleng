// Firebase Authentication ไม่รองรับ "เบอร์โทร + password" ตรงๆ (Phone provider ของ Firebase ผูกกับ SMS OTP เท่านั้น)
// จึงแปลงเบอร์โทร/login_identifier เป็น "synthetic email" ภายใน แล้วใช้ Email/Password provider แทน
// ผู้ใช้เห็นแค่ช่องกรอกเบอร์โทร/รหัสผ่าน ไม่เห็น email นี้เลย — เก็บ password จริงไว้ที่ Firebase Auth
// (hash/verify ให้ปลอดภัยอยู่แล้ว) ไม่ใช่เขียนเป็น field ลง Firestore เอง

export function normalizePhone(phone) {
  return phone.replace(/[\s-]/g, "");
}

export function phoneToEmail(phone) {
  return `${normalizePhone(phone)}@callsaleng.app`;
}

export function adminIdToEmail(loginIdentifier) {
  return `${loginIdentifier.trim().toLowerCase()}@callsaleng-admin.app`;
}
