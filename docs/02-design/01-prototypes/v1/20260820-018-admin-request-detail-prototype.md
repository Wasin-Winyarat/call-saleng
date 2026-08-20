# Admin — รายละเอียดคำขอ + Confirm/Cancel + แชท + Assign สาเล้ง Prototype

## Persona & บริบทการใช้งาน

**Admin** กดเข้ามาจากแถวในรายการคำขอทั้งหมด เพื่อตรวจสอบรายละเอียดคำขอ ตัดสินใจ confirm/cancel, สื่อสารกับ user ผ่านแชทถ้าจำเป็น, และควบคุมขั้นตอนจับคู่สาเล้ง (self-pick หรือ admin-assign) ไปจนถึง confirm ขั้นสุดท้ายกับ user เป็นหน้าที่ Admin ใช้เวลาอยู่นานที่สุดต่อคำขอ 1 รายการ เพราะครอบคลุมทุกขั้นตอนของ lifecycle คำขอ

## อ้างอิงจาก

- Journey: node B–P ทั้งหมดใน [[../20260820-003-admin-request-matching-journey|Admin — ตรวจสอบและจับคู่คำขอ (Request Matching) Journey]] — ตั้งแต่แชทกับ user, confirm/cancel, เลือกช่องทางจับคู่ (admin-assign 2 ขั้น vs self-pick), confirm ขั้นสุดท้ายกับ user, จนถึงดูใบเสร็จหลังงานเสร็จสิ้น
- Feature: [[../../../01-requirements/feature-list#Admin|แชทกับ user เกี่ยวกับคำขอ]], [[../../../01-requirements/feature-list#Admin|กด confirm หรือ cancel คำขอของ user]], [[../../../01-requirements/feature-list#Admin|เลือก assign สาเล้งให้คำขอที่เปิดอยู่โดยตรง (admin-assign)]], [[../../../01-requirements/feature-list#Admin|Confirm การจับคู่งานกับ user เป็นขั้นตอนสุดท้ายเสมอ]], [[../../../01-requirements/feature-list#Admin|ดูใบเสร็จที่สาเล้งส่งเข้าระบบ (บันทึกประวัติธุรกรรม)]]
- Business rule: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — "การจับคู่งานมี 2 ช่องทางที่ต้องรองรับร่วมกัน" (self-pick / admin-assign), "คำขอต้องผ่านการ confirm จาก Admin กับ user เป็นขั้นสุดท้ายเสมอ" โดยกรณี admin-assign มี **2 ขั้นตอน** (confirm กับสาเล้งก่อน แล้วจึง confirm กับ user), กรณี self-pick การกดรับงานของสาเล้งยังเป็นแค่ "รอ Admin confirm" ไม่ final, "คำขอ 1 รายการต้องผูกกับสาเล้งได้เพียง 1 คนเท่านั้น", "คำขอที่ยังไม่มีสาเล้งรับงานจะไม่มีการหมดอายุอัตโนมัติ (no auto-expire)", โครงสร้างใบเสร็จ (ประเภทขยะ/น้ำหนัก/ราคา หลายรายการต่อใบเสร็จ)

> **หมายเหตุการออกแบบ (inferred):** สเปก/journey ไม่ได้ระบุว่าถ้า Admin ต้องการยกเลิก/เปลี่ยนตัวสาเล้งที่เลือก assign ไปแล้ว (ก่อนถึงขั้น confirm กับ user) จะทำอย่างไร — journey doc ระบุจุดนี้ไว้ว่า "รอการออกแบบเพิ่มเติม" หน้านี้จึงยังไม่มีปุ่ม "เปลี่ยนสาเล้ง" ในขั้นที่ 3 (รอ Admin confirm ขั้นสุดท้าย) ถ้าต้องการฟีเจอร์นี้ให้แจ้งกลับเพื่อออกแบบเพิ่ม

## Layout

Sidebar เดียวกับ [[20260820-017-admin-request-list-prototype|หน้ารายการคำขอทั้งหมด]] (เมนู "คำขอ" ยัง active) เนื้อหาหลักแบ่ง 2 คอลัมน์:

**Header เนื้อหา**: ปุ่ม back chevron + "กลับไปรายการคำขอ" ซ้ายบน, H1 "คำขอ #{รหัสคำขอ}" กลาง, status pill ปัจจุบันขวาบน

**คอลัมน์ซ้าย (~60%) — รายละเอียดคำขอ (อ่านอย่างเดียว):**

1. **Photo gallery**: รูปถ่ายขยะที่ user แนบ (สูงสุด 5 ภาพ) แสดง thumbnail มุมโค้งเรียงแนวนอน กดดูรูปเต็มจอได้
2. **Card ข้อมูลผู้ติดต่อ**: ชื่อผู้ติดต่อ, เบอร์โทร (พร้อมปุ่มโทรวงกลมสีเขียวเล็กๆ ข้างเบอร์), ที่อยู่เต็ม + จุดสังเกต
3. **Card รายละเอียดคำขอ**: ประเภทขยะโดยประมาณ (choice chip อ่านอย่างเดียว), ปริมาณโดยประมาณ, วันที่/ช่วงเวลาที่ต้องการเข้ารับ (แบบไทย เช่น "27 ก.ค. 2569 · 08:00–13:00"), รายละเอียดเพิ่มเติมจาก user ถ้ามี
4. **Card ใบเสร็จ** (แสดงเฉพาะเมื่อสถานะ = "เสร็จสิ้น"): รายการ (ประเภทขยะ, น้ำหนัก, ราคาต่อประเภท), ยอดรวม, วันที่ส่งใบเสร็จโดยสาเล้ง — ตรงกับ journey node P "Admin เห็นใบเสร็จที่สาเล้งส่งเข้าระบบ บันทึกเป็นประวัติธุรกรรม" ไม่มีปุ่มแก้ไข (Admin ดูอย่างเดียว)

**คอลัมน์ขวา (~40%) — Action panel แบบ sticky (เลื่อนตามเนื้อหาหลักเสมอ):**

1. **ปุ่ม "เปิดแชทกับ User"** (secondary, icon ข้อความแชท) — เปิด drawer แชทเลื่อนเข้าจากขวาทับบางส่วนของคอลัมน์ขวา (ไม่เปลี่ยนหน้า เพราะ Admin มักต้องสลับดูรายละเอียดคำขอไปพร้อมกับแชท)
2. **Vertical timeline stepper** สถานะคำขอ (ตาม DESIGN.md pattern "Vertical timeline stepper" — done = วงกลมเขียว+เครื่องหมายถูก, active = จุดส้ม, pending = วงกลมเทากลวง) มี 4 จุดหลัก: "Admin ตรวจสอบ" → "จับคู่สาเล้ง" → "Admin confirm ขั้นสุดท้าย" → "เสร็จสิ้น" แต่ละจุดมี action panel ย่อยของตัวเองปรากฏเฉพาะตอนเป็นจุด active (รายละเอียดดู Interaction Notes)

## Components & Design Tokens ที่ใช้

- Header ย้อนกลับ, Photo upload grid (ปรับเป็น read-only), Contact card, Vertical timeline stepper, Message/chat preview → drawer เต็มรูปแบบ — ตาม DESIGN.md ตาราง "UI Components & Patterns"
- Choice chip อ่านอย่างเดียว — pill `--radius-full`, พื้นหลัง `--color-primary-100`
- ปุ่ม Primary — `--color-primary-600`, radius `--radius-lg`, ความสูง ≥44px ตาม UX rule ข้อ 3
- ปุ่ม Danger/text (cancel, ปฏิเสธ) — ตัวอักษร/border `--color-danger`
- Confirm dialog overlay — การ์ดกลางจอ ปุ่ม primary/secondary ตาม DESIGN.md ตาราง Component "Confirm dialog"
- Chat drawer: message bubble ผู้ส่งต่างฝั่งสีต่างกัน (Admin = `--color-primary-100` ชิดขวา, User = `--color-neutral-card` border ชิดซ้าย) + textarea input ล่าง + ปุ่มส่งวงกลมเล็ก

## States (Empty / Loading / Error)

- **Loading**: skeleton แทนที่ photo gallery, card ข้อมูล, และ timeline stepper ระหว่างโหลดรายละเอียด
- **Error — โหลดรายละเอียดไม่สำเร็จ**: ข้อความ + icon เตือนโทน `--color-danger` พร้อมปุ่ม "ลองใหม่" เต็มพื้นที่เนื้อหา
- **Empty — ยังไม่มีข้อความแชท**: ใน chat drawer แสดงข้อความ "ยังไม่มีการสนทนา พิมพ์ข้อความเพื่อเริ่มแชทกับ user"
- **Empty — ยังไม่มีสาเล้งว่างในพื้นที่** (ตอนเปิด saleng picker สำหรับ admin-assign): ข้อความ "ไม่พบสาเล้งที่ว่างอยู่ในพื้นที่นี้ตอนนี้ ลองรอ self-pick หรือขยายพื้นที่ค้นหา"

## Interaction Notes

การ์ด action panel ที่ปรากฏขึ้นอยู่กับสถานะปัจจุบันของคำขอ (ตำแหน่งจุด active บน timeline):

1. **สถานะ "รอตรวจสอบ" (จุด active: Admin ตรวจสอบ)**: ปุ่ม Primary "Confirm คำขอนี้" เต็มความกว้าง panel + ปุ่ม text สีดำเนอร์ "ยกเลิกคำขอ" ใต้ปุ่ม Primary
   - กด "ยกเลิกคำขอ" → เปิด **Confirm dialog** ("ยกเลิกคำขอนี้?" + คำอธิบาย "การยกเลิกนี้ย้อนกลับไม่ได้ user จะเห็นสถานะคำขอเป็นยกเลิก" + ปุ่ม "ยกเลิกคำขอ" fill `--color-danger` / "กลับไปแก้ไข" secondary) ตาม UX rule ข้อ 8
   - กด "Confirm คำขอนี้" ไม่ต้องมี dialog ยืนยันเพิ่ม (การ confirm เดินหน้าต่อได้ ไม่ทำลายข้อมูล) → สถานะเปลี่ยนเป็น "รอสาเล้งรับงาน" และคำขอจะปรากฏในรายการของสาเล้งทันที (ดู [[20260820-013-saleng-job-list-prototype|Saleng — รายการคำขอที่เปิดอยู่]])
2. **สถานะ "รอสาเล้งรับงาน" (จุด active: จับคู่สาเล้ง)**: แสดงข้อความ "รอสาเล้งกดรับงานเอง หรือเลือก assign เองได้" + ปุ่ม secondary เต็มความกว้าง "เลือก assign สาเล้งเอง"
   - กด "เลือก assign สาเล้งเอง" → เปิด **Saleng picker** (modal หรือ panel เลื่อนเข้าจากขวาเช่นเดียวกับ chat drawer): list การ์ดเลือกได้ (Selectable choice card ตาม DESIGN.md) แสดงเฉพาะสาเล้งสถานะ "ว่าง" ในพื้นที่ พร้อมช่องค้นหาชื่อ/เบอร์โทร แต่ละแถว avatar + ชื่อ + พื้นที่ที่สนใจ + จำนวนงานที่เคยเสร็จสิ้น
   - เลือกสาเล้ง 1 คนแล้วกดปุ่ม Primary "Confirm การจับคู่กับสาเล้งนี้" (ขั้นที่ 1 ของ 2 ตาม business rule) → ปิด picker, สถานะเปลี่ยนเป็น "รอ Admin confirm ขั้นสุดท้าย" ทันที พร้อมแสดงชื่อสาเล้งที่เลือกไว้ใน panel
   - ถ้าไม่ทำอะไร ระบบรอจนกว่าสาเล้งคนใดคนหนึ่งกด self-pick เอง (ไม่มี auto-expire) — เมื่อมีคน self-pick แล้ว panel จะอัปเดตสถานะเป็น "รอ Admin confirm ขั้นสุดท้าย" อัตโนมัติ พร้อมแจ้งชื่อสาเล้งที่ self-pick
3. **สถานะ "รอ Admin confirm ขั้นสุดท้าย" (จุด active: Admin confirm ขั้นสุดท้าย)**: แสดง Contact card ของสาเล้งที่จับคู่ไว้ (ชื่อ, เบอร์โทร, พื้นที่) + label เล็กบอกที่มา ("มาจาก admin-assign" หรือ "มาจาก self-pick") + ปุ่ม Primary เต็มความกว้าง "Confirm การจับคู่กับ User" (ขั้นสุดท้าย)
   - กดแล้วเปิด **Confirm dialog** สั้นๆ ("ยืนยันจับคู่งานนี้กับ user?") เพราะเป็นจุดที่ทำให้งาน "เริ่มอย่างเป็นทางการ" ตาม business rule → กด "ยืนยัน" สถานะเปลี่ยนเป็น "ยืนยันแล้ว รอเข้ารับ"
4. **สถานะ "ยืนยันแล้ว รอเข้ารับ" (จุด active: เสร็จสิ้น รอ)**: แสดงข้อความอ่านอย่างเดียว "งานเริ่มอย่างเป็นทางการแล้ว รอสาเล้งไปรับซื้อขยะและปิดงาน" ไม่มี action ให้ Admin ทำต่อ (รอฝั่งสาเล้งดำเนินการตาม [[../20260820-002-saleng-job-fulfillment-journey|Saleng — Job Fulfillment Journey]])
5. **สถานะ "เสร็จสิ้น"**: timeline ครบทุกจุด (done ทั้งหมด) แสดง Card ใบเสร็จในคอลัมน์ซ้ายตามที่ระบุใน Layout ไม่มี action เพิ่มเติมในคอลัมน์ขวา
6. **สถานะ "ยกเลิก"**: timeline หยุดที่จุดยกเลิก (แสดง icon กากบาท terracotta) + แสดงข้อความ "คำขอนี้ถูกยกเลิกเมื่อ {วันที่}" ไม่มี action เพิ่มเติม

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-003-admin-request-matching-journey|Admin — ตรวจสอบและจับคู่คำขอ (Request Matching) Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
