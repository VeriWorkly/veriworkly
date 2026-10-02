import { describe, expect, it } from "vitest";

import { anthropic } from "../src/ai/anthropic.js";
import { createAtsAi } from "../src/ai/index.js";
import { openAiCompatible } from "../src/ai/openai-compatible.js";
import { scriptedProvider } from "../src/ai/testing/index.js";
import { AtsScoringService, DEFAULT_POLICY } from "../src/index.js";
import { groundingWords, isGrounded, normalizeForGrounding } from "../src/repair/grounding.js";

/**
 * Defects found in the final review of the AI layer, one block each. Every model reply is
 * scripted; no network.
 */

const NOW = new Date("2026-10-01T00:00:00Z");
const route = { model: "m", maxTokens: 100 };

const convert = async (resumeText: string, reply: unknown) => {
  const ai = createAtsAi({
    provider: scriptedProvider(JSON.stringify(reply)),
    routes: { convertResume: route },
  });
  return ai.convertResume({ resumeText });
};

describe("grounding treats symbols and addresses as part of the value", () => {
  it("does not ground C++ or C# in a resume that only says C", async () => {
    const { result, rejected } = await convert("Jane Doe\nSkills: C, Python", {
      basics: { fullName: "Jane Doe" },
      skills: [{ name: "Languages", keywords: ["C", "C++", "C#"] }],
    });
    expect(result.skills[0]?.keywords).toEqual(["C", "", ""]);
    expect(rejected.map((v) => v.value)).toEqual(["C++", "C#"]);
  });

  it("does not ground an email or a URL that differs from the resume's", async () => {
    const { result } = await convert(
      "Jane Doe\njane.doe@acme.com | github.com/janedoe | janedoe.dev",
      {
        basics: { fullName: "Jane Doe", email: "janedoe@acme.com" },
        links: [
          { label: "GitHub", url: "https://github.com/jane" },
          { label: "Site", url: "https://janedoe.dev/" },
        ],
      },
    );
    expect(result.basics.email).toBe("");
    expect(result.links.map((link) => link.url)).toEqual(["", "https://janedoe.dev/"]);
  });

  it("still grounds the resume's own email in another case", async () => {
    const { result } = await convert("Jane Doe\nJane.Doe@Acme.com", {
      basics: { fullName: "Jane Doe", email: "jane.doe@acme.com" },
    });
    expect(result.basics.email).toBe("jane.doe@acme.com");
  });

  it("grounds a value in a script written without spaces", async () => {
    const { result, rejected } = await convert("李华\n就职于阿里巴巴集团，担任高级工程师", {
      basics: { fullName: "李华" },
      experience: [{ company: "阿里巴巴集团", role: "高级工程师" }],
    });
    expect(rejected).toEqual([]);
    expect(result.experience[0]).toMatchObject({ company: "阿里巴巴集团", role: "高级工程师" });
  });

  it("blanks an identity value that holds no letter or digit", async () => {
    const { result } = await convert("Jane Doe\nEngineer at Acme", {
      basics: { fullName: "—" },
      experience: [{ company: "Acme", role: "–" }],
    });
    expect(result.basics.fullName).toBe("");
    expect(result.experience[0]?.role).toBe("");
  });

  it("grounds the job title in basics, as the docs say", async () => {
    const { result } = await convert("Jane Doe\nEngineer at Acme", {
      basics: { fullName: "Jane Doe", role: "Principal Architect" },
    });
    expect(result.basics.role).toBe("");
  });
});

describe("analyze keeps contact details out of the request", () => {
  it("redacts the name in any case, spacing or hidden character", async () => {
    const resumeText = [
      "J A N E   D O E",
      "jane.doe@acme.com | +1 415 555 0134",
      "Experience",
      "Engineer, Acme 2019 - 2023",
      "- JANE DOE led the platform team; Jane Doe also wrote jane@ac­me.com",
    ].join("\n");
    const report = AtsScoringService.check(resumeText, DEFAULT_POLICY, { now: NOW });
    const provider = scriptedProvider(JSON.stringify({ explanation: "ok" }));
    const ai = createAtsAi({ provider, routes: { analyze: route } });
    await ai.analyze({ resumeText, report });
    const sent = provider.calls[0]!.messages[0]!.content;
    expect(sent).not.toMatch(/jane\s*doe|j a n e/i);
    expect(sent).not.toMatch(/jane@acme\.com|jane\.doe@acme\.com/i);
  });

  it("keeps no suggestion naming a term outside the posting, even inside a list", async () => {
    const report = AtsScoringService.check("Jane Doe\nPython developer", DEFAULT_POLICY, {
      now: NOW,
    });
    const reply = JSON.stringify({
      keywordOpportunities: ["Kubernetes", "Python, Rust, Kubernetes"],
    });
    const run = (jobDescription?: string) =>
      createAtsAi({ provider: scriptedProvider(reply), routes: { analyze: route } }).analyze({
        resumeText: "Jane Doe\nPython developer",
        report,
        jobDescription,
      });
    expect(
      (await run("Requirements\n- Python and Kubernetes")).result.keywordOpportunities,
    ).toEqual(["Kubernetes"]);
  });

  it("holds a list to the posting whatever separates its items", async () => {
    const items = ["Kubernetes / Haskell", "Kubernetes | Erlang", "Kubernetes · Haskell"];
    const reply = JSON.stringify({ keywordOpportunities: [...items, "CI/CD"] });
    const jobDescription = "Requirements\n- Kubernetes and CI/CD";
    const report = AtsScoringService.check("Jane Doe\nPython developer", DEFAULT_POLICY, {
      now: NOW,
      jobDescription,
    });
    expect(report.missingKeywords.join(" ")).toMatch(/kubernetes/i);
    const { result } = await createAtsAi({
      provider: scriptedProvider(reply),
      routes: { analyze: route },
    }).analyze({ resumeText: "Jane Doe\nPython developer", report, jobDescription });
    expect(result.keywordOpportunities).toEqual(["CI/CD"]);
  });
});

