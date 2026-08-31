// แต้มสะสม: mockup สตาติกตามที่ตกลงไว้ (เลขเดียวกับหน้า dashboard) ไม่ได้เชื่อม Firestore
const MOCKUP_POINTS = 120;

const SUB_DISTRICTS = ["รอบเวียง", "เวียง", "แม่ยาว", "นางแล", "ริมกก"];
const ADDRESS_SLOTS = ["address_1", "address_2"];

const toast = document.getElementById("toast");
const addressCardList = document.getElementById("addressCardList");
const saveProfileBtn = document.getElementById("saveProfileBtn");

let currentUserId = null;
let savedAddresses = { address_1: null, address_2: null };
let editingSlot = null;

document.getElementById("pointsValue").textContent = MOCKUP_POINTS;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ---------- auth guard ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  currentUserId = user.uid;

  try {
    const profileSnap = await db.collection("user_accounts").doc(user.uid).get();
    if (profileSnap.exists) {
      const data = profileSnap.data();
      document.getElementById("full_name").value = data.full_name || "";
      document.getElementById("phone_number").value = data.phone_number || "";
      document.getElementById("email").value = data.email || "";
    }
  } catch (err) {
    console.error("โหลดโปรไฟล์ไม่สำเร็จ", err);
  }

  try {
    const addrSnap = await db.collection("user_addresses").doc(user.uid).get();
    if (addrSnap.exists) {
      const data = addrSnap.data();
      savedAddresses.address_1 = data.address_1 || null;
      savedAddresses.address_2 = data.address_2 || null;
    }
  } catch (err) {
    console.error("โหลดที่อยู่ที่บันทึกไว้ไม่สำเร็จ", err);
  }

  renderAddressCards();
});

// ---------- save profile ----------
saveProfileBtn.addEventListener("click", async () => {
  const fullName = document.getElementById("full_name").value.trim();
  const phoneNumber = document.getElementById("phone_number").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!fullName || !phoneNumber) {
    showToast("กรุณากรอกชื่อและเบอร์โทรศัพท์", true);
    return;
  }

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "กำลังบันทึก...";

  try {
    await db.collection("user_accounts").doc(currentUserId).set(
      { full_name: fullName, phone_number: phoneNumber, email },
      { merge: true },
    );
    showToast("บันทึกข้อมูลสำเร็จ");
  } catch (err) {
    console.error(err);
    showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", true);
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "บันทึกข้อมูล";
  }
});

// ---------- saved address cards (จัดการ: เพิ่ม/แก้ไข ไม่มีสถานะ "เลือก" เพราะหน้านี้ไม่ใช่ฟอร์มส่งคำร้อง) ----------
function addressLabel(slot) {
  return slot === "address_1" ? "ที่อยู่ 1" : "ที่อยู่ 2";
}

function renderAddressCards() {
  addressCardList.innerHTML = "";
  ADDRESS_SLOTS.forEach((slot) => {
    addressCardList.appendChild(buildAddressCard(slot));
  });
}

function buildAddressCard(slot) {
  if (editingSlot === slot) return buildAddressForm(slot);

  const saved = savedAddresses[slot];
  if (!saved) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "address-card-empty";
    btn.innerHTML = `<span class="plus-icon">+</span><span>เพิ่ม${addressLabel(slot)}</span>`;
    btn.addEventListener("click", () => {
      editingSlot = slot;
      renderAddressCards();
    });
    return btn;
  }

  const card = document.createElement("div");
  card.className = "address-card-filled";

  const body = document.createElement("div");
  body.className = "address-card-body";
  body.innerHTML = `
    <div class="address-card-label">📍 ${addressLabel(slot)}</div>
    <div class="address-card-text">${escapeHtml(saved.sub_district)} — ${escapeHtml(saved.address_text)}${saved.landmark ? ` (${escapeHtml(saved.landmark)})` : ""}</div>
  `;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "address-card-edit-btn";
  editBtn.textContent = "✏️";
  editBtn.addEventListener("click", () => {
    editingSlot = slot;
    renderAddressCards();
  });

  card.appendChild(body);
  card.appendChild(editBtn);
  return card;
}

function buildAddressForm(slot) {
  const saved = savedAddresses[slot] || { sub_district: "", address_text: "", landmark: "" };
  const wrap = document.createElement("div");
  wrap.className = "address-card-form";
  wrap.innerHTML = `
    <div class="address-card-label">📍 ${addressLabel(slot)}</div>
    <select class="addr-sub-district">
      <option value="">เลือกพื้นที่</option>
      ${SUB_DISTRICTS.map((sd) => `<option value="${sd}" ${saved.sub_district === sd ? "selected" : ""}>${sd}</option>`).join("")}
    </select>
    <textarea class="addr-address-text" rows="2" placeholder="บ้านเลขที่ / ซอย / ถนน">${escapeHtml(saved.address_text)}</textarea>
    <input type="text" class="addr-landmark" placeholder="จุดสังเกต (ไม่บังคับ)" value="${escapeHtml(saved.landmark || "")}">
    <div class="hint" style="margin:-4px 0 8px;">MVP รองรับเฉพาะเขตอำเภอเมือง จังหวัดเชียงราย</div>
    <div class="address-card-form-actions">
      <button type="button" class="btn btn-primary addr-save">บันทึกที่อยู่นี้</button>
      <button type="button" class="btn btn-secondary addr-cancel">ยกเลิก</button>
    </div>
  `;

  wrap.querySelector(".addr-save").addEventListener("click", async () => {
    const subDistrict = wrap.querySelector(".addr-sub-district").value;
    const addressText = wrap.querySelector(".addr-address-text").value.trim();
    const landmark = wrap.querySelector(".addr-landmark").value.trim();

    if (!subDistrict || !addressText) {
      showToast("กรุณาเลือกพื้นที่และกรอกรายละเอียดที่อยู่", true);
      return;
    }

    const saveBtn = wrap.querySelector(".addr-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "กำลังบันทึก...";

    try {
      savedAddresses[slot] = { sub_district: subDistrict, address_text: addressText, landmark };
      await db.collection("user_addresses").doc(currentUserId).set(
        { [slot]: savedAddresses[slot] },
        { merge: true },
      );
      editingSlot = null;
      renderAddressCards();
      showToast("บันทึกที่อยู่แล้ว");
    } catch (err) {
      console.error(err);
      showToast("บันทึกที่อยู่ไม่สำเร็จ: Firestore ปฏิเสธสิทธิ์ — ตั้งค่า Security Rules ก่อน (ดู README)", true);
      saveBtn.disabled = false;
      saveBtn.textContent = "บันทึกที่อยู่นี้";
    }
  });

  wrap.querySelector(".addr-cancel").addEventListener("click", () => {
    editingSlot = null;
    renderAddressCards();
  });

  return wrap;
}
