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
    defaultHeaders: config.ai.siteUrl ? { "HTTP-Referer": config.ai.siteUrl } : undefined,
  });

  return client;
}
