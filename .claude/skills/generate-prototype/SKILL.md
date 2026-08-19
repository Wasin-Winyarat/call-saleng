---
name: generate-prototype
description: Generate or update Markdown wireframe/prototype screen documents under docs/02-design/01-prototypes/v{N}/, synthesizing existing requirement spec(s), backlog, feature-list.md, and user journey docs, styled per DESIGN.md. Always proposes a plan for user confirmation before writing anything, and on repeat runs always asks whether to create a new version folder or edit the latest one. If DESIGN.md doesn't exist yet, walks the user through creating it first. Use when the user asks to create/update UI prototypes, wireframes, or mockup screens (for user journey/flowchart diagrams instead, use generate-feature-journey).
---

# Generate Prototype

Skill นี้เป็นจุดเข้า (entry point) สำหรับสร้าง/อัปเดตเอกสาร Markdown wireframe รายหน้าจอ (screen prototype) โดยสังเคราะห์จากเอกสารที่มีอยู่แล้ว: requirement spec, `backlog.md`, `feature-list.md`, และ user journey docs — สไตล์ตาม `DESIGN.md` งานเขียนไฟล์จริงมอบหมายให้ `.claude/agents/prototype-writer.md` เสมอ

> **หมายเหตุเรื่อง dispatch:** บาง environment ของ Claude Code ไม่รู้จัก `subagent_type` ที่มาจาก `.claude/agents/*.md` โดยตรง (Agent tool error `Agent type '...' not found`) ถ้าเจอกรณีนี้ ให้ใช้ fallback: Read ไฟล์ agent นั้น, ตัดส่วน frontmatter ออก, แล้วส่งเนื้อหาส่วนคำสั่ง (system prompt) ทั้งหมดไปเป็นส่วนหนึ่งของ prompt ที่ส่งให้ `subagent_type: "general-purpose"` แทน — อย่าล้มเลิกงานทั้งหมดเพราะ `subagent_type` ไม่ถูก whitelist

## ขอบเขต (สำคัญ)

Skill นี้ทำ **เฉพาะขั้น Prototype (wireframe screen)** เท่านั้น — ไม่ regenerate requirement spec, backlog, feature-list, หรือ user journey เอง สมมติว่าเอกสารต้นทางเหล่านี้มีอยู่แล้วและเป็นปัจจุบัน ถ้าพบว่าขาดอันไหนที่จำเป็น ให้หยุดและแจ้ง user ให้ไปรัน skill ที่เกี่ยวข้องก่อน (`create-requirement` และ/หรือ `generate-feature-journey`) — ห้ามข้ามไปเดาหรือสร้างแทนเอง

## เมื่อไหร่ควรใช้
ใช้เมื่อ user ขอให้สร้าง/อัปเดต UI prototype, wireframe, หรือ mockup หน้าจอ จากความต้องการ/feature/journey ที่มีอยู่ในโปรเจกต์นี้

## วิธีทำงาน

### 1. กำหนด scope
ถ้า user ระบุเจาะจง (เช่น persona, feature, journey doc, หรือ spec หนึ่งๆ) ใช้เฉพาะขอบเขตนั้น ถ้าไม่ระบุ ถือว่าทำกับทุก persona/journey ที่มีอยู่ใน `docs/02-design/01-prototypes/` (ไม่รวม `DESIGN.md`, `index.md`, และโฟลเดอร์ `v*/` เดิม)

### 2. ตรวจสอบ dependency ที่จำเป็น
- Glob `docs/02-design/01-prototypes/*.md` (journey docs) และอ่าน `docs/01-requirements/feature-list.md` — ถ้าไฟล์ใดในสโคปที่ต้องใช้ยังไม่มี **หยุดและแจ้ง user** ว่าต้องรัน `generate-feature-journey` (และ/หรือ `create-requirement` ถ้า spec เองก็ยังไม่มี) ก่อน
- ตรวจว่ามี `docs/02-design/01-prototypes/DESIGN.md` หรือยัง — ถ้า **ไม่มี** ให้ไปทำ "ขั้นตอนสร้าง DESIGN.md" ด้านล่างให้เสร็จก่อน แล้วค่อยกลับมาทำข้อ 3 ต่อ

