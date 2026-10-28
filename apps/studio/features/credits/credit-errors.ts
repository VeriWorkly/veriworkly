import { freeLimitMessage } from "@/features/documents/services/document-limit";
import { ApiRequestError } from "@/utils/fetchApiData";

export type PaidActionError = { message: string; buyCredits: boolean };

/** How long a restarting server asks to wait when it does not say: its own `Retry-After: 5`. */
const DEFAULT_RESTART_WAIT_SECONDS = 5;

/**
 * An AI route cut off by a server restart (V-313): 503 `SERVER_RESTARTING` with `Retry-After`.
 * The server hands the scan or the credits back, so nothing was charged; what the user typed stays
 * where it is and they only need to send it again.
 */
export function serverRestartingMessage(error: unknown): string | null {
  if (!(error instanceof ApiRequestError) || error.code !== "SERVER_RESTARTING") return null;

  const seconds = Math.max(1, Math.ceil(error.retryAfterSeconds ?? DEFAULT_RESTART_WAIT_SECONDS));

  return `The server is restarting; try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}. Nothing was charged.`;
}

/**
 * What to tell the user when a priced AI action fails. A 402 is either an empty wallet ("Not
 * enough AI credits.") or an action the account cannot use yet; both are fixed on /billing, so
 * both offer the way there. A restart (503 `SERVER_RESTARTING`) says when to try again. Anything
 * else keeps the server's own message.
 */
export function describePaidActionError(error: unknown, fallback: string): PaidActionError {
  const restarting = serverRestartingMessage(error);
  if (restarting) return { message: restarting, buyCredits: false };

  // A paid action that would make a document an account has no room for is refused before the
  // charge (V-201): credits do not lift the limit, so none are offered.
  if (error instanceof ApiRequestError && error.code === "DOCUMENT_LIMIT") {
    const type = (error.details as { type?: unknown }).type;
    return {
      message: freeLimitMessage(type === "COVER_LETTER" ? "COVER_LETTER" : "RESUME"),
      buyCredits: false,
    };
  }

  if (error instanceof ApiRequestError && error.status === 402) {
    return {
      message: /^not enough/i.test(error.message) ? "Not enough credits." : error.message,
      buyCredits: true,
    };
  }

  return { message: error instanceof Error ? error.message : fallback, buyCredits: false };
}
