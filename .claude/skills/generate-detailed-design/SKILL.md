---
name: generate-detailed-design
description: Generate or update conceptual, technology-agnostic Detailed Design documents at docs/02-design/02-technical/detailed-design/{journey-slug}-detailed-design.md — one file per user journey, expanding its high-level sequence diagram into a detailed interaction spec (main flow, alternate/exception flows, business rules, pre/post-conditions). Use when the user asks to create/update a detailed design, low-level design, detailed sequence diagram/flow, or interaction spec for a feature/journey, without wanting a specific technology stack chosen yet.
---

# Generate Detailed Design

Skill นี้เป็นจุดเข้า (entry point) สำหรับสร้าง/อัปเดตเอกสาร **Detailed Design เชิงแนวคิด (conceptual)** — หนึ่งไฟล์ต่อหนึ่ง user journey — โดยขยาย sequence diagram ระดับ high-level ที่มีอยู่แล้วให้ละเอียดขึ้น (main flow, alternate/exception flow, business rule, pre/post-condition) ยังไม่ผูกมัดกับ technology stack ใดๆ งานเขียนไฟล์จริงมอบหมายให้ `.claude/agents/detailed-design-writer.md` เสมอ

> **หมายเหตุเรื่อง dispatch:** บาง environment ของ Claude Code ไม่รู้จัก `subagent_type` ที่มาจาก `.claude/agents/*.md` โดยตรง (Agent tool error `Agent type '...' not found`) ถ้าเจอกรณีนี้ ให้ใช้ fallback: Read ไฟล์ agent นั้น, ตัดส่วน frontmatter ออก, แล้วส่งเนื้อหาส่วนคำสั่ง (system prompt) ทั้งหมดไปเป็นส่วนหนึ่งของ prompt ที่ส่งให้ `subagent_type: "general-purpose"` แทน — อย่าล้มเลิกงานทั้งหมดเพราะ `subagent_type` ไม่ถูก whitelist

## ขอบเขต (สำคัญ)

Skill นี้ทำ **เฉพาะขั้น conceptual detailed design** เท่านั้น — ไม่เลือก/แนะนำ technology stack และไม่ regenerate journey doc, spec, high-level-architecture, database-schema หรือ api-spec เอง สมมติว่าเอกสารต้นทางเหล่านี้มีอยู่แล้วและเป็นปัจจุบัน ถ้าพบว่าขาด journey doc หรือ spec ที่จำเป็น ให้หยุดและแจ้ง user ให้ไปรัน skill ที่เกี่ยวข้องก่อน (`generate-feature-journey` และ/หรือ `create-requirement`) — ห้ามข้ามไปเดาหรือสร้างแทนเอง

**granularity ของเอกสารนี้ถูกกำหนดไว้ตายตัวแล้วคือ 1 ไฟล์ต่อ 1 journey** (ดูเหตุผลใน `detailed-design-writer.md`) — ห้ามเปลี่ยนเป็นไฟล์รวมหรือแตกละเอียดกว่านี้โดยไม่ปรึกษา user ก่อน

ถ้า user ต้องการเอกสารเลือก stack จริงด้วย ให้แจ้งว่านั่นเป็นเอกสารคนละฉบับที่จะทำทีหลัง (ยังไม่มี skill สำหรับส่วนนั้นในตอนนี้) แล้วโฟกัสเฉพาะส่วน conceptual ก่อน

## เมื่อไหร่ควรใช้
ใช้เมื่อ user ขอให้สร้าง/อัปเดตเอกสาร detailed design, low-level design, sequence diagram แบบละเอียด, หรือ interaction spec ของ feature/journey หนึ่งๆ แบบยังไม่ผูกกับ tech stack

## วิธีทำงาน

### 1. กำหนด scope
ถ้า user ระบุเจาะจง (เช่น เฉพาะ journey เดียว) ใช้เฉพาะขอบเขตนั้น ถ้าไม่ระบุ ถือว่าทำกับทุก journey ที่มีอยู่ใน `docs/02-design/01-prototypes/` (ไฟล์ที่ลงท้าย `-journey.md`)

### 2. ตรวจสอบ dependency ที่จำเป็น
- Glob `docs/02-design/01-prototypes/*-journey.md` — ถ้าไม่มี journey ในสโคปเลย **หยุดและแจ้ง user** ว่าต้องรัน `generate-feature-journey` ก่อน
- อ่าน spec ที่เกี่ยวข้องกับแต่ละ journey ในสโคป (journey doc มี wikilink อ้างถึง spec ต้นทางอยู่แล้วใน section Reference) — ถ้า spec ไฟล์ใดหายไปจริง แจ้ง user ว่าต้องรัน `create-requirement` ก่อน
- เช็คว่ามี `docs/02-design/02-technical/high-level-architecture.md`, `database-schema.md`, `api-spec.md` หรือไม่ — ถ้ามีให้อ่านมาเตรียมส่งต่อด้วย (ไม่บังคับต้องมี แต่ถ้าไม่มี `high-level-architecture.md` ให้เตือน user สั้นๆ ว่า sequence diagram ของ detailed design จะตั้งชื่อ component เองแทนการอ้างอิงชื่อที่นิยามไว้แล้ว และถ้าไม่มี `api-spec.md` เตือนว่า message ใน diagram จะเป็น business logic step แทนการอ้างอิง operation จริงไปก่อน — ไม่ต้องบล็อกงาน แค่แจ้งให้ทราบ)

