import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "#config";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";

const cache = new Map<string, unknown>();

function resolveFilePath(filePath: string): string | null {
  if (!filePath) return null;
  if (existsSync(filePath)) return filePath;
  const cwdResolved = resolve(process.cwd(), filePath);
  if (existsSync(cwdResolved)) return cwdResolved;
  return null;
}

export function loadPrivateJson(
  cacheKey: string,
  pathValue: string,
  jsonValue: string,
  label: string,
) {
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let source = jsonValue ? jsonValue.trim() : "";
  if (!source && pathValue) {
    // The 503 reaches the client, so where the file was looked for stays in the server log.
    const resolvedPath = resolveFilePath(pathValue);
    if (!resolvedPath) {
      logger.warn(`${label} file was not found`, { path: pathValue, cwd: process.cwd() });
      throw new ApiError(503, `${label} is not configured.`);
    }
    try {
      source = readFileSync(resolvedPath, "utf8");
    } catch (readErr) {
      logger.warn(`${label} could not be read`, {
        path: resolvedPath,
        error: (readErr as Error).message,
      });
      throw new ApiError(503, `${label} is not configured.`);
    }
  }

  if (!source) throw new ApiError(503, `${label} is not configured.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (parseErr) {
    // Where, never what (V-330): V8's message quotes the source around the error ("...mPrompt":
    // You are th"...), and this message is logged, so it would write the private policy's text
    // to the logs. Only the position (when V8 gives one) and the length are kept.
    const at = /at position (\d+)/.exec((parseErr as Error).message)?.[1];
    throw new ApiError(
      503,
      `${label} is invalid JSON (${at ? `error at character ${at} of ` : ""}${source.length} characters).`,
    );
  }

  cache.set(cacheKey, parsed);
  return parsed;
}

export function getAiActionsPolicyJson() {
  return loadPrivateJson(
    "ai-actions",
    config.ai.actionsPolicyPath,
    config.ai.actionsPolicyJson,
    "AI actions policy",
  );
}

export function getAtsAiPolicyJson() {
  return loadPrivateJson(
    "ats-ai",
    config.ai.atsAiPolicyPath,
    config.ai.atsAiPolicyJson,
    "ATS AI policy",
  );
}

export function getAtsEnginePolicyJson() {
  return loadPrivateJson(
    "ats-engine",
    config.ai.atsEnginePolicyPath,
    config.ai.atsEnginePolicyJson,
    "ATS engine policy",
  );
}

export function resolvePrivateAiModel(model: string) {
  const match = model.match(/^env:([A-Z0-9_]+)$/);
  if (!match) return model;

  const resolved = process.env[match[1]];
  if (!resolved) throw new ApiError(503, "AI model routing is not configured.");

  return resolved;
}
