---
name: create-requirement
description: Capture a raw, informal requirement or feature request from the user and turn it into a structured requirement spec document under docs/01-requirements/01-spec/, keep docs/01-requirements/backlog.md updated, and log the change in docs/05-log/. Use when the user describes a new feature, business rule, or change they want for this project and it hasn't yet been written up as a formal requirement, or when they explicitly ask to write/log a requirement or update the backlog.
---

# Create Requirement & Update Backlog

Skill นี้เป็นจุดเข้า (entry point) สำหรับรับ requirement ดิบจาก user แล้วมอบหมายงานจริงให้ agent ทำตามขั้นตอนที่กำหนดไว้ใน `.claude/agents/requirement-writer.md` เพื่อสร้าง/แก้ไขเอกสาร, update backlog และ log ให้

> **หมายเหตุเรื่อง dispatch:** บาง environment ของ Claude Code ไม่รู้จัก `subagent_type` ที่มาจาก `.claude/agents/*.md` โดยตรง (Agent tool error `Agent type '...' not found`) ถ้าเจอกรณีนี้ ให้ใช้ fallback ในขั้นตอนที่ 2 แทน — อย่าล้มเลิกงานทั้งหมดเพราะ subagent_type ไม่ถูก whitelist

## เมื่อไหร่ควรใช้
ใช้เมื่อ user ให้ requirement หรือ feature request แบบดิบ (ไม่เป็นทางการ) มา และต้องการให้บันทึกเป็นเอกสาร requirement อย่างเป็นระบบในโปรเจกต์นี้

## วิธีทำงาน

1. **รับ requirement ดิบ** — ถ้า args ที่ส่งมาตอนเรียก skill มีเนื้อหา requirement อยู่แล้ว ใช้ได้ทันที ถ้าไม่มีหรือไม่ชัดเจนว่า user ต้องการบันทึกอะไร ให้ถาม user ก่อนว่า requirement ที่ต้องการบันทึกคืออะไร (คำต่อคำ อย่าสรุปหรือตีความเองในขั้นนี้)

2. **มอบหมายงานให้ agent ทำตามขั้นตอนใน `requirement-writer.md`** ผ่าน Agent tool แบบ **foreground** (ต้องรอผลเพื่อรายงาน user ต่อ):
   - ลองใช้ `subagent_type: "requirement-writer"` ก่อน
   - **ถ้าได้ error ว่าไม่พบ agent type นี้** ให้ Read ไฟล์ `.claude/agents/requirement-writer.md`, ตัดส่วน frontmatter ออก, แล้วส่งเนื้อหาส่วนคำสั่ง (system prompt) ทั้งหมดนั้นไปเป็นส่วนหนึ่งของ prompt ที่ส่งให้ `subagent_type: "general-purpose"` แทน (คือทำให้ general-purpose agent สวมบทบาทเป็น requirement-writer โดยได้รับคำสั่งเดียวกันทุกคำ)
   - ไม่ว่าจะ dispatch ด้วยวิธีไหน prompt ที่ส่งไปต้องมี:
     - requirement ดิบทั้งหมดจาก user แบบคำต่อคำ
     - วันที่ปัจจุบัน (สำหรับตั้งชื่อไฟล์ `{YYYYMMDD}-...`)
     - เอกสาร requirement เดิมที่ user อ้างอิงถึง (ถ้ามีการพูดถึง path หรือชื่อเอกสาร) หรือบอกว่าไม่มีการอ้างอิงถ้าไม่มี
     - (เมื่อ dispatch ผ่าน general-purpose) เนื้อหาขั้นตอนทั้งหมดจาก `requirement-writer.md`

3. **ถ้า agent ถามคำถามกลับมา** (ผ่าน AskUserQuestion) ให้ปล่อยให้คำถามนั้นแสดงต่อ user ตามปกติ (ห้ามตอบแทน user เอง) แล้วให้ agent ทำงานต่อจนจบในรอบ Agent call เดียวกัน

4. **เมื่อ agent ทำงานเสร็จ** สรุปผลให้ user แบบกระชับ: ไฟล์ไหนถูกสร้าง/แก้ไขบ้าง (พร้อมลิงก์), backlog และ log ถูกอัปเดตแล้ว, และมีจุดใดที่ยังไม่ชัดเจนหรือต้องตัดสินใจเพิ่มหรือไม่

## ข้อควรจำ
- ห้ามข้ามการสร้าง/แก้ไขไฟล์จริงไปเอง — งานเอกสาร/backlog/log ทั้งหมดต้องผ่าน agent ที่ทำตามขั้นตอนใน `requirement-writer.md` เสมอ (ไม่ว่าจะ dispatch แบบ named subagent_type หรือ fallback ผ่าน general-purpose) เพื่อให้ logic การตั้งชื่อไฟล์, running number, และการเช็คเอกสารเดิมสอดคล้องกันทุกครั้ง
- เอกสารทั้งหมดของ vault นี้เขียนเป็นภาษาไทยเป็นหลัก ตามที่ระบุใน `CLAUDE.md`
