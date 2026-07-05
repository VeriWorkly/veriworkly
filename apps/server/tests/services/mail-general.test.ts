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

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin-recipient@example.com",
        subject:
          "[VeriWorkly Contact] Important <b>Notification</b> from <script>alert('XSS')</script> John",
        text: expect.stringContaining("<script>alert('XSS')</script> John"),
        html: expect.stringContaining(
          "&lt;script&gt;alert(&#039;XSS&#039;)&lt;&#x2F;script&gt; John",
        ),
      }),
    );

    const callArgs = mockSendMail.mock.calls[0][0];
    // Ensure raw HTML tags are escaped in the HTML body
    expect(callArgs.html).toContain(
      "&lt;script&gt;alert(&#039;XSS&#039;)&lt;&#x2F;script&gt; John",
    );
    expect(callArgs.html).toContain("attacker@example.com&quot; onclick=&quot;alert(1)");
    expect(callArgs.html).toContain("Important &lt;b&gt;Notification&lt;&#x2F;b&gt;");
    expect(callArgs.html).toContain(
      "World &lt;iframe src=&#039;malicious.com&#039;&gt;&lt;&#x2F;iframe&gt;",
    );
    expect(callArgs.html).toContain("Hello<br>World"); // text newlines converted to <br>
  });
});
