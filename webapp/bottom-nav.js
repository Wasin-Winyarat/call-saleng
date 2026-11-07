// แถบเมนูด้านล่างของหน้าฝั่ง user — สร้าง markup เองแล้วต่อท้าย <body>
// ใช้: ใส่ <body data-nav="home|tracking|request|prices|profile"> + link bottom-nav.css + script นี้ไว้ท้าย body
// badge บนเมนู "ติดตาม" ทำงานเมื่อหน้านั้นโหลด firebase-config.js และ notify-helpers.js ก่อน script นี้
(function () {
  const ITEMS = [
    { key: "home", href: "../dashboard/index.html", icon: "🏠", label: "หน้าหลัก" },
    { key: "tracking", href: "../tracking/index.html", icon: "📦", label: "ติดตาม" },
    { key: "request", href: "../pickup-request/index.html", icon: "＋", label: "ส่งคำร้อง", primary: true },
    { key: "prices", href: "../prices/index.html", icon: "💰", label: "ราคาขยะ" },
    { key: "profile", href: "../profile/index.html", icon: "👤", label: "โปรไฟล์" },
  ];

  const active = document.body.dataset.nav;
  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  nav.setAttribute("aria-label", "เมนูหลัก");
  nav.innerHTML = `<div class="bottom-nav-inner">${ITEMS.map((item) => `
    <a class="bottom-nav-item${item.primary ? " primary" : ""}${item.key === active ? " active" : ""}" href="${item.href}"${item.key === active ? ' aria-current="page"' : ""}>
      <span class="bottom-nav-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
      ${item.key === "tracking" ? '<span class="bottom-nav-badge" id="bottomNavBadge" hidden></span>' : ""}
    </a>`).join("")}</div>`;
  document.body.appendChild(nav);
  document.body.classList.add("has-bottom-nav");

  if (typeof auth === "undefined" || typeof db === "undefined" || typeof loadSeenState === "undefined") return;

  const badge = document.getElementById("bottomNavBadge");
  let stopListeners = () => {};

  auth.onAuthStateChanged((user) => {
    stopListeners();
    badge.hidden = true;
    if (user) stopListeners = subscribeBadge(user.uid);
  });

  // badge = จำนวนคำขอที่สถานะเปลี่ยน + ข้อความใหม่จาก Admin ที่ยังไม่ได้เปิดดู (real-time)
  function subscribeBadge(uid) {
    const statuses = new Map(); // requestId → status
    const chats = new Map(); // requestId → ข้อความทั้งหมดของคำขอนั้น
    const chatListeners = new Map();

    const render = () => {
      const seen = loadSeenState(uid);
      let total = 0;
      statuses.forEach((status, id) => {
        if (hasStatusUpdate(seen, id, status)) total++;
        total += countUnreadAdminMessages(seen, id, chats.get(id) || []);
      });
      badge.textContent = total > 99 ? "99+" : total;
      badge.hidden = total === 0;
    };

    const stopRequests = db.collection("pickup_requests")
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

    // หน้า tracking บันทึกว่า "เห็นแล้ว" → อัปเดต badge ทันทีโดยไม่ต้องรอ snapshot ใหม่
    window.addEventListener(SEEN_CHANGED_EVENT, render);

    return () => {
      stopRequests();
      chatListeners.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener(SEEN_CHANGED_EVENT, render);
    };
  }
})();
