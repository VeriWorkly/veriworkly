import { getBaseLayout, escapeHtml } from "../shared/layout.js";

/**
 * Something a person has to act on (V-371): a billing webhook that kept failing, a payment taken
 * for a deleted account, an affiliate ledger shortfall. Sent to ADMIN_EMAIL, once per incident.
 */
export type OperatorAlert = {
  subject: string;
  /** Plain sentences: ids, amounts and what to do. No customer personal data. */
  lines: string[];
};

export function renderOperatorAlertEmail(alert: OperatorAlert): string {
  const paragraphs = alert.lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#3f3d38;">${escapeHtml(line)}</p>`,
    )
    .join("\n    ");

  const bodyHtml = `
    <h2 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:800;color:#171717;">
      ${escapeHtml(alert.subject)}
    </h2>
    ${paragraphs}
  `;

  return getBaseLayout({
    title: `[VeriWorkly] ${escapeHtml(alert.subject)}`,
    preheader: escapeHtml(alert.lines[0] ?? alert.subject),
    bodyHtml,
  });
}
