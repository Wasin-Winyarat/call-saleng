# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository นี้คืออะไร

**call-saleng** ("กรีนซาเล้ง / Green Saleng") เป็นโปรเจกต์นักศึกษาที่มีสองส่วนอยู่ในที่เดียวกัน:

1. **`docs/`** — Obsidian vault เก็บเอกสารตาม workflow pipeline (requirements → design → testing → retrospectives)
2. **`webapp/`** — โค้ดจริงของเว็บแอป (plain HTML/CSS/JS + Firebase) ที่ implement ตาม spec ใน `docs/`

ไม่มี build system, package manager, bundler, linter หรือ automated test suite ในโปรเจกต์นี้ — `webapp/` เป็น static HTML/JS ล้วนๆ ที่เปิดตรงได้แบบ `file://` (ดู [webapp/serve.ps1](webapp/serve.ps1) ถ้าต้องการรันผ่าน `http://` แทน)

เนื้อหาเอกสารและ comment ในโค้ดเขียนเป็นภาษาไทยเป็นหลัก

`SCOPE.md` สรุปขอบเขตของ module ที่กำลังพัฒนาส่งในรอบปัจจุบัน (User สร้างคำขอเรียกรถซาเล้ง + Admin accept/cancel/change-time) และเทียบโครงสร้างข้อมูลกับโปรเจกต์ตัวอย่าง LeaveEasy — อ่านก่อนเพื่อรู้ว่าอะไรอยู่ใน/นอกขอบเขตตอนนี้

## รันและทดสอบ webapp

ไม่มีคำสั่ง build/lint/test เพราะไม่มี dependency ใดๆ (ไม่มี `package.json`) เปิดแอปได้สองแบบ:

```powershell
# แบบที่ 1: เปิดไฟล์ตรงๆ (ไม่ต้องมี server)
# double-click webapp/index.html หรือเปิดผ่าน file:// ใน browser

# แบบที่ 2: รันผ่าน local static server (ใช้ทดสอบ path แบบเดียวกับตอน deploy จริง)
powershell -File webapp/serve.ps1
# แล้วเปิด http://localhost:8080/
```

ทดสอบ feature ใหม่ด้วยมือผ่าน browser จริงเสมอ (ดูโฟลเดอร์ [webapp/seed/](webapp/seed/) สำหรับ seed ข้อมูลตัวอย่างลง Firestore ถ้าต้องการข้อมูลทดสอบ)

## Architecture ของ webapp/

แต่ละหน้าเป็นโฟลเดอร์แยก มี `index.html` + `app.js` (+ `styles.css` ของตัวเอง บางหน้า) ไม่มี router หรือ SPA framework — เชื่อมหน้าด้วย `<a href>` ธรรมดา:

```
webapp/
  index.html            landing page (ปุ่ม login/register + admin corner สำหรับทดสอบ)
  firebase-config.js     Firebase compat SDK init (ใช้ร่วมทุกหน้า)
  auth-helpers.js         normalizePhone / phoneToEmail / adminIdToEmail
  shared-styles.css       CSS variable/tokens ที่ใช้ร่วมกัน
  login/, register/       user auth flow
  dashboard/              user home หลัง login
  pickup-request/         ฟอร์มสร้างคำขอเรียกรถซาเล้ง (เขียนลง Firestore collection pickup_requests)
  tracking/, prices/, profile/   หน้า user เพิ่มเติม
  admin/                  admin login + admin/dashboard/ (accept/cancel/change-time, chat)
  seed/                   สคริปต์ seed ข้อมูลตัวอย่างลง Firestore สำหรับ dev/demo
```

**สำคัญ — ทำไมใช้ Firebase compat SDK (ไม่ใช่ ES module):** เพื่อให้เปิดไฟล์ `.html` ผ่าน `file://` ได้ตรงๆ โดยไม่โดน CORS บล็อกและไม่ต้องรัน server ทุกหน้าต้อง include compat script (`app`/`auth`/`firestore` อย่างน้อย, `storage` เฉพาะหน้าที่อัปโหลดไฟล์) ก่อน `firebase-config.js` เสมอ — ดูลำดับ `<script>` ตัวอย่างใน `index.html` ของแต่ละหน้า อย่าเปลี่ยนกลับไปใช้ ES module/import โดยไม่ตั้งใจ

