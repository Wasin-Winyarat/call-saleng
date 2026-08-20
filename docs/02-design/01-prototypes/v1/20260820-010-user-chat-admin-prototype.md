# User — หน้าแชทกับ Admin Prototype

## Persona & บริบทการใช้งาน

**User** ต้องการสอบถามหรือแจ้งรายละเอียดเพิ่มเติมกับ Admin เกี่ยวกับคำขอที่กำลังดำเนินอยู่ (เช่น เปลี่ยนช่วงเวลา, สอบถามความคืบหน้า) โดยไม่ต้องโทรศัพท์

## อ้างอิงจาก

- Journey: node T "แชทกับ Admin เกี่ยวกับคำขอได้ตลอดกระบวนการ ถ้ามีข้อสงสัย" ใน [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- Feature: [[../../../01-requirements/feature-list#User|แชทกับ Admin เกี่ยวกับคำขอ]]
- Spec: [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]] — "User สามารถแชทกับ Admin เกี่ยวกับคำขอของตัวเองได้" / "Admin มีช่องแชทกับ user เพื่อสื่อสารเกี่ยวกับคำขอนั้นๆ"

## Layout

Header ย้อนกลับ: back chevron + title "แชทกับแอดมิน" + subtitle "คำขอ #SL-2607" (แชทผูกกับคำขอรายนั้นโดยเฉพาะ ตาม scope ของสเปก ไม่ใช่แชททั่วไป) ไม่มี bottom tab bar

1. **พื้นที่สนทนา** (scrollable, เรียงข้อความจากเก่าไปใหม่): message bubble ของ User ชิดขวา พื้นหลัง `--color-primary-600` ตัวอักษรขาว, message bubble ของ Admin ชิดซ้าย พื้นหลัง `--color-neutral-card` + border `--color-neutral-300` ตัวอักษร `--color-text-primary` — ใต้แต่ละ bubble มี timestamp (Caption 12–13px `--color-text-secondary`)
2. **Sticky footer**: input พิมพ์ข้อความเต็มความกว้าง (radius `--radius-full`) + ปุ่มส่งวงกลมไอคอนกระดาษเครื่องบิน พื้นหลัง `--color-primary-600` ขวาสุด

## Components & Design Tokens ที่ใช้

- Message bubble (2 แบบ ผู้ส่ง/ผู้รับ) ตามที่อธิบายด้านบน — อิง pattern "Message/chat preview card" ใน DESIGN.md ขยายเป็นหน้าแชทเต็ม
- ปุ่มส่งข้อความวงกลม — `--color-primary-600`, ความสูง/กว้าง ≥44px ตาม UX rule ข้อ 3
- Input พิมพ์ข้อความ — border `--color-neutral-300`, radius `--radius-full`

## States (Empty / Loading / Error)

- **Empty** — ยังไม่เคยมีข้อความในคำขอนี้: แสดงข้อความกลางพื้นที่สนทนา "เริ่มต้นการสนทนากับแอดมินเกี่ยวกับคำขอนี้ได้เลย" (Caption, `--color-text-secondary`)
- **Loading**: skeleton bubble 2–3 อันระหว่างโหลดประวัติแชท
- **Error — ส่งข้อความไม่สำเร็จ**: bubble ข้อความนั้นแสดง icon ลองใหม่ (retry) สีแดง `--color-danger` ข้าง bubble พร้อม label เล็ก "ส่งไม่สำเร็จ แตะเพื่อลองอีกครั้ง"

## Interaction Notes

- กดปุ่มส่ง → ข้อความใหม่ปรากฏทันที (optimistic UI) ที่ด้านล่างสุดของพื้นที่สนทนาและ auto-scroll ลง
- แชทนี้ผูกกับคำขอเฉพาะรายการ (ไม่ใช่ inbox รวมทุกคำขอ) — ถ้า user มีหลายคำขอที่กำลังดำเนินการพร้อมกัน แต่ละคำขอจะมีห้องแชทแยกกัน เข้าถึงผ่าน message preview card ในหน้าสถานะการเข้ารับของคำขอนั้นๆ

## Reference

- [[../../../01-requirements/feature-list|feature-list]]
- [[../DESIGN|DESIGN.md]]
- [[../20260820-001-user-pickup-request-journey|User — สร้างและติดตามคำขอเรียกรถซาเล้ง Journey]]
- [[../../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[index|v1 index]]
