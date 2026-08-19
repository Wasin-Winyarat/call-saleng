# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository นี้คืออะไร

Repository นี้เป็น Obsidian vault ไม่ใช่ codebase ของซอฟต์แวร์ ไม่มี source code, build system, linter หรือ test suite — มีเพียงเอกสาร Markdown (`docs/`) และ config ของ Obsidian (`.obsidian/`) จึงไม่มีคำสั่ง build/lint/test ให้รัน

เนื้อหาในเอกสารเขียนเป็นภาษาไทยเป็นหลัก

## โครงสร้างและ workflow

โครงสร้าง `docs/` ถูกออกแบบให้เป็น pipeline ของ workflow โปรเจกต์ตามลำดับเลข โดยแต่ละ stage จะมี `index.md` อธิบายว่าเก็บอะไรไว้ในนั้น และลิงก์ไปมาระหว่าง stage ก่อนหน้า/ถัดไปด้วย Obsidian wikilink (`[[path/index|label]]`) ลำดับการไหลของงานคือ:

```
01-requirements  →  02-design  →  03-testing  →  04-retrospectives
   01-spec              01-prototypes    01-test-plan
   02-plan              02-technical     02-test-result
   03-task
```

- **`01-requirements/`** — ต้นทาง (source of truth) ของความต้องการ: ระบบต้องทำอะไร (`01-spec`), จะทำเมื่อไหร่/อย่างไร (`02-plan`), และงานย่อยที่ลงมือทำได้จริง (`03-task`)
- **`02-design/`** — ต่อยอดจากความต้องการ: mockup/flow ของ UI/UX (`01-prototypes`) และการออกแบบเชิงเทคนิค เช่น architecture, database, API (`02-technical`)
- **`03-testing/`** — แผนและ test case ที่มาจากการออกแบบ (`01-test-plan`) และผลการทดสอบจริงพร้อมบั๊กที่พบ (`02-test-result`)
- **`04-retrospectives/`** — สรุปบทเรียนหลังจบแต่ละ phase/sprint โดยอ้างอิงผลทดสอบและ log
- **`05-log/`** — บันทึกความเคลื่อนไหวและการตัดสินใจตามลำดับเวลา เป็นหลักฐานอ้างอิงให้ stage อื่น
- **`00-archived/`** — เอกสารที่เลิกใช้แล้ว ให้ย้ายมาเก็บที่นี่แทนการลบ เพื่อรักษาประวัติการตัดสินใจ

เมื่อจะเพิ่มหรือแก้ไขเอกสาร ให้วางไว้ใน stage ที่ตรงกับเนื้อหา และทำ wikilink เชื่อมกับ stage ก่อนหน้า/ถัดไปตามรูปแบบเดิมที่มีอยู่ใน `index.md` ของแต่ละโฟลเดอร์
