# User — หน้าแรก (Home) Prototype

## Persona & บริบทการใช้งาน

หน้านี้เป็นหน้าที่ **User** เห็นบ่อยที่สุดหลังเข้าสู่ระบบ ใช้เป็นศูนย์กลางในการเริ่มสร้างคำขอใหม่ เข้าถึงข้อมูลที่ใช้บ่อย (ที่อยู่ที่บันทึกไว้, ราคาขยะ) และเช็คสถานะคำขอที่ยังไม่เสร็จแบบเร็วๆ โดยไม่ต้องสลับไปหน้าอื่น

## อ้างอิงจาก

- Journey: node B "กดปุ่มเรียกรถซาเล้ง" ใน [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- Feature: [[../../../01-requirements/feature-list#User|สร้างคำขอเรียกรถซาเล้งด้วยฟอร์มรายละเอียด]], [[../../../01-requirements/feature-list#User|เลือกใช้ที่อยู่ที่บันทึกไว้ในโปรไฟล์แทนกรอกใหม่]], [[../../../01-requirements/feature-list#User|ดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท]], [[../../../01-requirements/feature-list#User|ดูสถานะคำขอของตัวเอง]]
- Spec: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — หัวข้อ Scope > User

## Layout

หน้าหลักระดับ bottom tab bar (ไม่มี back chevron) ตาม navigation pattern ข้อ 5 ของ DESIGN.md

1. **App bar ทักทาย**: avatar วงกลมซ้าย + ข้อความ "สวัสดี คุณ{ชื่อ}" + ไอคอนกระดิ่งแจ้งเตือนขวาบน (มี badge ตัวเลขถ้ามีแจ้งเตือนใหม่)
2. **Promo banner**: card ขนาดใหญ่ gradient พาสเทลส้ม/เหลือง พร้อม pagination dots ด้านล่าง (เนื้อหา placeholder เช่น เคล็ดลับแยกขยะ/ประชาสัมพันธ์ — รายละเอียดเนื้อหาโฆษณาจริงรอ [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|business model ค่าโฆษณาในแอป]])
3. **ปุ่ม CTA หลักแบบการ์ด** เต็มความกว้าง พื้นหลัง `--color-primary-600`: icon badge วงกลมสีขาว (ไอคอนถังรีไซเคิล) ซ้าย + label "ขายขยะ / เรียกรถซาเล้งมารับที่บ้าน" + chevron ขวา → กดแล้วไปหน้า "เลือก/กรอกที่อยู่" (screen ถัดไป)
4. **Quick-link card คู่** เรียงแนวนอน 2 อัน:
   - "บันทึกที่อยู่" — icon badge พื้นหลัง `--color-accent-blue-100`, meta text "{N} ที่อยู่ที่บันทึกไว้" → ไปหน้าโปรไฟล์ ส่วนจัดการที่อยู่
   - "ราคาขยะ" — icon badge พื้นหลัง `--color-accent-peach-100`, meta text "ดูราคาล่าสุด" → ไปหน้าราคาขยะ
5. **Section header + ดูทั้งหมด**: H2 "รายการที่กำลังดำเนินการ" ซ้าย, ลิงก์ "ดูทั้งหมด" สีเขียวขวา → ไปหน้าติดตาม
6. **List / job card** สูงสุด 2–3 รายการล่าสุดที่ยังไม่เสร็จสิ้น: icon กล่องซ้าย, title "คำขอ #SL-XXXX" + meta text (วันที่นัด, ประเภทขยะย่อ), status pill ขวา (icon+ข้อความ+สีตามสถานะ), chevron → กดไปหน้าสถานะการเข้ารับของคำขอนั้น
7. **Bottom tab bar** 4 รายการ: หน้าแรก (active, สีเขียว) / ติดตาม / ราคา / โปรไฟล์

## Components & Design Tokens ที่ใช้

- App bar ทักทาย, Promo banner, ปุ่ม CTA หลักแบบการ์ด, Quick-link card คู่, Section header + ดูทั้งหมด, List/job card, Bottom tab bar — ตาม DESIGN.md ตาราง "UI Components & Patterns"
- สี status pill: `--color-accent-amber-500` (กำลังดำเนินการ/pending สาเล้ง), `--color-neutral-300` (รอ Admin ยืนยัน), `--color-success-600` (ยืนยันแล้ว) — ทุก pill มี icon + label กำกับเสมอ (UX rule ข้อ 2)
- Radius การ์ดทั่วไป `--radius-md`, ปุ่ม CTA หลัก `--radius-lg`
- พื้นหลังหน้าจอ `--color-neutral-bg`, พื้นหลัง card `--color-neutral-card`

## States (Empty / Loading / Error)

- **Empty** — ยังไม่มีคำขอที่กำลังดำเนินการเลย: ซ่อน section "รายการที่กำลังดำเนินการ" แบบ list card แล้วแสดงข้อความสั้นแทน "ยังไม่มีคำขอที่กำลังดำเนินการ ลองกดปุ่ม 'ขายขยะ' ด้านบนได้เลย" (ไม่มีปุ่มซ้ำเพิ่มเพื่อไม่ให้เกิน 1 primary action ต่อหน้า)
- **Loading** — แสดง skeleton card (พื้นหลังเทาอ่อน shimmer) แทนที่ promo banner และ list card ระหว่างโหลดข้อมูล
- **Error** — โหลดรายการคำขอไม่สำเร็จ: แสดงข้อความ "โหลดข้อมูลไม่สำเร็จ" พร้อม icon เตือนโทน `--color-danger` และปุ่ม secondary "ลองใหม่" เฉพาะ section รายการ (ส่วนอื่นของหน้ายังใช้งานได้ปกติ)

## Interaction Notes

- กดไอคอนกระดิ่ง → ไปหน้าแจ้งเตือน (นอก scope ชุดนี้ อาจเป็น placeholder ว่าง)
- กดปุ่ม CTA หลัก "ขายขยะ" → เข้าสู่ flow สร้างคำขอ เริ่มที่หน้าเลือก/กรอกที่อยู่ (ไม่ข้ามตรงไปฟอร์ม เพราะต้องตรวจสอบพื้นที่บริการก่อนตาม journey node C/E)
- List card ที่กดแล้วสถานะ "เสร็จสิ้น" จะไม่ปรากฏใน section นี้ (แสดงเฉพาะ "กำลังดำเนินการ" — ดูรายการทั้งหมดรวมเสร็จสิ้น/ยกเลิกได้ที่หน้าติดตาม)

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
