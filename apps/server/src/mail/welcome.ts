import { getBaseLayout, escapeHtml } from "./layout";

export function renderWelcomeEmail(name: string, dashboardUrl: string): string {
  const sanitizedName = escapeHtml(name || "there");
  const title = "Welcome to VeriWorkly";
  const preheader =
    "Welcome to VeriWorkly! Start building your professional documents and portfolio today.";

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      Welcome to VeriWorkly, ${sanitizedName}!
    </h2>
    <p style="margin:0 auto 28px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:460px;">
      We're thrilled to have you. VeriWorkly is designed to help you construct pristine, ATS-optimized resumes and publish premium developer portfolios.
    </p>

    <!-- Visual Interactive Resume Grid Mockup (Unique, modern out-of-the-box element) -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;background-color:#faf9f5;border:1px solid rgba(23, 23, 23, 0.06);border-radius:16px;padding:24px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
      <tr>
        <td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="70%" valign="top">
                <div style="height:12px;width:120px;background-color:#2563eb;border-radius:2px;margin-bottom:8px;"></div>
                <div style="height:6px;width:80px;background-color:#5f5c54;opacity:0.3;border-radius:2px;"></div>
              </td>
              <td width="30%" valign="top" align="right">
                <div style="height:6px;width:50px;background-color:#5f5c54;opacity:0.2;border-radius:2px;margin-bottom:4px;"></div>
                <div style="height:6px;width:70px;background-color:#5f5c54;opacity:0.2;border-radius:2px;"></div>
              </td>
            </tr>
          </table>
          <div style="height:1px;background-color:rgba(23, 23, 23, 0.08);margin:16px 0;"></div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td valign="top" style="padding-bottom:8px;">
                <div style="height:8px;width:100px;background-color:#171717;border-radius:2px;margin-bottom:6px;"></div>
                <div style="height:5px;width:100%;background-color:#5f5c54;opacity:0.2;border-radius:2px;margin-bottom:4px;"></div>
                <div style="height:5px;width:90%;background-color:#5f5c54;opacity:0.2;border-radius:2px;"></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Feature Checklist (Centered container block, left-aligned bullet items) -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px auto;max-width:440px;">
      <tr>
        <td style="padding-bottom:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="28" valign="top" style="font-size:14px;line-height:1.5;color:#2563eb;font-weight:bold;">✦</td>
              <td valign="top" style="font-size:14px;line-height:1.5;color:#5f5c54;">
                <strong style="color:#171717;display:block;margin-bottom:2px;">Privacy-First Editor</strong>
                Control your profile, import GitHub data, and keep complete ownership of your details.
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="28" valign="top" style="font-size:14px;line-height:1.5;color:#2563eb;font-weight:bold;">✦</td>
              <td valign="top" style="font-size:14px;line-height:1.5;color:#5f5c54;">
                <strong style="color:#171717;display:block;margin-bottom:2px;">Premium Layouts & Templates</strong>
                Choose between editorial-style portfolios, clean resumes, and custom design schemes.
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="28" valign="top" style="font-size:14px;line-height:1.5;color:#2563eb;font-weight:bold;">✦</td>
              <td valign="top" style="font-size:14px;line-height:1.5;color:#5f5c54;">
                <strong style="color:#171717;display:block;margin-bottom:2px;">Instant Subdomain Publishing</strong>
                Go live instantly on a secure, optimized subpath or connect your custom domain name.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:36px 0;text-align:center;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(dashboardUrl)}" target="_blank" style="background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;display:inline-block;box-shadow:0 4px 12px rgba(37, 99, 235, 0.15);">
            Get Started & Create Document →
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8c85;text-align:center;">
      Need any assistance or have feedback? Drop us a line at support@veriworkly.com. We read every email.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