### 3. ตรวจสอบ version folder ที่มีอยู่
Glob `docs/02-design/01-prototypes/v*/` เพื่อหา version ล่าสุด (เลข `N` สูงสุด):
- **ถ้ายังไม่มี version folder เลย** → ใช้ `v1/` เป็นเป้าหมายอัตโนมัติ ไม่ต้องถาม user เรื่อง version (ยังไม่มีของเดิมให้เลือก)
- **ถ้ามี version folder อยู่แล้ว (`v{N}` ล่าสุด)** → ต้องถาม user เสมอด้วย AskUserQuestion ว่าจะ **สร้าง version ใหม่ (`v{N+1}`)** หรือ **แก้ไข version ล่าสุด (`v{N}`)** พร้อมให้คำแนะนำในตัวเลือก:
  - **แก้ไข `v{N}` เดิม** เหมาะเมื่อ: ปรับแก้เนื้อหา/ข้อความเล็กน้อย, เพิ่มหน้าจอใหม่ในสโคปเดิมที่ยังไม่เสร็จ, ยังไม่มีเอกสารอื่น (เช่น `03-testing/`) อ้างอิง version นี้ไปแล้ว — ข้อดี: ไม่มีไฟล์ซ้ำซ้อน ข้อเสีย: ไม่มีประวัติ before/after ให้เทียบย้อนหลัง
  - **สร้าง version ใหม่** เหมาะเมื่อ: มี requirement ใหม่หรือเปลี่ยนแปลง scope มาก, ต้องการเก็บประวัติเทียบ before/after, หรือ version ล่าสุดถูกอ้างอิงใน `03-testing/`/`04-retrospectives/` ไปแล้ว (แก้ไขตรงๆ จะทำให้ผลอ้างอิงเดิม inconsistent) — ข้อดี: ประวัติครบ ย้อนดูได้ ข้อเสีย: มีไฟล์ซ้ำที่ไม่เปลี่ยนเยอะขึ้นทุก version
  ถ้า user ไม่แน่ใจ ให้แนะนำตามเกณฑ์ข้างต้นแต่ให้ user เป็นคนตัดสินใจสุดท้ายเสมอ

### 4. เสนอแผนงาน (Plan) — ต้องรอ confirm ก่อนเสมอ
ก่อนมอบหมายงานเขียนไฟล์จริง ให้สรุปแผนเป็นข้อความให้ user เห็นก่อนเสมอ ประกอบด้วย:
- persona/หน้าจอไหนบ้างที่จะสร้าง/แก้ไข และมาจาก journey/feature ไหน
- จะเขียนลง version folder ไหน (`v{N}` ใหม่ หรือแก้ไข `v{N}` เดิม — ตามที่ confirm ในข้อ 3)
- จะอ้างอิง `DESIGN.md` ส่วนไหนบ้าง (เช่น token สี, component pattern, navigation pattern ของ persona นั้น)

ห้ามมอบหมายให้ `prototype-writer` ลงมือเขียนไฟล์จริงจนกว่า user จะยืนยันแผนนี้ ถ้า user ขอแก้แผน ให้ปรับแล้วเสนอใหม่จนกว่าจะได้รับการยืนยันชัดเจน (เช่น "ตกลง", "ทำเลย", "ใช่")

### 5. มอบหมายให้ `prototype-writer` เขียนไฟล์จริง (foreground เสมอ)
ลอง `subagent_type: "prototype-writer"` ก่อน ถ้า error ให้ fallback ตามหมายเหตุด้านบน prompt ต้องมี:
- scope ที่ confirm แล้ว (ข้อ 4)
- version folder เป้าหมาย และระบุชัดว่าเป็น **version ใหม่** หรือ **แก้ไขของเดิม**
- เนื้อหาไฟล์ `DESIGN.md`, `feature-list.md`, journey doc(s), และ spec ที่เกี่ยวข้อง (แปะเนื้อหาตรงๆ ใน prompt)
- วันที่ปัจจุบัน

### 6. ถ้า agent ถามคำถามกลับมา
ปล่อยให้คำถามนั้นแสดงต่อ user ตามปกติ (ห้ามตอบแทน user เอง) แล้วให้ agent ทำงานต่อจนจบในรอบ Agent call เดียวกัน

### 7. เมื่องานเสร็จ
สรุปผลให้ user แบบกระชับ: ไฟล์ไหนถูกสร้าง/แก้ไขบ้าง (พร้อมลิงก์), อยู่ใน version ไหน, และมีจุดใดที่ยังไม่ชัดเจนหรือต้องตัดสินใจเพิ่มหรือไม่

## ขั้นตอนสร้าง DESIGN.md (เมื่อยังไม่มีไฟล์นี้)

ทำก่อนข้อ 3 ของ "วิธีทำงาน" เสมอ ถ้าตรวจพบว่ายังไม่มี `docs/02-design/01-prototypes/DESIGN.md`:

