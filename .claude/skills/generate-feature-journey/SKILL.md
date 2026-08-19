---
name: generate-feature-journey
description: Generate or update a consolidated feature list (with MoSCoW prioritization) from all requirement specs, and/or generate user journey documents (with Mermaid diagrams) for personas, derived from those specs. Use when the user asks to create/update a feature list, user journey, user flow diagrams, or wants a synthesized view of features and journeys across docs/01-requirements/01-spec/.
---

# Generate Feature List & User Journey

Skill นี้เป็นจุดเข้า (entry point) สำหรับสร้าง/อัปเดต feature list (พร้อม MoSCoW) และ user journey (พร้อม Mermaid diagram) จากเอกสาร requirement spec ที่มีอยู่ โดยมอบหมายงานจริงให้ 2 agent ทำตามลำดับ:

1. `.claude/agents/feature-list-writer.md` → เขียน `docs/01-requirements/feature-list.md`
2. `.claude/agents/user-journey-writer.md` → เขียน/แก้ไข `docs/02-design/01-prototypes/*.md`

> **หมายเหตุเรื่อง dispatch:** บาง environment ของ Claude Code ไม่รู้จัก `subagent_type` ที่มาจาก `.claude/agents/*.md` โดยตรง (Agent tool error `Agent type '...' not found`) ถ้าเจอกรณีนี้ ให้ใช้ fallback: Read ไฟล์ agent นั้น, ตัดส่วน frontmatter ออก, แล้วส่งเนื้อหาส่วนคำสั่ง (system prompt) ทั้งหมดไปเป็นส่วนหนึ่งของ prompt ที่ส่งให้ `subagent_type: "general-purpose"` แทน (ทำให้ general-purpose agent สวมบทบาทตาม agent นั้นโดยได้รับคำสั่งเดียวกันทุกคำ) — อย่าล้มเลิกงานทั้งหมดเพราะ subagent_type ไม่ถูก whitelist

## เมื่อไหร่ควรใช้
ใช้เมื่อ user ขอให้สร้าง/อัปเดต feature list, user journey/user flow, หรือขอภาพรวมฟีเจอร์+MoSCoW จากเอกสาร requirement ที่มีอยู่ในโปรเจกต์นี้

## วิธีทำงาน

1. **กำหนด scope** — ถ้า user ระบุ spec เจาะจง (path หรือชื่อ) ใช้เฉพาะ spec นั้น ถ้าไม่ระบุ ถือว่าทำกับ `docs/01-requirements/01-spec/` ทั้งหมด

2. **กำหนดว่าต้องทำอะไรบ้าง**:
   - ถ้า user พูดถึงทั้ง feature list และ journey หรือพูดกว้างๆ ไม่ระบุเจาะจง → ทำทั้งคู่ตามลำดับ (ข้อ 3 แล้วข้อ 4)
   - ถ้า user ขอเฉพาะอย่างใดอย่างหนึ่งชัดเจน (เช่น "อัปเดต feature list" เฉยๆ) → ทำเฉพาะอย่างนั้น (ข้ามข้อ 4 ถ้าไม่ต้องการ journey)

3. **เรียก `feature-list-writer` แบบ foreground เสมอก่อน** (ต้องรอผลก่อน เพราะ journey ในขั้นตอนถัดไปต้องใช้ผลลัพธ์นี้เป็น input ถ้าจะสร้าง journey ด้วย):
   - ลอง `subagent_type: "feature-list-writer"` ก่อน ถ้า error ให้ fallback ตามหมายเหตุด้านบน
   - prompt ต้องมี: scope ของ spec ที่จะสังเคราะห์, วันที่ปัจจุบัน

4. **ถ้าต้องสร้าง/อัปเดต journey ด้วย** เรียก `user-journey-writer` แบบ foreground โดย prompt ต้องมี:
   - spec ที่เกี่ยวข้อง (path หรือเนื้อหา)
   - เนื้อหาไฟล์ `docs/01-requirements/feature-list.md` ที่เพิ่งได้จากขั้นตอน 3 (แปะเนื้อหาเข้าไปตรงๆ ใน prompt)
   - วันที่ปัจจุบัน
   - ลอง `subagent_type: "user-journey-writer"` ก่อน ถ้า error ให้ fallback ตามหมายเหตุด้านบน

5. **ถ้า agent ถามคำถามกลับมา** (ผ่าน AskUserQuestion) ให้ปล่อยให้คำถามนั้นแสดงต่อ user ตามปกติ (ห้ามตอบแทน user เอง) แล้วให้ agent ทำงานต่อจนจบในรอบ Agent call เดียวกัน

6. **เมื่อ agent ทั้งหมดทำงานเสร็จ** สรุปผลให้ user แบบกระชับ: ไฟล์ไหนถูกสร้าง/แก้ไขบ้าง (พร้อมลิงก์), จำนวนฟีเจอร์ต่อ MoSCoW category, จำนวน journey doc ที่สร้าง/แก้ไข, และมีจุดใดที่ยังไม่ชัดเจนหรือต้องตัดสินใจเพิ่มหรือไม่

## ข้อควรจำ
- ต้อง generate `feature-list.md` ให้เสร็จก่อนเสมอถ้าจะสร้าง journey ด้วย (journey อ้างอิง wikilink จากไฟล์นี้ — ห้ามข้ามลำดับ)
- ห้ามข้ามการสร้าง/แก้ไขไฟล์จริงไปเอง — งาน feature list และ journey ทั้งหมดต้องผ่าน agent ที่เกี่ยวข้องเสมอ (ไม่ว่าจะ dispatch แบบ named subagent_type หรือ fallback ผ่าน general-purpose) เพื่อให้ logic การตั้งชื่อไฟล์, running number, การ inferred priority, และการเช็คเอกสารเดิมสอดคล้องกันทุกครั้ง
- เอกสารทั้งหมดของ vault นี้เขียนเป็นภาษาไทยเป็นหลัก ตามที่ระบุใน `CLAUDE.md`