describe("grounding", () => {
  const source = normalizeForGrounding("a ".repeat(25_000));
  const words = groundingWords(source);

  it("takes time linear in the source, whatever the value", () => {
    const started = performance.now();
    expect(isGrounded("a".repeat(2_048), source, words)).toBe(true);
    expect(isGrounded(`${"a".repeat(2_047)}b`, source, words)).toBe(false);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("still joins words only on their boundaries", () => {
    const text = normalizeForGrounding("Acme Corp\noration, metadata");
    expect(isGrounded("Acme Corporation", text)).toBe(true);
    expect(isGrounded("Meta", text)).toBe(false);
    expect(isGrounded("cme Corp", text)).toBe(false);
  });

  it.each([
    ["jane@acme.com", "jane@acme.com / +1 555 0100 / github.com/jane"],
    ["github.com/jane", "linkedin.com/in/jane / github.com/jane"],
    ["jane.doe@acme.com", "Email:jane.doe@acme.com"],
    ["jane.doe@acme.com", "\u{2709}jane.doe@acme.com"],
    ["jane.doe@acme.com", "\u{E0B0}jane.doe@acme.com"],
    ["linkedin.com/in/jane-doe-12345", "linkedin.com/in/jane-doe-\n12345"],
    ["jane.doe@acme.com", "jane.doe@\nacme.com"],
  ])("grounds the honest address %j in %j", (value, source) => {
    expect(isGrounded(value, normalizeForGrounding(source))).toBe(true);
  });

  it("still tells addresses apart by every character", () => {
    const source = normalizeForGrounding("Email:jane.doe@acme.com / github.com/janedoe");
    expect(isGrounded("janedoe@acme.com", source)).toBe(false);
    expect(isGrounded("github.com/jane", source)).toBe(false);
  });

  it("compares addresses in linear time against a long run of slashes", () => {
    const slashes = normalizeForGrounding(`x${"/".repeat(48_000)}y`);
    const started = performance.now();
    expect(isGrounded("https://github.com/janedoe", slashes)).toBe(false);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it("grounds a credential written with a slash as words when the source spaces it", () => {
    const text = normalizeForGrounding("B.Sc / M.Sc in Physics, github.com/janedoe");
    expect(isGrounded("B.Sc/M.Sc", text)).toBe(true);
    expect(isGrounded("github.com/jane", text)).toBe(false);
  });
});

describe("the task runner", () => {
  it("never retries once the caller has aborted, whatever the provider throws", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const ai = createAtsAi({
      provider: {
        complete: async () => {
          calls += 1;
          throw new DOMException("aborted", "AbortError");
        },
      },
      routes: { convertResume: { ...route, retries: 3 } },
    });
    const error = await ai
      .convertResume({ resumeText: "Jane" }, { signal: controller.signal })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "aborted" });
    expect(calls).toBe(1);
  });

  it("reads a fenced reply written on one line", async () => {
    const ai = createAtsAi({
      provider: scriptedProvider('```json{"basics":{"fullName":"Jane Doe"}}```'),
      routes: { convertResume: route },
    });
    const { result } = await ai.convertResume({ resumeText: "Jane Doe" });
    expect(result.basics.fullName).toBe("Jane Doe");
  });
});

describe("adapters", () => {
  const fetchReturning = (body: unknown) => async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  });
  const request = { model: "m", system: "s", messages: [], maxTokens: 10 };

  it("joins an OpenAI-style content array", async () => {
    const provider = openAiCompatible({
      apiKey: "k",
      fetch: fetchReturning({
        choices: [{ finish_reason: "stop", message: { content: [{ type: "text", text: "{}" }] } }],
      }),
    });
    expect((await provider.complete(request)).text).toBe("{}");
  });

  it("reads Anthropic's context-window stop as truncation and drops null cache counts", async () => {
    const provider = anthropic({
      apiKey: "k",
      fetch: fetchReturning({
        content: [{ type: "text", text: "{" }],
        stop_reason: "model_context_window_exceeded",
        usage: { input_tokens: 5, output_tokens: 1, cache_read_input_tokens: null },
      }),
    });
    expect(await provider.complete(request)).toMatchObject({
      finish: "length",
      usage: { inputTokens: 5, outputTokens: 1 },
    });
    expect((await provider.complete(request)).usage).not.toHaveProperty("cacheReadTokens");
  });

  it("sends max_completion_tokens to OpenAI itself, max_tokens elsewhere", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetch = async (_: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [] }) };
    };
    await openAiCompatible({ apiKey: "k", fetch }).complete(request);
    await openAiCompatible({ apiKey: "k", fetch, baseUrl: "http://localhost:11434/v1" }).complete(
      request,
    );
    expect(bodies[0]).toMatchObject({ max_completion_tokens: 10 });
    expect(bodies[0]).not.toHaveProperty("max_tokens");
    expect(bodies[1]).toMatchObject({ max_tokens: 10 });
  });
});
