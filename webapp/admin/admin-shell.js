// แถบหัวของหน้า admin (ใช้ร่วมกันระหว่าง admin/dashboard และ admin/banners) — คู่กับ admin-shell.css
// renderAdminHeader({ active: "requests" | "salengs" | "banners", name, onAiSettings, onLogout })
// onAiSettings ไม่ส่งมา = ไม่แสดงปุ่มตั้งค่า AI (หน้าที่ไม่มีปุ่ม AI)

function renderAdminHeader({ active, name, onAiSettings, onLogout }) {
  const header = document.getElementById("adminHeader");
  const navItem = (key, href, icon, label) =>
    `<a class="admin-nav-item${key === active ? " active" : ""}" href="${href}"${key === active ? ' aria-current="page"' : ""}><span aria-hidden="true">${icon}</span>${label}</a>`;
  const initial = (name || "A").trim().charAt(0);

  header.innerHTML = `
    <div class="admin-header-inner">
      <a class="admin-brand" href="../dashboard/index.html">
        <img src="../../assets/logo.png" alt="" class="admin-brand-logo">
        <span class="admin-brand-name">กรีนซาเล้ง</span>
        <span class="admin-brand-tag">Admin</span>
      </a>
      <nav class="admin-nav" aria-label="เมนู admin">
        ${navItem("requests", "../dashboard/index.html", "📋", "คำขอ")}
        ${navItem("salengs", "../salengs/index.html", "🛺", "ซาเล้ง")}
        ${navItem("banners", "../banners/index.html", "🖼️", "Banner")}
      </nav>
      <div class="admin-account">
        ${onAiSettings ? '<button type="button" class="admin-icon-btn" id="adminAiSettingsBtn" title="ตั้งค่า AI" aria-label="ตั้งค่า AI">⚙️<span class="admin-icon-btn-label">ตั้งค่า AI</span></button>' : ""}
        <div class="admin-user" title="${escapeHtmlAttr(name)}">
          <span class="admin-avatar" aria-hidden="true">${escapeHtmlAttr(initial)}</span>
          <span class="admin-user-name">${escapeHtmlAttr(name)}</span>
        </div>
        <button type="button" class="admin-logout" id="adminLogoutBtn">ออกจากระบบ</button>
      </div>
    </div>
  `;

  if (onAiSettings) document.getElementById("adminAiSettingsBtn").addEventListener("click", onAiSettings);
  document.getElementById("adminLogoutBtn").addEventListener("click", onLogout);
}

function escapeHtmlAttr(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML.replace(/"/g, "&quot;");
}
