// แต้มสะสม: mockup สตาติกตามที่ตกลงไว้ ไม่ได้คำนวณจากการใช้งานจริง/ไม่เชื่อม Firestore
const MOCKUP_POINTS = 120;

const greetingName = document.getElementById("greetingName");
const pointsValue = document.getElementById("pointsValue");
const logoutLink = document.getElementById("logoutLink");
const activeRequest = document.getElementById("activeRequest");
const bannerCarousel = document.getElementById("bannerCarousel");
const bannerTrack = document.getElementById("bannerTrack");
const bannerDots = document.getElementById("bannerDots");

pointsValue.textContent = MOCKUP_POINTS;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }

  try {
    const profileSnap = await db.collection("user_accounts").doc(user.uid).get();
    if (profileSnap.exists) {
      greetingName.textContent = `คุณ${profileSnap.data().full_name}`;
    }
  } catch (err) {
    console.error("โหลดโปรไฟล์ไม่สำเร็จ", err);
  }

  subscribeBanners();
  subscribeActiveRequest(user.uid);
});

// ---------- Banner ประชาสัมพันธ์ (ad_banners) — ปัดแนวนอนได้ + เลื่อนอัตโนมัติทุก 5 วินาที ----------
const BANNER_INTERVAL_MS = 5000;
let bannerTimer = null;

function subscribeBanners() {
  // ต้อง where status == 'active' ให้ตรงกับ Security Rules — ช่วงวันที่/ลำดับกรองและเรียงฝั่ง client (ไม่ต้องสร้าง index)
  db.collection("ad_banners")
    .where("status", "==", "active")
    .onSnapshot((snapshot) => {
      const banners = snapshot.docs
        .map((docSnap) => docSnap.data())
        .filter((banner) => isBannerLive(banner) && SAFE_IMAGE_DATA.test(banner.image_data || ""))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      renderBanners(banners);
    }, (err) => console.error("โหลด banner ไม่สำเร็จ", err));
}

function renderBanners(banners) {
  clearInterval(bannerTimer);
  bannerCarousel.hidden = banners.length === 0;
  bannerTrack.innerHTML = "";
  bannerDots.innerHTML = "";

  banners.forEach((banner, index) => {
    const link = SAFE_BANNER_LINK.test(banner.link_url || "") ? banner.link_url : "";
    const slide = document.createElement(link ? "a" : "div");
    slide.className = "banner-slide";
    if (link) {
      slide.href = link;
      if (link.startsWith("https://")) {
        slide.target = "_blank";
        slide.rel = "noopener";
      }
    }
    const img = document.createElement("img");
    img.src = banner.image_data;
    img.alt = banner.title || "";
    slide.appendChild(img);
    bannerTrack.appendChild(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "banner-dot";
    dot.setAttribute("aria-label", `ดู banner ที่ ${index + 1}`);
    dot.addEventListener("click", () => goToBanner(index));
    bannerDots.appendChild(dot);
  });

  bannerDots.hidden = banners.length < 2;
  updateBannerDots();
  if (banners.length > 1) startBannerTimer();
}

function currentBannerIndex() {
  return Math.round(bannerTrack.scrollLeft / Math.max(bannerTrack.clientWidth, 1));
}

function goToBanner(index) {
  bannerTrack.scrollTo({ left: index * bannerTrack.clientWidth, behavior: "smooth" });
}

function updateBannerDots() {
  const current = currentBannerIndex();
  bannerDots.querySelectorAll(".banner-dot").forEach((dot, i) => dot.classList.toggle("active", i === current));
}

function startBannerTimer() {
  clearInterval(bannerTimer);
  bannerTimer = setInterval(() => goToBanner((currentBannerIndex() + 1) % bannerTrack.children.length), BANNER_INTERVAL_MS);
}

bannerTrack.addEventListener("scroll", updateBannerDots, { passive: true });
// ผู้ใช้กำลังปัดเอง → หยุดเลื่อนอัตโนมัติชั่วคราว แล้วเริ่มนับใหม่หลังปล่อยนิ้ว
bannerTrack.addEventListener("pointerdown", () => clearInterval(bannerTimer));
bannerTrack.addEventListener("touchstart", () => clearInterval(bannerTimer), { passive: true });
["pointerup", "touchend"].forEach((type) => bannerTrack.addEventListener(type, () => {
  if (bannerTrack.children.length > 1) startBannerTimer();
}));

// ---------- คำขอที่กำลังดำเนินการ (ล่าสุดที่ยังไม่ยกเลิก/ไม่เสร็จสิ้น) พร้อมแถบขั้นตอน (real-time) ----------
// STATUS_LABEL / STATUS_HINT / progressStepsHtml / detailUrl / chatUrl มาจาก request-helpers.js
function subscribeActiveRequest(uid) {
  db.collection("pickup_requests")
    .where("user_id", "==", uid)
    .orderBy("created_at", "desc")
    .onSnapshot((snapshot) => {
      const active = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((data) => !FINISHED_STATUSES.includes(data.status));
      renderActiveRequest(active[0], active.length - 1);
    }, (err) => {
      console.error("โหลดคำขอไม่สำเร็จ", err);
      activeRequest.innerHTML = '<div class="empty-note">โหลดคำขอไม่สำเร็จ ลองรีเฟรชหน้าใหม่</div>';
    });
}

function renderActiveRequest(data, othersCount) {
  if (!data) {
    activeRequest.innerHTML = '<div class="empty-note">ไม่มีคำขอที่กำลังดำเนินการ — กด "เรียกรถซาเล้ง" ด้านบนเพื่อเริ่มได้เลย</div>';
    return;
  }

  activeRequest.innerHTML = `
    <div class="active-card">
      <div class="active-card-top">
        <div class="active-card-icon" aria-hidden="true">♻️</div>
        <div class="active-card-body">
          <div class="active-card-title">${escapeHtml((data.waste_types || []).join(", ") || "-")}</div>
          <div class="active-card-meta">🗓️ นัด ${escapeHtml(data.requested_date || "-")} · ${escapeHtml(data.time_slot || "-")}</div>
          <div class="active-card-meta">📍 ${escapeHtml(data.sub_district || "-")}</div>
        </div>
        ${statusPillHtml(data.status)}
      </div>
      ${progressStepsHtml(data.status)}
      <div class="active-card-hint">${escapeHtml(STATUS_HINT[data.status] || "")}</div>
      <div class="active-card-actions">
        <a class="btn-outline" href="${chatUrl(data.id)}">💬 แชทกับ Admin</a>
        <a class="btn-solid" href="${detailUrl(data.id)}">ดูรายละเอียด</a>
      </div>
    </div>
    ${othersCount > 0 ? `<a class="active-more" href="../tracking/index.html">+ อีก ${othersCount} คำขอที่กำลังดำเนินการ ›</a>` : ""}
  `;
}

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "../login/index.html";
});
