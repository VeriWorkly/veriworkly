import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const consume = vi.fn();
const refund = vi.fn();
const fetchJobPage = vi.fn();
const check = vi.fn();
const analyze = vi.fn();

vi.mock("#middleware/auth", () => ({
  requireAuthUser: vi.fn(() => ({ id: "user-1" })),
}));

vi.mock("#services/ats/quota", () => ({
  AtsQuotaService: {
    consume: (...args: unknown[]) => consume(...args),
    refund: (...args: unknown[]) => refund(...args),
  },
}));

vi.mock("#services/ats/jobFetch", () => ({
  AtsJobFetchService: { fetch: (...args: unknown[]) => fetchJobPage(...args) },
}));

vi.mock("#services/ats/scoring", () => ({
  AtsScoringService: {
    check: (...args: unknown[]) => check(...args),
    flattenResume: (resume: unknown) => String(resume),
  },
}));

vi.mock("#services/ats/ai", () => ({
  AtsAiService: { analyze: (...args: unknown[]) => analyze(...args) },
}));

/**
 * Repair is opt-in. Defaulted off here so the quota assertions below stay meaningful — they
 * would prove nothing if an unrequested repair could spend credits behind them — and switched
 * on individually by the cases that exercise the offer.
 */
const needsRepairMock = vi.fn(() => false);
const repairMock = vi.fn();

vi.mock("#services/ats/repair", () => ({
  needsRepair: (...args: unknown[]) => needsRepairMock(...(args as [])),
  AtsRepairService: { repair: (...args: unknown[]) => repairMock(...args) },
}));

vi.mock("#utils/requestIp", () => ({
  getRequestIpDetails: vi.fn(() => ({ resolvedIp: "203.0.113.9" })),
}));

const { AtsAiController } = await import("#controllers/ats/aiController");
const { ApiError } = await import("#lib/errors");

function requestFor(body: Record<string, unknown>) {
  return { body, authUser: { id: "user-1" } } as unknown as Request;
}

function responseSpy() {
  const json = vi.fn();
  return { res: { json } as unknown as Response, json };
}

const baseBody = {
  resume: "Jane Doe jane@example.com Experience Skills",
  requestId: "request-id-1234",
  jobUrl: "https://jobs.example.com/role",
  fetchJobUrl: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  needsRepairMock.mockReturnValue(false);
  check.mockReturnValue({ version: "ats-v2", failedChecks: [], prioritizedFixes: [] });
  analyze.mockResolvedValue({ ai: null, creditsSpent: 0, routed: true });
  fetchJobPage.mockResolvedValue("a job description long enough to score");
  consume.mockResolvedValue({ tier: "free", limit: 2, used: 1, remaining: 1 });
  refund.mockResolvedValue({ tier: "free", limit: 2, used: 0, remaining: 2 });
});

