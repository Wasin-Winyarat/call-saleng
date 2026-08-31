// ราคาตัวอย่าง (mockup) — ไม่เชื่อม Firestore ตามที่ตกลงไว้
const PRICE_CATEGORIES = [
  {
    name: "เศษเหล็ก",
    icon: "🔧",
    items: [
      { name: "เหล็กรวม", price: 4.2, trend: "flat" },
      { name: "กระป๋องสังกะสี", price: 3.1, trend: "flat" },
      { name: "สังกะสีแผ่น", price: 2.5, trend: "flat" },
      { name: "เหล็กโช๊ค", price: 1.7, trend: "flat" },
      { name: "เหล็กขี้กลึง, ลวดยุ่ง", price: 1.3, trend: "flat" },
    ],
  },
  {
    name: "โลหะ",
    icon: "🥫",
    items: [
      { name: "ทองแดง เบอร์ 1", price: 312.5, trend: "flat" },
      { name: "ทองแดง เบอร์ 2", price: 302.9, trend: "flat" },
      { name: "อลูมิเนียมกระป๋อง", price: 44.9, trend: "flat" },
      { name: "อลูมิเนียมหนา", price: 37.7, trend: "flat" },
      { name: "ทองเหลืองหนา", price: 190.9, trend: "flat" },
    ],
  },
  {
    name: "กระดาษ",
    icon: "📦",
    items: [
      { name: "กระดาษลังน้ำตาล (ลูกฟูก)", price: 2.7, trend: "flat" },
      { name: "กระดาษขาวดำ", price: 4.9, trend: "flat" },
      { name: "กระดาษย่อย / เล่ม", price: 1.8, trend: "flat" },
      { name: "กล่องนม", price: 4.8, trend: "down" },
    ],
  },
  {
    name: "พลาสติก / น้ำมัน",
    icon: "🧴",
    items: [
      { name: "ขวดน้ำ PET ใส", price: 6.5, trend: "up" },
      { name: "ขวดพลาสติกขุ่น (HDPE)", price: 5.0, trend: "flat" },
      { name: "น้ำมันพืชใช้แล้ว", price: 8.0, trend: "flat" },
    ],
  },
];

const TREND_LABEL = {
  flat: "➖ คงที่",
  up: "🔺 เพิ่มขึ้น",
  down: "🔻 ลดลง",
};

const priceList = document.getElementById("priceList");

PRICE_CATEGORIES.forEach((category) => {
  const section = document.createElement("div");
  section.className = "price-category";

  const header = document.createElement("div");
  header.className = "price-category-header";
  header.innerHTML = `
    <div class="price-category-icon">${category.icon}</div>
    <div class="price-category-title">ประเภท${category.name}</div>
  `;

  const table = document.createElement("div");
  table.className = "price-table";
  category.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "price-row";
    row.innerHTML = `
      <div class="price-row-name">${item.name}</div>
      <div class="price-row-value">${item.price.toFixed(1)} บาท/กก.</div>
      <div class="price-row-trend ${item.trend}">${TREND_LABEL[item.trend]}</div>
    `;
    table.appendChild(row);
  });

  section.appendChild(header);
  section.appendChild(table);
  priceList.appendChild(section);
});

const note = document.createElement("div");
note.className = "price-note";
note.textContent = "ราคาจริงตกลงกันหน้างานเป็นเงินสด ระบบไม่มีส่วนเกี่ยวข้องกับการกำหนดราคานี้";
priceList.appendChild(note);
