// แต้มสะสม: mockup สตาติกตามที่ตกลงไว้ ไม่ได้คำนวณจากการใช้งานจริง/ไม่เชื่อม Firestore
const MOCKUP_POINTS = 120;

const greetingName = document.getElementById("greetingName");
const pointsValue = document.getElementById("pointsValue");
const logoutLink = document.getElementById("logoutLink");
const trackingBadge = document.getElementById("trackingBadge");

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

  subscribeTrackingBadge(user.uid);
});

// ---------- badge บนการ์ด "ติดตามคำขอ" = จำนวนคำขอที่สถานะเปลี่ยน + ข้อความใหม่จาก Admin (real-time) ----------
// หน้านี้แค่อ่านสถานะ "เห็นแล้ว" — ล้าง badge เกิดขึ้นที่หน้า tracking ตอนเปิดดู (notify-helpers.js)
function subscribeTrackingBadge(uid) {
  const statuses = new Map(); // requestId → status
  const chats = new Map(); // requestId → ข้อความทั้งหมด
  const chatListeners = new Map();

  const render = () => {
    const seen = loadSeenState(uid);
    let total = 0;
    statuses.forEach((status, id) => {
      if (hasStatusUpdate(seen, id, status)) total++;
      total += countUnreadAdminMessages(seen, id, chats.get(id) || []);
    });
    trackingBadge.textContent = total > 99 ? "99+" : total;
    trackingBadge.hidden = total === 0;
  };

  db.collection("pickup_requests")
    .where("user_id", "==", uid)
    .onSnapshot((snapshot) => {
      statuses.clear();
      snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        statuses.set(id, docSnap.data().status);
        if (chatListeners.has(id)) return;
        chatListeners.set(id, db.collection("chat_messages")
          .where("request_id", "==", id)
          .onSnapshot((chatSnap) => {
            chats.set(id, chatSnap.docs.map((d) => d.data()));
            render();
          }, (err) => console.error("โหลดแชทไม่สำเร็จ", err)));
      });
      render();
    }, (err) => console.error("โหลดคำขอไม่สำเร็จ", err));
}

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "../login/index.html";
});
