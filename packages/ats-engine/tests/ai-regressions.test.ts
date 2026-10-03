import { describe, expect, it, vi } from "vitest";

import { createAtsAi } from "../src/ai/index.js";
import { openAiCompatible } from "../src/ai/openai-compatible.js";
import { createRedaction } from "../src/ai/redact.js";
import { scriptedProvider } from "../src/ai/testing/index.js";
import { DEFAULT_POLICY } from "../src/policy/default.js";
import { mergeGrounded, needsRepair } from "../src/repair/merge.js";
import { AtsScoringService } from "../src/scoring/engine.js";

/** Bugs found in review of the AI layer. Each test failed before its fix. */

const route = { model: "m", maxTokens: 100 };

describe("AI layer regressions", () => {
  it("keeps a URL the model wrote with a scheme the document left off", async () => {
    const source = "Jane Doe\nwww.linkedin.com/in/janedoe | github.com/janedoe";
    const provider = scriptedProvider(
      JSON.stringify({
        basics: { fullName: "Jane Doe" },
        links: [
          { label: "LinkedIn", url: "https://www.linkedin.com/in/janedoe" },
          { label: "GitHub", url: "https://github.com/janedoe/" },
          { label: "Site", url: "https://janedoe.dev" },
        ],
      }),
    );
    const ai = createAtsAi({ provider, routes: { convertResume: route } });
    const { result, rejected } = await ai.convertResume({ resumeText: source });

    expect(result.links.map((link) => link.url)).toEqual([
      "https://www.linkedin.com/in/janedoe",
      "https://github.com/janedoe/",
      "", // never in the document
    ]);
    expect(rejected.map((violation) => violation.path)).toEqual(["links[2].url"]);
  });

  it("does not sell a repair that the merge cannot apply", () => {
    // Roles found, but missing employers and dates. The merge never edits rows the parser
    // found, so a paid repair here would change nothing.
    const parsed = AtsScoringService.check(
      ["Experience", "Senior Engineer", "Staff Engineer", "Principal Engineer"].join("\n"),
      DEFAULT_POLICY,
    ).parsed;
    const incomplete = {
      ...parsed,
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "415 555 0199",
      roles: [
        { title: "Senior Engineer", employer: "", start: null, end: null, current: false },
        { title: "Staff Engineer", employer: "", start: null, end: null, current: false },
      ],
    };

    const merged = mergeGrounded(
      incomplete,
      {
        name: "",
        email: "",
        phone: "",
        roles: [
          {
            title: "Senior Engineer",
            employer: "Acme",
            start: { year: 2020, month: 1 },
            end: null,
            current: false,
          },
        ],
        education: [],
        skills: [],
      },
      "Senior Engineer Acme 2020",
      { policy: DEFAULT_POLICY },
    ).merged;
    expect(merged.roles).toEqual(incomplete.roles); // the merge cannot help…
    expect(needsRepair({ parsed: incomplete, wordCount: 400 })).toBe(false); // …so do not offer it
  });

  it("redacts whole words only", () => {
    const redaction = createRedaction(
      { name: "Ana", email: "", phone: "", links: [], roles: [] },
      "",
    );
    expect(redaction.apply("Ana led Analytics at Banana Co.")).toBe(
      "[NAME] led Analytics at Banana Co.",
    );
  });

  it("does not redact a 'name' that is really a parsed job title", () => {
    const redaction = createRedaction(
      {
        name: "Senior Software Engineer",
        email: "",
        phone: "",
        links: [],
        roles: [
          {
            title: "Senior Software Engineer",
            employer: "Acme",
            start: null,
            end: null,
            current: false,
          },
        ],
      },
      "",
    );
    expect(redaction.apply("Senior Software Engineer, Acme")).toBe(
      "Senior Software Engineer, Acme",
    );
  });

  it("does not pay for the same truncation twice", async () => {
    const provider = scriptedProvider({ text: '{"basics": {', finish: "length" });
    const ai = createAtsAi({ provider, routes: { convertResume: { ...route, retries: 2 } } });

    await expect(ai.convertResume({ resumeText: "x" })).rejects.toMatchObject({
      code: "truncated",
      attempts: 1,
    });
    expect(provider.calls).toHaveLength(1);
  });

  it("reports a non-object body as a bad response, not a crash", async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "null" }));
    const provider = openAiCompatible({ apiKey: "k", fetch });
    await expect(
      provider.complete({ model: "m", system: "", messages: [], maxTokens: 1 }),
    ).rejects.toMatchObject({ name: "LlmProviderError", retryable: true });
  });

  it("leaves usage unknown when the provider never reports it", async () => {
    const provider = scriptedProvider(JSON.stringify({ basics: {} }));
    const ai = createAtsAi({ provider, routes: { convertResume: route } });
    expect((await ai.convertResume({ resumeText: "x" })).usage).toBeUndefined();
  });
});
