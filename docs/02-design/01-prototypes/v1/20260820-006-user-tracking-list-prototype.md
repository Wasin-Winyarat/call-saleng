# User — หน้าติดตาม (Tracking List) Prototype

## Persona & บริบทการใช้งาน

**User** ต้องการดูภาพรวมคำขอทั้งหมดของตัวเอง ทั้งที่กำลังดำเนินการ เสร็จสิ้นแล้ว หรือยกเลิกไปแล้ว โดยไม่ต้องจำ id คำขอ เป็นหน้าหลักระดับ bottom tab bar

## อ้างอิงจาก

- Journey: ครอบคลุมทุกสถานะที่เกิดขึ้นตลอด flow ใน [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]] (ไม่ผูกกับ node เดียว แต่เป็น list รวมของคำขอทุกสถานะ)
- Feature: [[../../../01-requirements/feature-list#User|ดูสถานะคำขอของตัวเอง]]

## Layout

หน้าหลักระดับ bottom tab bar (ไม่มี back chevron)

1. **Header**: H1 "ติดตามคำขอของฉัน"
2. **Filter chip** แนวนอน (segmented pill, active fill `--color-primary-600`): "ทั้งหมด" / "กำลังดำเนินการ" / "เสร็จสิ้น" / "ยกเลิก"
3. **List / job card** เรียงจากคำขอล่าสุดไปเก่าสุด แต่ละ card: icon กล่องซ้าย, title "คำขอ #SL-XXXX" + meta text (วันที่นัด, ช่วงเวลา, ประเภทขยะย่อ), status pill ขวา (icon+ข้อความ+สีตามสถานะ), chevron ขวาสุด
4. **Bottom tab bar** 4 รายการ: หน้าแรก / ติดตาม (active) / ราคา / โปรไฟล์

## Components & Design Tokens ที่ใช้

- Filter chip — pill radius `--radius-full`, active fill `--color-primary-600` ตัวอักษรขาว, inactive border `--color-neutral-300`
- List/job card, status pill, Bottom tab bar — ตาม DESIGN.md ตาราง "UI Components & Patterns"
- สถานะทุก pill มี icon + label กำกับสีเสมอ (`--color-neutral-300` รอ Admin ยืนยัน, `--color-accent-amber-500` กำลังดำเนินการ/รอสาเล้ง/รอ confirm, `--color-success-600` ยืนยันแล้ว/เสร็จสิ้น, `--color-danger` ยกเลิก)

## States (Empty / Loading / Error)

- **Empty** — ไม่มีคำขอเลยในหมวดที่เลือก (เช่น filter "เสร็จสิ้น" แต่ยังไม่เคยมีงานเสร็จ): illustration เรียบง่าย + ข้อความ "ยังไม่มีคำขอในหมวดนี้" — ถ้าเป็น filter "ทั้งหมด" และไม่เคยสร้างคำขอเลย ให้เพิ่มปุ่ม secondary "เรียกรถซาเล้งเลย" กลับไปหน้าแรก
- **Loading**: skeleton list card 3–4 แถวระหว่างโหลดข้อมูล
- **Error**: โหลดรายการไม่สำเร็จ → ข้อความ + icon เตือนโทน `--color-danger` พร้อมปุ่ม "ลองใหม่"

## Interaction Notes

- กด card ใดๆ → ไปหน้าสถานะการเข้ารับ (screen สถานะ) ของคำขอนั้นเสมอ แม้สถานะจะเป็น "เสร็จสิ้น" แล้วก็ตาม (เข้าถึงใบเสร็จผ่านปุ่มในหน้าสถานะอีกที เพื่อความสอดคล้องของ flow)
- Filter chip เปลี่ยนค่าแล้ว list กรองทันทีโดยไม่ต้องกดปุ่มยืนยันเพิ่ม

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
