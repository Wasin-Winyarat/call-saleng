const bannerForm = document.getElementById("bannerForm");
const formTitle = document.getElementById("formTitle");
const imageInput = document.getElementById("bannerImageInput");
const preview = document.getElementById("bannerPreview");
const previewImg = document.getElementById("bannerPreviewImg");
const titleInput = document.getElementById("bannerTitle");
const linkPreset = document.getElementById("bannerLinkPreset");
const linkCustom = document.getElementById("bannerLinkCustom");
const startInput = document.getElementById("bannerStart");
const endInput = document.getElementById("bannerEnd");
const activeInput = document.getElementById("bannerActive");
const saveBtn = document.getElementById("bannerSaveBtn");
const cancelEditBtn = document.getElementById("bannerCancelEditBtn");
const bannerList = document.getElementById("bannerList");
const toast = document.getElementById("toast");

let banners = []; // [{ id, ...data }] เรียงตาม display_order
let editingId = null; // null = กำลังเพิ่มใหม่
let imageData = null; // data URL ของรูปในฟอร์ม (รูปเดิมตอนแก้ไข หรือรูปใหม่ที่เพิ่งเลือก)
let processingImage = false;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

// ---------- auth guard: admin เท่านั้น (เช็กจาก admin_accounts แบบเดียวกับ admin dashboard) ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  try {
    const profileSnap = await db.collection("admin_accounts").doc(user.uid).get();
    if (!profileSnap.exists) {
      await auth.signOut();
      window.location.href = "../index.html";
      return;
    }

    renderAdminHeader({
      active: "banners",
      name: profileSnap.data().full_name,
      onLogout: async () => {
        await auth.signOut();
        window.location.href = "../index.html";
      },
    });
    subscribeBanners();
  } catch (err) {
    console.error(err);
    showToast("โหลดข้อมูล admin ไม่สำเร็จ", true);
  }
});

// ---------- รายการ banner (real-time) ----------
function subscribeBanners() {
  db.collection("ad_banners")
    .orderBy("display_order", "asc")
    .onSnapshot((snapshot) => {
      banners = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      renderBannerList();
    }, (err) => {
      console.error(err);
      bannerList.innerHTML = `<div class="empty-note">โหลด banner ไม่สำเร็จ (${err.code === "permission-denied" ? "บัญชีนี้ไม่มีสิทธิ์ admin ตาม Security Rules" : "ลองรีเฟรชหน้าใหม่"})</div>`;
    });
}

function renderBannerList() {
  if (!banners.length) {
    bannerList.innerHTML = '<div class="empty-note">ยังไม่มี banner — เพิ่มจากฟอร์มด้านบน</div>';
    return;
  }

  bannerList.innerHTML = "";
  banners.forEach((banner, index) => {
    const state = bannerDisplayState(banner);
    const item = document.createElement("div");
    item.className = "banner-item";
    item.innerHTML = `
      <div class="banner-item-image">${SAFE_IMAGE_DATA.test(banner.image_data || "") ? `<img src="${banner.image_data}" alt="">` : ""}</div>
      <div class="banner-item-body">
        <div class="banner-item-title">${index + 1}. ${escapeHtml(banner.title)}<span class="state-pill ${state.key}">${escapeHtml(state.label)}</span></div>
        <div class="banner-item-meta">ลิงก์: ${escapeHtml(banner.link_url || "ไม่มี")}</div>
        <div class="banner-item-meta">ช่วงแสดง: ${escapeHtml(banner.start_date || "ไม่กำหนด")} ถึง ${escapeHtml(banner.end_date || "ไม่กำหนด")}</div>
        <div class="action-row">
          <button type="button" class="btn btn-secondary" data-act="up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="btn btn-secondary" data-act="down" ${index === banners.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="btn btn-secondary" data-act="toggle">${banner.status === "active" ? "ซ่อน" : "เผยแพร่"}</button>
          <button type="button" class="btn btn-secondary" data-act="edit">แก้ไข</button>
          <button type="button" class="btn btn-danger" data-act="delete">ลบ</button>
        </div>
      </div>
    `;
    item.querySelector('[data-act="up"]').addEventListener("click", () => swapOrder(index, index - 1));
    item.querySelector('[data-act="down"]').addEventListener("click", () => swapOrder(index, index + 1));
    item.querySelector('[data-act="toggle"]').addEventListener("click", () => toggleStatus(banner));
    item.querySelector('[data-act="edit"]').addEventListener("click", () => startEdit(banner));
    item.querySelector('[data-act="delete"]').addEventListener("click", () => deleteBanner(banner));
    bannerList.appendChild(item);
  });
}

async function swapOrder(a, b) {
  const batch = db.batch();
  batch.update(db.collection("ad_banners").doc(banners[a].id), { display_order: banners[b].display_order });
  batch.update(db.collection("ad_banners").doc(banners[b].id), { display_order: banners[a].display_order });
  try {
    await batch.commit();
  } catch (err) {
    console.error(err);
    showToast("สลับลำดับไม่สำเร็จ", true);
  }
}

