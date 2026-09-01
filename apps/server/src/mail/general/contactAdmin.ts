import { getBaseLayout, escapeHtml } from "../shared/layout.js";

export interface ContactAdminMailData {
  name: string;
  email: string;
  subject: string;
  message: string;
  receivedAt?: string;
}

/**
 * Modern, high-visibility team alert template sent to ADMIN_EMAIL
 */
export function renderAdminContactNotificationEmail(data: ContactAdminMailData): string {
  const sanitizedName = escapeHtml(data.name);
  const sanitizedEmail = escapeHtml(data.email);
  const sanitizedSubject = escapeHtml(data.subject);
  const sanitizedMessage = escapeHtml(data.message);
  const dateStr = escapeHtml(data.receivedAt || new Date().toUTCString());

  const title = `[VeriWorkly] Contact: ${sanitizedSubject}`;
  const preheader = `New inquiry from ${sanitizedName} (${sanitizedEmail}) regarding "${sanitizedSubject}"`;

  const bodyHtml = `
    <!-- Top Pill & Action Label -->
    <div style="margin-bottom:20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" style="display:inline-table;">
        <tr>
          <td style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:9999px;padding:5px 12px;">
            <span style="display:inline-block;width:6px;height:6px;background-color:#2563eb;border-radius:50%;margin-right:6px;vertical-align:middle;"></span>
            <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;vertical-align:middle;">
              New Direct Inquiry
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Subject Headline -->
    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;font-weight:800;color:#0f172a;letter-spacing:-0.03em;">
      ${sanitizedSubject}
    </h1>

    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#64748b;">
      A visitor submitted a new support/contact request through the VeriWorkly website.
    </p>

    <!-- Submitter Overview Bento Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding-bottom:12px;width:50%;vertical-align:top;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">
                  From
                </div>
                <div style="font-size:14px;font-weight:700;color:#0f172a;">
                  ${sanitizedName}
                </div>
              </td>
              <td style="padding-bottom:12px;width:50%;vertical-align:top;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">
                  Email Address
                </div>
                <div style="font-size:14px;font-weight:600;">
                  <a href="mailto:${sanitizedEmail}" style="color:#2563eb;text-decoration:none;">${sanitizedEmail}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;padding-top:12px;width:50%;vertical-align:top;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">
                  Topic / Category
                </div>
                <div style="font-size:13px;font-weight:600;color:#334155;">
                  ${sanitizedSubject}
                </div>
              </td>
              <td style="border-top:1px solid #e2e8f0;padding-top:12px;width:50%;vertical-align:top;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">
                  Timestamp (UTC)
                </div>
                <div style="font-size:12px;font-weight:500;color:#64748b;">
                  ${dateStr}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Message Content Box -->
    <div style="margin:0 0 24px 0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#475569;margin-bottom:8px;">
        Submitted Message
      </div>
      <div style="background-color:#ffffff;border:1px solid #cbd5e1;border-left:4px solid #2563eb;border-radius:12px;padding:18px 20px;font-size:14px;line-height:1.65;color:#1e293b;white-space:pre-wrap;word-break:break-word;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        ${sanitizedMessage.replace(/\n/g, "<br>")}
      </div>
    </div>

    <!-- Quick Action Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 16px 0;">
      <tr>
        <td>
          <a href="mailto:${sanitizedEmail}?subject=Re:%20${encodeURIComponent(data.subject)}" style="background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:13px 26px;border-radius:10px;display:inline-block;box-shadow:0 4px 14px rgba(37, 99, 235, 0.25);">
            Reply Directly to ${sanitizedName} →
          </a>
        </td>
      </tr>
    </table>

    <div style="background-color:#f1f5f9;border-radius:10px;padding:12px 16px;margin-top:20px;">
      <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">
        ⚡ <strong>One-Click Reply:</strong> Simply hit &ldquo;Reply&rdquo; in your mail app — the <code style="font-family:monospace;background:#e2e8f0;padding:2px 5px;border-radius:4px;color:#0f172a;">Reply-To</code> header is already configured to <strong style="color:#0f172a;">${sanitizedEmail}</strong>.
      </p>
    </div>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