**Auth pattern:** Firebase Auth ไม่รองรับ login ด้วยเบอร์โทร/รหัสผ่านตรงๆ (phone provider ผูกกับ SMS OTP เท่านั้น) จึงแปลงเบอร์โทร (user) หรือ login identifier (admin) เป็น "synthetic email" ภายใน (`auth-helpers.js`) แล้วใช้ Email/Password provider แทน — ผู้ใช้ไม่เห็น email นี้ Firestore เก็บเฉพาะ field จริงตามสคีมา ไม่เก็บ synthetic email เป็นข้อมูลผู้ใช้

**Firestore เป็น source of truth ของฟิลด์/collection:** ก่อนแก้หรือเพิ่ม field/collection ใน `webapp/` ให้เทียบกับ [docs/02-design/02-technical/database-schema.md](docs/02-design/02-technical/database-schema.md) ก่อน (ทั้งสองฝั่งอาจไม่ตรงกันชั่วคราวระหว่างพัฒนา — ดูหมายเหตุใน `SCOPE.md`)

### Collection (ชื่อโฟลเดอร์) ทั้งหมดใน Firestore

ชื่อ collection จริงในโค้ด (`.collection("...")`) เป็น**พหูพจน์** ต่างจากชื่อตารางเอกพจน์ใน `database-schema.md` — ใช้ชื่อจากลิสต์นี้เวลาเขียนโค้ด อย่าใช้ชื่อเอกพจน์จากเอกสาร:

| Collection ที่ implement แล้ว (ใช้จริงใน `webapp/`) | ตารางเทียบเท่าใน database-schema.md |
|---|---|
| `user_accounts` | `user_account` |
| `user_addresses` | `user_address` |
| `admin_accounts` | `admin_account` |
| `pickup_requests` | `pickup_request` |
| `chat_messages` | `chat_message` |

Collection อื่นที่มีอยู่ใน `database-schema.md` แต่**ยังไม่ implement**เป็นโค้ดจริง (นอกขอบเขต module ปัจจุบันตาม `SCOPE.md` — ฝั่งสาเล้ง/matching/ใบเสร็จ/ราคากลาง): `saleng_account`, `waste_type`, `waste_reference_price`, `pickup_request_waste_item`, `request_photo`, `request_match`, `receipt`, `receipt_item`, `saleng_fee_ledger_entry`, `saleng_wallet_balance`, `membership_tier`, `ad_banner` — อย่าสมมติว่ามี collection เหล่านี้อยู่ใน Firestore จริงแล้ว ต้องสร้างตอน implement เท่านั้น

### สถานะ (status) ของ `pickup_requests`

ฟิลด์ `status` ใน `database-schema.md` นิยามไว้ 6 ค่า แต่ในโค้ดปัจจุบัน (module รอบนี้ตัด flow ฝั่งสาเล้งออก) มีแค่ transition นี้ที่ implement จริงใน [webapp/admin/dashboard/app.js](webapp/admin/dashboard/app.js):

- `pending_admin_review` — สถานะเริ่มต้นตอน user ส่งคำขอ ([webapp/pickup-request/app.js](webapp/pickup-request/app.js))
- `open_for_saleng` — admin กด "Confirm"
- `cancelled` — admin กด "Reject" (**หมายเหตุ**: business rule ใหม่บังคับต้องมี `cancel_reason` ตาม `SCOPE.md` แต่โค้ดจุดนี้ยังไม่ได้ใส่ field นี้ตอน update — รอทำต่อ อย่าลืมถ้าถูกขอให้ทำ cancel reason)

ค่าที่เหลือ (`pending_match_confirm`, `confirmed`, `completed`) มีอยู่ใน seed data ([webapp/seed/seed.js](webapp/seed/seed.js)) และใน filter UI ของ admin dashboard เพื่อเตรียมไว้ แต่ยังไม่มี code path ใดเขียนค่าพวกนี้จริง (ต้องรอ flow การจับคู่สาเล้ง/ปิดงานซึ่งอยู่นอกขอบเขตตอนนี้)

### ข้อห้าม — ห้ามใส่คีย์ลงไฟล์ที่ push

ห้าม commit/push secret key ใดๆ ลงไฟล์ในโปรเจกต์นี้ (service account JSON, Firebase Admin SDK private key, API key ของบริการอื่นที่ไม่ใช่ client-side Firebase, token, password) ไม่ว่าจะฝังตรงในโค้ดหรือใส่เป็นไฟล์ `.env`/`credentials.json` ก็ตาม

ข้อยกเว้นเดียวคือ `firebaseConfig` ใน [webapp/firebase-config.js](webapp/firebase-config.js) (รวม `apiKey`) ซึ่งเป็น **client-side public config** ของ Firebase web app โดยเจตนา ไม่ใช่ secret — ความปลอดภัยจริงบังคับที่ Firestore/Storage Security Rules ไม่ใช่การซ่อนค่านี้ ดังนั้นค่านี้ commit ได้ตามปกติ แต่ต้องไม่เผลอเพิ่ม secret อื่น (เช่น Admin SDK key) ไว้ในไฟล์เดียวกันหรือไฟล์ใกล้เคียง

