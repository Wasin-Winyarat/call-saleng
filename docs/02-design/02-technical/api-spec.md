# API Spec (Conceptual Data Contract)

> เอกสารนี้อธิบาย data contract ในระดับแนวคิด (conceptual) เท่านั้น **ไม่ผูกมัดกับ protocol, HTTP method/URL, หรือรูปแบบ authentication เฉพาะเจาะจงใดๆ** การเลือก protocol จริงจะอยู่ในเอกสารแยกต่างหากภายใต้โฟลเดอร์เดียวกันนี้เมื่อถึงขั้นตอนออกแบบเชิงเทคนิค

## ภาพรวม

เอกสารนี้ต่อยอดจาก [[database-schema|Database Schema (Conceptual)]] แปลงแต่ละตาราง/กลุ่มตารางให้เป็น **resource** เชิงแนวคิด พร้อมระบุ **operation** ที่แต่ละ actor ทำได้ ตาม [[../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]], [[../../01-requirements/feature-list|feature-list]] และ journey doc ทั้ง 5 ฉบับ ชื่อ resource ในเอกสารนี้ตรงกับชื่อตารางหลักใน database-schema เสมอ ส่วน component เชิงแนวคิดที่รับผิดชอบแต่ละ resource อ้างอิงจาก [[high-level-architecture|High-Level Architecture (Conceptual)]] — โดยเฉพาะ operation ในกลุ่ม "การจับคู่งาน" ที่ถูกจัดกลุ่มแยกเป็น resource **Request Match** ต่างหาก สะท้อนว่ารับผิดชอบโดย **Matching/Assignment** component ไม่ใช่ Core Application Layer ทั่วไป

**อัปเดต 2026-11-07:** ต่อยอดตาม [[../../01-requirements/01-spec/20260912-002-saleng-auto-matching|spec 002 — ระบบจับคู่งานสาเล้งตามพื้นที่ (ตำบล) + Admin-assign และการจัดการสาเล้ง]] ให้ตรงกับสิ่งที่พัฒนาจริงในรอบนี้: การสมัครสาเล้งพร้อมเอกสาร + การอนุมัติ/ไม่อนุมัติ/ระงับ/เปิดใช้งานอีกครั้ง, การมองเห็นงานตามตำบล, การรับงานแบบกันชน, การตอบรับ/ปฏิเสธงานที่ Admin มอบหมาย, การยกเลิกงานพร้อมกำหนดเวลา, การยุติการจับคู่โดย Admin และ resource ใหม่ **Saleng Chat Message**

## Actors

| Actor | คำอธิบาย |
|---|---|
| **User** | เจ้าของขยะที่สร้างและติดตามคำขอเรียกรถซาเล้ง — เห็นชื่อ/เบอร์/ทะเบียนรถของสาเล้งเมื่อการจับคู่ถูก confirm แล้วเท่านั้น |
| **Saleng** | คนขับที่สมัครพร้อมเอกสาร ดูงานเปิดในตำบลที่ลงทะเบียน กดรับ/ตอบรับ/ปฏิเสธ/ยกเลิกงาน ปิดงาน แชทกับ Admin และส่งใบเสร็จ — operation ด้านงานทั้งหมดเรียกได้เฉพาะ "สาเล้งที่ใช้งานได้" (`approval_status = approved` และ `account_status = active`); สาเล้งที่ยังรออนุมัติ/ไม่ผ่าน/ถูกระงับ เข้าสู่ระบบและดูสถานะบัญชีตัวเองได้เท่านั้น ใช้งานบน smartphone เป็นหลัก |
| **Admin** | ผู้ดูแลระบบ ตรวจสอบ/จับคู่คำขอ (มอบหมาย, confirm, ยุติการจับคู่), อนุมัติ/ระงับบัญชีสาเล้ง, จัดการบัญชี user, ตั้งราคากลาง, แชทกับ user และกับสาเล้ง (คนละห้อง) |

หมายเหตุ: operation ที่มีการตรวจสอบเงื่อนไขอัตโนมัติ (เช่น การป้องกันรับงานซ้ำตอน self-pick) ยังคงถูก "เรียก" โดย actor ที่เป็นมนุษย์เสมอ (User/Saleng/Admin) — ไม่มี actor แบบระบบอัตโนมัติที่เรียก operation เองในสเปกนี้ (ไม่มี auto-expire หรือ auto-matching ใน MVP)

## Resources & Operations

### User Account (อ้างอิงตาราง [[database-schema#user_account|user_account]])

