import { afterEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL ??= "http://127.0.0.1:1/api/v1";

/** Each `/ats/extract` call spends an upload from the visitor's quota, and its answer can arrive after they moved on. */

const RESUME_TEXT = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");

/** A fetch that answers only when the test says so, recording the signal it was given. */
function heldFetch() {
  const calls: { signal: AbortSignal; answer: () => void }[] = [];
  const fetchMock = vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        calls.push({
          signal: init!.signal!,
          answer: () =>
            resolve(Response.json({ success: true, message: "ok", data: { text: RESUME_TEXT } })),
        });
      }),
  );
  return { calls, fetchMock };
}

const pdf = (name = "cv.pdf") => new File(["%PDF"], name, { type: "application/pdf" });

describe("resume file reads", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ignores a second file while one is read: one extract, one quota spent (W-099)", async () => {
    const { calls, fetchMock } = heldFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { createResumeReader } = await import("@/features/ats-checker/services/resume-reader");

    const reader = createResumeReader();
    const first = reader.read(pdf());
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    expect(reader.busy).toBe(true);
    await expect(reader.read(pdf("other.pdf"))).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    calls[0]!.answer();
    await expect(first).resolves.toMatchObject({ ok: true, input: RESUME_TEXT, words: 40 });
    expect(reader.busy).toBe(false);
  });

  it("cancelling aborts the request and drops a late answer (W-100)", async () => {
    const { calls, fetchMock } = heldFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { createResumeReader } = await import("@/features/ats-checker/services/resume-reader");

    const reader = createResumeReader();
    const pending = reader.read(pdf());
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    reader.cancel();
    expect(calls[0]!.signal.aborted).toBe(true);
    expect(reader.busy).toBe(false);

    // The server answers anyway: the visitor pasted text since, and that must stay.
    calls[0]!.answer();
    await expect(pending).resolves.toBeNull();
  });

  it("a cancelled read does not block the next file", async () => {
    const { calls, fetchMock } = heldFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { createResumeReader } = await import("@/features/ats-checker/services/resume-reader");

    const reader = createResumeReader();
    const stale = reader.read(pdf());
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    reader.cancel();

    const fresh = reader.read(pdf("new.pdf"));
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[0]!.answer();
    calls[1]!.answer();

    await expect(stale).resolves.toBeNull();
    await expect(fresh).resolves.toMatchObject({ ok: true });
  });
});
