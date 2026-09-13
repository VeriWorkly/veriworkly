import { getBaseLayout, escapeHtml } from "../shared/layout.js";

export function renderSubscriptionCancelledEmail(name: string): string {
  const sanitizedName = escapeHtml(name || "there");
  const title = "Subscription Cancelled";
  const preheader = "Your VeriWorkly subscription has been cancelled.";

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      We're sorry to see you go, ${sanitizedName}
    </h2>

    <p style="margin:0 auto 28px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:440px;">
      Your subscription has been cancelled. You'll retain access to paid features until the end of your current billing period, after which your account will move to the free plan.
    </p>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8c85;text-align:center;">
      Changed your mind? You can resubscribe anytime from your billing settings. Questions? Reach us at info@veriworkly.com.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
