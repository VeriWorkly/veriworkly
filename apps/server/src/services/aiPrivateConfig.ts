import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "#config";
import { ApiError } from "#lib/errors";

const cache = new Map<string, unknown>();

function resolveFilePath(filePath: string): string | null {
  if (!filePath) return null;
  if (existsSync(filePath)) return filePath;
  const cwdResolved = resolve(process.cwd(), filePath);
  if (existsSync(cwdResolved)) return cwdResolved;
  return null;
}

function loadPrivateJson(cacheKey: string, pathValue: string, jsonValue: string, label: string) {
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let source = jsonValue ? jsonValue.trim() : "";
  if (!source && pathValue) {
    const resolvedPath = resolveFilePath(pathValue);
    if (!resolvedPath) {
      throw new ApiError(
        503,
        `${label} file was not found at "${pathValue}" (working directory: ${process.cwd()}).`,
      );
    }
    try {
      source = readFileSync(resolvedPath, "utf8");
    } catch (readErr) {
      throw new ApiError(
        503,
        `${label} could not be read from "${resolvedPath}": ${(readErr as Error).message}`,
      );
    }
  }

  if (!source) throw new ApiError(503, `${label} is not configured.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (parseErr) {
    throw new ApiError(503, `${label} is invalid JSON: ${(parseErr as Error).message}`);
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

export function resetPrivateAiConfigForTests() {
  cache.clear();
}
