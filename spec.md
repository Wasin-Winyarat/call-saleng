# spec.md — สรุป Module ปัจจุบันของ call-saleng

> สรุปจาก [SCOPE.md](SCOPE.md) + โค้ดจริงใน `webapp/` (ตรวจ ณ 2026-09-22) ไม่ใช่เอกสาร pipeline อย่างเป็นทางการใน `docs/` — เป็นสรุปสถานะให้อ่านเร็วๆ เท่านั้น ถ้าต้องการ requirement spec ทางการ ให้ใช้ skill `create-requirement`

## ขอบเขต Module รอบนี้

**User สร้างคำขอเรียกรถซาเล้ง + Admin accept / cancel / change-time** — ตัดฝั่งสาเล้ง (คนขับ) และ matching/ใบเสร็จ/ราคากลางออกทั้งหมด

## 1. หน้าจอทั้งหมด (screens ที่ implement แล้ว)

### ฝั่ง User

| หน้า | Path | หน้าที่ |
|---|---|---|
| Landing | `webapp/index.html` | ปุ่มเข้าสู่ระบบ/สมัครสมาชิก + มุม Admin (สำหรับทดสอบเท่านั้น ระบบจริงไม่มี) |
| สมัครสมาชิก | `webapp/register/` | กรอกชื่อ+เบอร์โทร+รหัสผ่าน → สร้าง `user_accounts` |
| เข้าสู่ระบบ | `webapp/login/` | login ด้วยเบอร์โทร+รหัสผ่าน (แปลงเป็น synthetic email ภายใน) |
| Dashboard | `webapp/dashboard/` | หน้าหลักหลัง login: ทางลัดไปโปรไฟล์ / ส่งคำร้อง / ติดตามคำขอ / ราคาขยะ + แต้มสะสม (mockup ตัวเลขนิ่ง ไม่เชื่อม Firestore) |
| โปรไฟล์ | `webapp/profile/` | แก้ไขชื่อ/เบอร์โทร/อีเมล + จัดการที่อยู่บันทึกไว้ (เพิ่ม/แก้ไข/ลบ สูงสุด 2 ช่อง `address_1`/`address_2`) |
| ส่งคำร้อง | `webapp/pickup-request/` | ฟอร์มสร้างคำขอเรียกรถซาเล้ง (โหมดสร้างใหม่ และโหมดแก้ไข `?edit=<request_id>` — แก้ไขได้เฉพาะตอนยัง `pending_admin_review`) |
| ติดตามคำขอ | `webapp/tracking/` | รายการคำขอของตัวเอง (real-time) + แก้ไข/ลบคำขอที่ยัง `pending_admin_review` + แชทกับ Admin ต่อคำขอ |
| ราคาขยะ | `webapp/prices/` | ตารางราคาอ้างอิง — **mockup ข้อมูลนิ่ง ไม่เชื่อม Firestore** ไม่เกี่ยวกับ `waste_reference_price` ใน schema |

### ฝั่ง Admin

| หน้า | Path | หน้าที่ |
|---|---|---|
| Admin login | `webapp/admin/` | login ด้วย login identifier + รหัสผ่าน |
| Admin dashboard | `webapp/admin/dashboard/` | ดูรายการคำขอทั้งหมด (filter ตาม status), Confirm/Reject คำขอ (Reject ต้องกรอก `cancel_reason` ก่อน), แก้ไขวัน-เวลานัดรับ (ไม่เปลี่ยน status), แชทกับ user ต่อคำขอ, ปุ่ม AI ช่วยสรุปคำขอ/ช่วยเรียบเรียงเหตุผล reject |

### เครื่องมือ dev/เสริม (ไม่ใช่ฟีเจอร์ให้ end-user)

- `webapp/seed/` — สคริปต์ seed ข้อมูลตัวอย่างลง Firestore
- `webapp/ai-test/` — หน้าทดสอบเรียก AI (OpenRouter) เปล่าๆ ไม่ผูกกับ business flow ใด
- ฟีเจอร์ AI ใน admin dashboard (สรุปคำขอ/เรียบเรียงเหตุผล) เป็นตัวช่วยเสริมที่มีอยู่ในโค้ดจริงแล้ว แต่ไม่ได้อยู่ในคำอธิบายขอบเขตของ `SCOPE.md` — ไม่แตะ field `status` ของคำขอ (มีคอมเมนต์เตือนไว้ในโค้ดชัดเจน)