ก่อน push ทุกครั้งที่แตะไฟล์ config/credential ให้ตรวจ `git status`/`git diff` ว่าไม่มีไฟล์ secret หลุดติดไปโดยไม่ตั้งใจ

## docs/ — pipeline เอกสารและ agent/skill ที่เกี่ยวข้อง

โครงสร้าง `docs/` ถูกออกแบบให้เป็น pipeline ของ workflow โปรเจกต์ตามลำดับเลข โดยแต่ละ stage จะมี `index.md` อธิบายว่าเก็บอะไรไว้ในนั้น และลิงก์ไปมาระหว่าง stage ก่อนหน้า/ถัดไปด้วย Obsidian wikilink (`[[path/index|label]]`) ลำดับการไหลของงานคือ:

```
01-requirements  →  02-design  →  03-testing  →  04-retrospectives
   01-spec              01-prototypes    01-test-plan
   02-plan              02-technical     02-test-result
   03-task
```

- **`01-requirements/`** — ต้นทาง (source of truth) ของความต้องการ: ระบบต้องทำอะไร (`01-spec`), จะทำเมื่อไหร่/อย่างไร (`02-plan`), และงานย่อยที่ลงมือทำได้จริง (`03-task`) — `feature-list.md` และ `backlog.md` อยู่ที่ระดับนี้ด้วย
- **`02-design/`** — ต่อยอดจากความต้องการ: mockup/flow ของ UI/UX (`01-prototypes`) และการออกแบบเชิงเทคนิค เช่น architecture, database, API (`02-technical`)
- **`03-testing/`** — แผนและ test case ที่มาจากการออกแบบ (`01-test-plan`) และผลการทดสอบจริงพร้อมบั๊กที่พบ (`02-test-result`)
- **`04-retrospectives/`** — สรุปบทเรียนหลังจบแต่ละ phase/sprint โดยอ้างอิงผลทดสอบและ log
- **`05-log/`** — บันทึกความเคลื่อนไหวและการตัดสินใจตามลำดับเวลา เป็นหลักฐานอ้างอิงให้ stage อื่น
- **`00-archived/`** — เอกสารที่เลิกใช้แล้ว ให้ย้ายมาเก็บที่นี่แทนการลบ เพื่อรักษาประวัติการตัดสินใจ

เมื่อจะเพิ่มหรือแก้ไขเอกสารด้วยมือ ให้วางไว้ใน stage ที่ตรงกับเนื้อหา และทำ wikilink เชื่อมกับ stage ก่อนหน้า/ถัดไปตามรูปแบบเดิมที่มีอยู่ใน `index.md` ของแต่ละโฟลเดอร์

โปรเจกต์นี้มี custom skills (`.claude/skills/`) และ agents (`.claude/agents/`) คู่กันสำหรับสร้าง/อัปเดตเอกสารแต่ละ stage แทนการเขียนมือ — ให้เรียกใช้ผ่าน skill แทนที่จะเขียนไฟล์เอกสารตรงๆ เมื่อมี skill ให้ตรงงาน:

| Skill | สร้าง/อัปเดต |
|---|---|
| `create-requirement` | requirement spec ใหม่ใน `01-requirements/01-spec/` + sync `backlog.md` |
| `generate-feature-journey` | `feature-list.md` (MoSCoW) และ user journey docs |
| `generate-prototype` | wireframe/prototype markdown ใน `02-design/01-prototypes/v{N}/` |
| `generate-architecture` | `02-design/02-technical/high-level-architecture.md` |
| `generate-data-api-spec` | `02-design/02-technical/database-schema.md` และ `api-spec.md` |
| `generate-detailed-design` | `02-design/02-technical/detailed-design/{journey}-detailed-design.md` |
| `generate-test-plan` | test cases ใน `03-testing/01-test-plan/` |

เอกสารทุก stage เป็น conceptual/technology-agnostic (ไม่ผูกกับ Firebase โดยเฉพาะ) ยกเว้นโค้ดจริงใน `webapp/` ที่เลือก Firebase แล้ว — อย่าสับสนสอง layer นี้เวลาถูกขอให้ "อัปเดต schema" หรือ "อัปเดต API spec" (หมายถึงเอกสาร ไม่ใช่โค้ด เว้นแต่ระบุชัดว่าจะแก้โค้ดด้วย)
