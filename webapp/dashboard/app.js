// แต้มสะสม: mockup สตาติกตามที่ตกลงไว้ ไม่ได้คำนวณจากการใช้งานจริง/ไม่เชื่อม Firestore
const MOCKUP_POINTS = 120;

const greetingName = document.getElementById("greetingName");
const pointsValue = document.getElementById("pointsValue");
const logoutLink = document.getElementById("logoutLink");
const latestRequests = document.getElementById("latestRequests");

const STATUS_LABEL = {
  pending_admin_review: "รอตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
  open_for_saleng: "รอสาเล้งรับงาน",
  pending_match_confirm: "รอยืนยันการจับคู่",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
};

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

  subscribeLatestRequests(user.uid);
});

// ---------- คำขอล่าสุด 3 รายการ (real-time) — กดแล้วไปหน้าติดตาม ----------
// badge แจ้งเตือนย้ายไปอยู่ที่เมนู "ติดตาม" ในแถบด้านล่าง (bottom-nav.js)
function subscribeLatestRequests(uid) {
  db.collection("pickup_requests")
    .where("user_id", "==", uid)
    .orderBy("created_at", "desc")
    .limit(3)
    .onSnapshot((snapshot) => {
      if (snapshot.empty) {
        latestRequests.innerHTML = '<div class="empty-note">ยังไม่มีคำขอ — <a href="../pickup-request/index.html">เรียกรถซาเล้งครั้งแรก</a></div>';
        return;
      }
      latestRequests.innerHTML = "";
      snapshot.forEach((docSnap) => latestRequests.appendChild(renderLatestCard(docSnap.data())));
    }, (err) => {
      console.error("โหลดคำขอล่าสุดไม่สำเร็จ", err);
      latestRequests.innerHTML = '<div class="empty-note">โหลดคำขอไม่สำเร็จ ลองรีเฟรชหน้าใหม่</div>';
    });
}

function renderLatestCard(data) {
  const card = document.createElement("a");
  card.className = "latest-card";
  card.href = "../tracking/index.html";
  card.innerHTML = `
    <div class="latest-card-icon" aria-hidden="true">♻️</div>
    <div class="latest-card-body">
      <div class="latest-card-title">${escapeHtml((data.waste_types || []).join(", ") || "-")}</div>
      <div class="latest-card-meta">นัด ${escapeHtml(data.requested_date || "-")} · ${escapeHtml(data.time_slot || "-")}</div>
    </div>
    <span class="status-pill ${escapeHtml(data.status)}">${escapeHtml(STATUS_LABEL[data.status] || data.status || "-")}</span>
  `;
  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "../login/index.html";
});