## 2. โครงสร้างข้อมูล (Firestore collections ที่ implement จริง)

ชื่อ collection ในโค้ดเป็นพหูพจน์ (ต่างจากชื่อเอกพจน์ใน [database-schema.md](docs/02-design/02-technical/database-schema.md)):

### `user_accounts` (doc id = Firebase Auth uid)
| Field | ใช้จริงในโค้ด |
|---|---|
| `full_name` | ชื่อผู้ใช้ |
| `phone_number` | เบอร์โทร (normalize แล้ว) |
| `email` | อีเมลจริงที่ผู้ใช้กรอกเอง (ไม่ใช่ synthetic email ของ auth) |
| `status` | `active` (ตอน register) — ยังไม่มี code path เปลี่ยนเป็น `suspended` |
| `created_at` | server timestamp |

### `user_addresses` (doc id = uid ของ user, ไม่ใช่ auto-id)
เก็บเป็น map ซ้อนในเอกสารเดียว ไม่ใช่ sub-collection: field `address_1` และ `address_2` แต่ละอันเป็น object `{ sub_district, address_text, landmark }` — ต่างจากที่ `database-schema.md` ออกแบบไว้ (1 แถวต่อที่อยู่)

### `admin_accounts` (doc id = Firebase Auth uid)
| Field | คำอธิบาย |
|---|---|
| `full_name` | ชื่อ admin |
| (ไม่มีขั้นตอนสมัครในโค้ด — ต้องสร้าง doc ล่วงหน้าเอง/ผ่าน seed) | |

### `pickup_requests` (doc id = auto-id)
| Field | คำอธิบาย |
|---|---|
| `user_id` | เจ้าของคำขอ |
| `contact_name`, `contact_phone` | ข้อมูลติดต่อ (autofill จากโปรไฟล์ แก้ไขได้) |
| `saved_address_id` | `"address_1"` / `"address_2"` (ไม่ใช่ reference id แบบใน schema เอกสาร) |
| `address_text`, `sub_district`, `landmark` | snapshot ที่อยู่ ณ ตอนสร้าง |
| `notes` | หมายเหตุจากผู้แจ้ง |
| `waste_types` | array ของ string (เลือกได้หลายประเภท) — **ไม่มี collection `waste_type` แยก** เก็บเป็น string ตรงในฟอร์ม |
| `estimated_quantity_description` | ปริมาณโดยประมาณ |
| `requested_date`, `time_slot` | วัน-เวลานัด (`08:00-13:00` / `13:00-18:00`) |
| `status` | ดูหัวข้อ "สถานะ" ด้านล่าง |
| `admin_reviewed_at`, `admin_reviewed_by` | เวลา/admin ที่ confirm หรือ reject |
| `cancelled_at`, `cancelled_by`, `cancel_reason` | ใส่เฉพาะตอน reject (บังคับกรอกเหตุผลใน UI) |
| `created_at` | server timestamp |
| `aiSuggestion` | (ส่วนเสริม) แคชผลสรุปจาก AI — ไม่ใช่ field ทางการใน schema |
| sub-collection `aiLog` | audit log ทุกครั้งที่เรียก AI (type/input/output/model/createdAt) |

**สถานะ (`status`) ที่โค้ดเขียนจริง:** `pending_admin_review` → `open_for_saleng` (confirm) หรือ `cancelled` (reject) เท่านั้น ค่า `pending_match_confirm` / `confirmed` / `completed` มีอยู่ใน seed data และ filter UI แต่ไม่มี code path ใดเขียนค่านี้จริง (รอ flow จับคู่สาเล้งที่ตัดออกจาก module นี้)

### `chat_messages` (doc id = auto-id)
| Field | คำอธิบาย |
|---|---|
| `request_id` | คำขอที่ผูกอยู่ |
| `sender_role` | `user` / `admin` |
| `sender_id` | uid ของผู้ส่ง |
| `message_text` | เนื้อหาข้อความ |
| `sent_at` | server timestamp |

