# Non-Functional Requirements (NFR)

> เอกสารนี้อธิบาย non-functional requirement ในระดับแนวคิด (conceptual) เท่านั้น **ไม่ผูกมัดกับ technology stack ใดๆ** (เช่น ไม่ระบุ cloud provider, database engine, หรือ SLA เชิงสัญญาจริง) การเลือกเทคโนโลยีจริงจะอยู่ในเอกสารแยกต่างหากภายใต้โฟลเดอร์เดียวกันนี้เมื่อถึงขั้นตอนออกแบบเชิงเทคนิค ตัวเลข/เป้าหมายเชิงปริมาณในเอกสารนี้ถูกกำหนดโดยยึดสมมติฐานว่าโปรเจกต์นี้เป็น**งานต้นแบบ/งานศึกษาระดับ pilot** ตามที่ user ยืนยันเมื่อ 2026-08-26 (ดูรายละเอียดใน "สมมติฐานและข้อจำกัด") หากโปรเจกต์เปลี่ยนทิศทางไปสู่การเปิดใช้งานจริงกับผู้ใช้ทั่วไป ต้องทวนสอบตัวเลขเหล่านี้ใหม่ทั้งหมด

## ภาพรวม

เอกสารนี้สกัด non-functional requirement (NFR) จากการอ่าน [[../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]], [[../../01-requirements/feature-list|feature-list]], [[high-level-architecture|High-Level Architecture (Conceptual)]], [[database-schema|Database Schema (Conceptual)]], [[api-spec|API Spec (Conceptual Data Contract)]], [[detailed-design/index|Detailed Design]] ทั้ง 5 journey และ [[../../03-testing/01-test-plan/index|test plan]] ฝั่ง User ร่วมกัน โดยแบ่งเป็น 2 กลุ่ม:

1. **NFR ที่ผูกกับ business rule ที่ระบุไว้แน่นอนแล้วในเอกสารอื่น** (เช่น atomic self-pick, การเผยข้อมูลติดต่อเฉพาะคู่ที่จับคู่แล้ว) — เอกสารนี้เพียงยกระดับให้เป็นข้อกำหนดที่วัดผลได้ ไม่ใช่การตัดสินใจใหม่
2. **NFR ที่ต้องใช้ดุลยพินิจทางธุรกิจ** (เช่น scale, uptime, ความถี่ polling, ระดับ compliance) ซึ่งไม่มีตัวเลขระบุไว้ในเอกสารใดมาก่อน — ส่วนนี้ยืนยันกับ user แล้วผ่าน AskUserQuestion เมื่อ 2026-08-26 ก่อนเขียนเป็นตัวเลขในเอกสารนี้

## สรุป NFR ทั้งหมด (ตารางสรุป)

| # | หมวด | ข้อกำหนดหลัก | ความสำคัญ |
|---|---|---|---|
| 1 | Concurrency / Data Consistency | self-pick ต้อง atomic ระดับข้อมูล ป้องกันรับงานซ้ำ | สูง |
| 2 | Access Control / Privacy | เบอร์โทร/ที่อยู่ เผยได้เฉพาะคู่ที่จับคู่แล้ว บังคับที่ชั้น API ไม่ใช่แค่ UI | สูง |
| 3 | Financial Data Integrity | fee ledger/wallet balance ต้องสอดคล้อง ตรวจสอบย้อนหลังได้ | สูง |
| 4 | Authentication Security | กรอก OTP ผิดได้ไม่เกิน 3 ครั้งก่อน lockout ชั่วคราว | สูง |
| 5 | Authorization Consistency | บัญชีที่ถูกระงับต้องถูกบังคับสิทธิ์ทันทีทุก entry point | สูง |
| 6 | Auditability | บันทึก audit log การเปลี่ยนราคากลางและการ suspend/unsuspend บัญชี | กลาง |
| 7 | Status Freshness (Polling) | หน้าติดตามสถานะ auto-refresh ทุก 15–30 วินาที | กลาง |
| 8 | Reliability (External OTP dependency) | มี resend cooldown และ retry policy เมื่อ OTP ส่งช้า/ไม่ถึง | กลาง |
| 9 | File/Media Handling | บีบอัดรูปถ่ายขยะอัตโนมัติไม่เกิน 2MB/ภาพ และจำกัดประเภทไฟล์ | กลาง |
| 10 | Performance (Responsiveness) | หน้าเว็บโหลด < 3 วินาทีบนมือถือ, API ตอบสนอง < 500ms (read) / < 1s (write) | กลาง |
| 11 | Availability / Uptime | Best-effort ~99% เฉพาะช่วงเวลาให้บริการ 08:00–18:00 | กลาง |
| 12 | Scalability / Capacity | รองรับผู้ใช้พร้อมกัน < 100 คน และคำขอ < 50 รายการ/วัน (pilot) | กลาง |
| 13 | Compatibility (Browser/Device) | รองรับ evergreen browser หลักบนมือถือ/เดสก์ท็อป รวมมือถือรุ่นกลาง-ล่างที่พบทั่วไปในพื้นที่บริการ | กลาง |
| 14 | Data Privacy Baseline | Data minimization + TLS in transit + จำกัดการเข้าถึง PII แม้ไม่ทำ compliance program เต็มรูป | กลาง |
| 15 | Maintainability / Extensibility | data model/API เผื่อฟีเจอร์อนาคต (e-wallet, membership, ad banner, auto-matching) ไม่ breaking change | ต่ำ |
| 16 | Backup / Disaster Recovery | สำรองข้อมูลพื้นฐานเป็นระยะ (ไม่ต้องมี DR plan เต็มรูปสำหรับ pilot) | ต่ำ |

