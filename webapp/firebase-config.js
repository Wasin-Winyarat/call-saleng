// Firebase init ใช้ร่วมกันทั้ง webapp (modular SDK v10, โหลดผ่าน CDN — ไม่ต้องมี npm/build step)
// อ้างอิง field/table names จาก docs/02-design/02-technical/database-schema.md

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// apiKey ของ Firebase web app ไม่ใช่ secret (ความปลอดภัยจริงบังคับที่ Firestore/Storage Security Rules)
// จึงฝังในโค้ด client ได้ตามปกติ — ดู README ส่วน "ตั้งค่า Firebase Console" ก่อนใช้งานจริง
const firebaseConfig = {
  apiKey: "AIzaSyA9YFXYAe6DAjtdnkkIstFj7s2ZHV5RXhI",
  authDomain: "callsaleng.firebaseapp.com",
  projectId: "callsaleng",
  storageBucket: "callsaleng.firebasestorage.app",
  messagingSenderId: "14017034334",
  appId: "1:14017034334:web:68d7e78cf9fb87f068dccf",
  measurementId: "G-T09RBKNFTR",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
