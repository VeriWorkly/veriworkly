import { describe, expect, it } from "vitest";
import { renderOtpEmail } from "../../src/mail/auth/otp.js";

describe("OTP mail rendering", () => {
  it("renders sign-in OTP template properly", () => {
    const html = renderOtpEmail("123456", "sign-in");
    expect(html).toContain("Sign in to VeriWorkly");
    expect(html).toContain("Verification Code");
    expect(html).toContain("Confirm your request using the secure verification code below.");
    expect(html).toContain("123 456"); // checks OTP formatting
  });

  it("renders email-verification OTP template properly", () => {
    const html = renderOtpEmail("654321", "email-verification");
    expect(html).toContain("Verify your email");
    expect(html).toContain("Verify email address");
    expect(html).toContain(
      "Use this code to confirm your email address and activate your VeriWorkly profile.",
    );
    expect(html).toContain("654 321");
  });

  it("renders forget-password OTP template properly", () => {
    const html = renderOtpEmail("111222", "forget-password");
    expect(html).toContain("Reset your password");
    expect(html).toContain("Reset password code");
    expect(html).toContain(
      "Use this code to confirm your password reset request and set a new password.",
    );
    expect(html).toContain("111 222");
  });

  it("renders change-email OTP template properly", () => {
    const html = renderOtpEmail("333444", "change-email");
    expect(html).toContain("Confirm your email change");
    expect(html).toContain("Confirm email change");
    expect(html).toContain(
      "Use this code to verify your new email address and update your VeriWorkly credentials.",
    );
    expect(html).toContain("333 444");
  });
});
