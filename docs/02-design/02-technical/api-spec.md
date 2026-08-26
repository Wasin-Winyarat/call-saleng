# API Spec (Conceptual Data Contract)

> เอกสารนี้อธิบาย data contract ในระดับแนวคิด (conceptual) เท่านั้น **ไม่ผูกมัดกับ protocol, HTTP method/URL, หรือรูปแบบ authentication เฉพาะเจาะจงใดๆ** การเลือก protocol จริงจะอยู่ในเอกสารแยกต่างหากภายใต้โฟลเดอร์เดียวกันนี้เมื่อถึงขั้นตอนออกแบบเชิงเทคนิค

## ภาพรวม

เอกสารนี้ต่อยอดจาก [[database-schema|Database Schema (Conceptual)]] แปลงแต่ละตาราง/กลุ่มตารางให้เป็น **resource** เชิงแนวคิด พร้อมระบุ **operation** ที่แต่ละ actor ทำได้ ตาม [[../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng spec]], [[../../01-requirements/feature-list|feature-list]] และ journey doc ทั้ง 5 ฉบับ ชื่อ resource ในเอกสารนี้ตรงกับชื่อตารางหลักใน database-schema เสมอ ส่วน component เชิงแนวคิดที่รับผิดชอบแต่ละ resource อ้างอิงจาก [[high-level-architecture|High-Level Architecture (Conceptual)]] — โดยเฉพาะ operation ในกลุ่ม "การจับคู่งาน" ที่ถูกจัดกลุ่มแยกเป็น resource **Request Match** ต่างหาก สะท้อนว่ารับผิดชอบโดย **Matching/Assignment** component ไม่ใช่ Core Application Layer ทั่วไป

## Actors

| Actor | คำอธิบาย |
|---|---|
| **User** | เจ้าของขยะที่สร้างและติดตามคำขอเรียกรถซาเล้ง |
| **Saleng** | คนขับที่ดูงาน กดรับงาน ปิดงาน และส่งใบเสร็จ ต้องผ่านการอนุมัติจาก Admin ก่อนจึงเรียก operation ส่วนใหญ่ได้ |
| **Admin** | ผู้ดูแลระบบ ตรวจสอบ/จับคู่คำขอ, จัดการบัญชีสาเล้ง/user, ตั้งราคากลาง |

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

