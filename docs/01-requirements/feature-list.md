# Feature List

> ไฟล์นี้ auto-generate จากเอกสารใน [[01-spec/index|01-spec]] ทั้งหมด **ห้ามแก้ไขไฟล์นี้ตรงๆ** — ถ้าต้องการเปลี่ยนฟีเจอร์หรือ priority ให้แก้ที่เอกสาร spec ต้นทางแล้วรัน feature-list-writer ใหม่ อ้างอิงสถานะจาก [[backlog|backlog]]

## User

| ฟีเจอร์ | รายละเอียดย่อ | Spec ต้นทาง | MoSCoW | สถานะ |
| --- | --- | --- | --- | --- |
| สมัครสมาชิก/เข้าสู่ระบบ | เข้าสู่ระบบ/สมัครบัญชีเพื่อใช้งานฟีเจอร์สร้างคำขอ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| จัดการโปรไฟล์ส่วนตัว | บันทึกชื่อ, เบอร์โทร, ที่อยู่ไว้ใช้ซ้ำเวลาสร้างคำขอครั้งต่อไป | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Should have (inferred) | Confirmed |
| สร้างคำขอเรียกรถซาเล้งด้วยฟอร์มรายละเอียด | กรอกชื่อ, เบอร์โทร, ที่อยู่+จุดสังเกต, วันที่, ช่วงเวลา (08:00–13:00 หรือ 13:00–18:00), ประเภทขยะ, ปริมาณโดยประมาณ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| เลือกใช้ที่อยู่ที่บันทึกไว้ในโปรไฟล์แทนกรอกใหม่ | ดึงที่อยู่จากโปรไฟล์ หรือกรอกที่อยู่ใหม่แล้วเลือกบันทึกเพิ่ม | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Should have (inferred) | Confirmed |
| อัปโหลดรูปถ่ายขยะสูงสุด 5 ภาพต่อคำขอ | แนบรูปประกอบคำขอเพื่อให้ Admin/สาเล้งประเมินงานก่อนตัดสินใจ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท | แสดงราคาอ้างอิง (ไม่ผูกธุรกรรมจริง) ก่อน/ระหว่างสร้างคำขอ เพื่อประกอบการตัดสินใจ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Should have (inferred) | Confirmed |
| ดูสถานะคำขอของตัวเอง | ติดตามสถานะ: รอ Admin ยืนยัน / รอสาเล้งรับงาน / รอ Admin confirm / ยืนยันแล้ว / เสร็จสิ้น / ยกเลิก | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| แชทกับ Admin เกี่ยวกับคำขอ | สื่อสารสอบถาม/แจ้งรายละเอียดเพิ่มเติมกับ Admin เกี่ยวกับคำขอของตัวเอง | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Should have (inferred) | Confirmed |
| ดูใบเสร็จที่สาเล้งส่งเข้าระบบหลังงานเสร็จสิ้น | เห็นรายการ (ประเภทขยะ, น้ำหนัก, ราคา) เป็นหลักฐานการซื้อขาย | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ยกเลิกคำขอได้ก่อนงานเสร็จสิ้น | ยกเลิกกรณีมีเหตุสุดวิสัย เช่น สาเล้งไปไม่ถึง/user ไม่อยู่บ้าน | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| เห็นข้อมูลติดต่อของสาเล้งที่รับงาน | เห็นเบอร์โทร/ที่อยู่ของสาเล้งพอสมควรเพื่อนัดเจอ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ระบบแจ้งเตือนสถานะคำขอแบบ real-time (push notification) | Out of scope ใน MVP — ใช้การ refresh/polling ธรรมดาแทน | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |
| ระบบชำระเงินออนไลน์ / e-wallet ในแอป | Out of scope ใน MVP — ยังใช้เงินสดหน้างาน (วางแผนรองรับ e-wallet เป็น future phase) | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |
| ระบบตีราคาขยะแบบผูกกับธุรกรรมจริงหรือต่อรองราคาผ่านแอป | Out of scope ใน MVP — ราคาซื้อขายจริงยังตกลงหน้างานเอง | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |
| ระบบให้คะแนน/รีวิวสาเล้งหรือ user | Out of scope ใน MVP นี้ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |
| การจองล่วงหน้าแบบตารางเวลา (recurring/scheduled pickup) | Out of scope ใน MVP — เป็นรูปแบบ on-demand เท่านั้น | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |
| ให้บริการนอกเขตอำเภอเมือง จังหวัดเชียงราย | Out of scope ใน MVP — พื้นที่บริการจำกัดเฉพาะเขตอำเภอเมือง เชียงราย | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |

