// ตัวช่วยเรียก OpenRouter — ใช้ร่วมกันทุกหน้าที่ต้องการ AI
// API key มาจาก 2 ทาง (ห้ามฝัง key ในไฟล์ที่ deploy/commit):
//   1) ai-config.js (window.OPENROUTER_CONFIG) — ใช้ตอนรันในเครื่อง ไฟล์นี้อยู่ใน .gitignore และไม่ถูก deploy ขึ้น Hosting
//   2) localStorage ของ browser admin — บนเว็บจริง admin วาง key เองครั้งเดียวผ่านปุ่ม "ตั้งค่า AI" (เก็บเฉพาะเครื่องนั้น)

const AI_KEY_STORAGE = "greensaleng_openrouter_key";
const AI_DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

function getAiConfig() {
  const fileConfig = window.OPENROUTER_CONFIG;
  if (fileConfig && fileConfig.apiKey && !fileConfig.apiKey.startsWith("YOUR_")) {
    return { apiKey: fileConfig.apiKey, model: fileConfig.model || AI_DEFAULT_MODEL, source: "file" };
  }
  let storedKey = null;
  try {
    storedKey = localStorage.getItem(AI_KEY_STORAGE);
  } catch (err) {
    // localStorage ใช้ไม่ได้ — ถือว่ายังไม่ได้ตั้งค่า
  }
  return { apiKey: storedKey, model: AI_DEFAULT_MODEL, source: storedKey ? "browser" : null };
}

function saveAiKey(key) {
  try {
    if (key) localStorage.setItem(AI_KEY_STORAGE, key);
    else localStorage.removeItem(AI_KEY_STORAGE);
    return true;
  } catch (err) {
    return false;
  }
}

async function askAI(systemPrompt, userContent) {
  const config = getAiConfig();
  if (!config.apiKey) {
    throw new Error('ยังไม่ได้ตั้งค่า API key ของ AI — กด "⚙️ ตั้งค่า AI" ที่มุมขวาบนก่อน');
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) throw new Error('API key ไม่ถูกต้องหรือหมดอายุ — กด "⚙️ ตั้งค่า AI" เพื่อใส่ key ใหม่');
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "(ไม่มีคำตอบ)";
}
