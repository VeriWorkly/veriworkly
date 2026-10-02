/**
 * Just enough of `fetch` for the adapters.
 *
 * The package compiles without DOM or Node types so that nothing runtime-specific leaks into
 * the browser build, which means the platform's `fetch` and `AbortSignal` are described here
 * structurally rather than imported. Every runtime the package targets — Node
 * 20.19+, browsers, edge workers — provides them.
 */

import { isRetryableStatus, LlmProviderError, type AbortSignalLike } from "./provider.js";

export type { AbortSignalLike };

export type FetchResponseLike = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

export type FetchLike = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignalLike;
  },
) => Promise<FetchResponseLike>;

const platform = globalThis as unknown as {
  fetch?: FetchLike;
  AbortSignal: {
    timeout(ms: number): AbortSignalLike;
    any(signals: AbortSignalLike[]): AbortSignalLike;
  };
};

/** Options every HTTP adapter accepts. */
export type HttpOptions = {
  /** Per-attempt timeout. Defaults to 120 s. */
  timeoutMs?: number;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Defaults to the global `fetch`. */
  fetch?: FetchLike;
};

/** Thrown when the caller's own signal aborted the call. Never retried. */
export class AbortedError extends Error {
  constructor(cause?: unknown) {
    super("The request was aborted.", { cause });
    this.name = "AbortError";
  }
}

/**
 * POSTs `body` as JSON and returns the parsed JSON response.
 *
 * Every failure becomes an `LlmProviderError` with the shared retry rule applied, except an
 * abort the caller asked for, which is an `AbortedError` — the caller has stopped waiting, so
 * there is nothing to retry for. A timeout is the adapter's own abort and is retryable.
 */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  options: HttpOptions & { signal?: AbortSignalLike },
): Promise<unknown> {
  const fetchImpl = options.fetch ?? platform.fetch;
  if (!fetchImpl) throw new LlmProviderError("No fetch implementation.", { retryable: false });
  if (options.signal?.aborted) throw new AbortedError(options.signal.reason);

  const timeout = platform.AbortSignal.timeout(options.timeoutMs ?? 120_000);
  const signal = options.signal ? platform.AbortSignal.any([options.signal, timeout]) : timeout;

  let response: FetchResponseLike;
  let raw: string;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
    raw = await response.text();
  } catch (error) {
    if (options.signal?.aborted) throw new AbortedError(error);
    throw new LlmProviderError(timeout.aborted ? "Provider request timed out." : "Network error.", {
      retryable: true,
      cause: error,
    });
  }

  if (!response.ok) {
    throw new LlmProviderError(`Provider returned HTTP ${response.status}: ${raw.slice(0, 500)}`, {
      status: response.status,
      retryable: isRetryableStatus(response.status),
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new LlmProviderError("Provider returned a body that is not JSON.", {
      status: response.status,
      retryable: true,
      cause: error,
    });
  }
  // Adapters read fields off the body; anything but an object is a bad response, not a crash.
  if (!json || typeof json !== "object" || Array.isArray(json))
    throw new LlmProviderError("Provider returned JSON that is not an object.", {
      status: response.status,
      retryable: true,
    });
  return json;
}