## 3. บทบาทผู้ใช้ (roles ที่มีจริงใน module นี้)

1. **User** (เจ้าของขยะ) — สมัคร/login ด้วยเบอร์โทร, สร้าง/แก้ไข/ลบคำขอของตัวเอง (แก้ไข/ลบได้เฉพาะตอน `pending_admin_review`), จัดการที่อยู่บันทึกไว้ในโปรไฟล์, แชทกับ Admin ต่อคำขอ
2. **Admin** — login ด้วย login identifier, ดูคำขอทั้งหมด (filter ตาม status), Confirm/Reject คำขอ (reject ต้องระบุเหตุผล), แก้ไขวัน-เวลานัดรับได้ทันทีโดยไม่เปลี่ยน status, แชทกับ user, ใช้ปุ่ม AI ช่วยสรุป/เรียบเรียงเหตุผล

**Saleng (คนขับ) ไม่มีบทบาทในโค้ดของ module นี้เลย** — ไม่มีหน้า login/register/dashboard ของสาเล้ง และไม่มี collection `saleng_accounts`

## 4. สิ่งที่ไม่ทำใน Module นี้

ตาม `SCOPE.md` และยืนยันจากโค้ดจริงว่ายังไม่มี code path ใดแตะเรื่องเหล่านี้:

- **ฝั่งสาเล้ง (คนขับ) ทั้งหมด** — ไม่มีสมัคร/login/OTP, ไม่มีหน้ารับงาน/self-pick, ไม่มีการอนุมัติบัญชีสาเล้งโดย Admin
- **การจับคู่งาน (matching)** — ไม่มี collection `request_match`, ไม่มี self-pick หรือ admin-assign สาเล้ง, สถานะ `pending_match_confirm` / `confirmed` / `completed` ยังไม่ถูกเขียนจริง
- **ใบเสร็จและค่าธรรมเนียม** — ไม่มี `receipt`, `receipt_item`, `saleng_fee_ledger_entry`, `saleng_wallet_balance`
- **ราคากลางอ้างอิงแบบจัดการได้** — ไม่มี collection `waste_type` แยกต่างหากหรือ `waste_reference_price`; หน้า "ราคาขยะ" เป็น mockup ข้อมูลนิ่งเท่านั้น Admin ยังตั้ง/แก้ราคากลางจริงไม่ได้
- **รูปถ่ายขยะแนบคำขอ** (`request_photo`) — schema เอกสารออกแบบไว้ (สูงสุด 5 ภาพ) แต่โค้ดฟอร์มสร้างคำขอปัจจุบันไม่มีช่องอัปโหลดรูป (แม้ admin dashboard เตรียม UI แสดง `photo_urls` ไว้รอ แต่ไม่มีจุดเขียนข้อมูลนี้)
- **การระงับบัญชี (suspend)** — `user_account.status` มีแค่ `active` ตอน register, ไม่มีหน้า/ปุ่มให้ Admin ระงับบัญชี user หรือ saleng
- **สมาชิกรายเดือน/โฆษณาในแอป** (`membership_tier`, `ad_banner`) — เป็น placeholder ในเอกสารเผื่ออนาคตเท่านั้น ไม่มีในโค้ด
- **แต้มสะสม (points)** ในหน้า dashboard/โปรไฟล์ — เป็นตัวเลข mockup คงที่ (120) ไม่ได้คำนวณจากธุรกรรมจริง
- **cancel_reason จาก business rule ใหม่** — ตาม `SCOPE.md` มีหมายเหตุว่าโค้ด reject เดิมยังไม่ใส่ field นี้ ปัจจุบัน (ตรวจโค้ดล่าสุด) **ได้ทำแล้ว**: ปุ่ม Reject บังคับกรอกเหตุผลก่อนยืนยันเสมอ

## Reference

- [SCOPE.md](SCOPE.md)
- [docs/02-design/02-technical/database-schema.md](docs/02-design/02-technical/database-schema.md)
- [docs/01-requirements/01-spec/20260819-001-saleng-pickup-request.md](docs/01-requirements/01-spec/20260819-001-saleng-pickup-request.md)
