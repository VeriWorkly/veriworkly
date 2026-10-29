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
