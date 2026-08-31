# SCOPE — Module ที่ส่งอาจารย์

เอกสารนี้สรุปขอบเขตของ 1 module ที่เลือกพัฒนา/ส่งในรอบนี้: **User สร้างคำขอเรียกรถซาเล้ง** + **Admin accept / cancel / change-time** (ยังไม่รวมฝั่งสาเล้ง/matching)

เทียบโครงสร้างข้อมูลกับตัวอย่างโปรเจกต์ [LeaveEasy](https://github.com/Wasin-Winyarat/leaveeasy) เพื่อยืนยันว่าออกแบบ Firestore ครบตามแพทเทิร์นเดียวกัน:

| | 🔧 LeaveEasy | 🚚 Call-Saleng (ของคุณ) |
|---|---|---|
| 📁 โฟลเดอร์หลัก | `leaveRequests` | `pickup_requests` |
| 📁 โฟลเดอร์ประเภท | `leaveTypes` | `waste_type` (เก็บเป็น array `waste_types` ในฟอร์ม ไม่ใช่ collection แยกในโค้ดปัจจุบัน) |
| 📁 โฟลเดอร์ย่อย | `approvals` (ซ้อนใน `leaveRequests/{id}/approvals` — ความเห็นของหัวหน้า) | `chat_message` (`request_id` · `sender_role` · `sender_id` · `message_text` · `sent_at`) — บทสนทนา user↔admin |
| ✏️ ช่องบอกว่าเป็นของใคร | `requesterId` · `requesterName` | `user_id` · `contact_name` |
| 🔀 สถานะทั้งหมด | รอพิจารณา · อนุมัติ · ไม่อนุมัติ | `pending_admin_review` · `open_for_saleng` (accept) · `cancelled` (cancel) |
| 👤 คนที่สร้างรายการ | พนักงาน | User (เจ้าของขยะ) |
| 👤 คนที่เปลี่ยนสถานะ | หัวหน้า | Admin — accept / cancel (ต้องใส่ `cancel_reason`) / เปลี่ยนเวลา (มีผลทันที) |
| 📝 ช่องข้อความยาวที่ AI จะอ่าน | `reason` | `notes` · `estimated_quantity_description` · `landmark` |
| 🤖 งานที่ AI ช่วย (สัปดาห์ที่ 8) | จัดประเภทการลาให้อัตโนมัติ | แบ่งโซนอัตโนมัติจาก `sub_district` |

## หมายเหตุ

- Business rules ใหม่ 2 ข้อ (cancel ต้องมีเหตุผล, admin เปลี่ยนเวลาได้ทันที) ถูกเพิ่มเข้า spec แล้วที่ [docs/01-requirements/01-spec/20260819-001-saleng-pickup-request.md](docs/01-requirements/01-spec/20260819-001-saleng-pickup-request.md)
- ยังไม่ได้ปรับ [docs/02-design/02-technical/database-schema.md](docs/02-design/02-technical/database-schema.md) และโค้ดจริงใน [webapp/admin/dashboard/app.js](webapp/admin/dashboard/app.js) ให้ตรงกับ business rule ใหม่ (รอทำต่อ)
- `request_match` (ตารางจับคู่งานกับสาเล้ง) ยังไม่ต้องสร้าง เพราะ module รอบนี้ตัดฝั่งสาเล้งออก
