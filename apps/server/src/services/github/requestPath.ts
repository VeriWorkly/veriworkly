import { ApiError } from "#lib/errors";

/**
 * GitHub calls made while a user waits (the profile import and its quota lookup), V-240 / V-243.
 *
 * `fetchGitHubApi` (client.ts) retries with backoff for the background jobs; a request path cannot
 * sit through that, so these calls get one attempt with a deadline, and every failure becomes an
 * answer the studio can act on. Never a 401: the studio reads any 401 as a dead session and signs
 * the user out, while an expired GitHub token only needs the account reconnected.
 *
 * `details.code`:
 * - `GITHUB_RECONNECT_REQUIRED` (409): the user's linked GitHub token was refused.
 * - `GITHUB_RATE_LIMITED` (503): GitHub's rate limit; try again later.
 * - `GITHUB_UNAVAILABLE` (502): GitHub errored, timed out or could not be reached.
 */
export const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "VeriWorkly-App",
} as const;

function unavailable(message = "GitHub could not be reached. Try again in a moment.") {
  return new ApiError(502, message, { code: "GITHUB_UNAVAILABLE" });
}

/** One GitHub GET with a deadline. A network error or timeout is a 502 `GITHUB_UNAVAILABLE`. */
export async function githubGet(url: string, token?: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: token ? { ...GITHUB_HEADERS, Authorization: `Bearer ${token}` } : GITHUB_HEADERS,
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw unavailable();
  }
}

function isRateLimited(response: Response) {
  return (
    response.status === 429 ||
    (response.status === 403 &&
      (response.headers.get("x-ratelimit-remaining") === "0" ||
        response.headers.has("retry-after")))
  );
}

/**
 * The error for a GitHub response that was not OK. `userToken` says whether the call carried the
 * user's own linked token (a 401 then means reconnect) rather than the server's (a 401 then is
 * our configuration, so GitHub is "unavailable" to the user). A 404 is left to the caller.
 */
export function githubFailure(response: Response, userToken: boolean): ApiError {
  if (response.status === 401 && userToken)
    return new ApiError(409, "Your GitHub connection has expired. Reconnect GitHub in settings.", {
      code: "GITHUB_RECONNECT_REQUIRED",
    });
  if (isRateLimited(response))
    return new ApiError(503, "GitHub is limiting requests right now. Try again later.", {
      code: "GITHUB_RATE_LIMITED",
    });
  return unavailable("GitHub did not answer the request. Try again in a moment.");
}