1. แจ้ง user ตรงๆ ว่ายังไม่มี `DESIGN.md` — ต้องสร้างก่อนถึงจะทำ prototype ต่อได้ เพราะ prototype ทุกหน้าจอต้องอ้างอิง design token จากไฟล์นี้
2. ถาม user ด้วย AskUserQuestion (อย่างน้อย 2 คำถาม แต่ละคำถามมีตัวเลือก **อย่างน้อย 3 แนวทาง** พร้อมข้อดี-ข้อเสีย):
   - **โทนสี/สไตล์ที่ต้องการ** — ปรับตัวอย่างตามบริบทโปรเจกต์จริง เช่น (ตัวอย่างทั่วไป ไม่ต้องยึดตายตัว):
     - *Earth tone + Minimalist* — สงบ อบอุ่น เหมาะกับบริการที่เน้นความน่าเชื่อถือ/ใช้งานต่อเนื่องนาน (เช่น จอทำงานของพนักงาน) — ข้อดี: อ่านง่าย ไม่ล้าตา ข้อเสีย: อาจดูธรรมดาถ้าต้องการความโดดเด่นทางการตลาด
     - *Vibrant/Playful* — สีสดใส เหมาะแบรนด์ที่เน้นความสนุก/กลุ่มเป้าหมายวัยรุ่น — ข้อดี: ดึงดูดสายตา จดจำง่าย ข้อเสีย: อาจล้าตาถ้าใช้งานหน้าจอนาน ไม่เหมาะกับงานที่ต้องโฟกัส
     - *Corporate/Professional* — โทนเข้ม น้ำเงิน-เทา เรียบหรู — ข้อดี: ดูน่าเชื่อถือ เหมาะ B2B/dashboard ข้อเสีย: อาจดูเย็นชาเกินไปสำหรับหน้าจอฝั่งลูกค้า
   - **มีโลโก้/ภาพตัวอย่างอ้างอิงหรือไม่** — ถ้ามี ให้ user ระบุ path ไฟล์ภาพในเครื่อง แล้วใช้ Read เพื่อดูภาพประกอบการตัดสินใจสี/สไตล์ ถ้าไม่มีให้ระบุว่าจะออกแบบแบบ name-agnostic/placeholder ไปก่อน
3. เมื่อได้คำตอบครบ ร่างเนื้อหา `DESIGN.md` ใหม่ทั้งไฟล์ โดยใช้โครงสร้างหมวดหมู่เดียวกับธรรมเนียมของ design system เอกสาร (Brand Identity & CI, Design Tokens สี/typography/spacing/radius, UI Components & Patterns, UX Guidelines & Rules, Open Questions, Reference) ปรับเนื้อหาให้ตรงกับคำตอบ user จริง — **ห้าม copy ค่าที่เป็นตัวอย่างในคู่มือนี้หรือของโปรเจกต์อื่นมาใส่ตรงๆ**
4. เสนอร่าง `DESIGN.md` ให้ user รีวิวก่อนเขียนไฟล์จริง (เหมือนขั้นตอน Plan ในข้อ 4 ของ "วิธีทำงาน")
5. เมื่อ confirm แล้วค่อยเขียนไฟล์ `docs/02-design/01-prototypes/DESIGN.md` จริง แล้วบันทึก log ที่ `docs/05-log/{YYYYMMDD}-log.md` ว่าได้สร้าง `DESIGN.md` ใหม่ พร้อมสรุปคำตอบที่ user ให้เรื่องโทนสี/สไตล์/โลโก้

## ข้อควรจำ
- ห้ามข้ามการยืนยันแผนกับ user ก่อนเขียนไฟล์จริง ไม่ว่ากรณีใด — รวมถึงตอนสร้าง `DESIGN.md` ใหม่ด้วย
- ห้ามข้ามคำถามเรื่อง version folder เมื่อมี version เดิมอยู่แล้ว แม้ user จะบอกแค่ "อัปเดต prototype" เฉยๆ โดยไม่ระบุ
- ห้ามข้ามการสร้าง/แก้ไขไฟล์จริงไปเอง — งาน prototype ทั้งหมดต้องผ่าน agent `prototype-writer` เสมอ (ไม่ว่าจะ dispatch แบบ named `subagent_type` หรือ fallback ผ่าน `general-purpose`) เพื่อให้ logic การตั้งชื่อไฟล์, running number, การแตกหน้าจอ, และการอ้างอิง DESIGN.md สอดคล้องกันทุกครั้ง
- เอกสารทั้งหมดของ vault นี้เขียนเป็นภาษาไทยเป็นหลัก ตามที่ระบุใน `CLAUDE.md`
