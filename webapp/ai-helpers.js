// ตัวช่วยเรียก OpenRouter — ใช้ร่วมกันทุกหน้าที่ต้องการ AI (ต้อง include ai-config.js ก่อนไฟล์นี้)
async function askAI(systemPrompt, userContent) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${window.OPENROUTER_CONFIG.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: window.OPENROUTER_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "(ไม่มีคำตอบ)";
}
