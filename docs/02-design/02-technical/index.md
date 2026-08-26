# 02 - Technical

เก็บเอกสาร **การออกแบบเชิงเทคนิค (Technical Design)** เช่น

- System architecture / โครงสร้างระบบโดยรวม
- Database schema
- API design / data contract
- เทคโนโลยีและไลบรารีที่เลือกใช้ พร้อมเหตุผล

เอกสารในโฟลเดอร์นี้คือพิมพ์เขียวที่ทีมพัฒนาใช้อ้างอิงตอนลงมือเขียนโค้ด และเป็นฐานในการวางแผนทดสอบใน [[../../03-testing/01-test-plan/index|01-test-plan]]

## เอกสารในโฟลเดอร์นี้

- [[high-level-architecture|High-Level Architecture (Conceptual)]] — โครงสร้างระบบระดับ component/layer และ data flow ตาม user journey ยังไม่ผูกกับ technology stack ใดๆ
- [[database-schema|Database Schema (Conceptual)]] — ER diagram และรายละเอียดตารางข้อมูลระดับแนวคิด ยังไม่ผูกกับ database engine เฉพาะเจาะจง
- [[api-spec|API Spec (Conceptual Data Contract)]] — รายการ resource/operation ที่แต่ละบทบาทเรียกใช้ได้ ยังไม่ผูกกับ protocol/HTTP method เฉพาะเจาะจง
- [[detailed-design/index|Detailed Design]] — ขยาย sequence diagram ระดับ high-level ให้ละเอียดขึ้นเป็นระดับ interaction spec ต่อ journey (main/alternate/exception flow, pre/post-condition, business rule ต่อ step)
- [[non-functional-requirements|Non-Functional Requirements (NFR)]] — ข้อกำหนดเชิงคุณภาพของระบบ (performance, security, availability, data consistency, ฯลฯ) พร้อมเหตุผลและทางเลือกที่พิจารณา ยังไม่ผูกกับ technology stack ใดๆ