จัดการบัญชีและสถานะของ Saleng

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| register | create | Saleng | full_name, phone_number | saleng_account ใหม่ (approval_status = pending, otp_verification_status = unverified) | ต้องยืนยัน OTP และรอ Admin อนุมัติก่อนจึงเห็น/รับงานได้ |
| request_otp | custom action | Saleng | phone_number | ผลการส่งรหัสยืนยัน | เรียก External Identity Verification ส่งรหัสไปยังเบอร์โทร ตาม business rule "ยืนยันตัวตนด้วยเบอร์โทร/OTP เท่านั้น" |
| verify_otp | custom action | Saleng | phone_number, รหัส OTP | otp_verification_status = verified | ต้องผ่านก่อนบัญชีจะรอ Admin อนุมัติต่อ |
| login | custom action | Saleng | phone_number + ข้อมูลยืนยันตัวตน (เชิงแนวคิด) | ผลการเข้าสู่ระบบ + ข้อมูล saleng_account | ต้องผ่านก่อนเรียก operation อื่นได้ |
| view_own_profile | read | Saleng | saleng_id (ของตัวเอง) | full_name, phone_number, approval_status, account_status | ดูสถานะบัญชีตัวเอง |
| list | list | Admin | filter ไม่บังคับ (เช่น approval_status, account_status) | รายการ saleng_account พร้อมสถานะ (ว่าง/กำลังทำงาน/ระงับ — ค่า "ว่าง/กำลังทำงาน" เป็นค่า derived ดู database-schema) | สนับสนุน [[../../01-requirements/feature-list#Admin|ดูสถานะสาเล้งแต่ละคน (หน้าจัดการรถซาเล้ง)]] |
| view_job_history | custom action | Admin | saleng_id | รายการ pickup_request/receipt ที่สาเล้งคนนี้เคยรับ/ปิดงาน | [[../../01-requirements/feature-list#Admin|ดูประวัติงานของสาเล้งแต่ละคน (หน้าจัดการรถซาเล้ง)]] |
| approve | custom action | Admin | saleng_id | approval_status = approved | สาเล้งได้สิทธิ์เข้าดู/รับงานทันที |
| reject | custom action | Admin | saleng_id, reason (ไม่บังคับ) | approval_status = rejected | บัญชีไม่ได้รับสิทธิ์เข้าดู/รับงาน |
| suspend | custom action | Admin | saleng_id, suspend_reason (ไม่บังคับ) | account_status = suspended | รับงานใหม่ไม่ได้จนกว่าจะปลดระงับ — งานที่ `confirmed` อยู่แล้วไม่ได้รับผลกระทบอัตโนมัติ (ดู "คำถามเปิด" ของ database-schema) |
| unsuspend | custom action | Admin | saleng_id | account_status = active | ปฏิบัติการย้อนกลับของ suspend — **สมมติฐาน** เช่นเดียวกับฝั่ง User |

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
| read | read | User | request_id (ของตัวเอง) | รายละเอียดคำขอเต็มรูปแบบ + ข้อมูลติดต่อสาเล้งที่รับงาน (เมื่อ status ≥ confirmed) | [[../../01-requirements/feature-list#User|เห็นข้อมูลติดต่อของสาเล้งที่รับงาน]] — ข้อมูลติดต่อแสดงเฉพาะหลังจับคู่ confirm แล้วเท่านั้น (cross-cutting concern เรื่องความเป็นส่วนตัว) |
| cancel (user) | custom action | User | request_id, cancel_reason (ไม่บังคับ) | pickup_request ที่ status = cancelled, cancelled_by = user | [[../../01-requirements/feature-list#User|ยกเลิกคำขอได้ก่อนงานเสร็จสิ้น]] — ทำได้ทุกสถานะก่อน completed |
| list_all | list | Admin | filter ตามสถานะ/วันที่ (ไม่บังคับ) | รายการ pickup_request ทั้งหมดพร้อมรายละเอียด | [[../../01-requirements/feature-list#Admin|ดูรายการคำขอที่เข้ามาทั้งหมดพร้อมรายละเอียด]] |
| read (admin) | read | Admin | request_id | รายละเอียดคำขอเต็มรูปแบบ | ใช้ตรวจสอบก่อนตัดสินใจ confirm/cancel |
| confirm (admin, ขั้นแรก) | custom action | Admin | request_id | pickup_request ที่ status = open_for_saleng | [[../../01-requirements/feature-list#Admin|กด confirm หรือ cancel คำขอของ user]] — เปิดให้คำขอปรากฏในรายการของสาเล้ง |
| cancel (admin) | custom action | Admin | request_id, cancel_reason (ไม่บังคับ) | pickup_request ที่ status = cancelled, cancelled_by = admin | ควบคุมว่าคำขอใดจะเข้าสู่กระบวนการจับคู่จริง |
| list_open (saleng) | list | Saleng | filter ตาม sub_district/พื้นที่ที่สนใจ (ไม่บังคับ) | รายการ pickup_request ที่ status = open_for_saleng | [[../../01-requirements/feature-list#Saleng|ดูรายการคำขอที่เปิดอยู่ในพื้นที่ที่สนใจ]] — คำขอที่ถูกรับไปแล้วต้องหายจากรายการนี้ทันที |
| read (saleng) | read | Saleng | request_id ที่ตนได้รับ | รายละเอียดคำขอเต็มรูปแบบ + ข้อมูลติดต่อ User (เมื่อ status = confirmed) | [[../../01-requirements/feature-list#Saleng|ดูรายละเอียดงานที่ต้องเข้าไปรับ]] / [[../../01-requirements/feature-list#Saleng|เห็นข้อมูลติดต่อของ user เพื่อนัดเจอ]] |
| cancel (saleng) | custom action | Saleng | request_id, cancel_reason (ไม่บังคับ) | pickup_request กลับสู่ status = open_for_saleng (ถ้ายังไม่ completed) และ request_match ที่เกี่ยวข้องเป็น cancelled | [[../../01-requirements/feature-list#Saleng|ยกเลิกงานที่รับไว้ได้ก่อนงานเสร็จสิ้น]] — คำขอกลับไปเปิดให้สาเล้งคนอื่นรับต่อได้ |
| complete | custom action | Saleng | request_id | pickup_request ที่ status = completed | [[../../01-requirements/feature-list#Saleng|กดปิดงาน (mark as completed)]] — เป็นเงื่อนไขก่อนส่งใบเสร็จได้ |

### Request Match (อ้างอิงตาราง [[database-schema#request_match|request_match]])

กลไกจับคู่งาน (self-pick / admin-assign) รับผิดชอบโดย Matching/Assignment component แยกจาก resource Pickup Request โดยตรง เพื่อรองรับ 2 ช่องทางจับคู่และการ confirm หลายขั้นตอนตาม business rule

| Operation | ประเภท | Actor | Input (เชิงแนวคิด) | Output (เชิงแนวคิด) | Business rule / Effect |
|---|---|---|---|---|---|
| self_pick | custom action | Saleng | request_id | request_match ใหม่ (match_channel = self_pick, match_status = pending_admin_confirm_user) | [[../../01-requirements/feature-list#Saleng|กดรับงาน (self-pick) คำขอที่เปิดอยู่]] — ต้องตรวจสอบแบบ atomic ว่าไม่มี request_match อื่นที่ active อยู่กับคำขอนี้ (ป้องกันรับงานซ้ำ, first-come-first-served); ยังไม่ final จนกว่า Admin จะ confirm |
| assign | custom action | Admin | request_id, saleng_id | request_match ใหม่ (match_channel = admin_assign, match_status = pending_admin_confirm_saleng) | [[../../01-requirements/feature-list#Admin|เลือก assign สาเล้งให้คำขอที่เปิดอยู่โดยตรง (admin-assign)]] |
| confirm_with_saleng | custom action | Admin | request_match_id | match_status = pending_admin_confirm_user | ขั้นที่ 1 ของเส้นทาง admin-assign เท่านั้น — "Admin confirm การจับคู่กับสาเล้งที่เลือกก่อน" |
| confirm_with_user | custom action | Admin | request_match_id | match_status = confirmed, pickup_request.status = confirmed, pickup_request.assigned_saleng_id ตั้งค่า | [[../../01-requirements/feature-list#Admin|Confirm การจับคู่งานกับ user เป็นขั้นตอนสุดท้ายเสมอ]] — ใช้ได้ทั้ง 2 เส้นทาง (self-pick มาถึงขั้นนี้ได้ทันที, admin-assign ต้องผ่าน confirm_with_saleng ก่อน) |
| reject | custom action | Admin | request_match_id, reject_reason (ไม่บังคับ) | match_status = rejected, pickup_request.status กลับเป็น open_for_saleng | Admin ปฏิเสธการจับคู่ที่ค้างอยู่ (ทั้ง self-pick ที่ยังไม่ confirm หรือ admin-assign ที่ยังไม่ confirm ขั้นสุดท้าย) — **สมมติฐาน**: สเปกไม่ได้ระบุผลลัพธ์ของกรณีนี้ไว้ตรงๆ ยึดตามพฤติกรรมเดียวกับการยกเลิกงาน (ดู "คำถามเปิด") |
| read | read | User, Saleng, Admin | request_id | request_match ล่าสุด/active ของคำขอนั้น | ใช้ประกอบกับ Pickup Request.read เพื่อดูรายละเอียดขั้นตอนการจับคู่ |

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

## คำถามเปิด / จุดที่ต้องตัดสินใจเพิ่มเติม

สืบเนื่องจากคำถามเปิดของ [[database-schema#คำถามเปิด / จุดที่ต้องตัดสินใจเพิ่มเติม|database-schema]] ทั้งหมด (มีผลโดยตรงต่อ operation ในเอกสารนี้) เพิ่มเติมเฉพาะฝั่ง API:

1. `Request Match.reject` ควรมีผลอย่างไรต่อสิทธิ์ของสาเล้งที่ถูกปฏิเสธ (กลับไป self-pick คำขอเดิมซ้ำได้หรือไม่)
2. `unsuspend` ควรมีเงื่อนไข/ผู้อนุมัติเพิ่มเติมหรือไม่ (เช่น ต้องมีเหตุผลกำกับ) หรือ Admin กดย้อนสถานะได้ทันที
3. `top_up_wallet` ควรเป็น operation ที่ Saleng เรียกเอง, Admin เป็นผู้บันทึกแทน, หรือทั้งสองฝ่ายเรียกได้ในสถานการณ์ต่างกัน
4. ระดับความละเอียดของ filter ใน `list_open (saleng)` (ตาม `sub_district` ตามที่ออกแบบไว้ หรือรูปแบบอื่น)

## Reference

- [[../../01-requirements/feature-list|feature-list]]
- [[../../01-requirements/01-spec/20260819-001-saleng-pickup-request|Call-Saleng: ระบบเรียกรถซาเล้งมารับซื้อขยะ Recycle ที่บ้าน]]
- [[high-level-architecture|High-Level Architecture (Conceptual)]]
- [[database-schema|Database Schema (Conceptual)]]
- [[index|02-technical]]