### 3. ตรวจสอบว่ามีเอกสารเดิมอยู่แล้วหรือยัง (ต่อ journey)
Glob `docs/02-design/02-technical/detailed-design/*-detailed-design.md` แล้ว match กับ journey slug ในสโคป — ต่อ journey แต่ละอัน:
- **ถ้ายังไม่มีไฟล์ตรงกัน** → เป็นการสร้างใหม่สำหรับ journey นั้น
- **ถ้ามีอยู่แล้ว** → อ่านเนื้อหาเดิมมาเตรียมส่งต่อ ถือเป็นการ **แก้ไข/ต่อยอด** ไฟล์นั้นเสมอ (เอกสารเหล่านี้เป็น living document ต่อ journey ไม่ทำ versioning แบบ prototype — ถ้า user ต้องการเก็บประวัติ before/after ให้แนะนำว่าใช้ git history ของ vault แทนได้)

### 4. เสนอแผนงาน (Plan) — ต้องรอ confirm ก่อนเสมอ
ก่อนมอบหมายงานเขียนไฟล์จริง ให้สรุปแผนเป็นข้อความให้ user เห็นก่อนเสมอ ประกอบด้วย:
- journey ไหนบ้างที่อยู่ในสโคป และแต่ละอันจะเป็นไฟล์ใหม่หรือแก้ไขของเดิม (ตามข้อ 3)
- มี `high-level-architecture.md`/`api-spec.md`/`database-schema.md` รองรับครบหรือไม่ต่อ journey (ถ้าขาดจะกระทบความละเอียดของ diagram อย่างไรตามที่เตือนในข้อ 2)
- ย้ำว่าเอกสารนี้จะไม่มีชื่อ technology stack ใดๆ ทั้งสิ้น และ granularity คือ 1 ไฟล์ต่อ 1 journey

ห้ามมอบหมายให้ `detailed-design-writer` ลงมือเขียนไฟล์จริงจนกว่า user จะยืนยันแผนนี้ ถ้า user ขอแก้แผน ให้ปรับแล้วเสนอใหม่จนกว่าจะได้รับการยืนยันชัดเจน (เช่น "ตกลง", "ทำเลย", "ใช่")

### 5. มอบหมายให้ `detailed-design-writer` เขียนไฟล์จริง (foreground เสมอ)
ลอง `subagent_type: "detailed-design-writer"` ก่อน ถ้า error ให้ fallback ตามหมายเหตุด้านบน prompt ต้องมี:
- scope ที่ confirm แล้ว (ข้อ 4)
- ระบุชัดต่อ journey ว่าเป็น **สร้างใหม่** หรือ **แก้ไข/ต่อยอดของเดิม**
- เนื้อหา journey doc(s) และ spec ที่เกี่ยวข้องทั้งหมดในสโคป, เนื้อหา `high-level-architecture.md`/`database-schema.md`/`api-spec.md` ถ้ามี, และเนื้อหาไฟล์ detailed design เดิมต่อ journey (ถ้ามี) — แปะเนื้อหาตรงๆ ใน prompt
- วันที่ปัจจุบัน

### 6. ถ้า agent ถามคำถามกลับมา
ปล่อยให้คำถามนั้นแสดงต่อ user ตามปกติ (ห้ามตอบแทน user เอง) แล้วให้ agent ทำงานต่อจนจบในรอบ Agent call เดียวกัน คำถามลักษณะนี้มักเกี่ยวกับการแตก sequence diagram ย่อยเมื่อ journey มีหลาย use case, การจัดการ step ที่ api-spec ยังไม่ครอบคลุม, หรือระดับความละเอียดของ exception path (ดูตัวอย่างใน `detailed-design-writer.md`) — ไม่ใช่เรื่องเลือก technology ใดๆ

### 7. เมื่องานเสร็จ
สรุปผลให้ user แบบกระชับ: ไฟล์ไหนถูกสร้าง/แก้ไขบ้าง (พร้อมลิงก์), แต่ละไฟล์ครอบคลุม use case/exception path ไหนบ้าง, มี step ไหนยังรอผูกกับ api-spec หรือยังไม่ชัดเจนต้องติดตามต่อหรือไม่

## ข้อควรจำ
- ห้ามข้ามการยืนยันแผนกับ user ก่อนเขียนไฟล์จริง ไม่ว่ากรณีใด
- ห้ามให้ agent หรือ skill นี้เลือก/แนะนำ technology stack ใดๆ แทนที่จริง — ถ้า user ถามเรื่อง stack ระหว่างทาง ให้ตอบว่านอกขอบเขตของ skill นี้และเสนอทำเป็นงานแยกทีหลัง
- ห้ามข้ามการสร้าง/แก้ไขไฟล์จริงไปเอง — งานทั้งหมดต้องผ่าน agent `detailed-design-writer` เสมอ (ไม่ว่าจะ dispatch แบบ named `subagent_type` หรือ fallback ผ่าน `general-purpose`) เพื่อให้ logic การขยาย sequence diagram, การอ้างอิง component/operation, และรูปแบบเอกสารสอดคล้องกันทุกครั้ง
- granularity ของเอกสาร (1 ไฟล์ต่อ 1 journey) เป็นการตัดสินใจที่ user ยืนยันไว้แล้วตอนออกแบบ skill นี้ — ถ้า user ขอเปลี่ยน granularity ในอนาคต (เช่นอยากแตกต่อ use case ย่อย) ให้ปรับ `detailed-design-writer.md` และ skill นี้ให้สอดคล้องกันทั้งคู่ ไม่ใช่ปรับแค่ฝั่งใดฝั่งหนึ่ง
- เอกสารทั้งหมดของ vault นี้เขียนเป็นภาษาไทยเป็นหลัก ตามที่ระบุใน `CLAUDE.md`
