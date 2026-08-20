# User — ฟอร์มสร้างคำขอ Prototype

## Persona & บริบทการใช้งาน

หลังผ่านการตรวจสอบพื้นที่บริการแล้ว **User** มากรอกรายละเอียดคำขอให้ครบก่อนส่งให้ Admin พิจารณา หน้านี้เป็นหน้าที่มีข้อมูลเยอะที่สุดใน flow การสร้างคำขอ — ผู้ใช้มีทั้งวัยทำงานและผู้สูงอายุ จึงต้องแบ่ง section ชัดเจนและให้ hint ครบตาม UX rule ข้อ 6

## อ้างอิงจาก

- Journey: node G "กรอกรายละเอียดคำขอ", node H "ดูราคากลางอ้างอิง", node I "อัปโหลดรูปถ่ายขยะ", node J "ส่งคำขอ" ใน [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- Feature: [[../../../01-requirements/feature-list#User|สร้างคำขอเรียกรถซาเล้งด้วยฟอร์มรายละเอียด]], [[../../../01-requirements/feature-list#User|อัปโหลดรูปถ่ายขยะสูงสุด 5 ภาพต่อคำขอ]], [[../../../01-requirements/feature-list#User|ดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท]]
- Business rule: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — ช่วงเวลาเข้ารับเลือกได้ 1 ใน 2 ช่วง (08:00–13:00 / 13:00–18:00), จำกัดรูปไม่เกิน 5 ภาพต่อคำขอ, ราคากลางเป็นข้อมูลอ้างอิงเท่านั้นไม่ผูกธุรกรรมจริง

> **หมายเหตุการตัดสินใจออกแบบ:** orchestrator ระบุให้ใช้ AskUserQuestion ถามผู้ใช้หากไม่ชัดเจนว่าหน้านี้ควรเป็นหน้าเดียวหรือแยก multi-step แต่ระหว่างทำงานจริงไม่มี AskUserQuestion tool พร้อมใช้งานในสภาพแวดล้อมนี้ จึงตัดสินใจแทนโดยอ้างอิงเกณฑ์ที่มีอยู่แล้วใน DESIGN.md แทนการเดาแบบไม่มีหลักฐาน: เลือกออกแบบเป็น **single-page scrollable form แบ่ง section ชัดเจน** (ไม่ใช่ multi-step wizard) เพราะ (1) สอดคล้องกับ UX rule ข้อ 1 "1 primary action ต่อหน้าจอ" — ปุ่ม "ส่งคำขอ" เป็นปุ่มเดียวที่ sticky footer ด้านล่างสุด ไม่มีปุ่ม "ถัดไป" หลายจุดที่อาจสร้างความสับสน (2) จำนวน field ทั้งหมดไม่มากเกินไปเมื่อแบ่ง section ด้วย whitespace ตาม UX rule ข้อ 1 (3) ลดจำนวนจุดที่ต้องกดเปลี่ยนหน้า เหมาะกับ persona ที่มีผู้สูงอายุร่วมด้วย — **ถ้าทีมต้องการ multi-step wizard แทน โปรดแจ้งกลับเพื่อแก้ไขหน้านี้ในรอบถัดไป**

## Layout

Header ย้อนกลับ: back chevron + title "สร้างคำขอเรียกรถซาเล้ง" (ไม่มี bottom tab bar) เนื้อหาเป็น scroll เดียวยาว แบ่ง 5 section ตามลำดับ:

**1. ข้อมูลผู้ติดต่อ**
- Input "ชื่อผู้ติดต่อ" — prefill จากโปรไฟล์ แก้ไขได้
- Input "เบอร์โทรติดต่อ" — prefill จากโปรไฟล์ แก้ไขได้
- Card แสดงที่อยู่ที่เลือกไว้จากขั้นก่อนหน้าแบบ read-only + ลิงก์ "แก้ไข" ด้านขวา → ย้อนกลับไปหน้าเลือกที่อยู่

**2. วันที่และช่วงเวลาที่ต้องการให้เข้ารับ**
- Date picker "วันที่ต้องการให้เข้ารับ"
- Selectable choice card 2 ตัวเลือก (เลือกได้ 1): "08:00–13:00" และ "13:00–18:00" — grid 2 คอลัมน์

**3. ประเภทขยะและปริมาณ**
- Selectable choice card grid 2 คอลัมน์ (เลือกได้หลายอย่าง): กระดาษ / พลาสติก / เหล็ก / อลูมิเนียม / ขวดแก้ว — แต่ละ card มี icon + label + checkbox มุมขวาบน + meta text ราคากลางอ้างอิงของประเภทนั้น (เช่น "≈ 8–12 บาท/กก.") แสดงเฉพาะเมื่อ card ถูกเลือก พร้อมลิงก์ท้าย section "ดูตารางราคาเต็ม" → ไปหน้าราคาขยะ
- Choice chip ปริมาณโดยประมาณ (เลือก 1): "น้อย (<5 กก.)" / "กลาง (5–15 กก.)" / "มาก (>15 กก.)" / "ระบุเอง (กก.)" — เลือก "ระบุเอง" แล้วแสดง input ตัวเลขเพิ่ม
- Textarea "รายละเอียดเพิ่มเติม / ขยะเพิ่มเติม" (ไม่บังคับกรอก) พร้อม placeholder ตัวอย่างข้อความ

**4. รูปถ่ายขยะ**
- Photo upload grid 4 คอลัมน์: thumbnail มุมโค้ง + ปุ่มลบวงกลมมุมขวาบนของแต่ละรูป, ปุ่มเพิ่มรูปเส้นประ (ไอคอนกล้อง+เครื่องหมายบวก), ตัวนับ "x/5" เหนือ grid, helper text ใต้ grid "อัปโหลดได้สูงสุด 5 ภาพ ไม่บังคับ"

**5. Sticky footer**
- ปุ่ม Primary เต็มความกว้าง "ส่งคำขอ" — disable จนกว่า required field ครบ (ชื่อ, เบอร์โทร, ที่อยู่, วันที่, ช่วงเวลา, ประเภทขยะอย่างน้อย 1 ชนิด, ปริมาณ) — รูปถ่ายเป็นตัวเลือกเสริม (สเปกไม่ได้กำหนด minimum จำนวนรูป)

## Components & Design Tokens ที่ใช้

- Input, Date picker, Textarea — ตาม pattern DESIGN.md, radius `--radius-md`
- Selectable choice card — border/tint `--color-primary-100` เมื่อเลือก, checkbox มุมขวาบน
- Choice chip — pill radius `--radius-full`, active fill `--color-primary-600`
- Photo upload grid — ตาม pattern DESIGN.md ทุกรายละเอียด (thumbnail, ปุ่มลบ, ปุ่มเพิ่มเส้นประ, ตัวนับ, helper text)
- ปุ่ม Primary sticky footer — `--color-primary-600`, radius `--radius-lg`, ความสูง ≥44px
- Section header (H2 20px Semibold) แบ่งแต่ละ section ด้วย spacing 24px ตาม spacing scale

## States (Empty / Loading / Error)

- **Error — อัปโหลดรูปเกิน 5 ภาพหรือไฟล์ผิดชนิด/เกินขนาด**: toast หรือ inline message ใต้ grid สี `--color-danger` พร้อม icon เตือน
- **Error — กรอกฟิลด์บังคับไม่ครบ**: highlight border สีแดงที่ field นั้น + helper text อธิบายใต้ field เมื่อพยายามกด "ส่งคำขอ" ทั้งที่ปุ่ม disable
- **Error — ส่งคำขอไม่สำเร็จ** (เช่น network error): inline banner ด้านบนสุดของฟอร์ม "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" พร้อมปุ่ม "ลองใหม่"
- **Loading**: ปุ่ม "ส่งคำขอ" เปลี่ยนเป็น spinner + disable ระหว่างส่งข้อมูล
- ไม่มี Empty state สำหรับหน้านี้ (เป็นฟอร์มกรอกใหม่เสมอ)

## Interaction Notes

- ราคากลางอ้างอิงที่แสดงใต้แต่ละ choice card เป็นข้อมูลอ้างอิงเท่านั้น ไม่ผูกกับธุรกรรมจริงตาม business rule — ต้องมี caption กำกับไว้ใต้ section "ราคาที่แสดงเป็นราคาอ้างอิงเท่านั้น ราคาจริงตกลงกันหน้างาน"
- กด "ส่งคำขอ" สำเร็จ → นำทางไปหน้าสถานะการเข้ารับของคำขอที่เพิ่งสร้าง โดยสถานะเริ่มต้นคือ "รอ Admin ยืนยัน" ตาม journey node J
- การเลือกประเภทขยะหลายชนิดไม่จำกัดจำนวน (เลือกได้ทุก card ที่มี)

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
