# BACKLOG (root-level)

> ไฟล์นี้คนละไฟล์กับ [docs/01-requirements/backlog.md](docs/01-requirements/backlog.md) (ซึ่ง sync กับ requirement spec แต่ละใบผ่าน skill `create-requirement` — ห้ามแก้มือ)
> ไฟล์นี้เก็บ backlog เชิงเทคนิค/ปฏิบัติการที่พบจากการตรวจ live site และการทดสอบจริงเมื่อ 2026-09-22 โดยเฉพาะ

## 1. ย้าย AI API key (`webapp/ai-config.js`) ออกจาก client ไปเป็น server-side proxy

**ปัญหา**: `webapp/ai-config.js` เก็บ OpenRouter API key จริงไว้ตรงๆ ในไฟล์ที่ถูก `<script src="../../ai-config.js">` โหลดเข้าหน้า `webapp/admin/dashboard/index.html` แม้ไฟล์นี้จะอยู่ใน `.gitignore` (บรรทัด 24 — ไม่เคย commit เข้า git จริง ตรวจแล้วด้วย `git log --all -- webapp/ai-config.js` ไม่มี history เลย) แต่ `firebase.json` → `hosting.ignore` มีแค่ `["firebase.json", "**/.*", "**/node_modules/**"]` ซึ่ง**ไม่ครอบคลุม `webapp/ai-config.js` เลย** — ถ้ามีคนรัน `firebase deploy` จากเครื่องที่มีไฟล์นี้อยู่จริง (จำเป็นต้องมีเพื่อให้ปุ่ม AI บน admin dashboard ทำงานได้) ไฟล์นี้จะถูกอัปโหลดขึ้น Firebase Hosting ไปด้วยโดยไม่มีอะไรกันไว้เลย

**สถานะปัจจุบัน (ตรวจสอบจริง 2 ครั้งแยกกัน เมื่อ 2026-09-22)**: เปิด `https://callsaleng.web.app/ai-config.js` ตรงๆ ได้ผลลัพธ์ **404 "Page Not Found"** ทั้ง 2 ครั้ง — แปลว่า ณ ตอนนี้ **คีย์ยังไม่ได้หลุดออกไปจริงผ่าน path นี้** (ต่างจากที่รายงานก่อนหน้าของ sub-agent ระบุไว้ว่า "publicly fetchable" ทันที ซึ่งเป็นการสรุปเกินจากกลไกที่เป็นไปได้ ไม่ใช่ผลตรวจสอบจริง ณ ขณะนี้ — แก้ไขให้ตรงกับผลตรวจจริงแล้ว) ความเสี่ยงนี้จึงเป็น **latent risk ที่จะเกิดขึ้นทันทีที่มีการ deploy รอบใหม่จากเครื่องที่มีไฟล์นี้** ไม่ใช่การรั่วไหลที่ยืนยันแล้วว่ากำลังเกิดอยู่ ณ ขณะนี้ — ยังคงต้องแก้ก่อนที่จะ deploy ครั้งต่อไป ไม่ควรปล่อยผ่านเพราะโชคดีที่รอบล่าสุดไม่ได้พาไฟล์นี้ขึ้นไปด้วย ต่างจาก `firebaseConfig` ใน `webapp/firebase-config.js` ที่ตั้งใจ public โดยออกแบบ (ความปลอดภัยจริงอยู่ที่ Firestore Rules ไม่ใช่การซ่อนค่านี้) — กรณีนี้เป็น secret ของบริการภายนอก (OpenRouter) ที่ไม่ควรอยู่ฝั่ง client เลย

