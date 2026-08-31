// แต้มสะสม: mockup สตาติกตามที่ตกลงไว้ ไม่ได้คำนวณจากการใช้งานจริง/ไม่เชื่อม Firestore
const MOCKUP_POINTS = 120;

const greetingName = document.getElementById("greetingName");
const pointsValue = document.getElementById("pointsValue");
const logoutLink = document.getElementById("logoutLink");

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
});

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "../login/index.html";
});
