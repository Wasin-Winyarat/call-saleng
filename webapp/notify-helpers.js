// Badge แจ้งเตือน — ฝั่ง user: ข้อความใหม่จาก Admin + สถานะคำขอที่เปลี่ยนไปตั้งแต่เปิดดูครั้งล่าสุด
// ฝั่ง admin (admin/dashboard): ข้อความใหม่จากลูกค้า (ใช้ key แยกตาม uid ของ admin)
// เก็บ "เห็นแล้วถึงตรงไหน" ไว้ใน localStorage ของ browser (แยกตาม uid) — ไม่เพิ่ม collection/field ใน Firestore
// ข้อจำกัด: สถานะ "อ่านแล้ว" ไม่ sync ข้ามเครื่อง/browser (เปิดเครื่องใหม่จะเห็น badge ของข้อความเก่าอีกรอบ)

const SEEN_KEY_PREFIX = "greensaleng_seen_";
const SEEN_CHANGED_EVENT = "greensaleng-seen-changed"; // bottom-nav.js ฟังเพื่ออัปเดต badge
const INITIAL_STATUS = "pending_admin_review"; // คำขอที่ยังไม่เคยบันทึกว่าเห็น ถือว่าเห็นสถานะเริ่มต้นแล้ว

function loadSeenState(uid) {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY_PREFIX + uid));
    if (parsed && parsed.status && parsed.chat) return parsed;
  } catch (err) {
    // localStorage ใช้ไม่ได้ (private mode ฯลฯ) — ใช้ค่าว่างแทน badge จะแสดงทุกครั้งที่เปิดหน้า
  }
  return { status: {}, chat: {} };
}

function saveSeenState(uid, seen) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + uid, JSON.stringify(seen));
  } catch (err) {
    // เงียบไว้ — badge ยังทำงานได้ใน session นี้
  }
  window.dispatchEvent(new Event(SEEN_CHANGED_EVENT));
}

function seenStatusOf(seen, requestId) {
  return seen.status[requestId] || INITIAL_STATUS;
}

function hasStatusUpdate(seen, requestId, status) {
  return !!status && seenStatusOf(seen, requestId) !== status;
}

function messageMillis(msg) {
  return msg.sent_at && msg.sent_at.toMillis ? msg.sent_at.toMillis() : 0;
}

// messages = array ของ data จาก chat_messages ของคำขอนั้น, fromRole = ฝั่งที่ส่งมาหาเรา ("admin" หรือ "user")
function countUnreadMessages(seen, requestId, messages, fromRole) {
  const lastSeen = seen.chat[requestId] || 0;
  return messages.filter((msg) => msg.sender_role === fromRole && messageMillis(msg) > lastSeen).length;
}

// ฝั่ง user: ข้อความใหม่จาก Admin
function countUnreadAdminMessages(seen, requestId, messages) {
  return countUnreadMessages(seen, requestId, messages, "admin");
}

function latestMessageMillis(messages) {
  return messages.reduce((max, msg) => Math.max(max, messageMillis(msg)), 0);
}
