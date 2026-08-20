# User — หน้าราคาขยะ Prototype

## Persona & บริบทการใช้งาน

**User** เข้ามาดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภทเพื่อประเมินมูลค่าขยะที่มีคร่าวๆ ก่อนตัดสินใจเรียกรถซาเล้ง เป็นหน้าหลักระดับ bottom tab bar ที่เข้าถึงได้ทั้งจาก quick-link ในหน้าแรกและจาก tab bar โดยตรง

## อ้างอิงจาก

- Journey: node H "ดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท ประกอบการตัดสินใจ" ใน [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- Feature: [[../../../01-requirements/feature-list#User|ดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท]]
- Business rule: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — "ราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภทตั้ง/อัปเดตได้โดย Admin เท่านั้น และเป็นเพียงข้อมูลอ้างอิงให้ user ประกอบการตัดสินใจ ไม่ใช่ราคาที่ผูกมัดกับธุรกรรมจริง"

## Layout

หน้าหลักระดับ bottom tab bar (ไม่มี back chevron)

1. **Header**: H1 "ราคาขยะรีไซเคิล" + caption ใต้หัวข้อ (`--color-text-secondary`) "ราคาอ้างอิงต่อกิโลกรัม อัปเดตล่าสุด {วันที่แบบไทย}"
2. **Banner เตือนสั้นๆ**: card เล็กพื้นหลังพาสเทล `--color-accent-peach-100` ข้อความ "ราคานี้เป็นราคาอ้างอิงเท่านั้น ราคาซื้อขายจริงตกลงกันหน้างานระหว่างคุณกับสาเล้ง"
3. **List ราคาต่อประเภทขยะ**: list card เรียบง่าย (ไม่ใช่ grid เพราะเป็นข้อมูลอ่านอย่างเดียว) แต่ละแถว: icon ประเภทขยะซ้าย (กระดาษ/พลาสติก/เหล็ก/อลูมิเนียม/ขวดแก้ว) + ชื่อประเภท + ราคาต่อกิโลกรัมชิดขวาตัวหนา (เช่น "8–12 บาท/กก.")
4. **Bottom tab bar** 4 รายการ: หน้าแรก / ติดตาม / ราคา (active) / โปรไฟล์

## Components & Design Tokens ที่ใช้

- List card เรียบง่าย — พื้นหลัง `--color-neutral-card`, radius `--radius-md`, แบ่งแถวด้วย whitespace ไม่ใช้เส้นคั่นหนัก ตาม UX rule ข้อ 1
- Banner เตือน — พื้นหลัง `--color-accent-peach-100`, radius `--radius-md`
- Typography: ราคาต่อกิโลกรัมใช้ Body 16px ตัวหนา, ชื่อประเภทใช้ Body 16px ปกติ, caption อัปเดตล่าสุดใช้ Caption 12–13px `--color-text-secondary`

## States (Empty / Loading / Error)

- **Loading**: skeleton row 5 แถวแทนที่ list ระหว่างโหลดข้อมูลราคา
- **Error**: โหลดราคาไม่สำเร็จ → ข้อความ "โหลดข้อมูลราคาไม่สำเร็จ" พร้อม icon เตือนโทน `--color-danger` และปุ่ม "ลองใหม่"
- ไม่มี Empty state เพิ่มเติมนอกจาก Loading/Error (ระบบควรมีราคาอ้างอิงครบทุกประเภทเสมอ เพราะ Admin เป็นผู้ตั้งค่าไว้ล่วงหน้า)

## Interaction Notes

- หน้านี้เป็น read-only ทั้งหมดสำหรับ User (การตั้ง/แก้ไขราคาทำได้เฉพาะฝั่ง Admin ตาม business rule)
- ถ้าเข้าถึงหน้านี้ผ่านลิงก์ "ดูตารางราคาเต็ม" จากฟอร์มสร้างคำขอ ให้กดปุ่มย้อนกลับ (browser back / back chevron ถ้ามี) กลับไปหน้าฟอร์มโดยข้อมูลที่กรอกไว้ยังคงอยู่ครบ

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