async function toggleStatus(banner) {
  try {
    await db.collection("ad_banners").doc(banner.id).update({
      status: banner.status === "active" ? "draft" : "active",
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(err);
    showToast("เปลี่ยนสถานะไม่สำเร็จ", true);
  }
}

async function deleteBanner(banner) {
  if (!window.confirm(`ลบ banner "${banner.title}"? การลบไม่สามารถย้อนกลับได้`)) return;
  try {
    await db.collection("ad_banners").doc(banner.id).delete();
    if (editingId === banner.id) resetForm();
    showToast("ลบ banner แล้ว");
  } catch (err) {
    console.error(err);
    showToast("ลบ banner ไม่สำเร็จ", true);
  }
}

// ---------- ฟอร์มเพิ่ม/แก้ไข ----------
imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  imageInput.value = "";
  if (!file) return;
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    showToast("ไฟล์ไม่รองรับ (ใช้ได้เฉพาะ JPG / PNG / WEBP)", true);
    return;
  }

  processingImage = true;
  validate();
  try {
    imageData = await compressImage(file);
    showPreview();
  } catch (err) {
    console.error(err);
    showToast("อ่านรูปไม่สำเร็จ", true);
  } finally {
    processingImage = false;
    validate();
  }
});

linkPreset.addEventListener("change", () => {
  linkCustom.hidden = linkPreset.value !== "custom";
  validate();
});

bannerForm.addEventListener("input", validate);

function showPreview() {
  preview.hidden = !imageData;
  if (imageData) previewImg.src = imageData;
}

function getLinkUrl() {
  if (linkPreset.value === "custom") return linkCustom.value.trim();
  return linkPreset.value;
}

function validate() {
  const link = getLinkUrl();
  const datesOk = !startInput.value || !endInput.value || startInput.value <= endInput.value;
  const ok = !!imageData && !processingImage && titleInput.value.trim().length > 0 &&
    (!link || SAFE_BANNER_LINK.test(link)) && datesOk;
  saveBtn.disabled = !ok;
  saveBtn.textContent = processingImage ? "กำลังย่อรูป..." : (editingId ? "บันทึกการแก้ไข" : "บันทึก Banner");
  return ok;
}

function startEdit(banner) {
  editingId = banner.id;
  imageData = banner.image_data || null;
  titleInput.value = banner.title || "";
  const presetValues = Array.from(linkPreset.options).map((opt) => opt.value);
  if (!banner.link_url || presetValues.includes(banner.link_url)) {
    linkPreset.value = banner.link_url || "";
    linkCustom.value = "";
  } else {
    linkPreset.value = "custom";
    linkCustom.value = banner.link_url;
  }
  linkCustom.hidden = linkPreset.value !== "custom";
  startInput.value = banner.start_date || "";
  endInput.value = banner.end_date || "";
  activeInput.checked = banner.status === "active";
  formTitle.textContent = `แก้ไข Banner: ${banner.title}`;
  cancelEditBtn.hidden = false;
  showPreview();
  validate();
  bannerForm.scrollIntoView({ behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  imageData = null;
  bannerForm.reset();
  activeInput.checked = true;
  linkCustom.hidden = true;
  formTitle.textContent = "เพิ่ม Banner ใหม่";
  cancelEditBtn.hidden = true;
  showPreview();
  validate();
}

cancelEditBtn.addEventListener("click", resetForm);

bannerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) {
    showToast("กรอกข้อมูลให้ครบ: รูป, หัวข้อ, ลิงก์ (https:// เท่านั้น) และวันสิ้นสุดต้องไม่ก่อนวันเริ่ม", true);
    return;
  }

  saveBtn.disabled = true;
  const payload = {
    title: titleInput.value.trim(),
    image_data: imageData,
    link_url: getLinkUrl(),
    start_date: startInput.value,
    end_date: endInput.value,
    status: activeInput.checked ? "active" : "draft",
    placement_area: "user_home",
    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (editingId) {
      await db.collection("ad_banners").doc(editingId).update(payload);
      showToast("บันทึกการแก้ไขแล้ว");
    } else {
      const maxOrder = banners.reduce((max, b) => Math.max(max, b.display_order || 0), 0);
      await db.collection("ad_banners").doc().set({
        ...payload,
        display_order: maxOrder + 1,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      showToast("เพิ่ม banner แล้ว");
    }
    resetForm();
  } catch (err) {
    console.error(err);
    showToast(err.code === "permission-denied" ? "บันทึกไม่สำเร็จ: Firestore ปฏิเสธสิทธิ์" : "บันทึกไม่สำเร็จ กรุณาลองใหม่", true);
    validate();
  }
});

validate();
