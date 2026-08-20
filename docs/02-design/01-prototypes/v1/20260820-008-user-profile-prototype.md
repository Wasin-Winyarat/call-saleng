# User — หน้าโปรไฟล์ Prototype

## Persona & บริบทการใช้งาน

**User** จัดการข้อมูลส่วนตัว (ชื่อ, เบอร์โทร) และที่อยู่ที่บันทึกไว้สำหรับใช้ซ้ำตอนสร้างคำขอครั้งถัดไป เป็นหน้าหลักระดับ bottom tab bar

## อ้างอิงจาก

- Feature: [[../../../01-requirements/feature-list#User|จัดการโปรไฟล์ส่วนตัว]], [[../../../01-requirements/feature-list#User|เลือกใช้ที่อยู่ที่บันทึกไว้ในโปรไฟล์แทนกรอกใหม่]]
- Spec: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — "User สมัครสมาชิก/เข้าสู่ระบบ และมี profile ส่วนตัวที่เก็บข้อมูลไว้ใช้ซ้ำได้ (ชื่อ, เบอร์โทรติดต่อ, ที่อยู่ที่บันทึกไว้)"

## Layout

หน้าหลักระดับ bottom tab bar (ไม่มี back chevron)

1. **Header**: H1 "โปรไฟล์ของฉัน"
2. **ส่วนข้อมูลส่วนตัว**: avatar วงกลมใหญ่กึ่งกลาง + ชื่อ + เบอร์โทร ใต้ avatar + ปุ่ม secondary "แก้ไขข้อมูลส่วนตัว" (เปิด inline form/modal แก้ไขชื่อและเบอร์โทร)
3. **Section "ที่อยู่ที่บันทึกไว้" + ปุ่ม "+ เพิ่มที่อยู่ใหม่"** (ลิงก์สีเขียวด้านขวาของ section header)
4. **List ที่อยู่ที่บันทึกไว้**: card ต่อรายการ (รูปแบบเดียวกับ selectable list card ในหน้าเลือกที่อยู่ แต่ไม่มี radio เพราะไม่ใช่การเลือก) แต่ละใบ: icon หมุด + label ที่อยู่ + ที่อยู่แบบย่อ + ปุ่มไอคอน "แก้ไข" และ "ลบ" ด้านขวา
5. **ปุ่ม "ออกจากระบบ"**: text link สี `--color-danger` อยู่ล่างสุดของหน้า แยกจาก section อื่นด้วย spacing 32–40px
6. **Bottom tab bar** 4 รายการ: หน้าแรก / ติดตาม / ราคา / โปรไฟล์ (active)

## Components & Design Tokens ที่ใช้

- Avatar วงกลม, ปุ่ม secondary (border `--color-primary-600`, ตัวอักษรสีเขียว), List card ที่อยู่, Bottom tab bar — ตาม DESIGN.md
- ปุ่ม "ออกจากระบบ" และปุ่ม "ลบที่อยู่" ใช้สี `--color-danger` เพื่อสื่อ action ที่มีผลกระทบ ควบคู่กับ label ข้อความชัดเจน (ไม่ใช้สีอย่างเดียวสื่อความหมาย)
- Confirm dialog (radius `--radius-md`) สำหรับ action ลบที่อยู่/ออกจากระบบ ตาม UX rule ข้อ 8

## States (Empty / Loading / Error)

- **Empty** — ยังไม่เคยบันทึกที่อยู่ไว้เลย: แสดงข้อความ "ยังไม่มีที่อยู่ที่บันทึกไว้" พร้อมปุ่ม secondary "+ เพิ่มที่อยู่แรกของคุณ" แทนที่ list
- **Loading**: skeleton แทนที่ข้อมูลส่วนตัวและ list ที่อยู่ระหว่างโหลด
- **Error**: โหลดข้อมูลโปรไฟล์ไม่สำเร็จ → ข้อความ + icon เตือนโทน `--color-danger` พร้อมปุ่ม "ลองใหม่"

## Interaction Notes

- กดปุ่ม "ลบ" ที่ที่อยู่ใดๆ → เปิด confirm dialog "ยืนยันลบที่อยู่นี้?" (การลบย้อนกลับไม่ได้ ตาม UX rule ข้อ 8) พร้อมปุ่ม "ลบ" (fill `--color-danger`) และ "ยกเลิก" (secondary)
- กดปุ่ม "ออกจากระบบ" → เปิด confirm dialog ก่อนออกจากระบบจริงเสมอ เพื่อป้องกันการกดพลาด
- การแก้ไขที่อยู่เปิดฟอร์มแบบเดียวกับ inline form กรอกที่อยู่ใหม่ในหน้าเลือกที่อยู่ (Textarea ที่อยู่เต็ม + Input จุดสังเกต + Input ชื่อที่อยู่)

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
