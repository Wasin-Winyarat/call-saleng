---
name: generate-data-api-spec
description: Generate or update the conceptual, technology-agnostic database schema document (ER diagram + per-table detail) at docs/02-design/02-technical/database-schema.md and the conceptual API spec / data contract document (resources + operations) at docs/02-design/02-technical/api-spec.md, derived from requirement spec(s). Use when the user asks to create/update a database schema, ER diagram, table design, data model, API spec, API design, or data contract, without wanting a specific database engine or API protocol chosen yet.
---

# Generate Database Schema & API Spec

Skill นี้เป็นจุดเข้า (entry point) สำหรับสร้าง/อัปเดตเอกสาร **Database Schema** และ **API Spec** เชิงแนวคิด (conceptual) คู่กัน — ยังไม่ผูกมัดกับ technology stack ใดๆ — โดยสังเคราะห์จาก requirement spec (และ `feature-list.md`, journey doc, `high-level-architecture.md` ถ้ามี) งานเขียนไฟล์จริงมอบหมายให้ `.claude/agents/data-api-spec-writer.md` เสมอ

> **หมายเหตุเรื่อง dispatch:** บาง environment ของ Claude Code ไม่รู้จัก `subagent_type` ที่มาจาก `.claude/agents/*.md` โดยตรง (Agent tool error `Agent type '...' not found`) ถ้าเจอกรณีนี้ ให้ใช้ fallback: Read ไฟล์ agent นั้น, ตัดส่วน frontmatter ออก, แล้วส่งเนื้อหาส่วนคำสั่ง (system prompt) ทั้งหมดไปเป็นส่วนหนึ่งของ prompt ที่ส่งให้ `subagent_type: "general-purpose"` แทน — อย่าล้มเลิกงานทั้งหมดเพราะ `subagent_type` ไม่ถูก whitelist

## ขอบเขต (สำคัญ)

Skill นี้ทำ **เฉพาะขั้น conceptual data model + data contract** เท่านั้น — ไม่เลือก/แนะนำ database engine หรือ API protocol จริง (REST/GraphQL, HTTP method/URL, authentication mechanism) และไม่ regenerate requirement spec, feature-list, หรือ user journey เอง สมมติว่าเอกสารต้นทางเหล่านี้มีอยู่แล้วและเป็นปัจจุบัน ถ้าพบว่าขาด spec ที่จำเป็น ให้หยุดและแจ้ง user ให้ไปรัน `create-requirement` ก่อน — ห้ามข้ามไปเดาหรือสร้างแทนเอง

ถ้า user ต้องการเอกสารเลือก database engine หรือ API protocol จริงด้วย ให้แจ้งว่านั่นเป็นเอกสารคนละฉบับที่จะทำทีหลัง (ยังไม่มี skill สำหรับส่วนนั้นในตอนนี้) แล้วโฟกัสเฉพาะส่วน conceptual ก่อน

## เมื่อไหร่ควรใช้
ใช้เมื่อ user ขอให้สร้าง/อัปเดตเอกสาร database schema, ER diagram, data model, API spec, API design, หรือ data contract แบบยังไม่ผูกกับ tech stack

## วิธีทำงาน

### 1. กำหนด scope
ถ้า user ระบุเจาะจง (เช่น เฉพาะ spec/feature หนึ่ง) ใช้เฉพาะขอบเขตนั้น ถ้าไม่ระบุ ถือว่าทำกับทุก spec ที่มีอยู่ใน `docs/01-requirements/01-spec/` (ยกเว้น `index.md`)

### 2. ตรวจสอบ dependency ที่จำเป็น
- Glob `docs/01-requirements/01-spec/*.md` (ยกเว้น `index.md`) — ถ้าไม่มี spec ในสโคปเลย **หยุดและแจ้ง user** ว่าต้องรัน `create-requirement` ก่อน
- อ่านเนื้อหา spec ทั้งหมดในสโคป
- เช็คว่ามี `docs/01-requirements/feature-list.md`, journey doc ใน `docs/02-design/01-prototypes/*-journey.md`, และ `docs/02-design/02-technical/high-level-architecture.md` หรือไม่ — ถ้ามีให้อ่านมาเตรียมส่งต่อด้วย (ไม่บังคับต้องมี แค่ใช้เสริมความสอดคล้องของชื่อฟีเจอร์/component ถ้ามีอยู่แล้ว) ถ้าไม่มีก็ทำงานต่อได้ปกติโดยไม่ต้องแนะนำให้ไปสร้างก่อน

