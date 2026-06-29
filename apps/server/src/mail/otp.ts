import { getBaseLayout, escapeHtml } from "./layout.js";

export function renderOtpEmail(
  otp: string,
  type: "sign-in" | "email-verification" | "forget-password" | "change-email",
): string {
  let title = "Sign in to VeriWorkly";
  let headline = "Verification Code";
  const preheader = `Your VeriWorkly verification code is ${otp}`;
  let desc = "Confirm your request using the secure verification code below.";

  if (type === "email-verification") {
    title = "Verify your email";
    headline = "Verify email address";
    desc = "Use this code to confirm your email address and activate your VeriWorkly profile.";
  }

  const formattedOtp = otp.length === 6 ? `${otp.slice(0, 3)} ${otp.slice(3)}` : otp;

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      ${headline}
    </h2>
    <p style="margin:0 auto 32px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:440px;">
      ${desc}
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:36px 0;text-align:center;">
      <tr>
        <td align="center">
          <div style="max-width:400px;margin:0 auto;padding:28px 32px;background:linear-gradient(145deg, #ffffff, #f9f9f6);border:1px solid rgba(23, 23, 23, 0.08);border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.02);text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#8f8c85;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;text-align:center;">One-Time Code</div>
            <div style="font-size:42px;letter-spacing:0.15em;font-weight:800;color:#2563eb;line-height:1;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;margin-bottom:8px;text-align:center;">${escapeHtml(formattedOtp)}</div>
            <div style="height:1px;background-color:rgba(23, 23, 23, 0.06);margin:16px 0 12px 0;"></div>
            <div style="font-size:12px;color:#8f8c85;line-height:1.5;text-align:center;">
              This code will expire in <strong style="color:#171717;">10 minutes</strong> and can only be used once. If you didn't request this sign-in, you can safely ignore this email.
            </div>
          </div>
        </td>
      </tr>
    </table>
    
    <p style="margin:0;font-size:12px;line-height:1.6;color:#a3a098;text-align:center;">
      VeriWorkly uses passwordless OTP authentication to guarantee maximum credential security.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
