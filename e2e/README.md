# e2e — Automated tester (Playwright + Firebase Emulator)

ชุดทดสอบอัตโนมัติของ webapp ที่รันกับ **Firebase Emulator ในเครื่อง** (Auth + Firestore + Hosting)
ไม่แตะ production เลย — ทุกเทสต์ล้างข้อมูลแล้ว seed ใหม่ก่อนเริ่ม จึงทดสอบปุ่มที่ย้อนกลับไม่ได้ (Confirm/Reject/จับคู่/ปิดงาน) ได้เต็มที่
และใช้ `firestore.rules` ตัวจริงของโปรเจกต์

## ติดตั้งครั้งแรก

ต้องมี Node.js, Firebase CLI (`npm i -g firebase-tools`) และ **Java JDK 11+** (emulator ต้องใช้)

```powershell
winget install EclipseAdoptium.Temurin.21.JDK   # ถ้ายังไม่มี Java
cd e2e
npm install
npx playwright install chromium
```

## รันเทสต์

```powershell
cd e2e
npm test                    # รันทั้งหมด (Playwright เปิด emulator ให้เอง แล้วปิดเมื่อจบ)
npm test -- tests/rules.spec.js     # รันไฟล์เดียว
npm test -- -g "Reject"             # รันเฉพาะเทสต์ที่ชื่อมีคำว่า Reject
npm run test:headed         # เห็นเบราว์เซอร์ขณะรัน
npm run report              # เปิดรายงาน HTML ของรอบล่าสุด (มี screenshot/trace ของเทสต์ที่ fail)
```

ถ้าจะรันซ้ำบ่อยๆ ให้เปิด emulator ค้างไว้อีกหน้าต่าง (เทสต์จะใช้ตัวที่เปิดอยู่แทน เร็วกว่า):

```powershell
firebase emulators:start --only auth,firestore,hosting --project demo-callsaleng
```

## รันอัตโนมัติบน GitHub (CI)

[.github/workflows/e2e.yml](../.github/workflows/e2e.yml) รันเทสต์ทั้งหมดให้เองทุกครั้งที่ push เข้า `main` และทุก Pull Request
(หรือกดรันเองได้ที่แท็บ Actions → e2e → Run workflow) — ใช้ emulator บนเครื่องของ GitHub ไม่ต้องตั้ง secret ใดๆ
ถ้า fail ให้ดาวน์โหลด artifact `playwright-report` จากหน้าผลรัน แล้วเปิด `playwright-report/index.html` ดู screenshot/trace

## ทำงานยังไง

- `webapp/firebase-config.js` สลับไปใช้ emulator **เฉพาะเมื่อเปิดผ่าน `127.0.0.1:5050`** (พอร์ตของ Hosting emulator)
  และเปลี่ยน projectId เป็น `demo-callsaleng` — Firebase รับประกันว่า project `demo-*` ไม่มีทางต่อ resource จริง
  การเปิดแบบอื่น (`file://`, `serve.ps1`, production) ไม่ได้รับผลกระทบ
- `lib/emulator.js` — ล้างข้อมูล / สร้างบัญชี / อ่าน-เขียน Firestore ผ่าน REST ของ emulator
- `lib/seed.js` — ข้อมูลตั้งต้นของทุกเทสต์ (password ทุกบัญชี: `Test1234!` เฉพาะใน emulator)

| บัญชี | login | หมายเหตุ |
|---|---|---|
| ลูกค้า A | 0891234567 | ที่อยู่ตำบลเวียง |
| ลูกค้า B | 0823456789 | ที่อยู่ตำบลรอบเวียง |
| Admin | admin1 | |
| ซาเล้ง S1 | 0811111111 | อนุมัติแล้ว · เวียง, รอบเวียง |
| ซาเล้ง S2 | 0822222222 | อนุมัติแล้ว · แม่ยาว |
| ซาเล้ง PENDING | 0833333333 | รออนุมัติ |
| ซาเล้ง SUSPENDED | 0844444444 | ถูกระงับ |

## ไฟล์เทสต์

| ไฟล์ | ครอบคลุม |
|---|---|
| `tests/user.spec.js` | สมัคร, login, บัญชีถูกระงับ, auth guard ทุกหน้า, สร้างคำขอ (validation + แนบรูป), ติดตาม, แก้ไข/ลบ, ที่อยู่ในโปรไฟล์ |
| `tests/admin.spec.js` | admin login, Confirm, Reject (ต้องมีเหตุผล), แก้วัน-เวลานัด, แชทกับลูกค้า |
| `tests/saleng.spec.js` | สมัครซาเล้ง → อนุมัติ/ไม่อนุมัติ/ระงับ (real-time), งานตามตำบล, โควตา 3/รอบ และ 6 งานค้าง, รับงานเอง → ยืนยัน → ปิดงาน, Admin มอบหมาย → ตอบรับ/ปฏิเสธ, ยกเลิกการจับคู่, แชทกับซาเล้ง |
| `tests/rules.spec.js` | Security rules: ข้อมูลข้ามบัญชี, ปลอมเป็น admin, ข้ามสถานะ, ซาเล้งที่ไม่อนุมัติ, อนุมัติตัวเอง ฯลฯ |

`legacy-production/` — ชุดเทสต์เก่าที่ยิง production (callsaleng.web.app) เก็บไว้อ้างอิง ไม่ถูกรันแล้ว