### 3. ตรวจสอบว่ามีเอกสารเดิมอยู่แล้วหรือยัง
Glob `docs/02-design/02-technical/database-schema.md` และ `docs/02-design/02-technical/api-spec.md` แยกกัน — แต่ละไฟล์:
- **ถ้ายังไม่มี** → เป็นการสร้างใหม่สำหรับไฟล์นั้น
- **ถ้ามีอยู่แล้ว** → อ่านเนื้อหาเดิมมาเตรียมส่งต่อ ถือเป็นการ **แก้ไข/ต่อยอด** ไฟล์นั้นเสมอ (เอกสารเหล่านี้เป็น living document ไฟล์เดียว ไม่ทำ versioning แบบ prototype — ถ้า user ต้องการเก็บประวัติ before/after ให้แนะนำว่าใช้ git history ของ vault แทนได้)

### 4. เสนอแผนงาน (Plan) — ต้องรอ confirm ก่อนเสมอ
ก่อนมอบหมายงานเขียนไฟล์จริง ให้สรุปแผนเป็นข้อความให้ user เห็นก่อนเสมอ ประกอบด้วย:
- spec ไหนบ้างที่จะถูกสังเคราะห์เป็น entity/resource
- แต่ละไฟล์ (`database-schema.md`, `api-spec.md`) จะเป็นการสร้างใหม่ทั้งฉบับ หรือแก้ไข/เพิ่มเติมจากของเดิม (ตามข้อ 3)
- ย้ำว่าเอกสารทั้งสองจะไม่มีชื่อ database engine, API protocol, หรือรายละเอียด implementation ใดๆ ทั้งสิ้น

ห้ามมอบหมายให้ `data-api-spec-writer` ลงมือเขียนไฟล์จริงจนกว่า user จะยืนยันแผนนี้ ถ้า user ขอแก้แผน ให้ปรับแล้วเสนอใหม่จนกว่าจะได้รับการยืนยันชัดเจน (เช่น "ตกลง", "ทำเลย", "ใช่")

### 5. มอบหมายให้ `data-api-spec-writer` เขียนไฟล์จริง (foreground เสมอ)
ลอง `subagent_type: "data-api-spec-writer"` ก่อน ถ้า error ให้ fallback ตามหมายเหตุด้านบน prompt ต้องมี:
- scope ที่ confirm แล้ว (ข้อ 4)
- ระบุชัดต่อไฟล์ว่าเป็น **สร้างใหม่** หรือ **แก้ไข/ต่อยอดของเดิม**
- เนื้อหา spec ทั้งหมดในสโคป, `feature-list.md`/journey doc(s)/`high-level-architecture.md` ถ้ามี, และเนื้อหาไฟล์ `database-schema.md`/`api-spec.md` เดิม (ถ้ามี) — แปะเนื้อหาตรงๆ ใน prompt
- วันที่ปัจจุบัน

### 6. ถ้า agent ถามคำถามกลับมา
ปล่อยให้คำถามนั้นแสดงต่อ user ตามปกติ (ห้ามตอบแทน user เอง) แล้วให้ agent ทำงานต่อจนจบในรอบ Agent call เดียวกัน คำถามลักษณะนี้มักเกี่ยวกับระดับการ normalize ข้อมูล, การเก็บ audit trail, ขอบเขตของ resource ต่อ custom action ฯลฯ (ดูตัวอย่างใน `data-api-spec-writer.md`) — ไม่ใช่เรื่องเลือก technology ใดๆ

### 7. เมื่องานเสร็จ
สรุปผลให้ user แบบกระชับ: ไฟล์ไหนถูกสร้าง/แก้ไขบ้าง (พร้อมลิงก์), มีตาราง/resource ไหนถูกเพิ่ม/ปรับ, และมีจุดใดที่ยังไม่ชัดเจนหรือต้องตัดสินใจเพิ่มหรือไม่

## ข้อควรจำ
- ห้ามข้ามการยืนยันแผนกับ user ก่อนเขียนไฟล์จริง ไม่ว่ากรณีใด
- ห้ามให้ agent หรือ skill นี้เลือก/แนะนำ database engine หรือ API protocol จริงแทนที่จริง — ถ้า user ถามเรื่อง stack ระหว่างทาง ให้ตอบว่านอกขอบเขตของ skill นี้และเสนอทำเป็นงานแยกทีหลัง
- ห้ามข้ามการสร้าง/แก้ไขไฟล์จริงไปเอง — งานทั้งหมดต้องผ่าน agent `data-api-spec-writer` เสมอ (ไม่ว่าจะ dispatch แบบ named `subagent_type` หรือ fallback ผ่าน `general-purpose`) เพื่อให้ logic การสกัด entity/resource, การอ้างอิง spec, และความสอดคล้องระหว่างสองเอกสารตรงกันทุกครั้ง
- เอกสารทั้งหมดของ vault นี้เขียนเป็นภาษาไทยเป็นหลัก ตามที่ระบุใน `CLAUDE.md`
