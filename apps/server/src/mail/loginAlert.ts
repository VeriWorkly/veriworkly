import { getBaseLayout, escapeHtml } from "./layout.js";

export interface LoginAlertMeta {
  ip: string;
  device: string;
  timestamp: string;
  location?: string;
}

export function renderLoginAlertEmail(email: string, meta: LoginAlertMeta): string {
  const sanitizedEmail = escapeHtml(email);
  const title = "New Login Alert";
  const preheader = `A new login was detected on your VeriWorkly account for ${sanitizedEmail}.`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      New Login Alert
    </h2>
    <p style="margin:0 auto 28px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:440px;">
      We detected a new sign-in to your VeriWorkly account (<strong>${sanitizedEmail}</strong>). Please review the session details below.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px auto;max-width:440px;background-color:#faf9f5;border:1px solid rgba(23, 23, 23, 0.06);border-radius:12px;padding:24px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
      <tr>
        <td style="padding-bottom:12px;font-size:13px;color:#8f8c85;">Device / Browser:</td>
        <td style="padding-bottom:12px;font-size:13px;color:#171717;font-weight:600;text-align:right;">${escapeHtml(meta.device)}</td>
      </tr>
      <tr>
        <td style="padding-bottom:12px;font-size:13px;color:#8f8c85;">IP Address:</td>
        <td style="padding-bottom:12px;font-size:13px;color:#171717;font-weight:600;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(meta.ip)}</td>
      </tr>
      ${
        meta.location
          ? `
      <tr>
        <td style="padding-bottom:12px;font-size:13px;color:#8f8c85;">Location:</td>
        <td style="padding-bottom:12px;font-size:13px;color:#171717;font-weight:600;text-align:right;">${escapeHtml(meta.location)}</td>
      </tr>
      `
          : ""
      }
      <tr>
        <td style="font-size:13px;color:#8f8c85;">Timestamp (UTC):</td>
        <td style="font-size:13px;color:#171717;font-weight:600;text-align:right;">${escapeHtml(meta.timestamp)}</td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px auto;max-width:440px;background-color:#fff5f5;border:1px solid rgba(220, 38, 38, 0.15);border-radius:10px;padding:20px;text-align:left;">
      <tr>
        <td valign="top" style="font-size:14px;line-height:1.5;color:#b91c1c;">
          <strong style="color:#7f1d1d;display:block;margin-bottom:4px;">Was this not you?</strong>
          If you did not authorize this login, your account security could be compromised. Please reply to this alert immediately or reach out to security@veriworkly.com.
        </td>
      </tr>
    </table>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
