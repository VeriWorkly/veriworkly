import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validate } from "@/features/contact/components/ContactForm";

describe("contact form validation (W-050)", () => {
  it("returns one message per invalid field instead of a single first error", () => {
    const errors = validate({ name: " ", email: "nope", subject: "", message: "short" });

    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name", "subject"]);
  });

  it("passes a complete message", () => {
    expect(
      validate({
        name: "Ada",
        email: "ada@example.com",
        subject: "Billing",
        message: "A question about credits.",
      }),
    ).toEqual({});
  });
});

describe("contact form timestamp (SV-01)", () => {
  const source = readFileSync(
    join(__dirname, "..", "..", "features", "contact", "components", "ContactForm.tsx"),
    "utf8",
  );

  it("sets `_ts` at first render, so a submit before any effect runs is not a 400", () => {
    expect(source).toMatch(/useState\(\(\) => Date\.now\(\)\)/);
    expect(source).not.toMatch(/useRef<number \| null>\(null\)/);
  });
});
