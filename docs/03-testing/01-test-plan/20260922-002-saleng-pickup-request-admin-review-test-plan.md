# Test Plan — ตรวจสอบและจัดการคำขอ (ฝั่ง Admin: Confirm / Reject / แก้ไขวัน-เวลา / แชท)

## อ้างอิงจาก

- Spec: [[../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- Prototype (v1 — หน้าจอฝั่ง Admin ที่เกี่ยวข้อง กับ **หมายเหตุ mismatch สำคัญ** ดู Open Items ข้อ 1):
  - [[../../02-design/01-prototypes/v1/20260820-017-admin-request-list-prototype|Admin — รายการคำขอที่เข้ามาทั้งหมด]]
  - [[../../02-design/01-prototypes/v1/20260820-018-admin-request-detail-prototype|Admin — รายละเอียดคำขอ + Confirm/Cancel + แชท + Assign สาเล้ง]]

## ขอบเขตการทดสอบ (In Scope / Out of Scope)

**In Scope** (เฉพาะฝั่ง Admin ที่ implement จริงใน [webapp/admin/dashboard/app.js](../../../webapp/admin/dashboard/app.js) ตามที่ orchestrator กำหนด — เติมช่องว่างที่เอกสาร [[20260820-001-saleng-pickup-request-user-flow-test-plan|Test Plan ฝั่ง User]] ระบุไว้ว่าเป็น Out of Scope):

- ดูรายการคำขอทั้งหมด กรองด้วย filter chip ตามสถานะ
- Admin กด **Confirm** คำขอ: `pending_admin_review` → `open_for_saleng` (ตั้งค่า `admin_reviewed_at` / `admin_reviewed_by`)
- Admin กด **Reject/ลบ** คำขอ: `pending_admin_review` → `cancelled` — ปุ่มยืนยันใน modal ต้องถูก disable จนกว่าจะกรอก `cancel_reason` (เลือกจาก dropdown เทมเพลต, พิมพ์เอง, หรือให้ AI ช่วยเรียบเรียง) แล้วตั้งค่า `cancelled_at` / `cancelled_by="admin"` / `cancel_reason`
- Admin **แก้ไขวัน-เวลานัดรับ** (`requested_date` / `time_slot`) — ทำได้ทุกเมื่อ **ยกเว้น** สถานะ `cancelled` และ `completed` และ **ต้องไม่เปลี่ยนค่า `status`**
- แชทกับ user ต่อคำขอ (collection `chat_messages`, `sender_role` เป็น `"admin"`/`"user"`, real-time)

**Out of Scope** (ไม่แตก test case ในเอกสารนี้):

- Business logic ฝั่ง Saleng ทั้งหมด, `request_match`/การจับคู่งาน (self-pick/admin-assign), ใบเสร็จ, การจัดการราคากลางอ้างอิง (`waste_reference_price`) — ยังไม่มี code path ใดใน module รอบนี้ (ดู `SCOPE.md`/`spec.md`)
- ปุ่ม AI ช่วยเสริมของ Admin dashboard: 🤖 "สรุปคำร้องนี้" / "สรุปรายการที่แสดงอยู่" / "ช่วยเรียบเรียงให้สุภาพ" (AI-drafted cancel reason) — เป็น implementation extra ที่ไม่อยู่ใน business rule ทางการของ spec ตามที่ orchestrator กำหนดให้ข้าม (โค้ดมีคอมเมนต์ยืนยันว่าไม่แตะ field `status` เลย)
- หน้าจัดการสาเล้ง (`webapp/admin/dashboard` ไม่มีหน้านี้จริงในโค้ด) และหน้าราคากลาง — ตาม prototype #019/#020 ยังไม่ implement เป็นโค้ดจริง

## ขอบเขตการทดสอบ — หมายเหตุ mismatch ระหว่าง Prototype กับโค้ดจริง (สำคัญ)

Prototype v1 (#017, #018) ออกแบบไว้ **ก่อน** business rule ใหม่ 2 ข้อที่เพิ่มเข้า spec เมื่อ 2026-08-31 (บังคับ `cancel_reason`, แก้ไขวัน-เวลาได้ทันที) และก่อนตัดสินใจตัด scope ฝั่งสาเล้ง/matching ออกจากโมดูลนี้ (ดู `SCOPE.md`) ทำให้ prototype **ไม่ตรงกับพฤติกรรมจริงของ [webapp/admin/dashboard/app.js](../../../webapp/admin/dashboard/app.js)** หลายจุด:

1. Prototype #018 ไม่มีปุ่ม/ฟอร์ม "แก้ไขวัน-เวลานัดรับ" เลยในหน้ารายละเอียด แต่โค้ดจริงมีฟีเจอร์นี้ (business rule ใหม่ที่ยังไม่ย้อนกลับไปอัปเดต prototype)
2. Prototype #018 ระบุว่ากด "Confirm คำขอนี้" **ไม่ต้องมี dialog ยืนยันเพิ่ม** แต่โค้ดจริงเปิด confirm modal เสมอทุกครั้ง (แม้ไม่มีช่องเหตุผลสำหรับ action confirm)
3. Prototype #018 ระบุ dialog ยกเลิก/ปฏิเสธมีแค่คำอธิบาย + ปุ่ม 2 ปุ่ม ไม่มีช่องกรอกเหตุผลเลย ต่างจากโค้ดจริงที่บังคับกรอก `cancel_reason` ก่อนปุ่มยืนยันจะกดได้
4. Prototype ทั้ง 2 หน้าออกแบบเป็น sidebar navigation + 2-column desktop layout พร้อม vertical timeline stepper, saleng picker (สำหรับ admin-assign), และ chat drawer แยกจากเนื้อหา — โค้ดจริงเป็น **accordion card list หน้าเดียว** ไม่มี sidebar, ไม่มี timeline stepper, ไม่มี saleng picker (เพราะ matching ถูกตัด scope ออก), แชทฝังอยู่ในแต่ละ card แทน drawer แยก
5. Prototype #017 ออกแบบ filter เป็น 7 tab (รวม "รอ Admin confirm ขั้นสุดท้าย") พร้อมช่องค้นหาและ pagination + data table แต่โค้ดจริงมี filter chip เพียง 5 อัน ("รอตรวจสอบ" / "เปิดให้สาเล้งรับงาน" / "ยืนยันแล้ว" / "ยกเลิกแล้ว" / "ทั้งหมด"), ไม่มีช่องค้นหา, ไม่มี pagination, ใช้ card list แทน data table

เนื่องจาก mismatch เหล่านี้อยู่ระดับ layout/interaction ทั้งหน้า เอกสารนี้จึง**แตก test case ตามพฤติกรรมโค้ดจริง** ใน `webapp/admin/dashboard/` เป็นหลัก ไม่ใช่ตาม prototype — ถ้าต้องการให้ UI ตรงกับ prototype ต้อง refactor โค้ดหรืออัปเดต prototype ให้ตรงกับ business rule ใหม่ก่อน แล้วจึง review test case นี้ใหม่อีกครั้ง (ดูเพิ่มเติมที่ Open Items)

## Test Environment / Precondition

- มีบัญชี Admin ทดสอบอย่างน้อย 1 บัญชีที่มี doc อยู่ใน collection `admin_accounts` (login ผ่าน Firebase Auth ด้วย login identifier ตาม `auth-helpers.js`)
- มีคำขอทดสอบสถานะ `pending_admin_review` อย่างน้อย 2–3 รายการที่สร้างจริงจากฝั่ง User ผ่าน `webapp/pickup-request/` (ใช้สำหรับทดสอบ Confirm/Reject/แก้ไขวัน-เวลา)
- มีคำขอที่ seed ไว้ล่วงหน้าด้วย `webapp/seed/` ครอบคลุมสถานะ `open_for_saleng`, `confirmed`, `cancelled` อย่างน้อย 1 รายการต่อสถานะ (สำหรับสถานะ `pending_match_confirm` และ `completed` ที่ไม่มี filter chip เฉพาะและไม่มี code path เขียนถึง ให้ seed ไว้เพื่อทดสอบผ่าน filter "ทั้งหมด" เท่านั้น)
- มีบัญชี User ทดสอบอย่างน้อย 1 บัญชี พร้อมเปิด 2 browser session พร้อมกัน (User ฝั่งหนึ่ง, Admin ฝั่งหนึ่ง) สำหรับ test case ที่ต้องตรวจสอบ real-time (รายการคำขอใหม่, แชท)
- ทราบ Firestore Security Rules ปัจจุบันของ `pickup_requests`/`chat_messages` เพื่อจำลอง error state permission-denied (เช่น login ด้วยบัญชีที่ไม่มี doc ใน `admin_accounts`)

## Test Cases

### 1. รายการคำขอ + Filter สถานะ

| ID | Scenario | Precondition | Steps | Test Data | Expected Result | Priority |
|----|----------|--------------|-------|-----------|------------------|----------|
| TC-002-001 | Filter เริ่มต้นหลัง login คือ "รอตรวจสอบ" | login เข้าสู่ Admin dashboard สำเร็จ | 1. Login ด้วยบัญชี Admin | มีคำขอสถานะ `pending_admin_review` อย่างน้อย 1 รายการปนกับสถานะอื่น | Chip "รอตรวจสอบ" active โดยอัตโนมัติ และรายการที่แสดงมีเฉพาะคำขอสถานะ `pending_admin_review` เท่านั้น | High |
| TC-002-002 | กรองด้วย chip "เปิดให้สาเล้งรับงาน" | มีคำขอสถานะ `open_for_saleng` อย่างน้อย 1 รายการ | 1. กด chip "เปิดให้สาเล้งรับงาน" | คำขอสถานะ `open_for_saleng` | รายการแสดงเฉพาะคำขอสถานะ `open_for_saleng` เท่านั้น และ chip นี้ถูก highlight เป็น active | High |
| TC-002-003 | กรองด้วย chip "ยืนยันแล้ว" (สถานะที่ไม่มี code path เขียนถึงในโค้ดปัจจุบัน) | มีคำขอสถานะ `confirmed` ที่ seed ไว้ล่วงหน้าอย่างน้อย 1 รายการ | 1. กด chip "ยืนยันแล้ว" | คำขอสถานะ `confirmed` (จาก seed) | รายการแสดงคำขอสถานะ `confirmed` ได้ถูกต้อง (แม้สถานะนี้ยังไม่มี action ใดเขียนถึงได้จริงในโค้ด แต่การอ่าน/แสดงผลต้องทำงานปกติ) | Medium |
| TC-002-004 | กรองด้วย chip "ยกเลิกแล้ว" | มีคำขอสถานะ `cancelled` อย่างน้อย 1 รายการ | 1. กด chip "ยกเลิกแล้ว" | คำขอสถานะ `cancelled` | รายการแสดงเฉพาะคำขอสถานะ `cancelled` เท่านั้น | Medium |
| TC-002-005 | กรองด้วย chip "ทั้งหมด" เรียงจากใหม่ไปเก่า | มีคำขอหลายสถานะปนกัน | 1. กด chip "ทั้งหมด" | คำขอ ≥ 4 รายการ สถานะต่างกัน (รวม `pending_match_confirm`/`completed` ที่ seed ไว้) | รายการแสดงคำขอทุกสถานะโดยไม่กรอง เรียงจาก `created_at` ล่าสุดไปเก่าสุด | Medium |
| TC-002-006 | Empty state — ไม่มีคำขอในหมวดที่เลือก | เลือก filter ที่ไม่มีคำขอตรงเงื่อนไข | 1. กด chip ที่ไม่มีข้อมูลตรงกับสถานะนั้นเลย | - | แสดงข้อความ "ไม่มีคำขอในหมวดนี้" แทนรายการ | Medium |
| TC-002-007 | Error state — โหลดรายการไม่สำเร็จ (permission denied) | login ด้วยบัญชีที่ไม่มี doc อยู่ใน `admin_accounts` แต่หลุดผ่าน auth guard เข้ามาถึงจุด subscribe ได้ (หรือจำลอง Security Rules ปฏิเสธ) | 1. โหลดหน้า Admin dashboard ขณะ query ถูกปฏิเสธสิทธิ์ | - | แสดงข้อความ "โหลดรายการไม่สำเร็จ (บัญชีนี้ไม่มีสิทธิ์ admin ตาม Security Rules)" แทนรายการ | Medium |
| TC-002-008 | คลิกที่ header การ์ดเพื่อเปิด/ปิดรายละเอียด (accordion) | มีคำขออย่างน้อย 1 รายการในรายการ | 1. คลิก header ของการ์ดคำขอ 2. คลิกซ้ำอีกครั้ง | - | คลิกครั้งแรก การ์ดขยายแสดงรายละเอียด (address, ปริมาณ, แชท ฯลฯ) คลิกครั้งที่สอง การ์ดหุบกลับ | Medium |
| TC-002-009 | รายการคำขอใหม่จาก User ปรากฏแบบ real-time โดยไม่ต้อง refresh | Admin เปิดหน้า dashboard ค้างไว้ที่ filter "รอตรวจสอบ" | 1. เปิดหน้า Admin dashboard ค้างไว้ 2. จากอีก browser session ให้ User ส่งคำขอใหม่ผ่าน `webapp/pickup-request/` | คำขอใหม่จาก User | คำขอใหม่ปรากฏในรายการฝั่ง Admin ทันทีโดยไม่ต้อง refresh หน้า (onSnapshot) | High |
| TC-002-010 | สถานะ `pending_match_confirm` และ `completed` ไม่มี filter chip เฉพาะให้กรองตรงๆ | มีคำขอสถานะ `pending_match_confirm` และ `completed` ที่ seed ไว้ | 1. ไล่ดู chip ทั้งหมดที่มีอยู่ (รอตรวจสอบ/เปิดให้สาเล้งรับงาน/ยืนยันแล้ว/ยกเลิกแล้ว/ทั้งหมด) | - | ไม่มี chip ใดกรองเฉพาะสถานะ `pending_match_confirm` หรือ `completed` ได้ตรงๆ ต้องใช้ chip "ทั้งหมด" แล้วไล่หาเองเท่านั้น (ยืนยันสถานะปัจจุบันของโค้ด ไม่ใช่บั๊ก) | Low |

### 2. Admin กด Confirm คำขอ

| ID | Scenario | Precondition | Steps | Test Data | Expected Result | Priority |
|----|----------|--------------|-------|-----------|------------------|----------|
| TC-002-011 | กด "Confirm" เปิด modal โดยไม่มีช่องกรอกเหตุผลและปุ่มยืนยัน enabled ทันที | เปิดการ์ดรายละเอียดคำขอสถานะ `pending_admin_review` | 1. กดปุ่ม "Confirm" ในการ์ดรายละเอียด | - | เปิด modal หัวข้อ "ยืนยัน Confirm คำขอนี้?" ไม่มี dropdown/textarea เหตุผลแสดง และปุ่ม "ยืนยัน" ไม่ถูก disable | High |
| TC-002-012 | กด "ยืนยัน" ใน Confirm modal สำเร็จ | เปิด Confirm modal ของคำขอสถานะ `pending_admin_review` ไว้แล้ว | 1. กดปุ่ม "ยืนยัน" ใน modal | - | สถานะเปลี่ยนเป็น `open_for_saleng`, ตั้งค่า `admin_reviewed_at`/`admin_reviewed_by` เป็น timestamp/uid ของ Admin ที่กด, แสดง toast "Confirm สำเร็จ", modal ปิด, คำขอนี้หายไปจาก filter "รอตรวจสอบ" และไปปรากฏใน filter "เปิดให้สาเล้งรับงาน" แทน | High |
| TC-002-013 | กดปุ่ม "ยกเลิก" ใน Confirm modal (ปิดโดยไม่ทำรายการ) | เปิด Confirm modal ไว้แล้ว | 1. กดปุ่ม "ยกเลิก" (modalCancelBtn) | - | Modal ปิดลง สถานะคำขอไม่เปลี่ยนแปลงใดๆ | Medium |
| TC-002-014 | ปุ่ม Confirm/Reject ไม่แสดงเมื่อสถานะไม่ใช่ `pending_admin_review` | เปิดการ์ดรายละเอียดคำขอสถานะ `open_for_saleng`/`confirmed`/`cancelled` | 1. เปิดการ์ดรายละเอียดของคำขอสถานะดังกล่าว | - | ไม่มีปุ่ม "Confirm" และ "ลบ / Reject" แสดงในการ์ดนั้นเลย | High |

### 3. Admin กด Reject/ลบคำขอ (บังคับกรอก cancel_reason)

| ID | Scenario | Precondition | Steps | Test Data | Expected Result | Priority |
|----|----------|--------------|-------|-----------|------------------|----------|
| TC-002-015 | กด "ลบ / Reject" เปิด modal พร้อมช่องเหตุผล และปุ่มยืนยันถูก disable เมื่อยังไม่มีเหตุผล | เปิดการ์ดรายละเอียดคำขอสถานะ `pending_admin_review` | 1. กดปุ่ม "ลบ / Reject" | - | เปิด modal หัวข้อ "ยืนยัน Reject/ลบคำขอนี้?" แสดง dropdown เทมเพลตเหตุผล + textarea + ปุ่ม AI ช่วยเรียบเรียง และปุ่ม "ยืนยัน" ถูก disable ทันที (เพราะช่องเหตุผลว่าง) | High |
| TC-002-016 | เลือกเหตุผลจาก dropdown เทมเพลต → auto กรอก textarea และปลดล็อกปุ่มยืนยัน | เปิด Reject modal ไว้แล้ว | 1. เลือกตัวเลือกจาก dropdown เช่น "ที่อยู่นอกเขตพื้นที่ให้บริการ" | ตัวเลือกเทมเพลต | Textarea ถูกเติมข้อความสำเร็จรูปที่ตรงกับตัวเลือกที่เลือกโดยอัตโนมัติ และปุ่ม "ยืนยัน" เปลี่ยนเป็น enabled | High |
| TC-002-017 | พิมพ์เหตุผลเองในช่อง textarea → ปลดล็อกปุ่มยืนยัน | เปิด Reject modal ไว้แล้ว | 1. พิมพ์ข้อความเหตุผลเองในช่อง textarea | ข้อความเหตุผลที่ไม่ว่าง | ปุ่ม "ยืนยัน" เปลี่ยนจาก disabled เป็น enabled ทันทีที่มีตัวอักษรที่ไม่ใช่ช่องว่าง | High |
| TC-002-018 | พิมพ์เฉพาะช่องว่าง (space) ในช่องเหตุผล → ปุ่มยืนยันยังคง disabled | เปิด Reject modal ไว้แล้ว | 1. พิมพ์เฉพาะตัวอักษรเว้นวรรคในช่อง textarea | " " (เว้นวรรคล้วน) | ปุ่ม "ยืนยัน" ยังคง disabled อยู่ (ตรวจสอบด้วย trim() ไม่ใช่แค่ความยาว string) | Medium |
| TC-002-019 | กด "ยืนยัน" Reject สำเร็จเมื่อมีเหตุผลแล้ว | เปิด Reject modal และกรอก/เลือกเหตุผลไว้แล้ว | 1. กดปุ่ม "ยืนยัน" | เหตุผล เช่น "ลูกค้าแจ้งขอยกเลิกเอง" | สถานะเปลี่ยนเป็น `cancelled`, ตั้งค่า `cancelled_at`=timestamp, `cancelled_by`="admin", `cancel_reason`=ข้อความที่กรอก, พร้อมตั้งค่า `admin_reviewed_at`/`admin_reviewed_by` ด้วย, แสดง toast "ลบ/Reject สำเร็จ", modal ปิด, คำขอนี้ไปปรากฏใน filter "ยกเลิกแล้ว" | High |
| TC-002-020 | กดปุ่ม "ยกเลิก" ปิด Reject modal โดยไม่ยืนยัน | เปิด Reject modal และพิมพ์เหตุผลไว้บางส่วนแล้ว | 1. กดปุ่ม "ยกเลิก" (modalCancelBtn) | - | Modal ปิดลง สถานะคำขอไม่เปลี่ยนแปลง และเปิด modal ใหม่ครั้งถัดไปช่องเหตุผลจะถูกล้างค่าเริ่มต้นเสมอ (ไม่ค้างข้อความเดิม) | Medium |

### 4. Admin แก้ไขวัน-เวลานัดรับ

| ID | Scenario | Precondition | Steps | Test Data | Expected Result | Priority |
|----|----------|--------------|-------|-----------|------------------|----------|
| TC-002-021 | ปุ่ม "แก้ไขวัน-เวลานัดรับ" แสดงในสถานะที่ไม่ใช่ cancelled/completed | เปิดการ์ดรายละเอียดคำขอสถานะ `pending_admin_review` / `open_for_saleng` / `confirmed` | 1. เปิดการ์ดรายละเอียดของคำขอแต่ละสถานะดังกล่าว | - | ปุ่ม "🗓️ แก้ไขวัน-เวลานัดรับ" แสดงอยู่ในการ์ดรายละเอียดของทุกสถานะข้างต้น | High |
| TC-002-022 | ปุ่ม "แก้ไขวัน-เวลานัดรับ" ไม่แสดงเมื่อสถานะ `cancelled` | เปิดการ์ดรายละเอียดคำขอสถานะ `cancelled` | 1. เปิดการ์ดรายละเอียด | - | ไม่มีปุ่ม/ฟอร์มแก้ไขวัน-เวลาแสดงในการ์ดนี้เลย | High |
| TC-002-023 | ปุ่ม "แก้ไขวัน-เวลานัดรับ" ไม่แสดงเมื่อสถานะ `completed` | เปิดการ์ดรายละเอียดคำขอสถานะ `completed` (seed) | 1. เปิดการ์ดรายละเอียด | - | ไม่มีปุ่ม/ฟอร์มแก้ไขวัน-เวลาแสดงในการ์ดนี้เลย | High |
| TC-002-024 | เปิดฟอร์มแก้ไขวัน-เวลาแล้ว pre-fill ค่าปัจจุบันถูกต้อง | คำขอมี `requested_date`/`time_slot` ที่ทราบค่าอยู่แล้ว | 1. กดปุ่ม "🗓️ แก้ไขวัน-เวลานัดรับ" | คำขอที่มี `requested_date`="2569-08-01", `time_slot`="08:00-13:00" | ฟอร์มเปิดออก ช่อง date แสดงวันที่เดิม และ radio ช่วงเวลาที่ตรงกับค่าเดิมถูก checked ไว้ | Medium |
| TC-002-025 | แก้ไขวัน-เวลาแล้วกด "บันทึก" สำเร็จโดยไม่เปลี่ยนสถานะ | เปิดฟอร์มแก้ไขวัน-เวลาไว้แล้ว | 1. เปลี่ยนวันที่ใหม่ 2. เลือกช่วงเวลาใหม่ 3. กด "บันทึก" | วันที่/ช่วงเวลาใหม่ที่ถูกต้อง | `requested_date`/`time_slot` ถูกอัปเดตเป็นค่าใหม่ในทันที, ค่า `status` ของคำขอยังคงเดิมไม่เปลี่ยนแปลง, แสดง toast "บันทึกวัน-เวลาใหม่แล้ว" และฟอร์มปิดกลับ | High |
| TC-002-026 | ล้างช่องวันที่ให้ว่างแล้วกด "บันทึก" | เปิดฟอร์มแก้ไขวัน-เวลาไว้แล้ว | 1. ล้างค่าในช่อง date ให้ว่าง 2. กด "บันทึก" | ช่องวันที่ว่าง | แสดง toast แจ้งเตือน "กรุณาเลือกวันที่และช่วงเวลาให้ครบ" และไม่มีการเขียนข้อมูลลง Firestore | Medium |
| TC-002-027 | กด "ปิด" ฟอร์มแก้ไขวัน-เวลาโดยไม่กด "บันทึก" | เปิดฟอร์มแก้ไขวัน-เวลาและแก้ค่าบางส่วนไว้แล้ว | 1. แก้ไขวันที่/ช่วงเวลาบางส่วน 2. กดปุ่ม "ปิด" | - | ฟอร์มหุบกลับโดยไม่มีการบันทึกข้อมูลใดๆ ค่า `requested_date`/`time_slot` เดิมของคำขอยังไม่เปลี่ยน | Low |

### 5. แชทกับ User (ฝั่ง Admin)

| ID | Scenario | Precondition | Steps | Test Data | Expected Result | Priority |
|----|----------|--------------|-------|-----------|------------------|----------|
| TC-002-028 | Empty state — ยังไม่เคยมีข้อความในคำขอนี้ | คำขอนี้ยังไม่เคยมีการแชทมาก่อน | 1. เปิดการ์ดรายละเอียดของคำขอนี้ (ครั้งแรกที่เปิด จะ subscribe แชท) | - | ส่วนแชทแสดงข้อความ "ยังไม่มีข้อความ" | Medium |
| TC-002-029 | Admin ส่งข้อความถึง user สำเร็จด้วยปุ่ม "ส่ง" | เปิดการ์ดรายละเอียดของคำขอใดคำขอหนึ่งไว้แล้ว | 1. พิมพ์ข้อความในช่อง input 2. กดปุ่ม "ส่ง" | ข้อความทดสอบ | ข้อความปรากฏทันทีในกล่องแชท ชิดขวา label "คุณ (Admin)" และเลื่อนไปด้านล่างสุดอัตโนมัติ | High |
| TC-002-030 | Admin ส่งข้อความด้วยการกด Enter (ไม่กดปุ่ม "ส่ง") | เปิดการ์ดรายละเอียดของคำขอไว้แล้ว | 1. พิมพ์ข้อความในช่อง input 2. กด Enter | ข้อความทดสอบ | ข้อความถูกส่งสำเร็จเช่นเดียวกับการกดปุ่ม "ส่ง" | Medium |
| TC-002-031 | ข้อความที่ส่งจากฝั่ง User ปรากฏถูกต้องในฝั่ง Admin | User ส่งข้อความมาในคำขอนี้ผ่านหน้าแชทของ User | 1. เปิดการ์ดรายละเอียดของคำขอนี้ในฝั่ง Admin | ข้อความจาก user | ข้อความจาก user แสดงชิดซ้าย label "ลูกค้า" คนละสไตล์กับข้อความของ Admin | Medium |
| TC-002-032 | ข้อความใหม่จาก User ปรากฏแบบ real-time ในฝั่ง Admin โดยไม่ต้อง refresh | เปิดการ์ดรายละเอียดของคำขอค้างไว้ที่ฝั่ง Admin | 1. เปิดการ์ดรายละเอียดค้างไว้ 2. จากอีก browser session ให้ User ส่งข้อความใหม่มาในคำขอนี้ | ข้อความใหม่จาก user | ข้อความปรากฏในกล่องแชทฝั่ง Admin ทันทีโดยไม่ต้อง refresh หน้า | High |
| TC-002-033 | พยายามส่งข้อความว่าง | เปิดการ์ดรายละเอียดของคำขอไว้แล้ว | 1. ไม่พิมพ์ข้อความใดๆ (ช่อง input ว่าง) 2. กดปุ่ม "ส่ง" | ช่อง input ว่าง | ไม่มีข้อความใหม่ถูกสร้างขึ้นเลย (ระบบไม่ทำอะไรเมื่อข้อความว่าง) | Low |
| TC-002-034 | แชทยังใช้งานได้แม้คำขออยู่ในสถานะ `cancelled`/`completed` | เปิดการ์ดรายละเอียดของคำขอสถานะ `cancelled` หรือ `completed` | 1. เปิดการ์ดรายละเอียด 2. พิมพ์และส่งข้อความ | ข้อความทดสอบ | ส่วนแชทแสดงและใช้งานส่งข้อความได้ตามปกติ ไม่ถูกผูกเงื่อนไขกับสถานะคำขอ | Low |

## Negative / Edge Cases

รวมอยู่ในตาราง Test Cases ของแต่ละหมวดข้างต้นแล้ว จุดที่เด่นที่สุดคือ:

- TC-002-015 / TC-002-018 / TC-002-019 — บังคับกรอก `cancel_reason` ก่อนยืนยัน Reject ได้เสมอ (business rule สำคัญที่สุดของโมดูลนี้)
- TC-002-022 / TC-002-023 — ปุ่มแก้ไขวัน-เวลาต้องไม่แสดงหลังคำขอ cancelled/completed
- TC-002-014 — ปุ่ม Confirm/Reject ต้องไม่แสดงเมื่อไม่ใช่สถานะ `pending_admin_review`
- TC-002-025 — แก้ไขวัน-เวลาต้อง**ไม่**เปลี่ยนค่า `status` (คนละ action กับ confirm/cancel ตาม business rule)
- TC-002-026 — validation ป้องกันบันทึกวัน-เวลาที่ไม่ครบ

## Open Items

1. **Prototype v1 (#017/#018) ไม่ตรงกับโค้ดจริงในหลายจุดระดับ layout/interaction** — ดูรายละเอียดครบใน "ขอบเขตการทดสอบ — หมายเหตุ mismatch" ด้านบน (ไม่มีฟอร์มแก้ไขวัน-เวลาใน prototype, prototype ระบุ confirm ไม่ต้องมี dialog แต่โค้ดมีเสมอ, prototype ไม่มีช่องกรอกเหตุผลใน dialog ยกเลิก, ไม่มี sidebar/timeline stepper/saleng picker ในโค้ดจริง, filter chip เหลือ 5 อันจาก 7 tab ที่ออกแบบไว้) — ควร refactor โค้ดหรืออัปเดต prototype ให้ตรงกันก่อน แล้ว review test case นี้ใหม่
2. **สถานะ `pending_match_confirm` และ `completed` ไม่มี filter chip เฉพาะในโค้ดจริง** ต่างจากที่คาดไว้ตอนวางสโคป (มีแค่ chip "ทั้งหมด" ที่จะรวมสถานะเหล่านี้ปนกับสถานะอื่น) — ถ้าต้องการ chip กรองเฉพาะ 2 สถานะนี้ต้องเพิ่มโค้ด/ออกแบบ UI เพิ่มก่อน
3. **ไม่มี business rule ระบุ constraint ของเนื้อหา `cancel_reason`** (ความยาวขั้นต่ำ/สูงสุด, คำต้องห้าม ฯลฯ) — โค้ดปัจจุบันตรวจสอบแค่ "ไม่ว่างเปล่าหลัง trim" เท่านั้น จึงยังไม่มี test case ตรวจสอบ constraint เนื้อหาเพิ่มเติม รอยืนยัน business rule ก่อน
4. **ไม่มี business rule ระบุ constraint ของวันที่ที่ Admin แก้ไขได้** (เช่น ห้ามเลือกวันที่ในอดีต) และโค้ดจริงก็ไม่มี validation ส่วนนี้ (input type="date" ไม่ได้ตั้งค่า `min`) — จึงยังไม่มี test case ครอบคลุมกรณีนี้ รอยืนยัน business rule ก่อนจะแตก test case negative เพิ่ม
5. **ปุ่ม AI-assist (สรุปคำขอ/ช่วยเรียบเรียงเหตุผล/สรุปรายการที่แสดงอยู่)** เป็นส่วนเสริมที่ implement แล้วจริงแต่ไม่อยู่ใน business rule ทางการของ spec ตามที่ orchestrator กำหนดให้ข้ามในเอกสารนี้ — หากต้องการ test plan ของฟีเจอร์นี้ในอนาคต ควรเปิดเป็นเอกสารแยกและยืนยัน scope ก่อน
6. **Business logic ฝั่ง Saleng/matching/ใบเสร็จ/ราคากลาง** ไม่อยู่ในสโคปของเอกสารนี้ตามที่ orchestrator กำหนด — เมื่อ module ถัดไปเปิด scope ฝั่งนี้ ควรตรวจสอบว่าผลลัพธ์ที่ Admin เห็น (เช่น สถานะ `pending_match_confirm`/`confirmed`/`completed` ที่จะมี code path เขียนถึงจริง) ยังสอดคล้องกับ test case ในเอกสารนี้ (เช่น TC-002-010, TC-002-021 ถึง TC-002-023) หรือไม่

## Reference

- [[../index|03-testing]]
- [[index|01-test-plan]]
