import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  renderOtpEmail,
  renderWelcomeEmail,
  renderLoginAlertEmail,
  renderAccountDeletedEmail,
  renderSubscriptionPurchasedEmail,
  renderSubscriptionCancelledEmail,
  renderPortfolioUpdatedEmail,
  renderAdminContactNotificationEmail,
  renderUserContactConfirmationEmail,
} from "../src/mail/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, "../email-previews");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const emailSamples = [
  {
    id: "auth-otp",
    name: "1. Auth: One-Time Password (OTP)",
    category: "Authentication",
    html: renderOtpEmail("482910", "sign-in", 10),
  },
  {
    id: "auth-welcome",
    name: "2. Auth: Welcome Email",
    category: "Authentication",
    html: renderWelcomeEmail("Alex Morgan", "https://veriworkly.com/dashboard"),
  },
  {
    id: "auth-login-alert",
    name: "3. Auth: New Login Alert",
    category: "Authentication",
    html: renderLoginEmailSample(),
  },
  {
    id: "auth-account-deleted",
    name: "4. Auth: Account Deleted",
    category: "Authentication",
    html: renderAccountDeletedEmail("Alex Morgan"),
  },
  {
    id: "billing-subscription-purchased",
    name: "5. Billing: Subscription Purchased",
    category: "Billing",
    html: renderSubscriptionPurchasedEmail("Alex Morgan", "Pro Lifetime"),
  },
  {
    id: "billing-subscription-cancelled",
    name: "6. Billing: Subscription Cancelled",
    category: "Billing",
    html: renderSubscriptionCancelledEmail("Alex Morgan"),
  },
  {
    id: "portfolio-updated",
    name: "7. Portfolio: Portfolio Published Live",
    category: "Portfolio",
    html: renderPortfolioUpdatedEmail("https://veriworkly.com/p/alex-morgan"),
  },
  {
    id: "contact-admin-notification",
    name: "8. General: Contact Form Admin Alert",
    category: "Contact & Support",
    html: renderAdminContactNotificationEmail({
      name: "Sarah Jenkins",
      email: "sarah.j@example.com",
      subject: "Partnership & Enterprise Inquiry",
      message:
        "Hi VeriWorkly team,\n\nWe love your verified resume builder. We'd like to explore integrating VeriWorkly for our 300+ engineering candidates. Could we schedule a demo call this week?",
      receivedAt: new Date().toUTCString(),
    }),
  },
  {
    id: "contact-user-confirmation",
    name: "9. General: Contact Auto-Confirmation Receipt",
    category: "Contact & Support",
    html: renderUserContactConfirmationEmail({
      name: "Sarah Jenkins",
      subject: "Partnership & Enterprise Inquiry",
      message:
        "Hi VeriWorkly team,\n\nWe love your verified resume builder. We'd like to explore integrating VeriWorkly for our 300+ engineering candidates. Could we schedule a demo call this week?",
    }),
  },
];

function renderLoginEmailSample() {
  return renderLoginAlertEmail("alex.morgan@example.com", {
    device: "Chrome 122 on macOS (Apple Silicon)",
    ip: "192.0.2.42",
    provider: "github",
    location: "San Francisco, CA, United States",
    timestamp: new Date().toUTCString(),
  });
}

// 1. Write individual HTML files
for (const sample of emailSamples) {
  const filePath = path.join(outputDir, `${sample.id}.html`);
  fs.writeFileSync(filePath, sample.html, "utf8");
}

// 2. Write an interactive Gallery Previewer HTML file
const galleryHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VeriWorkly — Email Templates Previewer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #0c0f17;
      color: #f1f5f9;
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    
    /* Sidebar */
    .sidebar {
      width: 320px;
      background: #111622;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .brand {
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .brand-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .brand h1 {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .brand p {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .template-list {
      list-style: none;
      padding: 12px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .category-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      padding: 12px 8px 4px 8px;
    }
    .template-btn {
      width: 100%;
      text-align: left;
      background: transparent;
      border: 1px solid transparent;
      padding: 10px 12px;
      border-radius: 8px;
      color: #cbd5e1;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .template-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #ffffff;
    }
    .template-btn.active {
      background: #2563eb;
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }

    /* Main Area */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #090c13;
      overflow: hidden;
    }
    .toolbar {
      height: 56px;
      background: #111622;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }
    .current-title {
      font-size: 14px;
      font-weight: 600;
      color: #f8fafc;
    }
    .viewport-controls {
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      padding: 3px;
      border-radius: 8px;
    }
    .vp-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .vp-btn.active {
      background: #1e293b;
      color: #38bdf8;
    }
    .preview-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: auto;
      background: radial-gradient(circle at center, #171d2c 0%, #090c13 100%);
    }
    .iframe-wrapper {
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%;
      max-width: 680px;
      height: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
    }
    .iframe-wrapper.mobile {
      max-width: 390px;
      border-radius: 36px;
      box-shadow: 0 0 0 12px #1f293d, 0 30px 80px rgba(0, 0, 0, 0.8);
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #f5f4ef;
    }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-badge">HTML Previewer</span>
      <h1>VeriWorkly Emails</h1>
      <p>9 autogenerated email templates</p>
    </div>
    <div class="template-list" id="templateList"></div>
  </aside>

  <main class="main">
    <header class="toolbar">
      <div class="current-title" id="currentTitle">Template Preview</div>
      <div class="viewport-controls">
        <button class="vp-btn active" id="btnDesktop" onclick="setViewport('desktop')">Desktop (680px)</button>
        <button class="vp-btn" id="btnMobile" onclick="setViewport('mobile')">Mobile (390px)</button>
      </div>
    </header>

    <div class="preview-container">
      <div class="iframe-wrapper" id="iframeWrapper">
        <iframe id="previewIframe" src="${emailSamples[0].id}.html"></iframe>
      </div>
    </div>
  </main>

  <script>
    const templates = ${JSON.stringify(emailSamples.map((s) => ({ id: s.id, name: s.name, category: s.category })))};
    let activeId = templates[0].id;

    function renderList() {
      const list = document.getElementById("templateList");
      list.innerHTML = "";
      
      let lastCategory = "";
      templates.forEach(t => {
        if (t.category !== lastCategory) {
          const cat = document.createElement("div");
          cat.className = "category-title";
          cat.textContent = t.category;
          list.appendChild(cat);
          lastCategory = t.category;
        }

        const btn = document.createElement("button");
        btn.className = "template-btn " + (t.id === activeId ? "active" : "");
        btn.textContent = t.name;
        btn.onclick = () => selectTemplate(t.id, t.name);
        list.appendChild(btn);
      });
    }

    function selectTemplate(id, name) {
      activeId = id;
      document.getElementById("previewIframe").src = id + ".html";
      document.getElementById("currentTitle").textContent = name;
      renderList();
    }

    function setViewport(mode) {
      const wrapper = document.getElementById("iframeWrapper");
      const btnDesktop = document.getElementById("btnDesktop");
      const btnMobile = document.getElementById("btnMobile");

      if (mode === "mobile") {
        wrapper.classList.add("mobile");
        btnMobile.classList.add("active");
        btnDesktop.classList.remove("active");
      } else {
        wrapper.classList.remove("mobile");
        btnDesktop.classList.add("active");
        btnMobile.classList.remove("active");
      }
    }

    document.getElementById("currentTitle").textContent = templates[0].name;
    renderList();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, "index.html"), galleryHtml, "utf8");

console.log(`Successfully generated ${emailSamples.length} email templates in: ${outputDir}`);
console.log(`Open: ${path.join(outputDir, "index.html")} in your browser to preview!`);
