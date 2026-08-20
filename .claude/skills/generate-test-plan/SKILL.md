---
name: generate-test-plan
description: Generate or update a test plan document under docs/03-testing/01-test-plan/, deriving test cases from a requirement spec in docs/01-requirements/01-spec/ and, when available, the matching UI prototype under docs/02-design/01-prototypes/v{N}/. Always proposes a plan for user confirmation before writing anything. Use when the user asks to create/update a test plan, test cases, or test scenarios for a feature/spec (for actual pass/fail test results and bugs, that's a separate 02-test-result concern, not this skill).
---

# Generate Test Plan

Skill นี้เป็นจุดเข้า (entry point) สำหรับสร้าง/อัปเดตเอกสาร Markdown แผนการทดสอบ (test plan) โดยแตก test case จาก requirement spec หนึ่งฉบับ และอ้างอิง prototype screen ที่เกี่ยวข้อง (ถ้ามี) งานเขียนไฟล์จริงมอบหมายให้ `.claude/agents/test-plan-writer.md` เสมอ

> **หมายเหตุเรื่อง dispatch:** บาง environment ของ Claude Code ไม่รู้จัก `subagent_type` ที่มาจาก `.claude/agents/*.md` โดยตรง (Agent tool error `Agent type '...' not found`) ถ้าเจอกรณีนี้ ให้ใช้ fallback: Read ไฟล์ agent นั้น, ตัดส่วน frontmatter ออก, แล้วส่งเนื้อหาส่วนคำสั่ง (system prompt) ทั้งหมดไปเป็นส่วนหนึ่งของ prompt ที่ส่งให้ `subagent_type: "general-purpose"` แทน — อย่าล้มเลิกงานทั้งหมดเพราะ `subagent_type` ไม่ถูก whitelist

## ขอบเขต (สำคัญ)

Skill นี้ทำ **เฉพาะขั้น Test Plan (test case ก่อนลงมือทดสอบ)** เท่านั้น — ไม่บันทึกผลการทดสอบจริง (pass/fail) หรือบั๊กที่พบ (นั่นคือ `docs/03-testing/02-test-result/` ซึ่งอยู่นอกขอบเขตนี้) และไม่ regenerate spec หรือ prototype เอง สมมติว่าเอกสารต้นทางเหล่านี้มีอยู่แล้ว ถ้า spec ที่จำเป็นยังไม่มี ให้หยุดและแจ้ง user ให้ไปรัน `create-requirement` ก่อน — ห้ามข้ามไปเดาหรือสร้างแทนเอง

## เมื่อไหร่ควรใช้
ใช้เมื่อ user ขอให้สร้าง/อัปเดต test plan, test case, หรือ test scenario ให้ feature/spec หนึ่งในโปรเจกต์นี้

## วิธีทำงาน

### 1. กำหนด scope
ถ้า user ระบุเจาะจง (ชื่อ spec, topic, หรือ path) ใช้ spec นั้น ถ้าไม่ระบุ:
- Glob `docs/01-requirements/01-spec/*.md` (ยกเว้น `index.md`) และ Glob `docs/03-testing/01-test-plan/*.md` (ยกเว้น `index.md`)
- หา spec ที่ **ยังไม่มี test plan อ้างอิงถึง** (เทียบจาก wikilink ใน reference section ของไฟล์ test plan ที่มีอยู่)
- ถ้ามี spec มากกว่า 1 ฉบับที่ยังไม่มี test plan ให้ถาม user ด้วย AskUserQuestion ว่าต้องการทำฉบับไหน (list ชื่อ spec ที่พบเป็นตัวเลือก)

### 2. ตรวจสอบ dependency ที่จำเป็น
- อ่าน spec ที่อยู่ในสโคป — ถ้าไม่มีไฟล์นี้จริง **หยุดและแจ้ง user** ว่าต้องรัน `create-requirement` ก่อน
- Glob `docs/02-design/01-prototypes/v*/` หา version ล่าสุด แล้วดูว่ามี screen doc ใดใน version นั้นอ้างอิงกลับมาที่ spec นี้หรือไม่ (เทียบจาก reference wikilink ในไฟล์ screen)
  - **ถ้ามี** — ใช้ screen doc เหล่านั้นประกอบการทำ test case ฝั่ง UI
  - **ถ้าไม่มี (หรือยังไม่มี prototype เลย)** — แจ้ง user ตรงๆ ว่า spec นี้ยังไม่มี prototype ที่ใช้ทำ test case ฝั่ง UI ได้ และถามด้วย AskUserQuestion ว่าต้องการ:
    1. **ทำเฉพาะ test case ฝั่ง business logic/functional ไปก่อน** เหมาะเมื่อ ต้องการ progress ทดสอบ backend/rule ไปพลางๆ — ข้อดี: ไม่ต้องรอ prototype ข้อเสีย: ต้องกลับมาเพิ่ม test case ฝั่ง UI ทีหลัง
    2. **รอให้รัน `generate-prototype` ก่อนแล้วค่อยกลับมาทำ** เหมาะเมื่อ feature นี้เน้น UI เป็นหลักและ test case ฝั่ง UI สำคัญกว่า — ข้อดี: ได้ test plan ที่ครบในรอบเดียว ข้อเสีย: ต้องรอ
    3. **ทำ test case คร่าวๆ ทั้งสองฝั่งแต่ระบุ UI-related เป็น Open Items ชัดเจน** — ข้อดี: เห็นภาพรวมเร็ว ข้อเสีย: test case ฝั่ง UI อาจต้องปรับใหญ่เมื่อ prototype ออกจริง

  ถ้า user เลือกตัวเลือกที่ 2 (รอ prototype ก่อน) ให้ **หยุด flow ของ skill นี้ทันที** โดยไม่ดำเนินการต่อไปยังข้อ 3-4 — แจ้ง user ว่าให้กลับมาเรียก `generate-test-plan` อีกครั้งหลังจากรัน `generate-prototype` เสร็จแล้ว (ไม่ต้องเสนอแผนหรือมอบหมายงานให้ agent ใดๆ ในรอบนี้)

### 3. เสนอแผนงาน (Plan) — ต้องรอ confirm ก่อนเสมอ
ก่อนมอบหมายงานเขียนไฟล์จริง ให้สรุปแผนเป็นข้อความให้ user เห็นก่อนเสมอ ประกอบด้วย:
- จะทำ test plan ให้ spec ไหน (path)
- จะสร้างเอกสารใหม่ หรือแก้ไขเอกสารเดิม (ถ้ามี test plan ของ spec นี้อยู่แล้ว)
- มี prototype ประกอบหรือไม่ (ระบุ version + screen ที่จะใช้) หรือจะทำแบบ business-logic-only ตามที่ user เลือกในข้อ 2

ห้ามมอบหมายให้ `test-plan-writer` ลงมือเขียนไฟล์จริงจนกว่า user จะยืนยันแผนนี้ ถ้า user ขอแก้แผน ให้ปรับแล้วเสนอใหม่จนกว่าจะได้รับการยืนยันชัดเจน (เช่น "ตกลง", "ทำเลย", "ใช่")

### 4. มอบหมายให้ `test-plan-writer` เขียนไฟล์จริง (foreground เสมอ)
ลอง `subagent_type: "test-plan-writer"` ก่อน ถ้า error ให้ fallback ตามหมายเหตุด้านบน prompt ต้องมี:
- เนื้อหาไฟล์ spec ที่ confirm แล้ว (แปะเนื้อหาตรงๆ ใน prompt)
- สถานะ prototype: มี/ไม่มี — ถ้ามี แนบ path + เนื้อหา screen doc ที่เกี่ยวข้องด้วย
- ว่าเป็นการสร้างใหม่หรือแก้ไขเอกสารเดิม (พร้อม path เดิมถ้าแก้ไข)
- วันที่ปัจจุบัน

### 5. ถ้า agent ถามคำถามกลับมา
ปล่อยให้คำถามนั้นแสดงต่อ user ตามปกติ (ห้ามตอบแทน user เอง) แล้วให้ agent ทำงานต่อจนจบในรอบ Agent call เดียวกัน

### 6. เมื่องานเสร็จ
สรุปผลให้ user แบบกระชับ: ไฟล์ไหนถูกสร้าง/แก้ไขบ้าง (พร้อมลิงก์), จำนวน test case, และมี Open Items อะไรที่ต้องติดตามต่อหรือไม่

## ข้อควรจำ
- ห้ามข้ามการยืนยันแผนกับ user ก่อนเขียนไฟล์จริง ไม่ว่ากรณีใด
- ห้ามข้ามการสร้าง/แก้ไขไฟล์จริงไปเอง — งาน test plan ทั้งหมดต้องผ่าน agent `test-plan-writer` เสมอ (ไม่ว่าจะ dispatch แบบ named `subagent_type` หรือ fallback ผ่าน `general-purpose`) เพื่อให้ logic การตั้งชื่อไฟล์, running number, และการแตก test case สอดคล้องกันทุกครั้ง
- เอกสารทั้งหมดของ vault นี้เขียนเป็นภาษาไทยเป็นหลัก ตามที่ระบุใน `CLAUDE.md`
