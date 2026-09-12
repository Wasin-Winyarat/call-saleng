# Sprint 2 — Task Backlog

ย้อนกลับไปที่ [[../02-plan/index|02-plan]] · ภาพรวมสถานะ requirement อยู่ที่ [[../backlog|backlog.md]]

| Task | สถานะ | Priority | หมายเหตุ |
| --- | --- | --- | --- |
| ย้ายคีย์ AI (OpenRouter) ไปไว้ฝั่งที่ผู้ใช้แตะไม่ได้ | ยังไม่เริ่ม | สูง (security) | ตอนนี้คีย์อยู่ใน `webapp/ai-config.js` — ไม่ถูก commit/push (gitignored) แต่ยังฝังอยู่ในหน้าเว็บฝั่ง client ที่ browser โหลดตรงๆ ใครก็ตามที่เปิด DevTools ของเบราว์เซอร์เห็นคีย์ได้ทันที ต้องย้าย logic เรียก OpenRouter ไปไว้หลัง backend/Cloud Function ก่อนใช้งานจริง (production) — เกี่ยวกับฟีเจอร์ AI ช่วยสรุปคำร้อง/ร่างเหตุผลยกเลิกใน admin dashboard ที่เพิ่งเพิ่มเข้ามา |