## รายละเอียดตาม NFR

### 1. Concurrency / Data Consistency

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | การ "self-pick" งานของสาเล้งต้องเป็น atomic operation ระดับข้อมูล (เช่น unique constraint หรือ conditional update) ไม่ใช่ตรวจสอบแล้วค่อยเขียนแยกเป็น 2 ขั้นตอนที่ระดับ application |
| เหตุผล | [[high-level-architecture#ประเด็นข้ามระบบ (Cross-cutting Concerns)|high-level-architecture]] และ [[database-schema#request_match|database-schema]] ระบุตรงๆ ว่า "คำขอ 1 รายการผูกสาเล้งได้ 1 คน ต้องหายจากรายการทันทีที่มีคนรับ" — เป็น correctness requirement ที่ต้องป้องกัน race condition เมื่อหลายสาเล้งกดรับงานเดียวกันพร้อมกัน |
| ทางเลือกอื่นที่พิจารณา | **App-level lock/queue** — ✅ เขียนง่ายกว่า ไม่ต้องพึ่งความสามารถของ data store ❌ เสี่ยง race condition ถ้ามีหลาย instance ของ application ทำงานพร้อมกันในอนาคต (ไม่ scale) |

### 2. Access Control / Privacy

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | เบอร์โทร/ชื่อ/ที่อยู่ ต้องถูกซ่อนที่ชั้น API (ไม่ใช่ซ่อนแค่ที่ UI) จนกว่า Admin จะ confirm การจับคู่ขั้นสุดท้าย |
| เหตุผล | [[high-level-architecture#ประเด็นข้ามระบบ (Cross-cutting Concerns)|high-level-architecture]] ระบุว่า "ต้องจำกัดการเข้าถึงข้อมูลนี้ให้เห็นเฉพาะคู่ที่จับคู่กันแล้ว" และทุก journey แสดงรูปแบบเดียวกันว่า "เห็นข้อมูลติดต่อ" มาหลังขั้น confirm เสมอ |
| ทางเลือกอื่นที่พิจารณา | **ซ่อนที่ UI อย่างเดียว** — ✅ ทำเร็วกว่า ❌ เรียก API ตรงๆ (bypass UI) ก็ยังเห็นข้อมูลของคู่ที่ยังไม่จับคู่ได้ — ช่องโหว่จริง ไม่ใช่แค่สมมติฐาน |

### 3. Financial Data Integrity

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | `saleng_fee_ledger_entry` และ `saleng_wallet_balance` ต้องได้รับการอัปเดตแบบ strongly consistent (ไม่มี lost update) ควรออกแบบเป็น append-only ledger (บันทึกรายการใหม่เมื่อยอดเปลี่ยน ไม่ mutate ทับของเดิม) |
| เหตุผล | [[database-schema#saleng_fee_ledger_entry|database-schema]] ระบุว่าเป็นระบบบันทึกยอดค่าธรรมเนียมที่สาเล้งค้างชำระ/ชำระแล้ว แม้ยังไม่มี payment gateway จริงใน MVP แต่ยังเป็น system-of-record สำหรับเงินที่ต้องกระทบยอดถูกต้อง โดยเฉพาะกรณีสองใบเสร็จปิดพร้อมกัน |
| ทางเลือกอื่นที่พิจารณา | **Mutable balance field ปกติ** — ✅ ง่ายกว่า implement ❌ ไม่มี trail ตรวจสอบได้เวลาโต้แย้งยอด และเสี่ยง lost-update ถ้ามีการ settle พร้อมกันหลายรายการ |

### 4. Authentication Security

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | กรอกรหัส OTP ผิดได้ไม่เกิน **3 ครั้ง** ก่อน lockout ชั่วคราว สำหรับทั้ง Saleng (OTP) และ User (เมื่อยืนยันวิธี auth แล้ว) — ยืนยันโดย user เมื่อ 2026-08-26 |
| เหตุผล | [[../../03-testing/01-test-plan/20260820-001-saleng-pickup-request-user-flow-test-plan|test plan]] มี test case สำหรับ OTP ผิด/หมดอายุ แต่เดิมไม่มี NFR ควบคุมการกรอกผิดซ้ำๆ เลย — เปิดช่องให้ brute-force รหัสหรือยิง SMS รัวๆ (SMS-bombing) ทำให้ต้นทุนค่า SMS พุ่งขึ้นโดยไม่จำเป็น เพดาน 3 ครั้งเป็นค่ามาตรฐานทั่วไปที่สมดุลระหว่างความปลอดภัยกับ UX (ผู้ใช้พิมพ์ผิดพลาดโดยไม่ตั้งใจได้ 1-2 ครั้งโดยไม่ถูก lock) |
| ทางเลือกอื่นที่พิจารณา | **ไม่ทำ rate-limit** — ✅ ประหยัดงาน dev ❌ เสี่ยงทั้งด้านความปลอดภัยบัญชีและต้นทุนค่าส่ง SMS ที่ควบคุมไม่ได้ |

### 5. Authorization Consistency

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | เมื่อบัญชี User หรือ Saleng ถูก suspend ต้องถูกปฏิเสธจากทุก entry point ที่พึ่งพา Core Application Layer ทันที (สร้างคำขอใหม่/รับงานใหม่) ไม่ใช่แค่ตอน login |
| เหตุผล | ระบุตรงๆ ใน [[high-level-architecture#ประเด็นข้ามระบบ (Cross-cutting Concerns)|high-level-architecture]] ว่าเป็น cross-cutting concern ที่ต้องบังคับใช้จากจุดเดียว |
| ทางเลือกอื่นที่พิจารณา | ไม่มีทางเลือกอื่นที่สมเหตุผล — เป็น correctness requirement ที่ยืนยันไว้แล้วในเอกสารต้นทาง |

### 6. Auditability

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | บันทึก audit log (ใคร/เมื่อไหร่/ค่าก่อน-หลัง) สำหรับการเปลี่ยนราคากลางอ้างอิง และการ suspend/unsuspend บัญชี User/Saleng |
| เหตุผล | ถูก flag ซ้ำๆ ว่า "รอการออกแบบเพิ่มเติม" ใน [[high-level-architecture#คำถามเปิด / จุดที่ต้องตัดสินใจเพิ่มเติม|high-level-architecture]], [[database-schema#คำถามเปิด / จุดที่ต้องตัดสินใจเพิ่มเติม|database-schema]] และ detailed-design ของ journey ที่ 4/5 — ทั้งสองกรณีกระทบเงิน (fee คำนวณจากราคากลาง) และสิทธิ์การใช้งานของบัญชี ควรพิสูจน์ย้อนหลังได้ถ้ามีข้อพิพาท |
| ทางเลือกอื่นที่พิจารณา | **ไม่ทำ audit log ใน MVP** — ✅ ship เร็วกว่า ❌ ไม่มีทางพิสูจน์ได้ว่าใครเปลี่ยนราคา/ระงับบัญชีเมื่อไหร่ ถ้าสาเล้งโต้แย้งยอดค่าธรรมเนียมหรือ user โต้แย้งการระงับบัญชี |

### 7. Status Freshness (Polling)

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | หน้าติดตามสถานะคำขอ/รายการงานของทั้ง 3 persona auto-refresh ทุก **15–30 วินาที** |
| เหตุผล | ธุรกิจตัดสินใจแล้วว่า MVP ไม่ทำ real-time push notification ([[../../01-requirements/feature-list#User|feature-list]] ระบุเป็น "Won't have (this phase)") แต่ยังไม่มีการกำหนดความถี่ของ polling ไว้ที่ไหน — ค่านี้ยืนยันกับ user ผ่าน AskUserQuestion เมื่อ 2026-08-26 โดยเลือกจุดสมดุลระหว่างความสดของข้อมูลกับ load บน pilot scale ที่เล็ก |
| ทางเลือกอื่นที่พิจารณา | **ทุก 60 วินาทีขึ้นไป** — ✅ ประหยัด load กว่า ❌ สถานะดูค้าง/ล่าช้าโดยเฉพาะช่วงแข่งกัน self-pick งาน · **ให้ผู้ใช้กด refresh เอง (manual)** — ✅ ไม่มี background load เลย ❌ UX แย่ ผู้ใช้ไม่รู้ว่ามีคนรับงานแล้วจนกว่าจะกดเอง |

### 8. Reliability (External OTP Dependency)

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | กำหนด resend cooldown (เช่น ส่งซ้ำได้หลังผ่านไประยะเวลาหนึ่ง) และ retry/fallback policy เมื่อ OTP ผ่านช่องทางภายนอกส่งช้าหรือไม่ถึง |
| เหตุผล | [[high-level-architecture#3. Admin — ตรวจสอบและจับคู่คำขอ|high-level-architecture]] และ detailed-design ของ journey ที่ 2 ระบุเฉพาะ happy-path ของการยืนยันตัวตนด้วย OTP — เป็น external dependency เดียวที่สาเล้งทุกคนต้องพึ่งพา ถ้า provider ล่ม/ช้า สาเล้งทั้งหมดจะเข้าระบบไม่ได้ |
| ทางเลือกอื่นที่พิจารณา | **ไม่ทำ fallback** — ✅ ไม่ต้องออกแบบเพิ่ม ❌ ระบบทั้งหมดหยุดทำงานฝั่งสาเล้งทันทีถ้าผู้ให้บริการ OTP มีปัญหา |

### 9. File/Media Handling

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | บีบอัด (compress) รูปถ่ายขยะอัตโนมัติให้มีขนาดไม่เกิน **2MB ต่อภาพ** ก่อนอัปโหลด และจำกัดประเภทไฟล์ (เช่น jpg/png) — บังคับทั้งฝั่ง client (บีบอัด/ตรวจสอบก่อนอัปโหลด) และฝั่ง server (กันข้าม client) — ยืนยันโดย user เมื่อ 2026-08-26 |
| เหตุผล | [[database-schema#request_photo|database-schema]] กำหนด "สูงสุด 5 รูปต่อคำขอ" ไว้แน่นอนแล้ว แต่เดิม**ไม่มี**ขนาด/ประเภทไฟล์ระบุไว้ — [[../../03-testing/01-test-plan/20260820-001-saleng-pickup-request-user-flow-test-plan|test plan]] เองก็ flag เป็น open item ค้างไว้ การบีบอัดอัตโนมัติ (ไม่ปฏิเสธไฟล์ที่ใหญ่กว่า) ช่วยลด friction ของผู้ใช้ที่อัปโหลดจากมือถือที่ถ่ายภาพความละเอียดสูงโดยไม่ต้องบีบอัดเอง |
| ทางเลือกอื่นที่พิจารณา | **ปฏิเสธไฟล์ที่เกิน 2MB ให้ผู้ใช้เลือกใหม่ (ไม่บีบอัดอัตโนมัติ)** — ✅ ระบบไม่ต้องประมวลผลภาพเพิ่ม ❌ UX แย่กว่า ผู้ใช้ต้องไปหาโปรแกรมบีบอัด/ลดความละเอียดเองก่อน · **ไม่จำกัดเลย** — ✅ ไม่ต้อง validate เพิ่ม ❌ เสี่ยง storage cost บวมและหน้าโหลดช้าเวลา Admin/Saleng ดูรูปประกอบการตัดสินใจ |

### 10. Performance (Responsiveness)

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | หน้าเว็บโหลดเสร็จ < 3 วินาทีบนเครือข่ายมือถือทั่วไป (3G/4G), API ตอบสนอง < 500ms สำหรับ read operation และ < 1 วินาทีสำหรับ write operation |
| เหตุผล | ตัดสินใจแล้วว่าเป็น Responsive Web App เข้าถึงผ่าน mobile browser เป็นหลัก ([[../../01-spec|spec]]) ผู้ใช้จริงในพื้นที่บริการอาจใช้เครือข่ายมือถือที่ไม่เสถียร ค่า target นี้เป็น baseline สำหรับ pilot ยังไม่ผูกกับ infra จริง |
| ทางเลือกอื่นที่พิจารณา | **ไม่กำหนด target ล่วงหน้า วัดผลตอน test จริง** — ✅ ลดงานออกแบบล่วงหน้า ❌ ไม่มี baseline อ้างอิงตอนพบว่า UX ช้าบนมือถือจริง |

### 11. Availability / Uptime

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | Best-effort ~99% เฉพาะช่วงเวลาให้บริการ **08:00–18:00** (ตาม time window ที่ระบุใน [[../../01-requirements/feature-list#User|feature-list]]) ไม่ต้องมี SLA นอกช่วงเวลานี้ |
| เหตุผล | ยืนยันกับ user ผ่าน AskUserQuestion เมื่อ 2026-08-26 ว่าเป็นโปรเจกต์ต้นแบบ/งานศึกษา — จึงไม่จำเป็นต้องลงทุน infra ระดับ enterprise การใช้งานจริงกระจุกอยู่ในช่วง time window ที่สเปกกำหนดไว้แล้ว |
| ทางเลือกอื่นที่พิจารณา | **99.9% ตลอด 24 ชม.** — ✅ ความน่าเชื่อถือสูง ❌ ต้นทุน infra/monitoring สูงเกินความจำเป็นของ pilot ที่ยังไม่เลือก tech stack |

### 12. Scalability / Capacity

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | ออกแบบให้รองรับผู้ใช้งานพร้อมกัน **< 100 คน** และคำขอ **< 50 รายการ/วัน** เป็น baseline สำหรับ capacity planning/load testing |
| เหตุผล | สอดคล้องกับ scope พื้นที่บริการเขตเดียว (อำเภอเมืองเชียงราย) ที่ระบุใน [[../../01-requirements/feature-list#User|feature-list]] และระดับ pilot ที่ user ยืนยันเมื่อ 2026-08-26 สถาปัตยกรรมได้แยก **Matching/Assignment** component ไว้แล้วเผื่อขยายสเกลในอนาคตโดยไม่ต้องรื้อโครงสร้าง (ดู [[high-level-architecture#Conceptual Components|high-level-architecture]]) |
| ทางเลือกอื่นที่พิจารณา | **ระดับกลาง (100-500 คำขอ/วัน)** — ✅ เผื่อโตเร็วกว่า ❌ ออกแบบ/ทดสอบเกินความจำเป็นของ scope ปัจจุบัน user ไม่เลือกตัวเลือกนี้ |

### 13. Compatibility (Browser/Device)

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | รองรับ evergreen browser หลัก (Chrome, Safari, Edge, Firefox) 2 เวอร์ชันล่าสุด ทั้งบนเดสก์ท็อปและมือถือ ครอบคลุมมือถือ Android รุ่นกลาง-ล่างที่พบทั่วไปในพื้นที่บริการ |
| เหตุผล | ตัดสินใจแล้วว่าเป็น Responsive Web App ไม่ทำ native app ([[../../01-spec|spec]]) กลุ่มผู้ใช้จริง (เจ้าของบ้าน/ร้านเล็ก) ไม่จำเป็นต้องใช้มือถือรุ่นใหม่เสมอไป |
| ทางเลือกอื่นที่พิจารณา | **จำกัดแค่ evergreen browser ใหม่ล่าสุดเท่านั้น** — ✅ ทดสอบน้อยกว่า ❌ ตัดผู้ใช้กลุ่มเป้าหมายบางส่วนออกจริง ซึ่งขัดกับเจตนาของการเลือก responsive web แทน native app |

### 14. Data Privacy Baseline

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | ใช้ data minimization (เก็บเท่าที่จำเป็นตาม business rule), เข้ารหัสข้อมูลระหว่างส่ง (TLS in transit), และจำกัดการเข้าถึง PII ตาม NFR #2 — โดย**ไม่ต้อง**ทำ compliance program เต็มรูป (ไม่ต้องมี DPO, breach-notification process formal) |
| เหตุผล | ระบบจัดการชื่อ-เบอร์โทร-ที่อยู่บ้าน-รูปถ่ายของคนสองฝ่ายที่ไม่รู้จักกัน ([[database-schema#user_account|database-schema]]) แต่ user ยืนยันเมื่อ 2026-08-26 ว่าเป็นงานต้นแบบ/งานศึกษา ไม่ใช่ production จริง จึงเลือกระดับ baseline ที่เพียงพอโดยไม่ต้องลงทุน compliance program เต็มรูป |
| ทางเลือกอื่นที่พิจารณา | **PDPA compliance เต็มรูป** (consent capture, data subject rights, DPO) — ✅ ปลอดภัยทางกฎหมายถ้ากลายเป็น production จริง ❌ หนักเกินไปสำหรับ pilot/งานศึกษา — ควรทวนสอบใหม่ถ้าโปรเจกต์ขยายไปสู่การใช้งานจริง |

### 15. Maintainability / Extensibility

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | data model และ API contract ต้องเผื่อฟีเจอร์อนาคตที่รู้แล้ว (e-wallet, membership, ad banner, auto-matching) ได้โดยไม่เกิด breaking change กับข้อมูล/ผู้ใช้ที่มีอยู่ |
| เหตุผล | [[database-schema#membership_tier (เผื่อรองรับอนาคต)|database-schema]] มี placeholder table (`membership_tier`, `ad_banner`) แล้ว และ [[high-level-architecture#Conceptual Components|high-level-architecture]] แยก Matching/Assignment component ออกมาโดยเฉพาะเพื่อเหตุผลนี้ |
| ทางเลือกอื่นที่พิจารณา | ไม่มีทางเลือกอื่นที่สมเหตุผล เพราะเป็นทิศทางที่ธุรกิจยืนยันไว้แล้วในสเปก (โมเดลรายได้ 3 ช่องทาง) |

### 16. Backup / Disaster Recovery

| หัวข้อ | รายละเอียด |
|---|---|
| ข้อกำหนด | สำรองข้อมูล (export/dump) เป็นระยะแบบพื้นฐาน ไม่ต้องมี disaster-recovery plan เต็มรูปหรือ retention policy ซับซ้อนสำหรับ pilot |
| เหตุผล | ไม่มีการพูดถึงเรื่อง backup เลยในเอกสารใดๆ ทั้งที่มีข้อมูล PII และยอดเงินค้างชำระของสาเล้งอยู่ ระดับพื้นฐานนี้เพียงพอสำหรับสถานะ pilot/งานศึกษาที่ user ยืนยัน |
| ทางเลือกอื่นที่พิจารณา | **ไม่ทำ backup เลย** — ✅ ไม่มีต้นทุนเพิ่ม ❌ ข้อมูลที่อยู่บ้าน/ยอดหนี้สาเล้งหายหมดถ้า server มีปัญหา ซึ่งเสี่ยงเกินไปแม้จะเป็น pilot |

## สมมติฐานและข้อจำกัด

เอกสารนี้เป็นการสร้างครั้งแรก เขียนขึ้นตามคำขอของ user ให้แนะนำ NFR โดยตรงในแชท (ไม่ผ่าน skill/agent เฉพาะทาง เพราะยังไม่มี skill สำหรับ NFR ในโปรเจกต์นี้) — จึงยึด convention เดียวกับเอกสารพี่น้องในโฟลเดอร์นี้ (blockquote บอกความเป็น conceptual, ภาพรวม, ตารางรายละเอียด, สมมติฐานและข้อจำกัด, คำถามเปิด, Reference)

ประเด็นที่ต้องใช้ดุลยพินิจทางธุรกิจ (ไม่มีข้อมูลในเอกสารต้นทางเลย) ถูกถามและยืนยันกับ user ผ่าน AskUserQuestion เมื่อ **2026-08-26** ก่อนเขียนเป็นตัวเลขในเอกสารนี้:

- **บริบทการใช้งาน**: เป็นโปรเจกต์ต้นแบบ/งานศึกษา (academic/prototype) ไม่ใช่ระบบที่จะเปิดใช้งานจริงกับผู้ใช้ทั่วไปในเฟสนี้ — ส่งผลให้ NFR ด้าน uptime, compliance, backup/DR ในเอกสารนี้ถูกกำหนดไว้ในระดับที่เบากว่า production จริง (ดู NFR #11, #14, #16)
- **ระดับ scale**: ระดับเล็ก (pilot) — ผู้ใช้พร้อมกัน < 100 คน, คำขอ < 50 รายการ/วัน (ดู NFR #12)
- **Uptime**: Best-effort เฉพาะช่วงเวลาให้บริการ 08:00–18:00 (ดู NFR #11)
- **ความถี่ polling**: ทุก 15–30 วินาที (ดู NFR #7)

ประเด็นเชิงตัวเลขอีก 2 ข้อถูกยืนยันกับ user ในข้อความแยกต่างหากเมื่อ **2026-08-26** เช่นกัน (หลังเอกสารฉบับแรกเสร็จ):

- **ขนาดไฟล์รูป**: บีบอัดอัตโนมัติไม่เกิน 2MB ต่อภาพ (ดู NFR #9)
- **จำนวนครั้ง OTP ผิดก่อน lockout**: 3 ครั้ง (ดู NFR #4)

ส่วน NFR ที่**ไม่ต้อง**ถามเพิ่ม เพราะผูกกับ business rule ที่ระบุไว้แน่นอนแล้วในเอกสารอื่น (NFR #1, #2, #3, #5, #9, #15) — เอกสารนี้เพียงยกระดับให้เป็นข้อกำหนดที่วัดผลได้ ไม่ใช่การตัดสินใจใหม่ที่ต้องยืนยัน

## คำถามเปิด / จุดที่ต้องตัดสินใจเพิ่มเติม

ยังไม่มีคำตอบ และควรนำไปยืนยันกับ user/owner ก่อนพัฒนาจริง:

1. ประเภทไฟล์ที่อนุญาตสำหรับรูปถ่ายขยะ (NFR #9) — เอกสารนี้แนะนำ jpg/png เป็นจุดตั้งต้น ยังไม่ได้ยืนยันรายการที่แน่นอน (เช่น รองรับ heic จากมือถือ iOS หรือไม่)
2. ระยะเวลา lockout เมื่อกรอก OTP ผิดครบ 3 ครั้ง (NFR #4) — ยืนยันจำนวนครั้งแล้ว แต่ยังไม่กำหนดว่า lockout กี่นาที/ปลดล็อกอย่างไร
3. รายการ browser/OS version ที่ต้องทดสอบจริงสำหรับ NFR #13 (เอกสารนี้ระบุเป็นแนวทางกว้างๆ "evergreen 2 เวอร์ชันล่าสุด" เท่านั้น)
4. ระยะเวลาการเก็บ backup (retention) สำหรับ NFR #16 — ยังไม่กำหนดจำนวนวัน
5. หากโปรเจกต์เปลี่ยนทิศทางไปสู่การเปิดใช้งานจริงในอนาคต ต้องทวนสอบ NFR #11 (uptime), #12 (scale), #14 (compliance), #16 (backup/DR) ทั้งหมดใหม่ เนื่องจากค่าปัจจุบันถูกกำหนดไว้สำหรับบริบท pilot/งานศึกษาเท่านั้น

## Reference

- [[../../01-requirements/feature-list|feature-list]]
- [[../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[high-level-architecture|High-Level Architecture (Conceptual)]]
- [[database-schema|Database Schema (Conceptual)]]
- [[api-spec|API Spec (Conceptual Data Contract)]]
- [[detailed-design/index|Detailed Design]]
- [[../../03-testing/01-test-plan/index|01-test-plan]]
- [[index|02-technical]]