## Saleng

| ฟีเจอร์ | รายละเอียดย่อ | Spec ต้นทาง | MoSCoW | สถานะ |
| --- | --- | --- | --- | --- |
| ลงทะเบียน/เข้าสู่ระบบด้วยเบอร์โทร/OTP | ยืนยันตัวตนสาเล้งก่อนใช้งานระบบ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ดูรายการคำขอที่เปิดอยู่ในพื้นที่ที่สนใจ | เห็นคำขอที่ยังไม่มีคนรับ พร้อมประเภท/ปริมาณขยะโดยประมาณ ก่อนเลือกงาน | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| กดรับงาน (self-pick) คำขอที่เปิดอยู่ | จองสิทธิ์รับงานแบบ first-come-first-served (ยังไม่ final จนกว่า Admin confirm) | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ดูรายละเอียดงานที่ต้องเข้าไปรับ | เห็นข้อมูล user (ชื่อ, เบอร์โทร, ที่อยู่, จุดสังเกต, รูปถ่ายขยะ) | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| เห็นข้อมูลติดต่อของ user เพื่อนัดเจอ | เห็นเบอร์โทร/ที่อยู่ของ user พอสมควรเพื่อประสานงานก่อนเข้ารับ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| กดปิดงาน (mark as completed) | อัปเดตสถานะคำขอเป็น "เสร็จสิ้น" หลังไปรับซื้อขยะเสร็จ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ส่งใบเสร็จเข้าระบบ | กรอกรายการ (ประเภทขยะ, น้ำหนัก, ราคา) ได้หลายรายการต่อ 1 ใบเสร็จ ให้ทั้ง user และ Admin เห็น | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ยกเลิกงานที่รับไว้ได้ก่อนงานเสร็จสิ้น | ยกเลิกกรณีมีเหตุสุดวิสัย เช่น ไปไม่ถึง/user ไม่อยู่บ้าน | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ระบบชั่งน้ำหนักหรือยืนยันปริมาณขยะจริงผ่านแอป | Out of scope ใน MVP นี้ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |
| การยืนยันตัวตนสาเล้งแบบเข้มงวด (KYC/เอกสารทะเบียนรถ/บัตรประชาชน) | Out of scope ใน MVP — ยืนยันด้วยเบอร์โทร/OTP เท่านั้น | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |

## Admin

