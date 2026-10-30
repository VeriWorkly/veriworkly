/**
 * Server error reports with a budget. During a backend outage every uncached render throws the
 * same error, so without one the reports and stderr lines grow one for one with requests.
 */

export type ErrorReport = {
  at: string;
  app: "site";
  name: string;
  message: string;
  digest?: string;
  path: string;
  method: string;
  routePath: string;
  routeType: string;
  renderSource?: string;
  revalidateReason?: string;
  /** Repeats of this error dropped since its last report. */
  suppressed?: number;
};

type ReporterOptions = {
  reportUrl?: string;
  now?: () => number;
  send?: typeof fetch;
  log?: (...args: unknown[]) => void;
};

/** The same error is reported at most once per window. */
export const DEDUPE_WINDOW_MS = 60_000;
/** Distinct errors tracked at once; the oldest is forgotten first. */
export const MAX_TRACKED_ERRORS = 100;
/** Report POSTs in flight at once; more are dropped (and counted) instead of queued. */
export const MAX_IN_FLIGHT = 8;
/** After a failed POST the receiver is left alone this long; reports go to stderr instead. */
export const RECEIVER_BACKOFF_MS = 60_000;

const MAX_PATH = 256;
const MAX_MESSAGE = 500;

export function createErrorReporter({
  reportUrl,
  now = Date.now,
  send = fetch,
  log = console.error,
}: ReporterOptions = {}) {
  const seen = new Map<string, { at: number; suppressed: number }>();
  let inFlight = 0;
  let receiverDownUntil = 0;
  let pendingSummary = 0;
  let summaryTimer: ReturnType<typeof setInterval> | undefined;

  const summarize = () => {
    if (pendingSummary > 0)
      log(`[request-error] suppressed ${pendingSummary} repeated or dropped reports`);
    pendingSummary = 0;
  };

  const suppress = (key: string | null) => {
    pendingSummary++;
    if (key) seen.get(key)!.suppressed++;
    if (!summaryTimer) {
      summaryTimer = setInterval(summarize, DEDUPE_WINDOW_MS);
      summaryTimer.unref?.();
    }
  };

  const toStderr = (report: ErrorReport) => log("[request-error]", JSON.stringify(report));

  return async function report(input: Omit<ErrorReport, "at" | "app">) {
    const at = now();
    const key = input.digest || `${input.name}:${input.message}:${input.routePath}`;
    const previous = seen.get(key);

    if (previous && at - previous.at < DEDUPE_WINDOW_MS) {
      suppress(key);
      return;
    }

    seen.delete(key);
    seen.set(key, { at, suppressed: 0 });
    if (seen.size > MAX_TRACKED_ERRORS) seen.delete(seen.keys().next().value!);

    const payload: ErrorReport = {
      ...input,
      at: new Date(at).toISOString(),
      app: "site",
      message: input.message.slice(0, MAX_MESSAGE),
      path: input.path.slice(0, MAX_PATH),
      ...(previous?.suppressed ? { suppressed: previous.suppressed } : {}),
    };

    if (!reportUrl || at < receiverDownUntil) {
      toStderr(payload);
      return;
    }

    if (inFlight >= MAX_IN_FLIGHT) {
      suppress(null);
      return;
    }

    inFlight++;
    try {
      const response = await send(reportUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) throw new Error(`receiver answered ${response.status}`);
    } catch (cause) {
      // One line when the receiver starts failing, then stderr only until the backoff ends.
      if (at >= receiverDownUntil)
        log(
          "[request-error] report failed, reporting to stderr for 60 s:",
          cause instanceof Error ? cause.message : String(cause),
        );
      receiverDownUntil = now() + RECEIVER_BACKOFF_MS;
      toStderr(payload);
    } finally {
      inFlight--;
    }
  };
}
