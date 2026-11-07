// Badge แจ้งเตือนฝั่ง user: ข้อความใหม่จาก Admin + สถานะคำขอที่เปลี่ยนไปตั้งแต่เปิดดูครั้งล่าสุด
// เก็บ "เห็นแล้วถึงตรงไหน" ไว้ใน localStorage ของ browser (แยกตาม uid) — ไม่เพิ่ม collection/field ใน Firestore
// ข้อจำกัด: สถานะ "อ่านแล้ว" ไม่ sync ข้ามเครื่อง/browser (เปิดเครื่องใหม่จะเห็น badge ของข้อความเก่าอีกรอบ)

const SEEN_KEY_PREFIX = "greensaleng_seen_";
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

// messages = array ของ data จาก chat_messages ของคำขอนั้น
function countUnreadAdminMessages(seen, requestId, messages) {
  const lastSeen = seen.chat[requestId] || 0;
  return messages.filter((msg) => msg.sender_role === "admin" && messageMillis(msg) > lastSeen).length;
}

function latestMessageMillis(messages) {
  return messages.reduce((max, msg) => Math.max(max, messageMillis(msg)), 0);
}