| ฟีเจอร์ | รายละเอียดย่อ | Spec ต้นทาง | MoSCoW | สถานะ |
| --- | --- | --- | --- | --- |
| ดูรายการคำขอที่เข้ามาทั้งหมดพร้อมรายละเอียด | ชื่อ, เบอร์โทร, ที่อยู่, จุดสังเกต, รูปขยะ, วันที่/ช่วงเวลา, ประเภท/ปริมาณขยะโดยประมาณ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| แชทกับ user เกี่ยวกับคำขอ | สื่อสารกับ user เกี่ยวกับคำขอที่เข้ามาแต่ละรายการ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Should have (inferred) | Confirmed |
| กด confirm หรือ cancel คำขอของ user | ควบคุมว่าคำขอใดจะเข้าสู่กระบวนการจับคู่สาเล้งจริง | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| เลือก assign สาเล้งให้คำขอที่เปิดอยู่โดยตรง (admin-assign) | มอบหมายงานให้สาเล้งคนใดคนหนึ่งโดยตรง แทนการปล่อยให้ self-pick | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| Confirm การจับคู่งานกับ user เป็นขั้นตอนสุดท้ายเสมอ | ทั้งกรณี self-pick และ admin-assign ต้องผ่าน Admin confirm กับ user ก่อนงานเริ่มอย่างเป็นทางการ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ดูสถานะสาเล้งแต่ละคน (หน้าจัดการรถซาเล้ง) | เช่น ว่าง / กำลังทำงาน / ระงับ — 1 ใน 4 ฟีเจอร์ของหน้าจัดการรถซาเล้ง | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have | Confirmed |
| อนุมัติการสมัครของสาเล้งใหม่ (หน้าจัดการรถซาเล้ง) | ตรวจสอบ/อนุมัติก่อนให้สิทธิ์เข้าดู/รับงานในระบบ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have | Confirmed |
| ระงับ (suspend) บัญชีสาเล้ง (หน้าจัดการรถซาเล้ง) | ปิดสิทธิ์การรับงานของสาเล้งที่ทำผิดกฎหรือมีปัญหาการใช้งาน | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have | Confirmed |
| ดูประวัติงานของสาเล้งแต่ละคน (หน้าจัดการรถซาเล้ง) | ตรวจสอบย้อนหลังงานที่สาเล้งแต่ละคนเคยรับ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have | Confirmed |
| อัปเดตราคากลางขยะต่อกิโลกรัมของแต่ละประเภท | ตั้ง/ปรับราคาอ้างอิงให้ user เห็นในระบบ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ระงับ (suspend) บัญชี user ที่ทำผิดกฎ | ปิดสิทธิ์การสร้างคำขอของ user ที่มีปัญหาการใช้งาน | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| ดูใบเสร็จที่สาเล้งส่งเข้าระบบ (บันทึกประวัติธุรกรรม) | เก็บประวัติรายการ (ประเภทขยะ, น้ำหนัก, ราคา) ของแต่ละงานฝั่งของ Admin | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Must have (inferred) | Confirmed |
| Admin dashboard เชิงวิเคราะห์/รายงานผล (analytics/reporting) และตรวจสอบธุรกรรมทางการเงิน | Out of scope ใน MVP นี้ | [[01-spec/20260819-001-saleng-pickup-request\|1]] | Won't have (this phase) | Confirmed |

## ⚠️ Priority ที่ inferred ไว้ ต้องให้ owner ทบทวน

Spec ต้นทางไม่มีคำระบุ priority ตรงๆ (เช่น "ต้องมี", "จำเป็น", "อย่างน้อย") สำหรับฟีเจอร์ต่อไปนี้ — agent ใช้กฎข้อ 3-5 (core dependency ตาม user story / เสริมประสบการณ์ / ทางเลือกเสริม) ในการตัดสินใจแทน จึงควรให้ owner ทวนสอบอีกครั้ง:

**Must have (inferred) — core feature ที่ persona ต้องพึ่งพาเพื่อบรรลุเป้าหมายหลักตาม user story (กฎข้อ 3):**

