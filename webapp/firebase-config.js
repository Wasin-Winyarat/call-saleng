// Firebase init ใช้ร่วมกันทั้ง webapp — ใช้ "compat" SDK (global <script> ธรรมดา ไม่ใช่ ES module)
// เพื่อให้เปิดไฟล์ .html ตรงๆ แบบ file:// ได้เลย ไม่ต้องรัน local server
// (ES module ที่เคยใช้ก่อนหน้านี้ถูกเบราว์เซอร์บล็อกด้วย CORS เมื่อเปิดผ่าน file://)
// ต้อง include compat script อย่างน้อย app/auth/firestore ก่อนไฟล์นี้เสมอ ดูตัวอย่างใน index.html ของแต่ละหน้า
// (storage-compat จำเป็นเฉพาะหน้าที่อัปโหลดไฟล์ เช่น pickup-request — เรียก firebase.storage() ตรงจุดที่ใช้เองแทน
// เพื่อไม่ให้หน้าอื่นพังถ้าลืม include สคริปต์นั้น)
// อ้างอิง field/table names จาก docs/02-design/02-technical/database-schema.md

// apiKey ของ Firebase web app ไม่ใช่ secret (ความปลอดภัยจริงบังคับที่ Firestore/Storage Security Rules)
// จึงฝังในโค้ด client ได้ตามปกติ
const firebaseConfig = {
  apiKey: "AIzaSyA9YFXYAe6DAjtdnkkIstFj7s2ZHV5RXhI",
  authDomain: "callsaleng.firebaseapp.com",
  projectId: "callsaleng",
  storageBucket: "callsaleng.firebasestorage.app",
  messagingSenderId: "14017034334",
  appId: "1:14017034334:web:68d7e78cf9fb87f068dccf",
  measurementId: "G-T09RBKNFTR",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
