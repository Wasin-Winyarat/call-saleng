# User — หน้าสถานะการเข้ารับ Prototype

## Persona & บริบทการใช้งาน

**User** เข้าหน้านี้ทันทีหลังส่งคำขอสำเร็จ หรือกดเข้าซ้ำจากหน้าแรก/หน้าติดตาม เพื่อดูว่าคำขอของตนอยู่ขั้นตอนไหนแล้ว หน้านี้ต้องสื่อสารสถานะที่ user ควบคุมไม่ได้ (รอ Admin/รอสาเล้ง) ให้ชัดเจน ลดความกังวลว่าคำขอ "หายไปไหน"

## อ้างอิงจาก

- Journey: node K–T ทั้งหมด (ทุกสถานะของคำขอ) ใน [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]] และหัวข้อ "เส้นทางอื่น / Edge case — ยกเลิกได้หลายจุด"
- Feature: [[../../../01-requirements/feature-list#User|ดูสถานะคำขอของตัวเอง]], [[../../../01-requirements/feature-list#User|เห็นข้อมูลติดต่อของสาเล้งที่รับงาน]], [[../../../01-requirements/feature-list#User|แชทกับ Admin เกี่ยวกับคำขอ]], [[../../../01-requirements/feature-list#User|ยกเลิกคำขอได้ก่อนงานเสร็จสิ้น]]
- Business rule: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — "คำขอต้องผ่านการ confirm จาก Admin กับ user เป็นขั้นสุดท้ายเสมอ", "คำขอที่ยังไม่มีสาเล้งรับงานจะไม่มีการหมดอายุอัตโนมัติ (no auto-expire)", "User หรือ saleng สามารถยกเลิกคำขอได้ก่อนงานเสร็จสิ้น"

## Layout

Header ย้อนกลับ: back chevron + title "สถานะการเข้ารับ" + subtitle "คำขอ #SL-2607" (ไม่มี bottom tab bar)

1. **Status hero card** (gradient เขียวเข้ม `--color-primary-700` → `--color-primary-600`, มุมโค้งมาก `--radius-lg`, decorative circle ลายพื้นหลังจางๆ): แสดงสถานะปัจจุบันเป็นตัวใหญ่ (icon + label) และวันเวลานัดหมายรูปแบบไทย เช่น "27 ก.ค. 2569 · 08:00–13:00"
2. **Vertical timeline stepper** ครบทุกสถานะตามลำดับ:
   1. รอ Admin ยืนยัน
   2. รอสาเล้งรับงาน
   3. รอ Admin confirm (การจับคู่)
   4. ยืนยันแล้ว รอเข้ารับ
   5. เสร็จสิ้น

   แต่ละจุด: **done** = วงกลมเขียวทึบ + เครื่องหมายถูก + label + timestamp, **active** (ขั้นปัจจุบัน) = จุดสีส้ม `--color-accent-amber-500` + label "กำลังดำเนินการ" (ไม่มี timestamp เพราะยังไม่เสร็จ), **pending** = วงกลมเทากลวง `--color-neutral-300` + label จาง ไม่มี timestamp
3. **กรณีสถานะ = ยกเลิก**: stepper หยุดแสดง progress ปกติ และแทรก badge พิเศษที่ตำแหน่งขั้นที่ถูกยกเลิก เป็นวงกลม/ป้าย icon กากบาท โทน `--color-danger` พร้อม label "ยกเลิกแล้ว" + timestamp เวลาที่ยกเลิก ส่วนขั้นตอนที่เหลือ (ถ้ามี) แสดงเป็น pending สีเทาต่อไปตามปกติเพื่อสื่อว่า flow จบแล้วไม่ไปต่อ
4. **Contact card สาเล้ง** (แสดงเฉพาะเมื่อสถานะ ≥ "ยืนยันแล้ว รอเข้ารับ"): avatar วงกลม + ชื่อสาเล้ง + ระยะทางโดยประมาณ + ปุ่มโทรวงกลมสีเขียวขวาสุด
5. **Message/chat preview card**: หัวข้อ "ข้อความ" + ลิงก์ "ดูทั้งหมด" ขวา → ไปหน้าแชทกับ Admin, แสดง message bubble ล่าสุด 1 อัน พร้อม tag แจ้งเตือนพื้นหลังพาสเทลถ้ามีข้อความยังไม่อ่าน
6. **Receipt summary card** (แสดงเฉพาะเมื่อสถานะ = "เสร็จสิ้น"): สรุปยอดที่ได้รับโดยย่อ + ปุ่ม secondary "ดูใบเสร็จ" → ไปหน้าใบเสร็จ
7. **Sticky footer**: ปุ่ม outline โทน `--color-danger` เต็มความกว้าง "ยกเลิกคำขอ" — แสดงเฉพาะเมื่อสถานะยังไม่ใช่ "เสร็จสิ้น" หรือ "ยกเลิก" (ปุ่มพร้อมใช้งานทุกสถานะก่อนเสร็จสิ้น ตาม edge case ใน journey doc)

## Components & Design Tokens ที่ใช้

- Status hero card, Vertical timeline stepper, Contact card, Message/chat preview card — ตาม DESIGN.md ตาราง "UI Components & Patterns" ทุกรายละเอียด
- Confirm dialog (modal กลางจอ, radius `--radius-md`) — ใช้ตาม UX rule ข้อ 8 "action ที่ย้อนกลับไม่ได้ต้อง confirm ก่อนเสมอ" แม้ไม่ได้อยู่ในตาราง component แต่ implied โดยกฎนี้
- ปุ่มยกเลิก sticky footer — outline `--color-danger`, ไม่ใช่ fill เต็ม เพื่อไม่ให้ดูเป็น primary action ของหน้า (primary action ของหน้านี้คือการติดตามสถานะ ไม่ใช่ยกเลิก)
- สถานะทุกจุดมี icon + ข้อความกำกับคู่กับสีเสมอ ตาม UX rule ข้อ 2

## States (Empty / Loading / Error)

- **Loading**: skeleton แทนที่ status hero card และ timeline stepper ระหว่างโหลดข้อมูลคำขอ
- **Error**: โหลดสถานะคำขอไม่สำเร็จ → แสดง inline error เต็มพื้นที่เนื้อหา พร้อม icon เตือนและปุ่ม "ลองใหม่"
- ไม่มี Empty state (หน้านี้ผูกกับคำขอที่มีอยู่จริงเสมอ เข้าถึงได้ต่อเมื่อมี request id)

## Interaction Notes

- กดปุ่ม "ยกเลิกคำขอ" → เปิด **Confirm dialog**: หัวข้อ "ยืนยันยกเลิกคำขอ?" ข้อความอธิบายผล (เช่น "คำขอนี้จะถูกยกเลิกและไม่สามารถกู้คืนได้") + ปุ่ม 2 ปุ่ม: "ยกเลิกคำขอ" (fill `--color-danger`, destructive) และ "ไม่ยกเลิก" (secondary/text) — กด "ยกเลิกคำขอ" แล้วสถานะเปลี่ยนเป็น "ยกเลิก" ทันทีและอัปเดต timeline stepper ตามข้อ 3 ด้านบน
- กดปุ่มโทรใน contact card → เปิด native dialer ของอุปกรณ์ (touch target ≥44px ตาม UX rule ข้อ 3)
- กด message preview card → ไปหน้าแชทกับ Admin ผูกกับคำขอนี้โดยเฉพาะ

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
