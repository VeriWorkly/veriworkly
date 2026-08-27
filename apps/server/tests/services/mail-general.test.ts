import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockSendMail } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return {
    mockSendMail: sendMail,
  };
});

vi.mock("../../src/services/mail/transporter.js", () => ({
  sendMail: mockSendMail,
}));

// Mock config values
const mockConfig = vi.hoisted(() => ({
  admin: {
    email: "admin-recipient@example.com",
  },
}));

vi.mock("#config", () => ({
  config: mockConfig,
  isDevelopment: true,
}));

import { sendContactEmail } from "../../src/services/mail/generalMail.js";

describe("generalMail service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends contact email with escaped HTML fields to prevent injection", async () => {
    await sendContactEmail({
      name: "<script>alert('XSS')</script> John",
      email: 'attacker@example.com" onclick="alert(1)',
      subject: "Important <b>Notification</b>",
      message: "Hello\nWorld <iframe src='malicious.com'></iframe>",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(2);

    // 1. First call: Admin notification with replyTo
    expect(mockSendMail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: "admin-recipient@example.com",
        replyTo: "attacker@example.com\" onclick=\"alert(1)",
        subject: "[VeriWorkly Contact] Important <b>Notification</b> from <script>alert('XSS')</script> John",
        text: expect.stringContaining("<script>alert('XSS')</script> John"),
        html: expect.stringContaining("&lt;script&gt;alert(&#039;XSS&#039;)&lt;&#x2F;script&gt; John"),
      }),
    );

    // 2. Second call: User confirmation receipt
    expect(mockSendMail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: "attacker@example.com\" onclick=\"alert(1)",
        subject: expect.stringContaining("We've received your message"),
        html: expect.stringContaining("Thank you for reaching out"),
      }),
    );


    const adminHtml = mockSendMail.mock.calls[0][0].html;
    expect(adminHtml).toContain("&lt;script&gt;alert(&#039;XSS&#039;)&lt;&#x2F;script&gt; John");
    expect(adminHtml).toContain("attacker@example.com&quot; onclick=&quot;alert(1)");
    expect(adminHtml).toContain("Important &lt;b&gt;Notification&lt;&#x2F;b&gt;");
    expect(adminHtml).toContain("World &lt;iframe src=&#039;malicious.com&#039;&gt;&lt;&#x2F;iframe&gt;");
  });
});

