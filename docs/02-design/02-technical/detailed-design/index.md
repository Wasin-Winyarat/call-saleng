# Detailed Design

เก็บเอกสาร **Detailed Design เชิงแนวคิด (Conceptual)** หนึ่งไฟล์ต่อหนึ่ง user journey — ขยาย sequence diagram ระดับ high-level ที่มีอยู่ใน [[../high-level-architecture|high-level-architecture]] ให้ละเอียดขึ้นเป็นระดับ interaction spec (main flow, alternate flow, exception/error path, pre/post-condition, business rule/validation ต่อ step) ยังคง**ไม่ผูกมัดกับ technology stack ใดๆ** เช่นเดียวกับ high-level-architecture — การเลือก stack จริงจะอยู่ในเอกสารแยกต่างหากเมื่อถึงขั้นตอนออกแบบเชิงเทคนิคถัดไป ทุก message ในไดอะแกรมที่เป็นการเรียกดำเนินการผูกกับ operation จริงจาก [[../api-spec|api-spec]] และ entity จาก [[../database-schema|database-schema]] แล้ว (ทั้งสองไฟล์มีอยู่ในโปรเจกต์นี้และครอบคลุมทั้ง 5 journey)

## เอกสารในโฟลเดอร์นี้

1. [[20260820-001-user-pickup-request-detailed-design|User — สร้างและติดตามคำขอเรียกรถซาเล้ง (Pickup Request)]] — ตั้งแต่เลือก/กรอกที่อยู่ ตรวจสอบพื้นที่บริการ กรอกรายละเอียดคำขอ อัปโหลดรูป ผ่าน Admin confirm 2 จุด จนถึงเห็นใบเสร็จเมื่องานเสร็จสิ้น รวมจุดที่ User ยกเลิกคำขอได้หลายจุดก่อนงานเสร็จสิ้น
2. [[20260820-002-saleng-job-fulfillment-detailed-design|Saleng — รับงานและปิดงาน (Job Fulfillment)]] — ตั้งแต่ลงทะเบียน/OTP ตรวจสอบสิทธิ์อนุมัติ self-pick/รับงานที่ถูก admin-assign ผ่าน Admin confirm ขั้นสุดท้าย ไปจนถึงปิดงาน ส่งใบเสร็จ และ settle ค่าธรรมเนียม 3 ช่องทาง
3. [[20260820-003-admin-request-matching-detailed-design|Admin — ตรวจสอบและจับคู่คำขอ (Request Matching)]] — จุดศูนย์กลางของ business rule การจับคู่งานทั้งหมด ครอบคลุมทั้งเส้นทาง self-pick และ admin-assign แบบ 2 ขั้น พร้อม confirm ขั้นสุดท้ายกับ User เสมอ
4. [[20260820-004-admin-saleng-management-detailed-design|Admin — จัดการรถซาเล้ง (Saleng Account Management)]] — อนุมัติ/ปฏิเสธการสมัครสาเล้งใหม่, ดูสถานะ/ประวัติงานของสาเล้งแต่ละคน, และระงับบัญชี
5. [[20260820-005-admin-price-management-detailed-design|Admin — อัปเดตราคากลางขยะ (Price Management)]] — บริหารข้อมูลอ้างอิงราคากลางต่อกิโลกรัมของขยะแต่ละประเภท ที่ User เห็นประกอบการตัดสินใจตอนสร้างคำขอ

## Reference

- [[../high-level-architecture|high-level-architecture]]
- [[../api-spec|api-spec]]
- [[../database-schema|database-schema]]
- [[../../01-prototypes/index|01-prototypes]]
- [[../../../01-requirements/01-spec/index|01-spec]]
- [[../index|02-technical]]
