import { renderOperatorAlertEmail, type OperatorAlert } from "#mail/index";

import { sendMail } from "./transporter.js";

export type { OperatorAlert };

/** Mails an operator alert (V-371). Throws on a failed send, so the claim is retried. */
export async function sendOperatorAlertEmail(email: string, alert: OperatorAlert): Promise<void> {
  await sendMail({
    to: email,
    subject: `[VeriWorkly] ${alert.subject}`,
    text: alert.lines.join("\n\n"),
    html: renderOperatorAlertEmail(alert),
  });
}
