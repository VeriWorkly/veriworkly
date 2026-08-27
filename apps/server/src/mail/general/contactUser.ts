import { getBaseLayout, escapeHtml } from "../shared/layout.js";

export interface ContactUserMailData {
  name?: string;
  subject: string;
  message: string;
}

/**
 * Modern, customer-centric auto-confirmation receipt template sent to user.email
 */
export function renderUserContactConfirmationEmail(data: ContactUserMailData): string {

  const sanitizedName = escapeHtml(data.name || "there");
  const sanitizedSubject = escapeHtml(data.subject);
  const sanitizedMessage = escapeHtml(data.message);

  const title = "We received your message – VeriWorkly";
  const preheader = `Hi ${sanitizedName}, thanks for reaching out. We received your note and our team will get back to you shortly.`;

  const bodyHtml = `
    <!-- Top Status Badge -->
    <div style="text-align:center;margin-bottom:20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;display:inline-table;">
        <tr>
          <td style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:9999px;padding:5px 14px;">
            <span style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#047857;">
              ✓ Message Received
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Title & Greeting -->
    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;font-weight:800;color:#0f172a;letter-spacing:-0.03em;text-align:center;">
      We're on it, ${sanitizedName}!
    </h1>

    <p style="margin:0 auto 24px auto;font-size:15px;line-height:1.6;color:#475569;text-align:center;max-width:440px;">
      Thank you for reaching out to VeriWorkly. We've received your note regarding <strong>&ldquo;${sanitizedSubject}&rdquo;</strong> and our engineering &amp; support team is on it.
    </p>

    <!-- Response SLA Guarantee Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="36" valign="middle" style="font-size:22px;">⏱</td>
              <td valign="middle" style="padding-left:12px;">
                <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:2px;">
                  Expected Response Time: 24 to 48 Hours
                </div>
                <div style="font-size:12px;color:#3b82f6;line-height:1.4;">
                  Every message is read and answered by a real engineer on our core team.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- User Copy of Submission -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:18px 20px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">
            Copy of your submission
          </div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;">
            Topic: ${sanitizedSubject}
          </div>
          <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap;word-break:break-word;">
            ${sanitizedMessage.replace(/\n/g, "<br>")}
          </div>
        </td>
      </tr>
    </table>

    <!-- Helpful Resources Section -->
    <div style="border-top:1px solid #e2e8f0;padding-top:24px;text-align:center;">
      <p style="margin:0 0 14px 0;font-size:13px;font-weight:600;color:#475569;">
        Need instant answers while you wait?
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
        <tr>
          <td style="padding:0 6px;">
            <a href="https://veriworkly.com/faq" target="_blank" style="display:inline-block;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:#1e293b;text-decoration:none;">
              Browse FAQ →
            </a>
          </td>
          <td style="padding:0 6px;">
            <a href="https://veriworkly.com/docs" target="_blank" style="display:inline-block;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:#1e293b;text-decoration:none;">
              Platform Docs →
            </a>
          </td>
        </tr>
      </table>
    </div>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
