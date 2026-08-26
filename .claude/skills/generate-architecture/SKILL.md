---
name: generate-architecture
description: Generate or update the conceptual, technology-agnostic high-level architecture document at docs/02-design/02-technical/high-level-architecture.md — system components/layers plus data flow diagrams derived from each user journey. Use when the user asks to create/update a high-level architecture doc, system architecture overview, component diagram, or data-flow-per-journey diagram, without wanting a specific technology stack chosen yet.
---

# Generate High-Level Architecture

Skill นี้เป็นจุดเข้า (entry point) สำหรับสร้าง/อัปเดตเอกสาร **High-Level Architecture เชิงแนวคิด (conceptual)** — ยังไม่ผูกมัดกับ technology stack ใดๆ — โดยสังเคราะห์จาก requirement spec, `feature-list.md`, และ user journey doc ที่มีอยู่แล้ว งานเขียนไฟล์จริงมอบหมายให้ `.claude/agents/architecture-writer.md` เสมอ

> **หมายเหตุเรื่อง dispatch:** บาง environment ของ Claude Code ไม่รู้จัก `subagent_type` ที่มาจาก `.claude/agents/*.md` โดยตรง (Agent tool error `Agent type '...' not found`) ถ้าเจอกรณีนี้ ให้ใช้ fallback: Read ไฟล์ agent นั้น, ตัดส่วน frontmatter ออก, แล้วส่งเนื้อหาส่วนคำสั่ง (system prompt) ทั้งหมดไปเป็นส่วนหนึ่งของ prompt ที่ส่งให้ `subagent_type: "general-purpose"` แทน — อย่าล้มเลิกงานทั้งหมดเพราะ `subagent_type` ไม่ถูก whitelist

## ขอบเขต (สำคัญ)

Skill นี้ทำ **เฉพาะขั้น conceptual architecture** เท่านั้น — ไม่เลือก/แนะนำ technology stack (ภาษา, framework, database, cloud, บริการภายนอก) และไม่ regenerate requirement spec, feature-list, หรือ user journey เอง สมมติว่าเอกสารต้นทางเหล่านี้มีอยู่แล้วและเป็นปัจจุบัน ถ้าพบว่าขาดอันไหนที่จำเป็น ให้หยุดและแจ้ง user ให้ไปรัน skill ที่เกี่ยวข้องก่อน (`create-requirement` และ/หรือ `generate-feature-journey`) — ห้ามข้ามไปเดาหรือสร้างแทนเอง

ถ้า user ต้องการเอกสารเลือก stack จริงด้วย ให้แจ้งว่านั่นเป็นเอกสารคนละฉบับที่จะทำทีหลัง (ยังไม่มี skill สำหรับส่วนนั้นในตอนนี้) แล้วโฟกัสเฉพาะส่วน conceptual ก่อน

## เมื่อไหร่ควรใช้
ใช้เมื่อ user ขอให้สร้าง/อัปเดตเอกสาร high-level architecture, system architecture ภาพรวม, component diagram, หรือ data flow ตาม user journey แบบยังไม่ผูกกับ tech stack

## วิธีทำงาน

### 1. กำหนด scope
ถ้า user ระบุเจาะจง (เช่น เฉพาะ journey/persona หนึ่ง หรือ spec หนึ่ง) ใช้เฉพาะขอบเขตนั้น ถ้าไม่ระบุ ถือว่าทำกับทุก journey ที่มีอยู่ใน `docs/02-design/01-prototypes/` (ไฟล์ที่ลงท้าย `-journey.md`)

### 2. ตรวจสอบ dependency ที่จำเป็น
- Glob `docs/02-design/01-prototypes/*-journey.md` และอ่าน `docs/01-requirements/feature-list.md` — ถ้าไฟล์ใดในสโคปที่ต้องใช้ยังไม่มี **หยุดและแจ้ง user** ว่าต้องรัน `generate-feature-journey` (และ/หรือ `create-requirement` ถ้า spec เองก็ยังไม่มี) ก่อน
- อ่าน spec ที่เกี่ยวข้องกับแต่ละ journey ในสโคป (journey doc มี wikilink อ้างถึง spec ต้นทางอยู่แล้วใน section Reference)