**แนวทางแก้ที่เสนอ**: ย้าย logic เรียก OpenRouter (ปัจจุบันอยู่ที่ `webapp/ai-helpers.js` + `window.OPENROUTER_CONFIG` จาก `ai-config.js`) ไปเป็น server-side proxy (เช่น Cloud Function/Cloud Run endpoint เดียว ที่รับ prompt จาก client แล้ว inject API key ฝั่ง server เอง) แล้วให้ `webapp/admin/dashboard/app.js` เรียก endpoint นั้นแทนการเรียก OpenRouter ตรงจาก browser — เมื่อทำแล้วให้ลบ `webapp/ai-config.js` ออกจาก hosting ทันที (หรือย้าย key จริงไปเก็บใน Cloud Function's environment config / Secret Manager แทน)

**ผลกระทบถ้าไม่แก้**: รอบ deploy ล่าสุดไม่ได้พาไฟล์นี้ขึ้น hosting จริง (ตามที่ตรวจแล้ว) แต่ deploy ครั้งต่อไปจากเครื่องที่มีไฟล์นี้อยู่จะพาขึ้นไปทันทีโดยไม่มีอะไรเตือน เพราะไม่มี ignore rule กันไว้ — ควรแก้ก่อน deploy รอบต่อไป และพิจารณาหมุน (rotate) key นี้เป็นมาตรการป้องกันไว้ก่อน แม้ยังไม่ยืนยันว่ารั่วไปแล้วจริง ๆ ก็ตาม

## 2. ฟีเจอร์จาก Feature List ของ Module 1 ที่ยังไม่ได้ทำ

อ้างอิง [docs/01-requirements/feature-list.md](docs/01-requirements/feature-list.md) และ [spec.md](spec.md) หัวข้อ "สิ่งที่ไม่ทำใน Module นี้" — module รอบปัจจุบันตัด scope เฉพาะ "User สร้างคำขอ + Admin accept/cancel/change-time" ฟีเจอร์ต่อไปนี้ยังไม่มี code path ใดใน `webapp/` เลย:

**ฝั่ง Saleng (คนขับ) — ทั้งหมดยังไม่ทำ**
- ลงทะเบียน/เข้าสู่ระบบด้วยเบอร์โทร/OTP (ไม่มีหน้า/collection `saleng_accounts` เลย)
- ดูรายการคำขอที่เปิดอยู่ในพื้นที่ที่สนใจ + กดรับงาน (self-pick)
- ดูรายละเอียดงาน/ข้อมูลติดต่อ user เพื่อนัดเจอ
- กดปิดงาน (mark as completed) + ส่งใบเสร็จเข้าระบบ (`receipt`, `receipt_item`)
- ยกเลิกงานที่รับไว้ได้ก่อนงานเสร็จสิ้น

**การจับคู่งาน (Matching)**
- ไม่มี collection `request_match`, ไม่มี self-pick/admin-assign สาเล้งจริง
- สถานะ `pending_match_confirm` / `confirmed` / `completed` มีอยู่ใน seed data และ filter UI ของ admin dashboard เพื่อเตรียมไว้ แต่ยังไม่มี code path ใดเขียนค่าเหล่านี้จริง

**ฝั่ง Admin — ส่วนที่ยังไม่ทำ**
- เลือก assign สาเล้งให้คำขอที่เปิดอยู่โดยตรง (admin-assign) + Confirm การจับคู่งานเป็นขั้นตอนสุดท้าย
- หน้าจัดการรถซาเล้ง (ดูสถานะสาเล้งแต่ละคน / อนุมัติสมัครสาเล้งใหม่ / ระงับบัญชีสาเล้ง / ดูประวัติงาน) — ไม่มีหน้านี้ในโค้ดจริงเลย
- อัปเดตราคากลางขยะต่อกิโลกรัมแบบจัดการได้จริง (หน้า `/prices/` ปัจจุบันเป็น mockup ข้อมูลนิ่ง ไม่มี collection `waste_reference_price`)
- ระงับ (suspend) บัญชี user ที่ทำผิดกฎ (ไม่มีหน้า/ปุ่มให้ admin ทำ แม้ `user_accounts.status` มี field เตรียมไว้แล้ว)
- ดูใบเสร็จที่สาเล้งส่งเข้าระบบ (ไม่มี `receipt`/`receipt_item`)

**ฟีเจอร์อื่นที่ยังไม่ทำ**
- ~~อัปโหลดรูปถ่ายขยะสูงสุด 5 ภาพต่อคำขอ~~ — ทำแล้ว 2026-11-07: เก็บเป็น base64 ใน collection `request_photos` (ไม่ใช้ Firebase Storage) ย่อ/บีบอัดเป็น JPEG ฝั่ง browser, admin เห็นรูปในรายละเอียดคำขอ — ที่เหลือ: หน้าติดตามฝั่ง user ยังไม่แสดงรูป (ดูได้ผ่านปุ่มแก้ไข), จำกัด 5 รูปบังคับแค่ฝั่ง client (rules เช็กไม่ได้โดยไม่ใช้ get())
- ดูใบเสร็จที่สาเล้งส่งเข้าระบบ (ฝั่ง user)
- เห็นข้อมูลติดต่อของสาเล้งที่รับงาน (ฝั่ง user)
- แต้มสะสม (points) เป็นตัวเลข mockup คงที่ (120) ทั้งหน้า dashboard และ profile ไม่ได้คำนวณจากธุรกรรมจริง

## 3. สิ่งที่เทสต์จับได้แต่ยังไม่ได้แก้ (จากการรันจริงรอบ 2026-09-22 — อ้างอิง [test-results.md](test-results.md))

### 🔴 CONFIRMED — หมวด 5 (Cross-user data isolation) รั่วจริง ยืนยันด้วยการรันจริงแล้ว

รันจริงเมื่อ 2026-09-22T09:38Z (โดย coordinator agent เอง ผ่าน browser จริง ไม่ใช่การคาดเดาจากโค้ด): login เป็น user B (082-345-6789) แล้วยิง Firestore JS SDK อ่าน document ของ user A (089-123-4567) ตรงๆ — **อ่านสำเร็จทั้งหมด ไม่ถูกปฏิเสธเลย**:
- `pickup_requests/CN0kseG9T3JkOBK02NMw` ของ user A — ได้ข้อมูลครบ (เบอร์โทร, ที่อยู่, landmark, notes)
- `user_accounts/<uid ของ user A>` — ได้ชื่อจริง/เบอร์โทร/สถานะบัญชี
- `admin_accounts` (ทั้ง collection) — ได้ `login_identifier`/`full_name` ของบัญชี admin

**สาเหตุ**: `firestore.rules` มีกฎเดียวคือ `allow read, write: if request.auth != null` — ตรวจแค่ว่า login แล้วหรือยัง ไม่เช็ก ownership/role เลย ผู้ใช้ที่ login แล้วคนไหนก็อ่าน/เขียนได้ทุก document ของทุกคนและทุก collection **ต้องแก้ `firestore.rules` ให้เช็ก ownership (`resource.data.user_id == request.auth.uid`) และ role (แยกสิทธิ์ admin ออกจาก user) ก่อน** — ดู [ACL.md](ACL.md) เป็นข้อกำหนดสิทธิ์ตั้งต้น (ยังไม่แปลงเป็น rule จริง ตามที่ระบุไว้ในไฟล์นั้นเอง)

### ✅ หมวด 2 (Confirm/Reject) — รันจริงแล้ว ได้รับคำยืนยันตรงจากผู้ใช้ ("ยืนยัน รันข้อ 2 บน production")

ทั้ง Confirm และ Reject ผ่านจริง (ดู test-results.md แถว 2a/2b) รวมทั้ง assertion ของปุ่ม "ยืนยัน" ใน reject modal ที่ต้อง disabled จนกรอกเหตุผล (ยืนยันด้วย screenshot จริง) — **ซึ่งแก้ปัญหาของหมวด 3 sub-case (b) ที่เคย "ยังพิสูจน์ไม่สำเร็จ" ไปในตัวด้วย** เพราะเป็น assertion เดียวกัน

### 📝 หมายเหตุผลข้างเคียงจากการทดสอบ (ไม่ใช่ปัญหาที่ต้องเก็บกวาดต่อแล้ว)

Fixture request ที่ค้างจากหมวด 1 (happy path, `pickup_requests/CN0kseG9T3JkOBK02NMw`) ที่เคยลบไม่ได้ (ปุ่ม "ลบ" เรียก native `window.confirm()` ที่เครื่องมืออัตโนมัติกดให้ไม่ได้) **ถูกนำมาใช้ทดสอบ Confirm ในหมวด 2a แทนการสร้าง fixture ใหม่** — ปัจจุบันจึงอยู่ในสถานะ `open_for_saleng` (terminal state ที่ตั้งใจจากการทดสอบ ไม่ใช่ข้อมูลค้างที่ต้องลบอีกแล้ว) ส่วน fixture ของหมวด 2b (`prpU8pgRjKHwIgXzPeMd`) อยู่ในสถานะ `cancelled` ก็เป็น terminal state ที่ตั้งใจเช่นกัน — ทั้งสองยังเป็นข้อมูลทดสอบที่ค้างอยู่ถาวรบน production (ไม่มีทาง rollback ผ่าน UI) แต่มี prefix `[e2e-test]` ใน `notes` ไว้ระบุตัวได้ ถ้าต้องการล้างข้อมูลออกจริงต้องทำผ่าน Firebase Console
