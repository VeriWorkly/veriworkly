import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const consume = vi.fn();
const refund = vi.fn();
const fetchJobPage = vi.fn();
const check = vi.fn();
const analyze = vi.fn();
const getWallet = vi.fn();

vi.mock("#middleware/auth", () => ({
  requireAuthUser: vi.fn(() => ({ id: "user-1" })),
}));

// The in-flight cap is covered by the limiter's own tests; here it only has to let work through.
vi.mock("#middleware/rateLimit", () => ({
  withAiSlot: (_userId: string, work: () => Promise<unknown>) => work(),
}));

vi.mock("#services/creditService", () => ({
  CreditService: {
    getWallet: (...args: unknown[]) => getWallet(...args),
    // No stored analysis: every request here is a first attempt (replays are integration-tested).
    storedResult: async () => null,
    attachReplay: async () => undefined,
  },
  replayFingerprint: () => "fingerprint",
}));

vi.mock("#services/ats/aiPolicy", () => ({
  publicAtsPolicy: () => ({
    analysisCredits: { min: 5, max: 25 },
    jobUrlAnalysisCredits: { min: 10, max: 50 },
    resumeConversionCredits: 25,
    parseRepairCredits: 2,
  }),
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
    prepare: (resume: unknown) => ({ text: String(resume), document: null }),
  },
}));

vi.mock("#services/ats/ai", () => ({
  ANALYSIS_ACTION: "ats_analysis",
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
  AtsRepairService: { repair: (...args: unknown[]) => repairMock(...args) },
}));

// Only the repair trigger is replaced; report shaping stays the real implementation.
vi.mock("@veriworkly/ats-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@veriworkly/ats-engine")>()),
  needsRepair: (...args: unknown[]) => needsRepairMock(...(args as [])),
}));

vi.mock("#utils/requestIp", () => ({
  getRequestIpDetails: vi.fn(() => ({ resolvedIp: "203.0.113.9" })),
}));

const { AtsAiController } = await import("#controllers/ats/aiController");
const { ApiError } = await import("#lib/errors");

function requestFor(body: Record<string, unknown>) {
  return { body, authUser: { id: "user-1" } } as unknown as Request;
}

/** Enough of a response for the controller to build its abort signal on and answer through. */
function responseSpy() {
  const json = vi.fn();
  const res = { json, once: vi.fn(), writableFinished: false } as unknown as Response;
  return { res, json };
}

