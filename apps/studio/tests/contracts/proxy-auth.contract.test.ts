import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

describe("proxy auth contract", () => {
  it("protects api key management routes", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/api-keys", "/api-keys/:path*"]));
  });
});
