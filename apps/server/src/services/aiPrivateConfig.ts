import { readFileSync } from "node:fs";

import { config } from "#config";
import { ApiError } from "#lib/errors";

let cachedConfig: unknown;

export function getPrivateAiConfig() {
  if (cachedConfig) return cachedConfig;

  const source = config.ai.privateConfigJson
    ? config.ai.privateConfigJson
    : config.ai.privateConfigPath
      ? readFileSync(config.ai.privateConfigPath, "utf8")
      : "";

  if (!source) throw new ApiError(503, "AI private policy is not configured.");

  try {
    cachedConfig = JSON.parse(source);
    return cachedConfig;
  } catch {
    throw new ApiError(503, "AI private policy is invalid.");
  }
}

export function resolvePrivateAiModel(model: string) {
  const match = model.match(/^env:([A-Z0-9_]+)$/);
  if (!match) return model;

  const resolved = process.env[match[1]];
  if (!resolved) throw new ApiError(503, "AI model routing is not configured.");

  return resolved;
}

export function resetPrivateAiConfigForTests() {
  cachedConfig = undefined;
}
