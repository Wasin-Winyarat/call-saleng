// สมัครเป็นซาเล้ง: สร้างบัญชี Auth (synthetic email แยก domain จากลูกค้า) + saleng_accounts/{uid} สถานะ pending
// + รูปเอกสาร 2 รูปใน saleng_documents — แล้วไปหน้างาน ซึ่งจะแสดง "รอ Admin ตรวจสอบ" จนกว่าจะได้รับอนุมัติ

const form = document.getElementById("registerForm");
const submitBtn = document.getElementById("submitBtn");
const errorBanner = document.getElementById("errorBanner");
const areaGrid = document.getElementById("areaGrid");

const photos = { vehicle_photo: null, id_card_photo: null }; // data URL หลังบีบอัด
const PREVIEW_ID = { vehicle_photo: "vehiclePreview", id_card_photo: "idCardPreview" };

areaGrid.innerHTML = SALENG_SUB_DISTRICTS.map((sd) =>
  `<label class="area-item"><input type="checkbox" value="${sd}"> ${sd}</label>`).join("");
areaGrid.querySelectorAll(".area-item").forEach((item) => {
  const input = item.querySelector("input");
  input.addEventListener("change", () => item.classList.toggle("checked", input.checked));
});

Object.keys(photos).forEach((key) => {
  const input = document.getElementById(key);
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showError("รองรับเฉพาะรูป JPG / PNG / WEBP");
      input.value = "";
      return;
    }
    const preview = document.getElementById(PREVIEW_ID[key]);
    preview.textContent = "…";
    try {
      photos[key] = await compressImage(file);
      preview.innerHTML = `<img src="${photos[key]}" alt="">`;
    } catch (err) {
      console.error(err);
      photos[key] = null;
      preview.textContent = "⚠️";
      showError("อ่านรูปไม่สำเร็จ ลองเลือกรูปอื่น");
    }
  });
});

function fieldValue(id) {
  return document.getElementById(id).value.trim();
}

function setFieldError(fieldId, hasError) {
  document.getElementById(fieldId).classList.toggle("has-error", hasError);
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add("show");
  errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
}

function selectedAreas() {
  return Array.from(areaGrid.querySelectorAll("input:checked")).map((el) => el.value);
}

const AUTH_ERROR_MESSAGE = {
  "auth/email-already-in-use": "เบอร์นี้สมัครเป็นซาเล้งไว้แล้ว — เข้าสู่ระบบแทน",
  "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
  "auth/operation-not-allowed": "ยังไม่ได้เปิด Email/Password provider ใน Firebase Console",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBanner.classList.remove("show");

  const phone = fieldValue("phone").replace(/[\s-]/g, "");
  const password = document.getElementById("password").value;
  const checks = [
    ["field-full_name", fieldValue("full_name").length > 0],
    ["field-phone", /^0\d{8,9}$/.test(phone)],
    ["field-password", password.length >= 6],
    ["field-confirm_password", password === document.getElementById("confirm_password").value && password.length >= 6],
    ["field-vehicle_plate", fieldValue("vehicle_plate").length > 0],
    ["field-areas", selectedAreas().length > 0],
    ["field-vehicle_photo", !!photos.vehicle_photo],
    ["field-id_card_photo", !!photos.id_card_photo],
  ];
  checks.forEach(([id, ok]) => setFieldError(id, !ok));
  if (!checks.every(([, ok]) => ok)) {
    showError("กรุณากรอกข้อมูลให้ครบทุกช่องที่มี *");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังส่งใบสมัคร...";

  try {
    const credential = await auth.createUserWithEmailAndPassword(salengPhoneToEmail(phone), password);
    const uid = credential.user.uid;

    await db.collection("saleng_accounts").doc(uid).set({
      full_name: fieldValue("full_name"),
      phone_number: phone,
      vehicle_plate: fieldValue("vehicle_plate"),
      service_sub_districts: selectedAreas(),
      approval_status: "pending",
      account_status: "active",
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // รูปเอกสาร: doc id = {uid}_{ชนิด} — สมัครซ้ำ/อัปโหลดใหม่จะไม่เกิด doc ซ้อน
    const batch = db.batch();
    Object.entries(photos).forEach(([docType, imageData]) => {
      batch.set(db.collection("saleng_documents").doc(`${uid}_${docType}`), {
        saleng_id: uid,
        doc_type: docType,
        image_data: imageData,
        uploaded_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    window.location.href = "../jobs/index.html";
  } catch (err) {
    console.error(err);
    showError(AUTH_ERROR_MESSAGE[err.code] || "สมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "ส่งใบสมัคร";
  }
});
