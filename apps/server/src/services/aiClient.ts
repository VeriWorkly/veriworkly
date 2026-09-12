import OpenAI from "openai";

import { config } from "#config";
import { ApiError } from "#lib/errors";

let client: OpenAI | null = null;

export function createAiClient() {
  if (client) return client;

  if (!config.ai.apiKey) {
    throw new ApiError(503, "AI provider credentials are not configured.");
  }

  client = new OpenAI({
    apiKey: config.ai.apiKey,
    baseURL: config.ai.baseUrl,
    timeout: config.ai.timeoutMs,
    /**
     * The SDK retries twice by default. Callers that wrap a retry loop around a request —
     * `AtsAiService.analyze` does — would otherwise multiply the two together and bill every
     * attempt: a policy asking for 2 retries becomes 9 provider calls, not 3, and the extra
     * six are invisible because the SDK swallows them below the call site.
     *
     * Retrying is a caller decision here: only the caller knows whether a failure is worth
     * paying to repeat, and `withRetries` already declines to repeat the ones that aren't.
     * So the transport performs none of its own.
     */
    maxRetries: 0,
    defaultHeaders: config.ai.siteUrl ? { "HTTP-Referer": config.ai.siteUrl } : undefined,
  });

  return client;
}