/** A repair outcome the way `AtsRepairService.repair` now returns it: charged only on commit. */
function repairOutcome(overrides: Record<string, unknown> = {}) {
  return {
    repaired: null,
    creditsSpent: 2,
    rejectedValues: 0,
    commit: vi.fn(async () => undefined),
    release: vi.fn(async () => undefined),
    ...overrides,
  };
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
  getWallet.mockResolvedValue({ available: 100 });
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
    expect(check).toHaveBeenCalledWith(expect.objectContaining({ text: baseBody.resume }), {
      jobDescription: "pasted description",
      layout: undefined,
    });
  });

  it("reads the resume once and hands the same text to scoring and to the model", async () => {
    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      responseSpy().res,
      vi.fn(),
    );

    const prepared = check.mock.calls[0][0] as { text: string };
    expect(analyze.mock.calls[0][2]).toBe(prepared.text);
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

    expect(check).toHaveBeenCalledWith(expect.objectContaining({ text: baseBody.resume }), {
      jobDescription: "pasted description",
      layout,
    });
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

    expect(refund).toHaveBeenCalledWith(
      "user-1",
      "203.0.113.9",
      expect.objectContaining({ tier: "free" }),
      expect.any(Function),
    );
    expect(json.mock.calls[0][0].data).toMatchObject({
      aiStatus: "unavailable",
      quota: { remaining: 2 },
    });
  });

  /**
   * V-388: the refund decrements and then reads the summary back. If the read after the
   * decrement throws, the scan is already back: refunding again (the outer catch used to) handed
   * back two scans for one. If the failure came before the decrement, nothing went back yet and
   * the refund is tried once more, or the scan is lost. `refund` reports the decrement through
   * its `onReturned` callback, which is how the two are told apart.
   */
  const unrouted = async () => {
    analyze.mockResolvedValue({ ai: null, creditsSpent: 0, routed: false });
    const { res, json } = responseSpy();
    const next = vi.fn();
    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].data.aiStatus).toBe("unavailable");
  };

  it("does not refund again when the read after the decrement fails", async () => {
    refund.mockImplementation(async (...args: unknown[]) => {
      (args[3] as () => void)();
      throw new Error("Redis GET failed after the DECR");
    });

    await unrouted();

    expect(refund).toHaveBeenCalledTimes(1);
  });

  it("tries the refund once more when it failed before the decrement", async () => {
    refund
      .mockRejectedValueOnce(new Error("Redis down before the DECR"))
      .mockImplementationOnce(async (...args: unknown[]) => {
        (args[3] as () => void)();
        return { tier: "free", remaining: 2 };
      });

    await unrouted();

    expect(refund).toHaveBeenCalledTimes(2);
  });

  it("gives up after a second failure before the decrement, and still answers", async () => {
    refund.mockRejectedValue(new Error("Redis down"));

    await unrouted();

    expect(refund).toHaveBeenCalledTimes(2);
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
 * V-035: the wallet is checked before the scan is metered and before the job page is fetched.
 * A zero-credit account used to be metered, make the server fetch its URL, and only then get
 * the 402 from the reservation — which refunded the scan, so the fetch cost it nothing.
 */
describe("POST /ats/analyze — the balance gate comes before the fetch", () => {
  it("answers 402 before consuming a scan or fetching when the wallet cannot cover an analysis", async () => {
    getWallet.mockResolvedValue({ available: 0 });
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(requestFor(baseBody), responseSpy().res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 402 }));
    expect(consume).not.toHaveBeenCalled();
    expect(fetchJobPage).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
  });

  it("prices the gate at the online rate when a job URL will be fetched", async () => {
    // Covers a pasted analysis (5) but not a fetched one (10).
    getWallet.mockResolvedValue({ available: 7 });

    const pasted = vi.fn() as unknown as NextFunction;
    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      responseSpy().res,
      pasted,
    );
    expect(pasted).not.toHaveBeenCalled();
    expect(analyze).toHaveBeenCalledTimes(1);

    const fetched = vi.fn() as unknown as NextFunction;
    await AtsAiController.analyze(requestFor(baseBody), responseSpy().res, fetched);
    expect(fetched).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 402 }));
    expect(fetchJobPage).not.toHaveBeenCalled();
  });

  it("keeps the scan spent when the reservation answers 402 because the wallet changed after the fetch", async () => {
    analyze.mockRejectedValue(new ApiError(402, "Not enough AI credits."));
    // Enough at the gate; spent elsewhere by the time the analysis reserved.
    getWallet.mockResolvedValueOnce({ available: 100 }).mockResolvedValue({ available: 3 });
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(requestFor(baseBody), responseSpy().res, next);

    expect(fetchJobPage).toHaveBeenCalledTimes(1);
    expect(refund).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 402 }));
  });

  it("V-327: keeps the scan spent on a 402 from a dearer bucket too, so a fetch is never free to repeat", async () => {
    analyze.mockRejectedValue(new ApiError(402, "Not enough AI credits."));
    // Covers the online minimum (10) but not the bucket a long posting routed to (up to 50), and
    // the wallet did not change. Refunding would let the same request fetch the page forever.
    getWallet.mockResolvedValue({ available: 30 });
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(requestFor(baseBody), responseSpy().res, next);
    await AtsAiController.analyze(requestFor(baseBody), responseSpy().res, next);

    expect(fetchJobPage).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenCalledTimes(2);
    expect(refund).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 402 }));
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
    repairMock.mockResolvedValue(
      repairOutcome({
        repaired: {
          name: "Jane Doe",
          email: "",
          phone: "",
          roles: [{ title: "Engineer", employer: "Acme", start: null, end: null, current: false }],
          education: [],
          skills: [],
          provenance: {
            name: "ai",
            email: "none",
            phone: "none",
            roles: "ai",
            education: "none",
            skills: "none",
          },
        },
        creditsSpent: 2,
        rejectedValues: 1,
      }),
    );
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

  it("says when the model found nothing to add, and charges nothing", async () => {
    const { AtsAiError } = await import("@veriworkly/ats-engine/ai");
    needsRepairMock.mockReturnValue(true);
    repairMock.mockRejectedValue(new AtsAiError("unusable", "The reply filled no field."));
    const { res, json } = responseSpy();

    await AtsAiController.analyze(requestFor({ ...baseBody, repairParse: true }), res, vi.fn());

    expect(json.mock.calls[0][0].data.repair).toMatchObject({
      available: true,
      applied: false,
      creditsSpent: 0,
      unusable: true,
    });
  });
});

/**
 * Credit reservations are unique per request id, and the scan quota is spent before any model
 * runs. These pin the accounting: repair and analysis never share an id, an optional repair
 * that fails does not take the analysis down with it, and a failure after metering refunds.
 */
