import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RestrictedAccess } from "@/components/RestrictedAccess";

describe("RestrictedAccess component", () => {
  it("renders correctly without throwing", () => {
    expect(() => renderToStaticMarkup(<RestrictedAccess />)).not.toThrow();
  });

  it("links Back to Homepage to the portfolio root path (/)", () => {
    const html = renderToStaticMarkup(<RestrictedAccess />);
    expect(html).toContain('href="/"');
    expect(html).toContain("Back to Homepage");
    expect(html).not.toContain('href="https://veriworkly.com"');
  });
});