จัดการบัญชีและโปรไฟล์ของ User

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| register | create | User | full_name, phone_number | user_account ที่สร้างใหม่ (status = active) | สมัครสมาชิกก่อนใช้งานฟีเจอร์อื่นได้ |
| login | custom action | User | phone_number + ข้อมูลยืนยันตัวตน (เชิงแนวคิด ไม่ระบุกลไก) | ผลการเข้าสู่ระบบ + ข้อมูล user_account | ต้องผ่านก่อนเรียก operation อื่นของ User ได้ |
| view_profile | read | User | user_id (ของตัวเอง) | full_name, phone_number, status | ดูข้อมูลโปรไฟล์ตัวเอง |
| update_profile | update | User | full_name และ/หรือ phone_number | user_account ที่อัปเดตแล้ว | แก้ไขข้อมูลไว้ใช้ซ้ำเวลาสร้างคำขอ |
| list | list | Admin | (ไม่มี filter บังคับ — ดูรายชื่อ user ทั้งหมดเพื่อใช้ประกอบการระงับบัญชี) | รายการ user_account พร้อม status | สนับสนุน [[../../01-requirements/feature-list#Admin|ระงับ (suspend) บัญชี user ที่ทำผิดกฎ]] |
| suspend | custom action | Admin | user_id, suspend_reason (ไม่บังคับ) | user_account ที่ status = suspended | บัญชีที่ถูกระงับสร้างคำขอใหม่ไม่ได้จนกว่าจะปลดระงับ |
| unsuspend | custom action | Admin | user_id | user_account ที่ status = active | ปฏิบัติการย้อนกลับของ suspend — **สมมติฐาน**: สเปกไม่ได้ระบุขั้นตอนปลดระงับไว้ตรงๆ (ดู "คำถามเปิด") |

### User Address (อ้างอิงตาราง [[database-schema#user_address|user_address]])

ที่อยู่ต้นแบบที่ User บันทึกไว้ใช้ซ้ำ

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| create | create | User | label (ไม่บังคับ), address_text, sub_district (ไม่บังคับ), landmark (ไม่บังคับ), gps_latitude/gps_longitude (ไม่บังคับ), is_default | user_address ที่สร้างใหม่ | รองรับ [[../../01-requirements/feature-list#User|เลือกใช้ที่อยู่ที่บันทึกไว้ในโปรไฟล์แทนกรอกใหม่]] — เกิดขึ้นได้ทั้งจากหน้าจัดการโปรไฟล์โดยตรง หรือ "เลือกบันทึกเพิ่ม" ตอนสร้างคำขอด้วยที่อยู่ใหม่ |
| list | list | User | user_id (ของตัวเอง) | รายการ user_address | แสดงให้เลือกตอนสร้างคำขอ |
| update | update | User | address_id, field ที่ต้องการแก้ | user_address ที่อัปเดตแล้ว | แก้ไขที่อยู่ที่บันทึกไว้ — ไม่กระทบ `pickup_request` ที่สร้างไปแล้วก่อนหน้า (เพราะคำขอเก็บ snapshot แยก) |
| delete | delete | User | address_id | ยืนยันการลบ | ลบที่อยู่ที่ไม่ใช้แล้ว |

### Saleng Account (อ้างอิงตาราง [[database-schema#saleng_account|saleng_account]])

จัดการบัญชีและสถานะของ Saleng รวมเอกสารประกอบการสมัคร (อ้างอิงตาราง [[database-schema#saleng_document|saleng_document]] ด้วย — รวมเป็นส่วนหนึ่งของ resource นี้เพราะเอกสารไม่มีวงจรชีวิตอิสระ ถูกสร้างพร้อมการสมัครเท่านั้น) ตาม spec 002 ข้อ 6

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| register | create | Saleng | full_name, phone_number, รหัสผ่าน (ข้อมูลยืนยันตัวตนเชิงแนวคิด ไม่เก็บใน saleng_account), vehicle_plate, service_sub_districts (≥ 1 ตำบล), รูปรถ (`vehicle_photo`), รูปบัตรประชาชน (`id_card_photo`) | saleng_account ใหม่ (approval_status = pending, account_status = active) + saleng_document 2 รายการ | spec 002 "การสมัครและอนุมัติสาเล้ง" — phone_number ต้อง unique; บัญชีใหม่ยังไม่เห็นงานจนกว่า Admin อนุมัติ; ระบบทดสอบใช้รูปบัตรประชาชนจำลองเท่านั้น; MVP ไม่ใช้ OTP |
| login | custom action | Saleng | phone_number + รหัสผ่าน (เชิงแนวคิด) | ผลการเข้าสู่ระบบ + ข้อมูล saleng_account | เข้าสู่ระบบได้ทุก approval_status/account_status แต่ operation ด้านงานเรียกได้เฉพาะสาเล้งที่ใช้งานได้ |
| view_own_status | read | Saleng | saleng_id (ของตัวเอง) | full_name, phone_number, vehicle_plate, service_sub_districts, approval_status, account_status, reject_reason (ถ้า rejected), suspend_reason (ถ้า suspended) | ดูสถานะบัญชีตัวเอง — สาเล้งที่ `pending` เห็นว่ารออนุมัติ, `rejected` เห็นเหตุผล, `suspended` เห็นว่าถูกระงับ (ไม่เห็นงานในทุกกรณีนี้) |
| list | list | Admin | filter ไม่บังคับ: approval_status, account_status (เช่น แท็บ "รออนุมัติ / ใช้งานอยู่ / ระงับ / ไม่อนุมัติ") | รายการ saleng_account พร้อมสถานะ, ตำบลที่รับงาน, ทะเบียนรถ และสถิติยกเลิกหลังยืนยัน (จำนวน request_match ที่ `cancelled_after_confirm = true` — ค่า derived) | สนับสนุน [[../../01-requirements/feature-list#Admin|ดูสถานะสาเล้งแต่ละคน (หน้าจัดการรถซาเล้ง)]] และ spec 002 user story 11 (ค่า "ว่าง/กำลังทำงาน" เป็นค่า derived ดู database-schema) |
| view_documents | read | Admin, Saleng (เจ้าของเท่านั้น) | saleng_id | รายการ saleng_document (doc_type + file_reference) | **ข้อมูลอ่อนไหว** — อ่านได้เฉพาะ Admin และเจ้าของบัญชี; สาเล้งคนอื่นและ User เรียกไม่ได้ |
| view_job_history | custom action | Admin | saleng_id | รายการ pickup_request/request_match/receipt ที่สาเล้งคนนี้เคยรับ/ยุติ/ปิดงาน | [[../../01-requirements/feature-list#Admin|ดูประวัติงานของสาเล้งแต่ละคน (หน้าจัดการรถซาเล้ง)]] |
| approve | custom action | Admin | saleng_id | approval_status = approved, account_status = active, approved_at/approved_by, reviewed_at/reviewed_by, reject_reason = null | สาเล้งได้สิทธิ์เป็น "สาเล้งที่ใช้งานได้" ทันที (เห็นงานเปิดในตำบลของตน/รับงานได้) — อนุมัติบัญชีที่เคยถูก reject ได้ด้วย |
| reject | custom action | Admin | saleng_id, reject_reason (**บังคับ**) | approval_status = rejected, reviewed_at/reviewed_by | spec 002 "reject ต้องระบุเหตุผล" — บัญชีไม่ได้รับสิทธิ์เข้าดู/รับงาน และสาเล้งเห็นเหตุผลผ่าน view_own_status |
| suspend | custom action | Admin | saleng_id, suspend_reason (**บังคับ**) | account_status = suspended, suspended_at/suspended_by | สาเล้งเสียสิทธิ์ "ใช้งานได้" ทันที — ไม่เห็นงานและรับงานใหม่ไม่ได้; งานที่จับคู่ค้างอยู่ไม่ถูกยุติอัตโนมัติ Admin ต้องใช้ Request Match.release เองถ้าต้องการ (ดู "คำถามเปิด" ของ database-schema) |
| reactivate | custom action | Admin | saleng_id | account_status = active, suspend_reason = null | "เปิดใช้งานอีกครั้ง" ของบัญชีที่ถูกระงับ — ได้สิทธิ์ใช้งานคืนทันที ไม่มีเงื่อนไขเพิ่ม (แทน `unsuspend` เดิมสำหรับฝั่งสาเล้ง) |

หมายเหตุ: operation `request_otp` / `verify_otp` ในฉบับก่อนหน้า **ไม่ถูกใช้ใน MVP** เพราะการพัฒนารอบนี้สาเล้งเข้าสู่ระบบด้วยเบอร์โทร + รหัสผ่าน และใช้การตรวจเอกสารโดย Admin แทน (spec 002 ข้อ 6) — ยังเก็บแนวคิดไว้ใน "สมมติฐานและข้อจำกัด" เผื่อเปิดใช้ OTP ในอนาคต (สอดคล้องกับ `saleng_account.otp_verification_status` ที่คงไว้แต่ไม่ได้ใช้)

### Admin Account (อ้างอิงตาราง [[database-schema#admin_account|admin_account]])

บัญชี Admin ออกแบบขั้นต่ำตามที่สเปกไม่ได้ระบุรายละเอียดการสมัคร/สิทธิ์

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| login | custom action | Admin | login_identifier + ข้อมูลยืนยันตัวตน (เชิงแนวคิด) | ผลการเข้าสู่ระบบ + ข้อมูล admin_account | ต้องผ่านก่อนเรียก operation อื่นของ Admin ได้ |

### Waste Reference Price (อ้างอิงตาราง [[database-schema#waste_type|waste_type]] และ [[database-schema#waste_reference_price|waste_reference_price]])

ราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| list | list | User, Saleng, Admin | (ไม่มี filter บังคับ) | รายการ waste_type พร้อม price_per_kg ปัจจุบัน | [[../../01-requirements/feature-list#User|ดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท]] — เป็นข้อมูลอ้างอิง ไม่ผูกธุรกรรมจริง |
| create_waste_type | create | Admin | name | waste_type ใหม่ | เพิ่มประเภทขยะใหม่เข้าตารางอ้างอิง — **สมมติฐาน**: สเปกไม่ได้ระบุตรงๆ ว่า Admin เพิ่มประเภทใหม่ได้ (แค่ระบุว่าตั้ง/อัปเดตราคา) แต่จำเป็นถ้าเลือก normalize เป็นตารางอ้างอิงตามที่ database-schema ตัดสินใจ |
| update_price | update | Admin | waste_type_id, price_per_kg | waste_reference_price ที่อัปเดตแล้ว | [[../../01-requirements/feature-list#Admin|อัปเดตราคากลางขยะต่อกิโลกรัมของแต่ละประเภท]] — มีผลทันทีกับสิ่งที่ User เห็นตอนสร้างคำขอครั้งถัดไป (ไม่มีผลย้อนหลังกับคำขอเก่าเพราะคำขอไม่เก็บ snapshot ราคา) |

### Pickup Request (อ้างอิงตาราง [[database-schema#pickup_request|pickup_request]], [[database-schema#pickup_request_waste_item|pickup_request_waste_item]], [[database-schema#request_photo|request_photo]])

คำขอเรียกรถซาเล้ง 1 รายการ ตั้งแต่สร้างจนเสร็จสิ้น/ยกเลิก

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| create | create | User | saved_address_id (ไม่บังคับ) หรือ address_text/sub_district/landmark/gps ใหม่, contact_name, contact_phone, requested_date, time_slot, waste_type_id[] (1 หรือมากกว่า), estimated_quantity_description | pickup_request ใหม่ (status = pending_admin_review) | ต้องตรวจสอบที่อยู่อยู่ในพื้นที่บริการ (เขตอำเภอเมือง เชียงราย) ก่อนสร้างสำเร็จ — ปฏิเสธถ้านอกพื้นที่ |
| upload_photo | custom action | User | request_id, ไฟล์รูปถ่ายขยะ | request_photo ที่สร้างใหม่ | [[../../01-requirements/feature-list#User|อัปโหลดรูปถ่ายขยะสูงสุด 5 ภาพต่อคำขอ]] — ปฏิเสธถ้าคำขอนี้มีรูปครบ 5 ภาพแล้ว, ไฟล์จริงถูกส่งไปเก็บที่ Media/File Storage |
| list_own | list | User | user_id (ของตัวเอง), filter ตามสถานะ (ไม่บังคับ) | รายการ pickup_request พร้อมสถานะ | [[../../01-requirements/feature-list#User|ดูสถานะคำขอของตัวเอง]] |
| read | read | User | request_id (ของตัวเอง) | รายละเอียดคำขอเต็มรูปแบบ + assigned_saleng_name / assigned_saleng_phone / assigned_saleng_plate (เมื่อ status เป็น confirmed หรือ completed) + สถานะ "กำลังหาสาเล้งใหม่" เมื่องานถูกคืนกลับเป็น open_for_saleng หลังเคยมีสาเล้งรับ | [[../../01-requirements/feature-list#User|เห็นข้อมูลติดต่อของสาเล้งที่รับงาน]] — ข้อมูลสาเล้งแสดงเฉพาะหลัง Admin confirm การจับคู่แล้วเท่านั้น (cross-cutting concern เรื่องความเป็นส่วนตัว); spec 002 user story 10: เมื่อสาเล้งยกเลิก ลูกค้าเห็นแจ้งเตือนว่ากำลังหาสาเล้งใหม่ |
| cancel (user) | custom action | User | request_id, cancel_reason (ไม่บังคับ) | pickup_request ที่ status = cancelled, cancelled_by = user | [[../../01-requirements/feature-list#User|ยกเลิกคำขอได้ก่อนงานเสร็จสิ้น]] — ทำได้ทุกสถานะก่อน completed |
| list_all | list | Admin | filter ตามสถานะ/วันที่ (ไม่บังคับ) | รายการ pickup_request ทั้งหมดพร้อมรายละเอียด | [[../../01-requirements/feature-list#Admin|ดูรายการคำขอที่เข้ามาทั้งหมดพร้อมรายละเอียด]] |
| read (admin) | read | Admin | request_id | รายละเอียดคำขอเต็มรูปแบบ | ใช้ตรวจสอบก่อนตัดสินใจ confirm/cancel |
| confirm (admin, ขั้นแรก) | custom action | Admin | request_id | pickup_request ที่ status = open_for_saleng, opened_at = เวลาปัจจุบัน | [[../../01-requirements/feature-list#Admin|กด confirm หรือ cancel คำขอของ user]] — เปิดให้คำขอปรากฏในรายการงานเปิดของสาเล้งในตำบลเดียวกัน |
| list_attention (admin) | list | Admin | (ไม่มี) | รายการ pickup_request ที่ status = open_for_saleng และ (opened_at เก่ากว่า 2 ชั่วโมง หรือ sub_district ไม่มีสาเล้งที่ใช้งานได้ลงทะเบียนไว้) | spec 002 user story 8 — เตือนงานค้างนาน/งานในตำบลที่ไม่มีสาเล้ง ให้ Admin เข้าไปมอบหมายได้ทัน (ค่า derived ไม่มี field ใหม่) |
| cancel (admin) | custom action | Admin | request_id, cancel_reason (ไม่บังคับ) | pickup_request ที่ status = cancelled, cancelled_by = admin | ควบคุมว่าคำขอใดจะเข้าสู่กระบวนการจับคู่จริง |
| list_open (saleng) | list | Saleng (ที่ใช้งานได้) | (ไม่มี filter จากผู้เรียก — ระบบกรองให้อัตโนมัติด้วย service_sub_districts ของสาเล้งผู้เรียก) | รายการ pickup_request ที่ status = open_for_saleng และ sub_district อยู่ใน service_sub_districts ของผู้เรียก — แสดงเฉพาะ sub_district, requested_date, time_slot, ประเภทขยะ, estimated_quantity_description, landmark (ถ้ามี) **ไม่รวม** address_text / gps / contact_name / contact_phone + โควตาปัจจุบันของผู้เรียกในรอบนั้น (เช่น "คิวเต็ม 3/3") | spec 002 ข้อ 1 — เห็นเฉพาะตำบลที่ลงทะเบียน (งานตำบลอื่นมาถึงได้ทาง Admin มอบหมายเท่านั้น); คำขอที่มีผู้รับแล้ว (มี assigned_saleng_id) หายจากรายการทันที; สาเล้งที่ pending/rejected/suspended ได้รายการว่าง |
| list_my_jobs (saleng) | list | Saleng (ที่ใช้งานได้) | (ของตัวเอง) | รายการ pickup_request ที่ assigned_saleng_id = ผู้เรียก แยกกลุ่ม "รอตอบรับ" (saleng_accepted = false), "รอ Admin ยืนยัน", "ยืนยันแล้ว", "เสร็จสิ้น" พร้อมกำหนดเวลายกเลิกเองของงานที่ confirmed | [[../../01-requirements/feature-list#Saleng|เห็นรายการงานที่ตนต้องเข้าไปรับ]] — ใช้แสดงปุ่มตอบรับ/ปฏิเสธ/ยกเลิก/ปิดงานตามสถานะ |
| read (saleng) | read | Saleng | request_id ที่ตนเป็น assigned_saleng_id | รายละเอียดงาน — **ที่อยู่ (address_text, gps) และข้อมูลติดต่อลูกค้า (contact_name, contact_phone) เปิดเผยเฉพาะเมื่อ status = confirmed** (ก่อนนั้นเห็นเท่าที่ list_open แสดง) | [[../../01-requirements/feature-list#Saleng|ดูรายละเอียดงานที่ต้องเข้าไปรับ]] / [[../../01-requirements/feature-list#Saleng|เห็นข้อมูลติดต่อของ user เพื่อนัดเจอ]] — ข้อมูลส่วนตัวลูกค้าเปิดเผยหลัง Admin confirm เท่านั้น |
| complete | custom action | Saleng | request_id (ต้อง status = confirmed และ assigned_saleng_id = ผู้เรียก) | pickup_request ที่ status = completed, completed_at | [[../../01-requirements/feature-list#Saleng|กดปิดงาน (mark as completed)]] — confirmed → completed เท่านั้น; เป็นเงื่อนไขก่อนส่งใบเสร็จได้ |

หมายเหตุ: operation `cancel (saleng)` ในฉบับก่อนหน้า **ย้ายไปเป็น `Request Match.cancel_by_saleng`** เพราะตาม spec 002 การยกเลิกของสาเล้งเป็นการยุติการจับคู่ (งานกลับเป็น open_for_saleng) ไม่ใช่การยกเลิกคำขอ

### Request Match (อ้างอิงตาราง [[database-schema#request_match|request_match]])

กลไกจับคู่งาน (self-pick / admin-assign) รับผิดชอบโดย Matching/Assignment component แยกจาก resource Pickup Request โดยตรง เพื่อรองรับ 2 ช่องทางจับคู่ การตอบรับของสาเล้ง การ confirm ขั้นสุดท้ายของ Admin และการยุติการจับคู่ ตาม spec หลัก + spec 002 ข้อ 2–5

**Effect ร่วมของทุก operation ในตารางนี้ต่อ Pickup Request:**
- **การเริ่มจับคู่** (self_pick, assign) — สร้าง request_match ใหม่ และตั้งกลุ่ม field การจับคู่ของ pickup_request พร้อมกัน: status = pending_match_confirm, assigned_saleng_id / assigned_saleng_name / assigned_saleng_phone / assigned_saleng_plate, match_channel, saleng_accepted, assigned_at, active_match_id (+ accepted_at ถ้าสาเล้งยอมรับแล้ว)
- **การยุติการจับคู่** (decline_assignment, cancel_by_saleng, release) — ตั้ง ended_by / end_reason / ended_at / cancelled_after_confirm ของ request_match และคืน pickup_request เป็น status = open_for_saleng, ตั้ง opened_at ใหม่, ล้างกลุ่ม field การจับคู่ทั้งหมด (รวม match_confirmed_at) เป็น null — คำขอกลับเข้ารายการงานเปิดของสาเล้งในตำบลนั้นทันที
- **เหตุผล (end_reason) บังคับทุกการยุติ** (spec 002 ข้อ 5 "การยกเลิกทุกกรณีต้องระบุเหตุผล")

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| self_pick | custom action | Saleng (ที่ใช้งานได้) | request_id | request_match ใหม่ (match_channel = self_pick, match_status = pending_admin_confirm_user, accepted_at = เวลาปัจจุบัน); pickup_request.saleng_accepted = true | [[../../01-requirements/feature-list#Saleng|กดรับงาน (self-pick) คำขอที่เปิดอยู่]] — **กันชนแบบ atomic (first-come-first-served)**: สำเร็จเฉพาะเมื่อ pickup_request ยัง status = open_for_saleng และยังไม่มี assigned_saleng_id (คำขอ 1 รายการผูกได้ 1 สาเล้ง) ถ้ามีผู้รับก่อนแล้วตอบกลับว่างานถูกรับไปแล้ว; sub_district ต้องอยู่ใน service_sub_districts ของผู้เรียก; **ปฏิเสธถ้าเกินโควตา** (3 งาน/รอบ หรือ 6 งานค้างรวม); ยังไม่ final จนกว่า Admin confirm |
| list_assign_candidates | list | Admin | request_id | รายชื่อสาเล้งที่ใช้งานได้ทั้งหมด เรียงตาม (1) ตำบลตรงกับ sub_district ของงานก่อน (2) จำนวนงานในรอบเดียวกันน้อยไปมาก พร้อมโควตาในรอบนั้น (เช่น 2/3) และงานค้างรวม (เช่น 4/6) | spec 002 ข้อ 3 — ค่าโควตาเป็น derived จาก pickup_request; ไม่จำกัดเฉพาะตำบลตรง |
| assign | custom action | Admin | request_id, saleng_id, ยืนยัน override (เมื่อเกินโควตา) | request_match ใหม่ (match_channel = admin_assign, match_status = pending_saleng_accept, created_by = Admin ผู้เรียก); pickup_request.saleng_accepted = false | [[../../01-requirements/feature-list#Admin|เลือก assign สาเล้งให้คำขอที่เปิดอยู่โดยตรง (admin-assign)]] — กันชนแบบ atomic เดียวกับ self_pick; ถ้าสาเล้งเกินโควตาแสดงคำเตือนแต่ Admin **override ได้**; งานถูกกันไว้จากสาเล้งคนอื่นและนับในโควตาของสาเล้งที่ถูกมอบหมายทันที แม้ยังไม่ตอบรับ (ยังไม่มี timeout) |
| accept_assignment | custom action | Saleng (ที่ถูกมอบหมาย) | request_id / request_match_id | match_status = pending_admin_confirm_user, accepted_at; pickup_request.saleng_accepted = true, accepted_at | spec 002 ข้อ 2 — สาเล้งกด "ตอบรับ" งานที่ Admin มอบหมาย **แทนขั้น `confirm_with_saleng` เดิม** ("Admin confirm กับสาเล้งที่เลือก" ของ spec หลัก กลายเป็นการตอบรับของสาเล้งเอง); accepted_at นี้คือ "เวลาที่กดรับ" ในสูตรกำหนดเวลายกเลิก |
| decline_assignment | custom action | Saleng (ที่ถูกมอบหมาย) | request_id / request_match_id, end_reason (**บังคับ**) | match_status = rejected, ended_by = saleng, cancelled_after_confirm = false | สาเล้งกด "ปฏิเสธ" งานที่ Admin มอบหมาย (ได้เฉพาะ match_status = pending_saleng_accept) — งานกลับไปเปิดรับ (Effect การยุติข้างต้น) |
| confirm | custom action | Admin | request_id / request_match_id | match_status = confirmed, confirmed_at / confirmed_by; pickup_request.status = confirmed, match_confirmed_at | [[../../01-requirements/feature-list#Admin|Confirm การจับคู่งานกับ user เป็นขั้นตอนสุดท้ายเสมอ]] — **ได้เฉพาะเมื่อสาเล้งยอมรับแล้ว** (saleng_accepted = true / match_status = pending_admin_confirm_user) ทั้ง 2 เส้นทาง; หลัง confirm ลูกค้าเห็นชื่อ/เบอร์/ทะเบียนสาเล้ง และสาเล้งเห็นที่อยู่/เบอร์ลูกค้า (แทน `confirm_with_user` เดิม) |
| cancel_by_saleng | custom action | Saleng (เจ้าของงาน) | request_id / request_match_id, end_reason (**บังคับ**) | match_status = cancelled, ended_by = saleng, cancelled_after_confirm = (true ถ้ายกเลิกหลัง confirm) | [[../../01-requirements/feature-list#Saleng|ยกเลิกงานที่รับไว้ได้ก่อนงานเสร็จสิ้น]] + spec 002 ข้อ 5 — ก่อน Admin confirm ยกเลิกได้อิสระ; หลัง confirm ยกเลิกเองได้**ไม่เกินกำหนดเวลา** = เวลาเริ่มรอบนัด − min(6 ชม., (เวลาเริ่มรอบนัด − accepted_at) / 2) — **เลยกำหนดแล้วปฏิเสธ** และต้องขอยกเลิกผ่าน Admin ทาง Saleng Chat Message แทน; งานกลับไปเปิดรับ และลูกค้าเห็นว่ากำลังหาสาเล้งใหม่ |
| release | custom action | Admin | request_id / request_match_id, end_reason (**บังคับ**) | match_status = rejected (ถ้ายังไม่ confirm) หรือ cancelled + cancelled_after_confirm = true (ถ้า confirm แล้ว), ended_by = admin | Admin ยุติการจับคู่ได้ทุกช่วง (pending_saleng_accept / pending_admin_confirm_user / confirmed) — ใช้ทั้งกรณีไม่เห็นด้วยกับการจับคู่ และกรณีสาเล้งขอยกเลิกผ่านแชทหลังเลยกำหนดเวลา; งานกลับไปเปิดรับ (แทน `reject` เดิม) |
| read | read | User, Saleng, Admin | request_id | request_match ล่าสุด/active ของคำขอนั้น (User เห็นเฉพาะข้อมูลที่สะท้อนใน pickup_request; Saleng เห็นเฉพาะแถวที่ saleng_id เป็นตัวเอง) | ใช้ประกอบกับ Pickup Request.read เพื่อดูรายละเอียดขั้นตอนการจับคู่ |
| list_cancel_stats | list | Admin | saleng_id (ไม่บังคับ) | จำนวน request_match ที่ cancelled_after_confirm = true ต่อสาเล้ง | spec 002 user story 11 — ใช้ประกอบการระงับบัญชี (ค่า derived) |

หมายเหตุ: operation `confirm_with_saleng`, `confirm_with_user`, `reject` ในฉบับก่อนหน้า ถูกแทนที่ด้วย `accept_assignment`, `confirm`, `release` ตามลำดับ ตามการเปลี่ยน flow ใน spec 002 (ดูความหมาย match_status ใน [[database-schema#request_match|database-schema]])

### Receipt (อ้างอิงตาราง [[database-schema#receipt|receipt]], [[database-schema#receipt_item|receipt_item]])

ใบเสร็จที่สาเล้งส่งเข้าระบบหลังปิดงาน

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| create | create | Saleng | request_id (ต้อง status = completed), รายการ [{waste_type_id, weight_kg, line_amount}] (1 หรือมากกว่า) | receipt ใหม่ พร้อม receipt_item ทุกรายการ, total_amount/platform_fee_amount/user_received_amount ที่คำนวณแล้ว | [[../../01-requirements/feature-list#Saleng|ส่งใบเสร็จเข้าระบบ]] — คำนวณค่าธรรมเนียมเรียกใช้งาน 20 บาทจาก total_amount ทันที และสร้าง saleng_fee_ledger_entry คู่กัน (ดู resource Saleng Fee Settlement) |
| read (user) | read | User | request_id (ของตัวเอง) | receipt พร้อมรายการทั้งหมด | [[../../01-requirements/feature-list#User|ดูใบเสร็จที่สาเล้งส่งเข้าระบบหลังงานเสร็จสิ้น]] |
| read (admin) | read | Admin | request_id | receipt พร้อมรายการทั้งหมด | [[../../01-requirements/feature-list#Admin|ดูใบเสร็จที่สาเล้งส่งเข้าระบบ (บันทึกประวัติธุรกรรม)]] |
| list (admin) | list | Admin | filter ตามช่วงวันที่/สาเล้ง (ไม่บังคับ) | รายการ receipt ทั้งหมด | บันทึกเป็นประวัติธุรกรรมส่วนกลาง (ไม่มี analytics/reporting ใน MVP ตาม feature-list) |

### Saleng Fee Settlement (อ้างอิงตาราง [[database-schema#saleng_fee_ledger_entry|saleng_fee_ledger_entry]], [[database-schema#saleng_wallet_balance|saleng_wallet_balance]])

ยอดค่าธรรมเนียมเรียกใช้งานที่สาเล้งค้างชำระ/ชำระแล้วกับ platform ตามโมเดลธุรกิจของสเปก (บันทึกยอดเท่านั้น ยังไม่มี payment gateway ตัดเงินจริงใน MVP)

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| list_own | list | Saleng | saleng_id (ของตัวเอง), filter ตาม settlement_status (ไม่บังคับ) | รายการ saleng_fee_ledger_entry | ให้สาเล้งเห็นยอดค้าง settle ตามที่ business rule ระบุว่าระบบต้อง "แจ้งยอดค่าธรรมเนียมค้าง settle" หลังส่งใบเสร็จ |
| settle | custom action | Saleng | ledger_entry_id, settlement_channel (prepaid_wallet / manual_transfer / cash_at_partner_shop) | saleng_fee_ledger_entry ที่ settlement_status = settled | สาเล้งแจ้งช่องทางที่ใช้ settle ค่าธรรมเนียม 1 ใน 3 ช่องทางตาม business model — ถ้าเลือก prepaid_wallet ระบบหักจาก saleng_wallet_balance อัตโนมัติ (ปฏิเสธถ้ายอดไม่พอ) |
| view_wallet_balance | read | Saleng | saleng_id (ของตัวเอง) | balance_amount ปัจจุบัน | ดูยอดเงินคงเหลือใน wallet |
| top_up_wallet | custom action | Saleng, Admin | saleng_id, จำนวนเงิน | saleng_wallet_balance ที่อัปเดตแล้ว | บันทึกยอดเติมเงินเข้า wallet เชิงบัญชีเท่านั้น (MVP ไม่มี payment gateway ตัดเงินจริง — การเติมเงินจริงเกิดขึ้นนอกระบบแล้วบันทึกยอดเข้ามา) — **สมมติฐาน**: สเปกไม่ได้ระบุตรงๆ ว่าใครเป็นผู้กด top-up (สาเล้งกดแจ้งเอง หรือ Admin เป็นผู้บันทึกแทนหลังตรวจสอบการโอนเงิน) |
| list_all (admin) | list | Admin | filter ตามสาเล้ง/settlement_status (ไม่บังคับ) | รายการ saleng_fee_ledger_entry ทั้งหมด | ภาพรวมยอดค้างชำระของสาเล้งทั้งระบบ สนับสนุนการติดตามรายได้ค่าบริการเรียกใช้งานตามโมเดลธุรกิจ |

### Chat Message (อ้างอิงตาราง [[database-schema#chat_message|chat_message]])

บทสนทนาระหว่าง User และ Admin เกี่ยวกับคำขอหนึ่งรายการ

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| send (user) | create | User | request_id (ของตัวเอง), message_text | chat_message ใหม่ (sender_role = user) | [[../../01-requirements/feature-list#User|แชทกับ Admin เกี่ยวกับคำขอ]] |
| send (admin) | create | Admin | request_id, message_text | chat_message ใหม่ (sender_role = admin) | [[../../01-requirements/feature-list#Admin|แชทกับ user เกี่ยวกับคำขอ]] |
| list (user) | list | User | request_id (ของตัวเอง) | รายการ chat_message เรียงตามเวลา | ดูประวัติบทสนทนาของคำขอตัวเอง |
| list (admin) | list | Admin | request_id | รายการ chat_message เรียงตามเวลา | ดูประวัติบทสนทนาของคำขอที่กำลังดูแล |

### Saleng Chat Message (อ้างอิงตาราง [[database-schema#saleng_chat_message|saleng_chat_message]])

บทสนทนาระหว่าง Admin กับสาเล้งเกี่ยวกับงานหนึ่งรายการ ตาม spec 002 Scope ข้อ ค. — **แยกจาก Chat Message ของลูกค้า** (ลูกค้าเรียก operation ใดๆ ของ resource นี้ไม่ได้) ห้องแชท 1 ห้อง = คู่ (request_id, saleng_id) ใช้ตกลงรายละเอียดก่อน Admin confirm และใช้ "ขอยกเลิกผ่าน Admin" หลังเลยกำหนดเวลายกเลิกเอง

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| send (saleng) | create | Saleng (ที่ใช้งานได้) | request_id (งานที่ตนเป็น assigned_saleng_id), message_text | saleng_chat_message ใหม่ (saleng_id = ผู้เรียก, sender_role = saleng) | spec 002 user story 7, 9 — สาเล้งส่งได้เฉพาะห้องของตัวเอง |
| send (admin) | create | Admin | request_id, saleng_id, message_text | saleng_chat_message ใหม่ (sender_role = admin) | Admin แชทกับสาเล้งที่ผูกกับงาน — ใช้ประกอบการตัดสินใจ confirm หรือ release |
| list (saleng) | list | Saleng | request_id (ห้องของตัวเอง) | รายการ saleng_chat_message ของคู่ (request_id, ผู้เรียก) เรียงตามเวลา | สาเล้งอ่านได้เฉพาะห้องที่ saleng_id เป็นตัวเอง |
| list (admin) | list | Admin | request_id, saleng_id | รายการ saleng_chat_message ของห้องนั้น เรียงตามเวลา | Admin อ่านได้ทุกห้อง |

### Membership Tier (เผื่อรองรับอนาคต — อ้างอิงตาราง [[database-schema#membership_tier|membership_tier]])

**หมายเหตุ: เผื่อรองรับโมเดลธุรกิจค่าสมาชิกรายเดือนในอนาคต ไม่ใช่ resource ที่พัฒนาเต็มรูปแบบใน MVP**

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| list | list | Admin | (ไม่มี) | รายการ membership_tier | สำหรับใช้อ้างอิงในอนาคตเมื่อเปิดฟีเจอร์ค่าสมาชิกจริง — MVP ไม่มี UI/flow ที่เรียก operation นี้ |

### Ad Banner (เผื่อรองรับอนาคต — อ้างอิงตาราง [[database-schema#ad_banner|ad_banner]])

**หมายเหตุ: เผื่อรองรับโมเดลธุรกิจค่าโฆษณาในแอปในอนาคต ไม่ใช่ resource ที่พัฒนาเต็มรูปแบบใน MVP**

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| list | list | Admin | (ไม่มี) | รายการ ad_banner | สำหรับใช้อ้างอิงในอนาคตเมื่อเปิดฟีเจอร์โฆษณาจริง — MVP ไม่มี UI/flow ที่เรียก operation นี้ |

## สมมติฐานและข้อจำกัด

เอกสารนี้เป็นการสร้างครั้งแรก คู่กับ [[database-schema|Database Schema (Conceptual)]] ไม่มี AskUserQuestion tool พร้อมใช้งานในสภาพแวดล้อมนี้ จึงร่างสมมติฐานพร้อมเหตุผลไว้เช่นเดียวกับเอกสารคู่กัน:

- ทุก resource สืบย้อนกลับไปหาตารางใน database-schema ได้ครบ ไม่มี field ใหม่ที่ API รับ/ส่งซึ่งไม่มีอยู่ในตาราง ยกเว้นจุดที่ระบุไว้ชัดเจนว่าเป็นสมมติฐาน (เช่น `create_waste_type`, `top_up_wallet`)
- **operation `unsuspend`** (ทั้ง User Account และ Saleng Account) เป็นการอนุมานแบบสมมาตรกับ `suspend` เพราะสเปกระบุว่าบัญชีถูกระงับ "จนกว่าจะได้รับการปลดระงับ" แต่ไม่ได้อธิบายเงื่อนไข/ขั้นตอนไว้ ยึดเป็นการย้อนสถานะกลับตรงๆ ไปก่อน
- **`Request Match.reject`** เป็นสมมติฐานเพื่อให้ครอบคลุม edge case "Admin ปฏิเสธจริงการจับคู่ที่ self-pick ไว้" ที่ journey doc ระบุว่ารอการออกแบบเพิ่มเติม — ออกแบบให้พฤติกรรมเหมือนการยกเลิกงาน (คำขอกลับไปเปิดให้รับใหม่) เป็นทางเลือกที่ simple ที่สุดในบรรดาทางเลือกที่เป็นไปได้
- **filter ของ operation ประเภท list ส่วนใหญ่ระบุไว้แบบ "ไม่บังคับ" ในเชิงแนวคิดเท่านั้น** (เช่น filter ตามสถานะ/วันที่/สาเล้ง) ไม่ลงรายละเอียด parameter จริง — ยกเว้น `list_open (saleng)` ที่ระบุ filter ตาม `sub_district` ชัดเจนเพราะสืบย้อนตรงจาก journey doc ("ดูรายการคำขอที่เปิดอยู่ในพื้นที่ที่สนใจ") และ field ที่มีอยู่แล้วในตาราง `pickup_request`
- **`top_up_wallet` ระบุ actor เป็นทั้ง Saleng และ Admin** เพราะสเปกไม่ได้ระบุตรงๆ ว่าใครเป็นผู้บันทึกยอดเติมเงิน (สาเล้งแจ้งเติมเงินเอง หรือ Admin เป็นผู้ตรวจสอบการโอนเงินแล้วบันทึกแทน) — ควรยืนยันกับผู้ใช้ก่อนพัฒนาจริง

### ส่วนที่เพิ่ม 2026-11-07 (ตาม [[../../01-requirements/01-spec/20260912-002-saleng-auto-matching|spec 002]])

- **"สาเล้งที่ใช้งานได้"** (`approval_status = approved` และ `account_status = active`) เป็นเงื่อนไขก่อนเรียก operation ด้านงานทุกตัวของ Saleng (list_open, list_my_jobs, self_pick, accept/decline_assignment, cancel_by_saleng, complete, Saleng Chat Message) — ระบบจริงมีกลไกเช็กสิทธิ์นี้แยกต่างหาก (ดูหมายเหตุใต้ [[database-schema#saleng_account|saleng_account]])
- **การเข้าสู่ระบบของสาเล้ง** ใช้เบอร์โทร + รหัสผ่าน (pattern เดียวกับ User) — ไม่มี request_otp/verify_otp ใน MVP แนวคิด OTP เดิมเก็บไว้เป็นทางเลือกอนาคตเท่านั้น
- **ความเป็นส่วนตัวสองทาง**: สาเล้งไม่เห็นที่อยู่/เบอร์ลูกค้าก่อน Admin confirm และลูกค้าไม่เห็นชื่อ/เบอร์/ทะเบียนสาเล้งก่อน Admin confirm; เอกสารสมัครของสาเล้ง (โดยเฉพาะรูปบัตรประชาชน) อ่านได้เฉพาะเจ้าของกับ Admin
- **โควตาคิว** (3 งาน/รอบ = วัน + ช่วงเวลาเดียวกัน, 6 งานค้างรวม) และ **กำหนดเวลายกเลิก** (เวลาเริ่มรอบนัด 08:00/13:00 − min(6 ชม., ครึ่งหนึ่งของเวลาตั้งแต่ accepted_at ถึงเวลาเริ่มรอบ)) เป็นค่าคำนวณจาก field ที่มีอยู่ ไม่มี field ใหม่ — ข้อจำกัดที่ทราบ: ปัจจุบันตรวจกติกาทั้งสองฝั่งการใช้งาน ยังไม่ได้บังคับที่ชั้นข้อมูล
- **งานที่ Admin มอบหมายแต่ยังไม่ตอบรับ** ถูกกันไว้จากสาเล้งคนอื่นและนับในโควตาแล้ว ยังไม่มี timeout — Admin ใช้ `release` ถ้าต้องการดึงงานคืน
- **list filter**: `list_open (saleng)` ระบบกรองตาม `service_sub_districts` ของผู้เรียกเสมอ (ไม่ใช่ filter ที่ผู้เรียกเลือกเอง); `list_assign_candidates` ระบุลำดับการเรียงเจาะจงตาม spec 002 ข้อ 3
- ทุก field ที่ operation ใหม่รับ/ส่งสืบย้อนไปหา field ใน database-schema ได้ ยกเว้นค่า derived ที่ระบุไว้ชัดเจน (โควตา, กำหนดเวลายกเลิก, สถิติยกเลิกหลังยืนยัน, รายการงานที่ต้องให้ความสนใจ) และ "รหัสผ่าน" ตอนสมัคร/เข้าสู่ระบบ ซึ่งเป็นข้อมูลยืนยันตัวตนเชิงแนวคิด ไม่เก็บในตารางบัญชี

## คำถามเปิด / จุดที่ต้องตัดสินใจเพิ่มเติม

สืบเนื่องจากคำถามเปิดของ [[database-schema#คำถามเปิด / จุดที่ต้องตัดสินใจเพิ่มเติม|database-schema]] ทั้งหมด (มีผลโดยตรงต่อ operation ในเอกสารนี้) เพิ่มเติมเฉพาะฝั่ง API:

1. `Request Match.release` (เดิม `reject`) ควรมีผลอย่างไรต่อสิทธิ์ของสาเล้งที่ถูกยุติการจับคู่ (กลับไป self-pick คำขอเดิมซ้ำได้หรือไม่ — ปัจจุบันไม่ได้ห้าม)
2. ~~`unsuspend` ควรมีเงื่อนไขเพิ่มเติมหรือไม่~~ — **ปิดสำหรับสาเล้ง (2026-11-07)**: `Saleng Account.reactivate` กดได้ทันทีไม่มีเงื่อนไข; `User Account.unsuspend` ยังเป็นสมมติฐานเดิม
3. `top_up_wallet` ควรเป็น operation ที่ Saleng เรียกเอง, Admin เป็นผู้บันทึกแทน, หรือทั้งสองฝ่ายเรียกได้ในสถานการณ์ต่างกัน
4. ~~ระดับความละเอียดของ filter ใน `list_open (saleng)`~~ — **ปิดแล้ว (spec 002)**: กรองตามตำบลที่สาเล้งลงทะเบียน (`service_sub_districts`) ไม่ใช้ GPS
5. (ใหม่) ควรเพิ่ม operation ให้สาเล้งแก้ไขตำบลที่รับงาน/ทะเบียนรถ/เอกสารหลังสมัครหรือไม่ — ปัจจุบันไม่มี (spec 002 ไม่ได้ระบุ)
6. (ใหม่ — จาก spec 002) การแจ้งเตือนงานใหม่แบบ push/badge ให้สาเล้ง ("เด้งงาน") — ยังไม่มี operation รองรับ ขั้นต่ำคือ `list_open (saleng)`
7. (ใหม่ — จาก spec 002) ถ้า Admin เปลี่ยนวัน/ช่วงเวลานัดของงานที่จับคู่แล้ว ควรแจ้งสาเล้งหรือให้สาเล้งยืนยันใหม่หรือไม่ (ปัจจุบันโควตาและกำหนดเวลายกเลิกคำนวณจากรอบนัดล่าสุดทันที)

## Reference

- [[../../01-requirements/feature-list|feature-list]]
- [[../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[../../01-requirements/01-spec/20260912-002-saleng-auto-matching|ระบบจับคู่งานสาเล้งตามพื้นที่ (ตำบล) + Admin-assign และการจัดการสาเล้ง]]
- [[high-level-architecture|High-Level Architecture (Conceptual)]]
- [[database-schema|Database Schema (Conceptual)]]
- [[index|02-technical]]
