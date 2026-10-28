import { DEFAULT_POLICY } from "@veriworkly/ats-engine";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "#app";
import { config } from "#config";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

/**
 * V-387: the login wall on `/ats/check` is the server's choice of `shapeReport` mode. An anonymous
 * caller gets a score and a verdict; the rule-by-rule breakdown and the keyword lists are never
 * sent. A signed-in caller gets the full report. The same resume both ways.
 */
const RESUME = [
  "Jordan Sample",
  "jordan.sample@example.com | +1 555 0100 | linkedin.com/in/jordansample",
  "",
  "EXPERIENCE",
  "Senior Software Engineer, Example Corp (2020 - 2024)",
  "- Led a migration of 40 services to Kubernetes, cutting deploy time by 60%.",
  "- Built a payments ledger in TypeScript and Postgres handling 2M transactions a day.",
  "",
  "EDUCATION",
  "B.Sc. Computer Science, Example University (2016)",
  "",
  "SKILLS",
  "TypeScript, Node.js, Postgres, Kubernetes, Terraform",
].join("\n");

const BODY = {
  resume: RESUME,
  jobDescription:
    "We are hiring a senior backend engineer with TypeScript, Postgres, Kafka and Kubernetes experience.",
};

describe("ATS check report shape by caller (V-387)", () => {
  // The suite blanks the private engine policy; the public default scores the same way here.
  const original = config.ai.atsEnginePolicyJson;
  beforeAll(() => {
    config.ai.atsEnginePolicyJson = JSON.stringify(DEFAULT_POLICY);
  });
  afterAll(() => {
    config.ai.atsEnginePolicyJson = original;
  });

  it("withholds the rules and keyword lists from an anonymous caller", async () => {
    const response = await request(app)
      .post("/api/v1/ats/check")
      .set("Origin", STUDIO_ORIGIN)
      .send(BODY);

    expect(response.status).toBe(200);
    const report = response.body.data.report;
    expect(report.restricted).toBe(true);
    expect(typeof report.readinessScore).toBe("number");
    for (const withheld of ["rules", "matchedKeywords", "missingKeywords", "failedChecks"])
      expect(report, withheld).not.toHaveProperty(withheld);
    expect(JSON.stringify(report).toLowerCase()).not.toContain("kafka");
  });

  it("sends the full report, rules and keywords included, to a signed-in caller", async () => {
    const user = await createUserWithSession();
    const response = await request(app)
      .post("/api/v1/ats/check")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send(BODY);

    expect(response.status).toBe(200);
    const report = response.body.data.report;
    expect(report.restricted).not.toBe(true);
    expect(Array.isArray(report.rules)).toBe(true);
    expect(report.rules.length).toBeGreaterThan(0);
    expect(Array.isArray(report.matchedKeywords)).toBe(true);
    // The job's missing keyword is named only in the full report.
    expect(report.missingKeywords).toContain("kafka");
  });
});