describe("POST /ats/analyze — credits and quota survive failures", () => {
  const thinParse = () => {
    needsRepairMock.mockReturnValue(true);
    check.mockReturnValue({
      version: "ats-v2",
      failedChecks: [],
      prioritizedFixes: [],
      parsed: {
        name: "",
        email: "",
        phone: "",
        roles: [],
        education: [],
        skills: [],
        provenance: {
          name: "none",
          email: "none",
          phone: "none",
          roles: "none",
          education: "none",
          skills: "none",
        },
      },
    });
  };

  it("reserves repair credits under a different id from the analysis", async () => {
    thinParse();
    repairMock.mockResolvedValue(repairOutcome());

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, repairParse: true }),
      responseSpy().res,
      vi.fn(),
    );

    const repairId = repairMock.mock.calls[0][1];
    const analysisId = analyze.mock.calls[0][1];
    expect(repairId).not.toBe(analysisId);
    expect(analysisId).toBe(baseBody.requestId);
  });

  it("still runs the analysis when the optional repair fails", async () => {
    thinParse();
    repairMock.mockRejectedValue(new ApiError(502, "AI parse repair could not be completed."));
    const { res, json } = responseSpy();
    const next = vi.fn();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, repairParse: true }),
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(json.mock.calls[0][0].data.repair).toMatchObject({ applied: false, creditsSpent: 0 });
    expect(refund).not.toHaveBeenCalled();
  });

  it("refunds the scan when the analysis fails after metering", async () => {
    analyze.mockRejectedValue(new ApiError(502, "AI ATS analysis could not be completed."));
    const next = vi.fn();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      responseSpy().res,
      next,
    );

    expect(refund).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
  });

  it("does not refund a failed job-page fetch, so fetching is never free", async () => {
    fetchJobPage.mockRejectedValue(new ApiError(400, "Could not read the job page."));
    const next = vi.fn();

    await AtsAiController.analyze(requestFor({ ...baseBody }), responseSpy().res, next);

    expect(refund).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  /**
   * V-036: the repair is paid for only when the analysis it was done for is delivered. It used
   * to commit its own reservation at once, so an analysis that then failed refunded the scan,
   * discarded the repaired parse, and kept the repair credits.
   */
  it("releases the repair when the analysis fails, and never commits it", async () => {
    thinParse();
    const repair = repairOutcome();
    repairMock.mockResolvedValue(repair);
    analyze.mockRejectedValue(new ApiError(502, "AI ATS analysis could not be completed."));
    const next = vi.fn();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, repairParse: true }),
      responseSpy().res,
      next,
    );

    expect(repair.release).toHaveBeenCalledTimes(1);
    expect(repair.commit).not.toHaveBeenCalled();
    expect(refund).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
  });

  it("commits the repair once the analysis has succeeded", async () => {
    thinParse();
    const repair = repairOutcome();
    repairMock.mockResolvedValue(repair);
    const { res, json } = responseSpy();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, repairParse: true }),
      res,
      vi.fn(),
    );

    expect(repair.commit).toHaveBeenCalledTimes(1);
    expect(repair.release).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].data.repair).toMatchObject({ creditsSpent: 2 });
  });

  it("reports the repair as unspent when the ledger refuses the late commit", async () => {
    thinParse();
    const repair = repairOutcome({
      commit: vi.fn(async () => {
        throw new ApiError(409, "AI credit reservation is no longer pending.");
      }),
    });
    repairMock.mockResolvedValue(repair);
    const { res, json } = responseSpy();
    const next = vi.fn();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, repairParse: true }),
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].data.repair).toMatchObject({ creditsSpent: 0 });
  });

  /** V-034: one signal per request, so the client leaving ends whichever call is running. */
  it("hands repair and analysis the same abort signal", async () => {
    thinParse();
    repairMock.mockResolvedValue(repairOutcome());

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, repairParse: true }),
      responseSpy().res,
      vi.fn(),
    );

    const repairSignal = repairMock.mock.calls[0][4];
    const analysisSignal = analyze.mock.calls[0][6];
    expect(repairSignal).toBeInstanceOf(AbortSignal);
    expect(analysisSignal).toBe(repairSignal);
  });

  it("still surfaces the original error when the scan refund itself fails", async () => {
    analyze.mockRejectedValue(new ApiError(502, "AI ATS analysis could not be completed."));
    refund.mockRejectedValue(new Error("Redis client not ready"));
    const next = vi.fn();

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      responseSpy().res,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
  });
});

