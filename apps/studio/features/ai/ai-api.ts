import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

export type AiAction =
  | "rewrite_short_text"
  | "rewrite_section"
  | "generate_section"
  | "generate_portfolio_copy"
  | "generate_cover_letter";

export type AiMode = "standard" | "expert";

export type AiActionPolicy = Record<
  AiAction,
  {
    costs: Record<AiMode, number>;
  }
>;

export type AiGenerateInput = {
  action: AiAction;
  mode: AiMode;
  input: {
    text?: string;
    context?: string;
    jobDescription?: string;
    instructions?: string;
  };
  requestId: string;
  documentId?: string;
};

export type AiGenerateResult = {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  credits: {
    spent: number;
    balance: number;
  };
};

let actionsPromise: Promise<AiActionPolicy> | null = null;

export function getAiActions() {
  actionsPromise ??= fetchApiData<AiActionPolicy>("/ai/actions").catch((error) => {
    actionsPromise = null;
    throw error;
  });
  return actionsPromise;
}

export function generateAiContent(input: AiGenerateInput, signal?: AbortSignal) {
  return fetchApiData<AiGenerateResult>("/ai/generate", {
    method: "POST",
    body: JSON.stringify(input),
    signal,
  });
}

/**
 * Idempotency key for a paid AI request. `crypto.randomUUID` only exists in secure contexts,
 * so a self-hosted studio served over plain HTTP falls back to `getRandomValues`, which
 * does not have that restriction.
 */
export function createRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Whether a failed generate call may be retried under the same request id.
 *
 * Only when the server never answered (network drop, abort, timeout): it may still hold or
 * have committed that reservation, and the same id keeps a retry from charging twice. Once it
 * has answered with an error, the id is spent — a released reservation answers 409 "can no
 * longer be reused" and a committed one 409 "already completed" — so reusing it would fail
 * every retry.
 */
export function canRetryWithSameRequestId(error: unknown): boolean {
  if (error instanceof ApiRequestError) return false;
  if (error instanceof TypeError) return true;

  return (
    error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
