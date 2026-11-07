// ย่อ/บีบอัดรูปเป็น JPEG base64 data URL ใน browser — ใช้ร่วมกันระหว่างรูปถ่ายขยะ (request_photos)
// และ banner ประชาสัมพันธ์ (ad_banners) ซึ่งเก็บรูปลง Firestore ตรงๆ แทน Firebase Storage
// doc ของ Firestore จำกัด 1 MiB จึงบีบให้ data URL ยาวไม่เกิน MAX_IMAGE_DATA_LENGTH (~500KB ไฟล์จริง)

const MAX_IMAGE_DATA_LENGTH = 700000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// image_data ถูกใส่ลง src ตรงๆ ตอนแสดงผล จึงรับเฉพาะ JPEG base64 ล้วน (กันค่าแปลกปลอมที่มี quote/HTML)
const SAFE_IMAGE_DATA = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

// ย่อด้านยาวสุดเหลือ 1280px แล้วลด quality/ขนาดลงเรื่อยๆ จนกว่า data URL จะไม่เกิน MAX_IMAGE_DATA_LENGTH
async function compressImage(file) {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let maxSide = 1280;
  let quality = 0.82;

  while (true) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    ctx.fillStyle = "#fff"; // PNG โปร่งใส → พื้นขาวแทนพื้นดำตอนแปลงเป็น JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_IMAGE_DATA_LENGTH || maxSide <= 320) return dataUrl;

    if (quality > 0.5) quality -= 0.1;
    else maxSide = Math.round(maxSide * 0.75);
  }
}