describe("POST /ats/analyze — the balance gate and the scan refund, revisited", () => {
  it("counts the requested repair in the gate, so the scan is never lost to the repair's 402", async () => {
    needsRepairMock.mockReturnValue(true);
    // Covers the analysis (5) but not analysis + repair (5 + 2).
    getWallet.mockResolvedValue({ available: 6 });
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(
      requestFor({
        ...baseBody,
        fetchJobUrl: false,
        jobDescription: "pasted description",
        repairParse: true,
      }),
      responseSpy().res,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 402 }));
    expect(consume).not.toHaveBeenCalled();

    getWallet.mockResolvedValue({ available: 7 });
    const enough = vi.fn() as unknown as NextFunction;
    await AtsAiController.analyze(
      requestFor({
        ...baseBody,
        fetchJobUrl: false,
        jobDescription: "pasted description",
        repairParse: true,
      }),
      responseSpy().res,
      enough,
    );
    expect(enough).not.toHaveBeenCalled();
  });

  it("refunds the scan on a 402 when no job page was fetched", async () => {
    analyze.mockRejectedValue(new ApiError(402, "Not enough AI credits."));
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted description" }),
      responseSpy().res,
      next,
    );

    expect(fetchJobPage).not.toHaveBeenCalled();
    expect(refund).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 402 }));
  });

  it("builds the abort signal before the job fetch and reserves nothing for a client already gone", async () => {
    const json = vi.fn();
    const res = {
      json,
      once: vi.fn(),
      writableFinished: false,
      destroyed: false,
    } as unknown as Response & { destroyed: boolean };
    fetchJobPage.mockImplementation(async () => {
      // The client leaves while the page is being fetched.
      res.destroyed = true;
      const closeHandler = (res.once as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
        (() => void) | undefined;
      closeHandler?.();
      return "a job description long enough to score";
    });
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(requestFor(baseBody), res, next);

    expect(fetchJobPage).toHaveBeenCalledTimes(1);
    expect(analyze).not.toHaveBeenCalled();
    // V-241: the page was fetched on the scan's strength; leaving does not hand the scan back.
    expect(refund).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 504 }));
  });

  it("V-241: hands the job fetch the request's abort signal", async () => {
    const { res } = responseSpy();
    await AtsAiController.analyze(requestFor(baseBody), res, vi.fn() as unknown as NextFunction);

    expect(fetchJobPage).toHaveBeenCalledWith(baseBody.jobUrl, expect.any(AbortSignal));
  });

  it("V-241: an analysis that times out after the page was fetched keeps the scan spent", async () => {
    analyze.mockRejectedValue(new ApiError(504, "The AI request timed out."));
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(requestFor(baseBody), responseSpy().res, next);

    expect(fetchJobPage).toHaveBeenCalledTimes(1);
    expect(refund).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 504 }));
  });

  it("V-241: a 504 with no page fetched still returns the scan", async () => {
    analyze.mockRejectedValue(new ApiError(504, "The AI request timed out."));
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(
      requestFor({ ...baseBody, fetchJobUrl: false, jobDescription: "pasted text" }),
      responseSpy().res,
      next,
    );

    expect(refund).toHaveBeenCalledTimes(1);
  });
});

/** V-178: repair is priced and charged only when it can actually run and be delivered. */
describe("POST /ats/analyze — parse repair is charged only when it is delivered", () => {
  it("leaves the repair price out of the gate when the parse needs no repair", async () => {
    needsRepairMock.mockReturnValue(false);
    // Covers the analysis (5) but not analysis + repair (5 + 2): enough, as no repair will run.
    getWallet.mockResolvedValue({ available: 6 });
    const next = vi.fn() as unknown as NextFunction;

    await AtsAiController.analyze(
      requestFor({
        ...baseBody,
        fetchJobUrl: false,
        jobDescription: "pasted description",
        repairParse: true,
      }),
      responseSpy().res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(consume).toHaveBeenCalledTimes(1);
    expect(repairMock).not.toHaveBeenCalled();
  });

  it("releases the repair, and reports it unspent, when no analysis model could be routed", async () => {
    needsRepairMock.mockReturnValue(true);
    const outcome = repairOutcome();
    repairMock.mockResolvedValue(outcome);
    analyze.mockResolvedValue({ ai: null, creditsSpent: 0, routed: false });
    const { res, json } = responseSpy();

    await AtsAiController.analyze(requestFor({ ...baseBody, repairParse: true }), res, vi.fn());

    expect(outcome.release).toHaveBeenCalledTimes(1);
    expect(outcome.commit).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].data.aiStatus).toBe("unavailable");
    expect(json.mock.calls[0][0].data.repair.creditsSpent).toBe(0);
    expect(refund).toHaveBeenCalledTimes(1);
  });
});
