import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { siteConfig } from "@/config/site";
import { ContactForm } from "@/features/contact/components/ContactForm";
import type { ContactSuccessData } from "@/features/contact/components/ContactSuccessModal";

import { byProp, mount, text } from "./hook-harness";

/** What the contact form shows for each answer /contact can give, through the real fetchApiData. */

// fetchApiData reads the backend URL when it is first imported; CI sets one, a local run may not.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://backend.test/api/v1";
});

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const { hooks } = await import("./hook-harness");
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

let onSuccess: Mock<(data: ContactSuccessData) => void>;

beforeEach(() => {
  onSuccess = vi.fn<(data: ContactSuccessData) => void>();
});

afterEach(() => vi.unstubAllGlobals());

async function send(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  const view = mount(ContactForm, { onSuccess });

  const fill = (id: string, value: string) => {
    const field = byProp(view.tree, "id", id);
    expect(field, id).toBeDefined();
    (field!.props.onChange as (v: string) => void)(value);
    view.rerender();
  };
  fill("name", "Ada");
  fill("email", "ada@example.com");
  fill("subject", "Billing");
  fill("message-body", "A question about credits.");

  const form = byProp(view.tree, "noValidate", true);
  (form!.props.onSubmit as (e: FormEvent<HTMLFormElement>) => Promise<void>)({
    preventDefault() {},
    currentTarget: { querySelector: () => null },
  } as unknown as FormEvent<HTMLFormElement>);
  await view.settle();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/contact$/);
  const fieldError = (id: string) => byProp(view.tree, "id", id)?.props.error;
  return { view, fieldError };
}

describe("contact form error mapping", () => {
  it("explains the hourly limit on a 429 and offers the support email", async () => {
    const { view } = await send(reply(429, { success: false, message: "Too many requests" }));

    const shown = text(view.tree);
    expect(shown).toContain("You can send 5 messages an hour from one connection");
    expect(shown).toContain(siteConfig.email);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("puts each 400 detail under its own field and shows no raw detail for hidden fields", async () => {
    const { view, fieldError } = await send(
      reply(400, {
        success: false,
        message: "Validation failed",
        statusCode: 400,
        details: [
          { path: "email", message: "Invalid email address" },
          { path: "message", message: "Too long" },
          { path: "_ts", message: "Required" },
          { path: "website" },
        ],
      }),
    );

    expect(fieldError("email")).toBe("Invalid email address");
    expect(fieldError("message-body")).toBe("Too long");
    expect(fieldError("name")).toBeUndefined();
    expect(fieldError("subject")).toBeUndefined();
    expect(text(view.tree)).toContain("Some fields need another look.");
    expect(text(view.tree)).not.toContain("Required");
  });

  it("falls back to the generic message on a 400 without field details", async () => {
    const { view, fieldError } = await send(reply(400, { success: false, message: "Bad" }));

    expect(fieldError("email")).toBeUndefined();
    expect(text(view.tree)).toContain("Your message could not be sent just now.");
  });

  it("falls back to the generic message when the backend is unreachable", async () => {
    const { view } = await send(
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    expect(text(view.tree)).toContain(`email ${siteConfig.email}`);
    expect(text(view.tree)).toContain("could not be sent");
  });

  it("hands the sent message to the success view and clears the form", async () => {
    const data = { name: "Ada", email: "ada@example.com", subject: "Billing", timestamp: "now" };
    const { view } = await send(reply(200, { success: true, data }));

    expect(onSuccess).toHaveBeenCalledWith(data);
    expect(byProp(view.tree, "id", "name")?.props.value).toBe("");
    expect(text(view.tree)).not.toContain("could not be sent");
  });
});

describe("the 429 copy matches the server's contact limit", () => {
  it("quotes the hourly window and request count from rateLimit.ts", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "server", "src", "middleware", "rateLimit.ts"),
      "utf8",
    );
    const start = source.indexOf("if (isContactRoute)");
    expect(start, "no contact rule in rateLimit.ts").toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf("};", start));
    expect(block).toMatch(/windowMs: 60 \* 60 \* 1000,/);
    expect(block).toMatch(/maxRequests: 5,/);
  });
});
