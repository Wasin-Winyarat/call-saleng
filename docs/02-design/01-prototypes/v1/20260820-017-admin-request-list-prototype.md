# Admin — รายการคำขอที่เข้ามาทั้งหมด Prototype

## Persona & บริบทการใช้งาน

**Admin** ใช้งานระบบผ่านคอมพิวเตอร์ (desktop) เป็นหลักตามลักษณะงานบริหารจัดการ ต่างจาก User/Saleng ที่เป็น mobile-first เปิดหน้านี้เป็นจุดเริ่มต้นของงานประจำวันเพื่อตรวจสอบคำขอใหม่จาก user ทั้งหมดก่อนตัดสินใจ confirm/cancel และจับคู่สาเล้ง เป็นหน้า default เมื่อเข้าสู่ระบบ Admin สำเร็จ

## อ้างอิงจาก

- Journey: node A "ดูรายการคำขอที่เข้ามาทั้งหมด: ชื่อ เบอร์โทร ที่อยู่ จุดสังเกต รูปขยะ วันที่/ช่วงเวลา ประเภท/ปริมาณ" ใน [[../20260820-003-admin-request-matching-journey|Admin — ตรวจสอบและจับคู่คำขอ (Request Matching) Journey]]
- Feature: [[../../../01-requirements/feature-list#Admin|ดูรายการคำขอที่เข้ามาทั้งหมดพร้อมรายละเอียด]]
- Business rule: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — รายละเอียดคำขอที่ต้องแสดง (ชื่อ, เบอร์โทร, ที่อยู่, จุดสังเกต, รูปขยะ, วันที่/ช่วงเวลาที่ต้องการ, ประเภท/ปริมาณขยะโดยประมาณ), "คำขอที่ยังไม่มีสาเล้งรับงานจะไม่มีการหมดอายุอัตโนมัติ (no auto-expire)" — Admin จึงต้องเห็นสถานะ/อายุคำขอชัดเจนเพื่อตัดสินใจ admin-assign เมื่อคำขอค้างนาน, "พื้นที่ให้บริการของ MVP จำกัดเฉพาะเขตอำเภอเมือง จังหวัดเชียงราย"

> **หมายเหตุการออกแบบ (Navigation pattern สำหรับ Admin):** DESIGN.md UX rule ข้อ 5 ระบุ navigation pattern แบบ bottom tab bar ไว้สำหรับ persona มือถือ (User/Saleng) เท่านั้น เนื่องจาก Admin ใช้งานผ่าน desktop เป็นหลัก ทุกหน้าจอ persona Admin ในเวอร์ชันนี้จึงใช้ **sidebar navigation แนวตั้งด้านซ้าย** แทน โดย adapt สี/typography/spacing/radius เดิมจาก DESIGN.md มาใช้ ไม่ได้สร้าง token ใหม่ — sidebar นี้เป็น layout ร่วมของทุกหน้าจอ Admin (#017–#020)

## Layout

**Sidebar ซ้ายคงที่ (desktop-first, ใช้ร่วมกันทุกหน้าจอ Admin):**

1. บนสุด: โลโก้ "กรีนซาเล้ง" ขนาดเล็ก + label "Admin" ใต้โลโก้ (Caption `--color-text-secondary`)
2. เมนูนำทาง 3 รายการ แนวตั้ง icon+label ระยะห่างเท่ากัน: "คำขอ" (**active** ในหน้านี้ — พื้นหลัง item `--color-primary-100`, ตัวอักษร/icon `--color-primary-700`, radius `--radius-sm`), "รถซาเล้ง", "ราคากลาง" (inactive = ตัวอักษร `--color-text-secondary`)
3. ล่างสุด: avatar วงกลม + ชื่อ Admin + ลิงก์ข้อความ "ออกจากระบบ"

**พื้นที่เนื้อหาหลัก (ขวาของ sidebar):**

1. **Topbar**: H1 "คำขอทั้งหมด" ซ้าย, ช่องค้นหา (placeholder "ค้นหาชื่อหรือเบอร์โทร") ตรงกลาง-ขวา, ไอคอนกระดิ่งแจ้งเตือนสุดขวา (มี badge ตัวเลขถ้ามีแจ้งเตือนใหม่)
2. **แถบ filter สถานะ** แนวนอน 7 tab พร้อม badge จำนวนคำขอต่อ tab: "ทั้งหมด" / "รอตรวจสอบ" / "รอสาเล้งรับงาน" / "รอ Admin confirm ขั้นสุดท้าย" / "ยืนยันแล้ว" / "เสร็จสิ้น" / "ยกเลิก" — tab ที่ active มีเส้นใต้ `--color-primary-600` หนา 2px
3. **Data table** รายการคำขอ (ตาม DESIGN.md ตาราง "UI Components & Patterns" pattern คล้าย list/job card แต่จัดเป็นตารางเพื่อเทียบข้อมูลได้เร็วบนจอกว้าง): header row พื้นหลัง `--color-primary-700` ตัวอักษรสีขาว, แถวสลับสีอ่อนบาง (zebra) ระหว่าง `--color-neutral-card` กับ `--color-neutral-bg` คอลัมน์:
   - วันที่สร้างคำขอ + วันที่/ช่วงเวลาที่ต้องการเข้ารับ
   - ชื่อผู้ติดต่อ + เบอร์โทร (2 บรรทัด)
   - ที่อยู่ย่อ (ตำบล/เขต เท่านั้น เพื่อความกระชับของตาราง)
   - ประเภทขยะโดยประมาณ (choice chip เล็กหลายอัน เช่น "พลาสติก" "กระดาษ")
   - ปริมาณโดยประมาณ (เช่น "กลาง (5–15 กก.)")
   - สถานะ (status pill)
   - Action: ปุ่ม text "ดูรายละเอียด" + chevron ขวา
4. **Pagination** ใต้ตาราง: เลขหน้า + ปุ่มก่อนหน้า/ถัดไป (แสดง 20 แถวต่อหน้า)

## Components & Design Tokens ที่ใช้

- Sidebar nav item, Topbar, Data table (header เข้ม + zebra row) — ตาม DESIGN.md ตาราง "UI Components & Patterns" ปรับให้เหมาะกับ desktop
- Status pill 7 สถานะ (ทุกอันมี icon กำกับคู่สีตาม UX rule ข้อ 2): "รอตรวจสอบ" = เทา `--color-neutral-300` + icon นาฬิกา, "รอสาเล้งรับงาน" = ส้ม `--color-accent-amber-500` + icon รอ, "รอ Admin confirm ขั้นสุดท้าย" = ส้มเข้ม + icon ตรวจสอบ, "ยืนยันแล้ว" = เขียว `--color-success-600` + icon เช็ค, "เสร็จสิ้น" = เขียว `--color-success-600` + icon ธง, "ยกเลิก" = terracotta `--color-danger` + icon กากบาท
- Choice chip อ่านอย่างเดียว — pill radius `--radius-full`, พื้นหลัง `--color-primary-100`
- Radius ตาราง/แถว `--radius-md` ที่มุมนอกสุดของ table container, พื้นหลังหน้าจอ `--color-neutral-bg`

## States (Empty / Loading / Error)

- **Empty — ยังไม่มีคำขอเข้ามาเลย**: แสดงภาพประกอบเรียบง่าย + ข้อความ "ยังไม่มีคำขอเข้ามาในระบบตอนนี้"
- **Empty — ไม่พบผลลัพธ์ตามตัวกรอง/คำค้นหา**: ข้อความ "ไม่พบคำขอที่ตรงกับเงื่อนไข" พร้อมปุ่ม secondary "ล้างตัวกรอง"
- **Loading**: skeleton row 8 แถวแทนที่ตารางระหว่างโหลดข้อมูล
- **Error**: โหลดรายการไม่สำเร็จ → ข้อความ "โหลดข้อมูลไม่สำเร็จ" พร้อม icon เตือนโทน `--color-danger` และปุ่ม secondary "ลองใหม่"

## Interaction Notes

- คลิกที่แถวหรือปุ่ม "ดูรายละเอียด" → ไปหน้ารายละเอียดคำขอ (ดู [[20260820-018-admin-request-detail-prototype|Admin — รายละเอียดคำขอ Prototype]])
- ค้นหาในช่องค้นหา filter ตารางแบบ realtime ตามชื่อ/เบอร์โทร โดยไม่ต้องกด submit
- Filter tab สถานะ "รอสาเล้งรับงาน" ที่ค้างอยู่นานควรพิจารณาเรียงจากเก่าสุดก่อน (sort ค่าเริ่มต้น = เวลาสร้างคำขอ เก่าสุดขึ้นก่อน) เพื่อช่วย Admin สังเกตคำขอที่ควร admin-assign ตาม business rule no-auto-expire — ยังไม่ได้ระบุ sort ทางเลือกอื่นในรอบนี้ (inferred)
- MVP ไม่มี real-time push (ดู Out of scope ของสเปก) ตารางควร refresh อัตโนมัติเป็นระยะ (polling) หรือมีปุ่ม "รีเฟรช" ด้วยมือ

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-003-admin-request-matching-journey|Admin — ตรวจสอบและจับคู่คำขอ (Request Matching) Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