### 3. ตรวจสอบว่ามีเอกสารเดิมอยู่แล้วหรือยัง
Glob `docs/02-design/02-technical/high-level-architecture.md`:
- **ถ้ายังไม่มี** → เป็นการสร้างใหม่ ไม่ต้องถาม user เรื่องนี้เพิ่ม
- **ถ้ามีอยู่แล้ว** → อ่านเนื้อหาเดิมมาเตรียมส่งต่อ ถือเป็นการ **แก้ไข/ต่อยอด** เอกสารเดิมเสมอ (เอกสารนี้เป็น living document ไฟล์เดียว ไม่ทำ versioning แบบ prototype — ถ้า user ต้องการเก็บประวัติ before/after ให้แนะนำว่าใช้ git history ของ vault แทนได้)

### 4. เสนอแผนงาน (Plan) — ต้องรอ confirm ก่อนเสมอ
ก่อนมอบหมายงานเขียนไฟล์จริง ให้สรุปแผนเป็นข้อความให้ user เห็นก่อนเสมอ ประกอบด้วย:
- journey/persona ไหนบ้างที่จะถูกแปลงเป็น data flow diagram (ไฟล์ใหม่ในสโคป vs journey ที่มีอยู่แล้วในเอกสาร)
- จะเป็นการสร้างไฟล์ใหม่ทั้งฉบับ หรือแก้ไข/เพิ่มเติมจากของเดิม (ตามข้อ 3)
- ย้ำว่าเอกสารนี้จะไม่มีชื่อ technology stack ใดๆ ทั้งสิ้น

ห้ามมอบหมายให้ `architecture-writer` ลงมือเขียนไฟล์จริงจนกว่า user จะยืนยันแผนนี้ ถ้า user ขอแก้แผน ให้ปรับแล้วเสนอใหม่จนกว่าจะได้รับการยืนยันชัดเจน (เช่น "ตกลง", "ทำเลย", "ใช่")

### 5. มอบหมายให้ `architecture-writer` เขียนไฟล์จริง (foreground เสมอ)
ลอง `subagent_type: "architecture-writer"` ก่อน ถ้า error ให้ fallback ตามหมายเหตุด้านบน prompt ต้องมี:
- scope ที่ confirm แล้ว (ข้อ 4)
- ระบุชัดว่าเป็น **สร้างใหม่** หรือ **แก้ไข/ต่อยอดของเดิม**
- เนื้อหาไฟล์ `feature-list.md`, journey doc(s), spec(s) ที่เกี่ยวข้องทั้งหมด, และเนื้อหาไฟล์ `high-level-architecture.md` เดิม (ถ้ามี) — แปะเนื้อหาตรงๆ ใน prompt
- วันที่ปัจจุบัน

### 6. ถ้า agent ถามคำถามกลับมา
ปล่อยให้คำถามนั้นแสดงต่อ user ตามปกติ (ห้ามตอบแทน user เอง) แล้วให้ agent ทำงานต่อจนจบในรอบ Agent call เดียวกัน คำถามลักษณะนี้มักเกี่ยวกับการแบ่ง conceptual component หรือรูปแบบการสื่อสารระหว่าง component (ดูตัวอย่างใน `architecture-writer.md`) — ไม่ใช่เรื่องเลือก technology ใดๆ

### 7. เมื่องานเสร็จ
สรุปผลให้ user แบบกระชับ: ไฟล์ไหนถูกสร้าง/แก้ไขบ้าง (พร้อมลิงก์), มี journey ไหนถูกแปลงเป็น data flow diagram บ้าง, และมีจุดใดที่ยังไม่ชัดเจนหรือต้องตัดสินใจเพิ่มหรือไม่

## ข้อควรจำ
- ห้ามข้ามการยืนยันแผนกับ user ก่อนเขียนไฟล์จริง ไม่ว่ากรณีใด
- ห้ามให้ agent หรือ skill นี้เลือก/แนะนำ technology stack ใดๆ แทนที่จริง — ถ้า user ถามเรื่อง stack ระหว่างทาง ให้ตอบว่านอกขอบเขตของ skill นี้และเสนอทำเป็นงานแยกทีหลัง
- ห้ามข้ามการสร้าง/แก้ไขไฟล์จริงไปเอง — งานทั้งหมดต้องผ่าน agent `architecture-writer` เสมอ (ไม่ว่าจะ dispatch แบบ named `subagent_type` หรือ fallback ผ่าน `general-purpose`) เพื่อให้ logic การสกัด component, การอ้างอิง journey, และรูปแบบ diagram สอดคล้องกันทุกครั้ง
- เอกสารทั้งหมดของ vault นี้เขียนเป็นภาษาไทยเป็นหลัก ตามที่ระบุใน `CLAUDE.md`
