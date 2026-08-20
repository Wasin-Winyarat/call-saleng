# Design System — Green Saleng

Design system กลางของโปรเจกต์ Call-Saleng ใช้เป็น reference เดียวสำหรับทุกหน้าจอ prototype ที่จะสร้างในโฟลเดอร์นี้ (`v{N}/`) โทนหลักคือ **เขียว pastel + minimalist + muji** — สงบ อบอุ่น เป็นมิตรกับสิ่งแวดล้อม ไม่เล่นสีจัดจ้าน เน้นพื้นที่ว่างและความเรียบง่ายมากกว่าการตกแต่ง

## Brand Identity & CI

- **ชื่อแบรนด์:** กรีนซาเล้ง (Green Saleng)
- **Tagline:** "บริการเก็บขยะรีไซเคิล — อนุรักษ์สิ่งแวดล้อม ชุมชนสะอาด"
- **โลโก้:** ตราวงกลม ล้อมกรอบลายใบไม้/ลูกศรรีไซเคิล ตรงกลางเป็น mascot สาเล้ง (คนขับใส่หมวก + แมสก์สีเขียว) ขับมอเตอร์ไซค์พ่วงข้างบรรทุกถุงขยะรีไซเคิล (ขวดพลาสติก, กระป๋อง, กล่องกระดาษ) ตัวอักษร "กรีนซาเล้ง / GREEN SALENG" สีกรมท่า-เขียวเข้มด้านบน
- **บุคลิกแบรนด์:** อบอุ่น น่าเชื่อถือ เป็นมิตร เน้นสิ่งแวดล้อมและชุมชน ไม่ formal/corporate จนดูเย็นชา และไม่ playful จัดจ้านจนดูไม่น่าเชื่อถือ
- **ไฟล์โลโก้จริง:** ยังไม่ได้นำเข้า vault — ดู [[#Open Questions|Open Questions]] ท้ายไฟล์

## Design Tokens

### Colors

พื้นหลังหลักของแอปเป็นโทนครีม/ออฟไวท์แบบ muji ไม่ใช่ขาวจัด ส่วนสีพาสเทลใช้เป็น background tint ของ icon badge/card เท่านั้น ไม่ใช้เป็นพื้นหลังเต็มจอ

| Token | Hex | ใช้กับ |
| --- | --- | --- |
| `--color-primary-700` | `#1F5C3D` | เฉดเข้มของ gradient hero/status card |
| `--color-primary-600` | `#2F7A4D` | สีหลักของแบรนด์ — ปุ่ม CTA หลัก, active state ของ bottom nav, ไอคอนบนโลโก้ |
| `--color-primary-100` | `#DCEEE1` | พื้นหลัง badge/section โทนเขียวอ่อน (เช่น icon "ขายขยะ") |
| `--color-accent-blue-100` | `#E3F0FB` | พื้นหลัง badge quick-link "บันทึกที่อยู่" |
| `--color-accent-peach-100` | `#FDE9D9` | พื้นหลัง badge quick-link "ราคาขยะ", พื้นหลัง promo banner |
| `--color-accent-amber-500` | `#E8A33D` | สถานะ "กำลังดำเนินการ" (in-progress) |
| `--color-success-600` | `#2F7A4D` | สถานะ "สำเร็จ/เสร็จสิ้น" (ใช้ค่าเดียวกับ primary-600) |
| `--color-neutral-bg` | `#FAF9F6` | พื้นหลังหน้าจอทั้งหมด (โทนครีมแบบ muji) |
| `--color-neutral-card` | `#FFFFFF` | พื้นหลัง card/component ทุกชนิด |
| `--color-neutral-300` | `#E5E4DF` | เส้นขอบบาง, เส้นแบ่ง, สถานะ "รอดำเนินการ" (pending) |
| `--color-text-primary` | `#2B2E2C` | ข้อความหลัก, หัวข้อ |
| `--color-text-secondary` | `#7A7F7A` | ข้อความรอง, hint, timestamp |
| `--color-danger` | `#D97757` | ยกเลิก/error — ใช้โทน terracotta ไม่ใช่แดงจัด ให้เข้ากับธีมธรรมชาติ |

**กฎการใช้สี:** ห้ามใช้สีเป็นตัวสื่อความหมายเพียงอย่างเดียว (เช่น สถานะ) ต้องมี icon หรือข้อความกำกับคู่กันเสมอ เพื่อ accessibility

### Typography

- **ฟอนต์หลัก:** Noto Sans Thai (fallback: `system-ui, sans-serif`) — อ่านง่ายทั้งไทย/อังกฤษ ไม่มีหัวจรดเยิ่นเย้อแบบฟอนต์ตกแต่ง
- **Scale:**
  | ระดับ | ขนาด | น้ำหนัก | ใช้กับ |
  | --- | --- | --- | --- |
  | H1 | 24px | Bold | หัวข้อหลักของหน้า (เช่น "สถานะการเข้ารับ") |
  | H2 | 20px | Semibold | หัวข้อ section |
  | H3 | 18px | Semibold | ชื่อ card สำคัญ (เช่น "ขายขยะ") |
  | Body | 16px | Regular | เนื้อหาทั่วไป, label ปุ่ม |
  | Body Small | 14px | Regular | รายละเอียดรอง, meta text |
  | Caption | 12–13px | Regular, `--color-text-secondary` | hint, timestamp, helper text |
- **Line-height:** 1.5 สำหรับทุกระดับ เพื่อความอ่านง่ายของภาษาไทย

### Spacing

Scale แบบ 4px base: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40` px
Padding มาตรฐานของ card/section คือ `16px`–`20px`, ระยะห่างระหว่าง section หลักคือ `24px`

### Radius

| Token | ค่า | ใช้กับ |
| --- | --- | --- |
| `--radius-sm` | 8px | chip, badge เล็ก |
| `--radius-md` | 16px | card ทั่วไป, input, textarea |
| `--radius-lg` | 20–24px | ปุ่ม CTA หลัก, hero/status card |
| `--radius-full` | pill | status pill, ปุ่มกลม (โทร, avatar) |

## UI Components & Patterns

| Component | ลักษณะ | ตัวอย่างการใช้ |
| --- | --- | --- |
| App bar ทักทาย | avatar วงกลม + ข้อความสวัสดี + ชื่อผู้ใช้ + ไอคอนกระดิ่งแจ้งเตือนขวาบน | หน้าแรก |
| Promo banner | card ขนาดใหญ่ พื้นหลัง gradient พาสเทล (ส้ม/เหลือง) มี pagination dots ด้านล่าง | หน้าแรก |
| ปุ่ม CTA หลักแบบการ์ด | card เต็มความกว้าง สีเขียว `--color-primary-600` มี icon badge วงกลมสีขาวด้านซ้าย, label, chevron ขวา | "ขายขยะ / เรียกรถซาเล้งมารับที่บ้าน" |
| Quick-link card คู่ | card เล็ก 2 อันเรียงแนวนอน icon badge พื้นหลังพาสเทลต่างสีตามความหมาย + label + meta text | "บันทึกที่อยู่", "ราคาขยะ" |
| Section header + ดูทั้งหมด | H2 ทางซ้าย, ลิงก์ "ดูทั้งหมด" สีเขียวทางขวา | "รายการที่กำลังดำเนินการ" |
| List / job card | icon กล่องซ้าย, title + meta text, status pill ขวา, chevron | รายการคำขอที่กำลังดำเนินการ |
| Bottom tab bar | 4 รายการ (หน้าแรก/ติดตาม/ราคา/โปรไฟล์) active = icon+label สีเขียว, inactive = เทา | ทุกหน้าหลัก |
| Selectable choice card | grid 2 คอลัมน์ icon + label + subtext + checkbox มุมขวาบน border/พื้นหลัง tint เมื่อเลือก | เลือกประเภทขยะ (เลือกได้หลายอย่าง) |
| Textarea | input หลายบรรทัด มี placeholder ตัวอย่างข้อความ | "ขยะเพิ่มเติม / รายละเอียดอื่นๆ" |
| Photo upload grid | thumbnail สี่เหลี่ยมมุมโค้ง + ปุ่มลบวงกลมมุมขวาบน, ปุ่มเพิ่มรูปเส้นประ, ตัวนับ x/5, helper text บอก limit ใต้ grid | อัปโหลดรูปขยะ |
| Header ย้อนกลับ | back chevron ซ้าย + title + subtitle | "สถานะการเข้ารับ / คำขอ #SL-2607" |
| Status hero card | card gradient เขียวเข้ม มุมโค้งมาก แสดงสถานะปัจจุบัน + วันเวลานัดหมาย มี decorative circle ลายพื้นหลังจางๆ | ด้านบนหน้าสถานะ |
| Vertical timeline stepper | เส้นตั้งเชื่อมจุดสถานะ: done = วงกลมเขียว+เครื่องหมายถูก, active = จุดส้ม, pending = วงกลมเทากลวง แต่ละจุดมี label + timestamp | รายการขั้นตอนสถานะงาน |
| Contact card | avatar วงกลม + ชื่อ + เรตติ้ง/ระยะทาง + ปุ่มโทรวงกลมสีเขียวขวาสุด | ข้อมูลติดต่อสาเล้ง/user |
| Message/chat preview card | หัวข้อ "ข้อความ" + ลิงก์ "ดูทั้งหมด", message bubble + tag แจ้งเตือนพื้นหลังพาสเทล | preview แชทล่าสุด |

## UX Guidelines & Rules

1. **Muji-minimalist เสมอ** — 1 primary action ต่อหน้าจอ, หลีกเลี่ยง shadow/border หนักๆ, ใช้ whitespace แบ่ง section แทนเส้นคั่น
2. **สถานะต้องสื่อด้วย icon/ข้อความคู่กับสีเสมอ** — ห้ามใช้สีอย่างเดียวสื่อความหมาย (เขียว = สำเร็จ/หลัก, ส้ม = กำลังดำเนินการ, เทา = รอดำเนินการ, terracotta = ยกเลิก/error)
3. **Touch target ≥44px** — persona มีทั้งวัยทำงานและผู้สูงอายุ (เช่น สาเล้งที่เป็นผู้สูงวัย) ปุ่มและ tap target ต้องใหญ่พอ กดง่าย
4. **Icon ต้องมี label กำกับเสมอ** — ไม่ใช้ icon ล้วนโดยไม่มีข้อความอธิบาย ยกเว้นปุ่มที่เป็น convention สากลชัดเจนมาก (เช่น ปุ่มโทร, ปุ่มปิด X)
5. **Navigation pattern** — หน้าหลัก (หน้าแรก, ติดตาม, ราคา, โปรไฟล์) ใช้ bottom tab bar คงที่; หน้าที่เป็น flow ย่อย/โฟกัสงานเดียว (สร้างคำขอ, ดูรายละเอียดสถานะ) ใช้ header แบบย้อนกลับ (back chevron) แทน ไม่โชว์ bottom tab bar ซ้อน
6. **ฟอร์มแบ่งเป็น section ชัดเจน** — มี hint/helper text บอกข้อจำกัดใต้ input ที่มี limit เสมอ (เช่น "อัปโหลดได้สูงสุด 5 รูป · ถ่ายให้เห็นกองขยะชัดเจน")
7. **รูปแบบวันที่แบบไทย** — ใช้ปี พ.ศ. แบบย่อ เช่น "27 ก.ค. 2569" ไม่ใช้ ค.ศ. หรือรูปแบบสากล
8. **Action ที่ย้อนกลับไม่ได้ต้อง confirm ก่อนเสมอ** — เช่น ยกเลิกคำขอ/ยกเลิกงาน ต้องมี dialog ยืนยันก่อนดำเนินการจริง
9. **Contrast ต้องผ่าน AA** — ข้อความบนพื้นหลังพาสเทล (badge, banner) ต้องเช็ค contrast ratio ให้อ่านง่าย ไม่ใช้ตัวอักษรสีอ่อนไปกว่า `--color-text-secondary` บนพื้นสี tint

## Open Questions

- ยังไม่มีไฟล์โลโก้จริง (`.png`/`.svg`) อยู่ใน vault — เมื่อมีไฟล์ต้นฉบับ ให้นำไปวางที่ `docs/02-design/01-prototypes/assets/logo-green-saleng.png` แล้วอ้างอิงจากไฟล์นี้และ prototype อื่นๆ ต่อไป
- ค่าสี hex ที่ระบุในไฟล์นี้ประมาณจากภาพตัวอย่างหน้าตา (reference mockup) ที่ผู้ใช้ให้มา ยังไม่ผ่านการเทียบกับ brand guideline ที่เป็นทางการ — หากมี brand guideline ฉบับจริงในอนาคต ให้ปรับค่าตรงนี้ตาม

## Reference

- [[index|01-prototypes]]
- [[../../01-requirements/feature-list|feature-list]]
