import { ApiError } from "#lib/errors";

const MAX_GITHUB_FETCH_RETRIES = 3;
const RETRYABLE_GITHUB_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRetryDelayMs(response: Response, attempt: number): number {
  const retryAfterHeader = response.headers.get("retry-after");

  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return Math.min(retryAfterSeconds * 1000, 30_000);
    }
  }

  if (response.status === 429) {
    const rateLimitResetHeader = response.headers.get("x-ratelimit-reset");

    if (rateLimitResetHeader) {
      const resetEpochSeconds = Number.parseInt(rateLimitResetHeader, 10);

      if (Number.isFinite(resetEpochSeconds)) {
        const untilResetMs = resetEpochSeconds * 1000 - Date.now();

        if (untilResetMs > 0) {
          return Math.min(untilResetMs, 30_000);
        }
      }
    }
  }

  const backoffMs = 1000 * 2 ** attempt;
  return Math.min(backoffMs, 10_000);
}

/**
 * Fetch GitHub REST API endpoint with retry handling, exponential backoff,
 * rate limit reset respect, and timeouts.
 */
export async function fetchGitHubApi(
  url: string,
  token?: string,
  options: RequestInit = {},
): Promise<Response> {
  let attempt = 0;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  while (attempt <= MAX_GITHUB_FETCH_RETRIES) {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return response;
    }

    if (
      !RETRYABLE_GITHUB_STATUS_CODES.has(response.status) ||
      attempt === MAX_GITHUB_FETCH_RETRIES
    ) {
      const errorBody = (await response.text()).slice(0, 500);

      throw new ApiError(502, "GitHub API communication failed", {
        status: response.status,
        body: errorBody,
      });
    }

    const delayMs = resolveRetryDelayMs(response, attempt);
    await sleep(delayMs);
    attempt += 1;
  }

  throw new ApiError(502, "GitHub API communication failed");
}
