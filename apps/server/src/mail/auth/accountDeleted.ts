import { getBaseLayout, escapeHtml } from "../shared/layout.js";

export function renderAccountDeletedEmail(name: string): string {
  const sanitizedName = escapeHtml(name || "there");
  const title = "Your VeriWorkly Account Has Been Deleted";
  const preheader =
    "Confirmation that your VeriWorkly account and associated data have been permanently deleted.";

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      Account Permanently Deleted
    </h2>

    <p style="margin:0 auto 28px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:460px;">
      Hello ${sanitizedName},
    </p>
    
    <p style="margin:0 auto 28px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:460px;">
      This email confirms that your VeriWorkly account has been deleted. As requested, all of your resumes, portfolios, and associated developer data have been permanently removed from our active database.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px auto;max-width:440px;background-color:#faf9f5;border:1px solid rgba(23, 23, 23, 0.06);border-radius:12px;padding:24px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
      <tr>
        <td valign="top" style="font-size:13px;line-height:1.6;color:#5f5c54;text-align:center;">
          <strong style="color:#171717;display:block;margin-bottom:6px;">Data Deletion Confirmation</strong>
          All profile details, resume templates, and published portfolio assets have been successfully and securely wiped from our systems in accordance with our privacy policy.
        </td>
      </tr>
    </table>
    
    <p style="margin:28px 0 0 0;font-size:13px;line-height:1.6;color:#8f8c85;text-align:center;">
      We're sorry to see you go. If you have any feedback on how we could improve, we'd love to hear from you. Just reply to this email to share your thoughts.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
