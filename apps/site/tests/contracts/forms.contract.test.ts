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
