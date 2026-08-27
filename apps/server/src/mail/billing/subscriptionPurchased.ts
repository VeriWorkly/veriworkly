import { getBaseLayout, escapeHtml } from "../shared/layout.js";

export function renderSubscriptionPurchasedEmail(name: string, planName: string): string {
  const sanitizedName = escapeHtml(name || "there");
  const sanitizedPlan = escapeHtml(planName);
  const title = "Subscription Activated";
  const preheader = `Your VeriWorkly ${sanitizedPlan} subscription is now active.`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      Welcome to ${sanitizedPlan}, ${sanitizedName}!
    </h2>

    <p style="margin:0 auto 28px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:440px;">
      Thank you for subscribing. Your account has been upgraded and your new plan benefits are active immediately.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px auto;max-width:440px;background-color:#faf9f5;border:1px solid rgba(23, 23, 23, 0.06);border-radius:12px;padding:24px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
      <tr>
        <td style="font-size:13px;color:#8f8c85;">Plan:</td>
        <td style="font-size:13px;color:#171717;font-weight:600;text-align:right;">${sanitizedPlan}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8c85;text-align:center;">
      Manage your subscription anytime from your billing settings. Questions? Reach us at contact@veriworkly.com.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