describe("POST /ats/analyze — quota gates outbound egress", () => {
  /**
   * The ordering here is the whole point. Fetching the caller-supplied job URL before metering
   * meant a user already at their limit could still make the server issue an arbitrary HTTPS
   * request on every attempt — the 429 only landed after the page had been downloaded. This
   * test fails if that ordering is ever restored.
   */
  it("never fetches the job page when the caller is out of quota", async () => {
    consume.mockRejectedValue(new ApiError(429, "ATS scan quota exceeded."));
    const next = vi.fn() as unknown as NextFunction;
    const { res } = responseSpy();

    await AtsAiController.analyze(requestFor(baseBody), res, next);

    expect(consume).toHaveBeenCalledTimes(1);
    expect(fetchJobPage).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));
  });

  it("consumes quota before fetching, not after", async () => {
    const order: string[] = [];
    consume.mockImplementation(async () => {
      order.push("consume");
      return { tier: "free", limit: 2, used: 2, remaining: 0 };
    });
    fetchJobPage.mockImplementation(async () => {
      order.push("fetch");
      return "a job description long enough to score";
    });

    await AtsAiController.analyze(requestFor(baseBody), responseSpy().res, vi.fn());

    expect(order).toEqual(["consume", "fetch"]);
  });

  it("rejects a URL fetch request that supplies no URL, before spending anything", async () => {
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(
      requestFor({ ...baseBody, jobUrl: undefined }),
      responseSpy().res,
      next,
    );

    expect(consume).not.toHaveBeenCalled();
    expect(fetchJobPage).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it("does not touch the network when the caller pasted the description instead", async () => {
    await AtsAiController.analyze(
      requestFor({
        resume: baseBody.resume,
        requestId: baseBody.requestId,
        jobDescription: "pasted description",
        fetchJobUrl: false,
      }),
      responseSpy().res,
      vi.fn(),
    );

    expect(consume).toHaveBeenCalledTimes(1);
    expect(fetchJobPage).not.toHaveBeenCalled();
    expect(check).toHaveBeenCalledWith(baseBody.resume, "pasted description", undefined);
  });

  it("flattens the resume once and hands the same text to scoring and to the model", async () => {
    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      responseSpy().res,
      vi.fn(),
    );

    const scoredText = check.mock.calls[0][0];
    expect(analyze.mock.calls[0][2]).toBe(scoredText);
  });

  it("passes uploaded page geometry through to the scoring pass", async () => {
    const layout = { columnRatio: 0.6, tableCount: 2, pageCount: 1 };

    await AtsAiController.analyze(
      requestFor({
        resume: baseBody.resume,
        requestId: baseBody.requestId,
        jobDescription: "pasted description",
        fetchJobUrl: false,
        layout,
      }),
      responseSpy().res,
      vi.fn(),
    );

    expect(check).toHaveBeenCalledWith(baseBody.resume, "pasted description", layout);
  });

  /**
   * Being unable to route a model is a configuration failure on our side. Charging a scan for
   * it and returning a 200 the caller cannot tell apart from an analysis that found nothing was
   * the worst of both: the user lost one of two daily scans and was never told why.
   */
  it("refunds the scan and says so when no model could be routed", async () => {
    analyze.mockResolvedValue({ ai: null, creditsSpent: 0, routed: false });
    const { res, json } = responseSpy();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      res,
      vi.fn(),
    );

    expect(refund).toHaveBeenCalledWith("user-1", "203.0.113.9");
    expect(json.mock.calls[0][0].data).toMatchObject({
      aiStatus: "unavailable",
      quota: { remaining: 2 },
    });
  });

  it("does not refund when the analysis actually ran", async () => {
    const { res, json } = responseSpy();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      res,
      vi.fn(),
    );

    expect(refund).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].data).toMatchObject({ aiStatus: "ok" });
  });
});

/**
 * Parse repair spends credits, so the contract that matters is that it cannot run unasked.
 * A thin parse advertises the option; only an explicit `repairParse` actually buys it.
 */
describe("POST /ats/analyze — parse repair is offered, not imposed", () => {
  it("advertises repair on a thin parse without running it", async () => {
    needsRepairMock.mockReturnValue(true);
    const { res, json } = responseSpy();

    await AtsAiController.analyze(requestFor({ ...baseBody }), res, vi.fn());

    expect(repairMock).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].data.repair).toMatchObject({
      available: true,
      applied: false,
      fields: [],
      creditsSpent: 0,
    });
  });

  it("does not offer repair when the deterministic parse was good enough", async () => {
    needsRepairMock.mockReturnValue(false);
    const { res, json } = responseSpy();

    await AtsAiController.analyze(requestFor({ ...baseBody, repairParse: true }), res, vi.fn());

    // Opted in, but there is nothing to repair — so nothing is charged.
    expect(repairMock).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].data.repair).toMatchObject({ available: false, applied: false });
  });

  it("runs repair when asked, and names the fields a model supplied", async () => {
    needsRepairMock.mockReturnValue(true);
    check.mockReturnValue({
      version: "ats-v2",
      failedChecks: [],
      prioritizedFixes: [],
      parsed: { name: "", email: "", phone: "", roles: [], education: [], skills: [] },
    });
    repairMock.mockResolvedValue({
      repaired: {
        name: "Jane Doe",
        email: "",
        phone: "",
        roles: [{ title: "Engineer", employer: "Acme", start: null, end: null, current: false }],
        education: [],
        skills: [],
      },
      creditsSpent: 2,
      rejectedValues: 1,
    });
    const { res, json } = responseSpy();

    await AtsAiController.analyze(requestFor({ ...baseBody, repairParse: true }), res, vi.fn());

    expect(repairMock).toHaveBeenCalledTimes(1);
    expect(json.mock.calls[0][0].data.repair).toMatchObject({
      available: true,
      applied: true,
      creditsSpent: 2,
      // Surfaced so the grounding check is visibly working rather than merely trusted.
      rejectedValues: 1,
    });
    // Only the fields the parser left empty and the model filled — provenance, not a blanket flag.
    expect(json.mock.calls[0][0].data.repair.fields).toEqual(["name", "roles"]);
  });
});
