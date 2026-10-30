import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { GET as atelier } from "@/app/api/template/atelier/og/route";
import { GET as cipher } from "@/app/api/template/cipher/og/route";
import { GET as nimbus } from "@/app/api/template/nimbus/og/route";
import { GET as signal } from "@/app/api/template/signal/og/route";

const routes = { atelier, cipher, nimbus, signal };

describe("template social cards", () => {
  it.each(Object.entries(routes))("%s is cacheable", async (id, GET) => {
    const response = await GET(new Request(`https://portfolio.test/api/template/${id}/og`));

    expect(response.headers.get("cache-control")).toMatch(/public, max-age=86400/);
  });

  it.each(Object.keys(routes))("%s has no founder defaults", (id) => {
    const source = readFileSync(
      new URL(`../app/api/template/${id}/og/route.tsx`, import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/Gautam|"gautam"/);
  });
});
