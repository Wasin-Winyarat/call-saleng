# 01 - Prototypes

เก็บ **ต้นแบบหน้าตาของระบบ (UI/UX Prototype)** เช่น

- Wireframe / mockup ของแต่ละหน้าจอ
- User flow และ navigation flow
- Design system เบื้องต้น เช่น สี ฟอนต์ คอมโพเนนต์หลัก

ใช้สำหรับสื่อสารและตกลงหน้าตาของระบบก่อนลงมือพัฒนาจริง โดยอ้างอิงความต้องการจาก [[../../01-requirements/01-spec/index|01-spec]] และส่งต่อรายละเอียดเชิงระบบให้ [[../02-technical/index|02-technical]]

ดู Design System กลาง (สี, ฟอนต์, spacing, component, UX rules) ได้ที่ [[DESIGN|DESIGN.md]]

User journey (Mermaid flowchart + คำอธิบาย) เก็บเป็นไฟล์แยกในโฟลเดอร์นี้โดยตรง ส่วน wireframe รายหน้าจอ (screen prototype) เก็บแยกเป็นเวอร์ชันในโฟลเดอร์ย่อย `v{N}/` (เช่น `v1/`, `v2/`) — สร้าง/อัปเดตด้วย skill `generate-prototype`

## เวอร์ชัน wireframe

- [[v1/index|v1 — User (เข้าสู่ระบบ, หน้าแรก, สร้างคำขอ, ติดตามสถานะ, ราคาขยะ, โปรไฟล์, ใบเสร็จ, แชทกับ Admin) + Saleng (เข้าสู่ระบบ, รออนุมัติ, รายการงาน, รับงาน, งานของฉัน, ส่งใบเสร็จ) + Admin (รายการคำขอ, รายละเอียดคำขอ/confirm/assign สาเล้ง, จัดการรถซาเล้ง, จัดการราคากลาง)]] — เวอร์ชันล่าสุด