- สมัครสมาชิก/เข้าสู่ระบบ (User) — ไม่มี user story หรือ scope ระบบทำงานได้เลยถ้าไม่ผ่านขั้นตอนนี้
- สร้างคำขอเรียกรถซาเล้งด้วยฟอร์มรายละเอียด (User) — เป็นแกนหลักของ user story #1, #12
- อัปโหลดรูปถ่ายขยะสูงสุด 5 ภาพต่อคำขอ (User) — Admin/สาเล้งต้องใช้รูปประเมินงานก่อนรับ
- ดูสถานะคำขอของตัวเอง (User) — user story #2
- ดูใบเสร็จที่สาเล้งส่งเข้าระบบหลังงานเสร็จสิ้น (User) — ปิด loop ของธุรกรรม, business rule กำหนดให้ต้องปรากฏฝั่ง user
- ยกเลิกคำขอได้ก่อนงานเสร็จสิ้น (User) — user story #6
- เห็นข้อมูลติดต่อของสาเล้งที่รับงาน (User) — จำเป็นต่อการนัดเจอให้งานสำเร็จ
- ลงทะเบียน/เข้าสู่ระบบด้วยเบอร์โทร/OTP (Saleng) — เป็นเงื่อนไขก่อนเห็น/รับงานได้ทุกกรณี
- ดูรายการคำขอที่เปิดอยู่ในพื้นที่ที่สนใจ (Saleng) — user story #3
- กดรับงาน (self-pick) คำขอที่เปิดอยู่ (Saleng) — user story #4
- ดูรายละเอียดงานที่ต้องเข้าไปรับ (Saleng) — user story #19
- เห็นข้อมูลติดต่อของ user เพื่อนัดเจอ (Saleng) — จำเป็นต่อการนัดเจอให้งานสำเร็จ
- กดปิดงาน (Saleng) — user story #5
- ส่งใบเสร็จเข้าระบบ (Saleng) — user story #20
- ยกเลิกงานที่รับไว้ได้ก่อนงานเสร็จสิ้น (Saleng) — user story #6
- ดูรายการคำขอที่เข้ามาทั้งหมดพร้อมรายละเอียด (Admin) — user story #15
- กด confirm หรือ cancel คำขอของ user (Admin) — user story #16
- เลือก assign สาเล้งให้คำขอที่เปิดอยู่โดยตรง (Admin) — user story #8
- Confirm การจับคู่งานกับ user เป็นขั้นตอนสุดท้ายเสมอ (Admin) — user story #17, business rule กำหนดว่าต้องผ่านขั้นนี้ก่อนงานเริ่มอย่างเป็นทางการ
- อัปเดตราคากลางขยะต่อกิโลกรัมของแต่ละประเภท (Admin) — user story #11
- ระงับ (suspend) บัญชี user ที่ทำผิดกฎ (Admin) — user story #9
- ดูใบเสร็จที่สาเล้งส่งเข้าระบบ ฝั่ง Admin (Admin) — user story #20, business rule กำหนดว่าต้องปรากฏฝั่ง Admin

**Should have (inferred) — ฟีเจอร์เสริมที่ปรับปรุงประสบการณ์ แต่ flow หลักไม่พังถ้าไม่มี (กฎข้อ 4):**

- จัดการโปรไฟล์ส่วนตัว (User) — ช่วยความรวดเร็ว (user story #13) แต่ user ยังกรอกข้อมูลใหม่ทุกครั้งได้
- เลือกใช้ที่อยู่ที่บันทึกไว้ในโปรไฟล์แทนกรอกใหม่ (User) — เช่นเดียวกับข้างบน
- ดูราคากลางอ้างอิงต่อกิโลกรัมของขยะแต่ละประเภท (User) — เป็นข้อมูลอ้างอิงประกอบการตัดสินใจ ไม่ผูกกับธุรกรรมจริง สร้างคำขอได้แม้ไม่เห็นราคานี้
- แชทกับ Admin เกี่ยวกับคำขอ (User) — ช่องทางสื่อสารเสริม flow หลัก (สร้างคำขอ → จับคู่ → เสร็จสิ้น) ไม่พังถ้าไม่มี
- แชทกับ user เกี่ยวกับคำขอ (Admin) — เช่นเดียวกับข้างบน (ฟีเจอร์เดียวกันมองจากฝั่ง Admin)

ไม่พบรายการที่เข้าเกณฑ์ Could have (inferred) ในรอบนี้ — ไม่มีฟีเจอร์เสริมเล็กๆ ที่ต่อยอดจาก preset/ฟีเจอร์หลักที่มีอยู่แล้วชัดเจนพอจะจัดกลุ่มนี้ได้
