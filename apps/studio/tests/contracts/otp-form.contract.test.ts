import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(__dirname, "..", "..", "app/login/component/OtpForm.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("email code sign-in", () => {
  it("S-365 Verify stays disabled after a successful sign-in, so the used code is not sent again", () => {
    expect(source).toContain("signedIn = true;");
    expect(source).toContain("if (!signedIn) setIsLoading(false);");
  });
});

describe("the email sign-up placeholder name", () => {
  it("O LOW the placeholder the code sign-in sends is never shown as the person's name", async () => {
    const { OTP_SIGN_UP_PLACEHOLDER_NAME, accountName } = await import("@/lib/constants");

    expect(source).toContain("name: OTP_SIGN_UP_PLACEHOLDER_NAME");
    expect(accountName(OTP_SIGN_UP_PLACEHOLDER_NAME)).toBeUndefined();
    expect(accountName("  ")).toBeUndefined();
    expect(accountName(null)).toBeUndefined();
    expect(accountName("Ada Lovelace")).toBe("Ada Lovelace");

    const currentUser = readFileSync(
      join(__dirname, "..", "..", "features/auth/services/current-user.ts"),
      "utf8",
    );
    expect(currentUser).toContain("name: accountName(user.name)");
  });
});
