// Banner ประชาสัมพันธ์ (collection ad_banners) — ใช้ร่วมกันระหว่างหน้า admin/banners และหน้าหลักของ user
// status: "active" (เผยแพร่) / "draft" (ฉบับร่าง) — "expired" ตาม database-schema คำนวณจาก end_date ตอนแสดงผลแทนการเขียนลง doc

// ลิงก์ที่ยอมให้ใส่ใน href: หน้าในแอป (../xxx/index.html) หรือ https:// เท่านั้น — กัน javascript: ฯลฯ
const SAFE_BANNER_LINK = /^(\.\.\/[a-z-]+\/index\.html|https:\/\/[^\s"'<>]+)$/;

function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// start_date / end_date เป็น string "YYYY-MM-DD" (ว่าง = ไม่จำกัด) เทียบแบบ string ได้ตรงๆ
function isBannerLive(banner, today = todayIsoDate()) {
  if (banner.status !== "active") return false;
  if (banner.start_date && today < banner.start_date) return false;
  if (banner.end_date && today > banner.end_date) return false;
  return true;
}

function bannerDisplayState(banner, today = todayIsoDate()) {
  if (banner.status !== "active") return { key: "draft", label: "ฉบับร่าง" };
  if (banner.start_date && today < banner.start_date) return { key: "scheduled", label: `เริ่ม ${banner.start_date}` };
  if (banner.end_date && today > banner.end_date) return { key: "expired", label: "หมดอายุแล้ว" };
  return { key: "live", label: "กำลังแสดง" };
}
