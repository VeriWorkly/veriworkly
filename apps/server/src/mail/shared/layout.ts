export interface MailLayoutOptions {
  title: string;
  preheader: string;
  bodyHtml: string;
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#096;")
    .replace(/\//g, "&#x2F;");
}

export function getBaseLayout({ title, preheader, bodyHtml }: MailLayoutOptions): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>${title}</title>
    <style>
      body {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      @media only screen and (max-width: 600px) {
        .email-container {
          width: 100% !important;
          border-radius: 16px !important;
          margin: 10px 0 !important;
        }
        .content-cell {
          padding: 36px 24px !important;
        }
      }
    </style>
  </head>

  <body style="margin:0;padding:0;background-color:#f5f4ef;background-image:radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 35%), radial-gradient(circle at top right, rgba(96, 165, 250, 0.05), transparent 25%);color:#171717;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;width:100% !important;height:100% !important;">
    <div style="display:none;font-size:1px;color:#f5f4ef;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
      ${preheader}
    </div>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:transparent;width:100%;">
      <tr>
        <td align="center" style="padding:48px 14px 48px 14px;">
          <table class="email-container" role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid rgba(23, 23, 23, 0.08);border-radius:32px;box-shadow:0 30px 90px -50px rgba(23, 23, 23, 0.25);overflow:hidden;">
            <tr>
              <td align="center" style="padding:40px 48px 0 48px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom:1px solid rgba(23, 23, 23, 0.06);padding-bottom:24px;">
                  <tr>
                    <td align="left">
                      <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2563eb;">
                        VeriWorkly <span style="color:#5f5c54;font-weight:500;">/ Securing Careers</span>
                      </div>
                    </td>

                    <td align="right" style="font-size:11px;color:#8f8c85;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;">
                      System Msg
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td class="content-cell" style="padding:40px 48px;vertical-align:top;">
                ${bodyHtml}
              </td>
            </tr>
            
            <tr>
              <td align="center" style="padding:0 48px 40px 48px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid rgba(23, 23, 23, 0.06);padding-top:28px;">
                  <tr>
                    <td align="center" style="font-size:12px;color:#5f5c54;line-height:1.8;text-align:center;">
                      <p style="margin:0 0 8px 0;">
                        This email was sent by VeriWorkly.
                      </p>

                      <p style="margin:0 0 16px 0;color:#8f8c85;">
                        Secure resume, portfolio, and career-building infrastructure.
                      </p>

                      <p style="margin:0;font-weight:600;">
                        <a href="https://veriworkly.com" target="_blank" style="color:#2563eb;text-decoration:none;margin:0 8px;">Website</a>
                        <span style="color:rgba(23, 23, 23, 0.15);">•</span>
                        <a href="https://veriworkly.com/docs" target="_blank" style="color:#2563eb;text-decoration:none;margin:0 8px;">Docs</a>
                        <span style="color:rgba(23, 23, 23, 0.15);">•</span>
                        <a href="mailto:support@veriworkly.com" style="color:#2563eb;text-decoration:none;margin:0 8px;">Support</a>
                      </p>

                      <p style="margin:24px 0 0 0;font-size:11px;color:#a3a098;">
                        &copy; ${new Date().getFullYear()} VeriWorkly. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
