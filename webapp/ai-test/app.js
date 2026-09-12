const sendBtn = document.getElementById("sendBtn");
const resultEl = document.getElementById("result");

sendBtn.addEventListener("click", async () => {
  sendBtn.disabled = true;
  resultEl.textContent = "กำลังส่ง...";

  try {
    resultEl.textContent = await askAI("คุณเป็นผู้ช่วยที่เป็นมิตร", "สวัสดี");
  } catch (err) {
    resultEl.textContent = `เกิดข้อผิดพลาด: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
  }
});
