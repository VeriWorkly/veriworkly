import type { Request } from "express";
import { logger } from "#lib/logger";

function normalizeIpValue(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);

  if (
    trimmed === "::1" ||
    trimmed === "::" ||
    trimmed === "0:0:0:0:0:0:0:1" ||
    trimmed === "0:0:0:0:0:0:0:0" ||
    trimmed === "127.0.0.1"
  )
    return "127.0.0.1";

  return trimmed;
}

function readHeaderValue(headers: Request["headers"], name: string): string | undefined {
  const value = headers[name];

  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;

  return undefined;
}

export function getRequestIpDetails(req: Request) {
  try {
    const realIp = readHeaderValue(req.headers, "x-real-ip");
    const clientIpHeader = readHeaderValue(req.headers, "x-client-ip");
    const forwardedFor = readHeaderValue(req.headers, "x-forwarded-for");
    const cfConnectingIp = readHeaderValue(req.headers, "cf-connecting-ip");

    const remoteAddress = req.socket?.remoteAddress || undefined;

    const forwardedForCandidate = forwardedFor?.split(",")[0]?.trim();

    const requestIp =
      typeof req.ip === "string" && req.ip.length > 0 ? normalizeIpValue(req.ip) : undefined;

    const socketIp = remoteAddress ? normalizeIpValue(remoteAddress) : undefined;

    const isProxyTrusted = req.app ? !!req.app.get("trust proxy") : true;

    const resolvedIp = isProxyTrusted
      ? requestIp ||
        (clientIpHeader ? normalizeIpValue(clientIpHeader) : undefined) ||
        (forwardedForCandidate ? normalizeIpValue(forwardedForCandidate) : undefined) ||
        (realIp ? normalizeIpValue(realIp) : undefined) ||
        (cfConnectingIp ? normalizeIpValue(cfConnectingIp) : undefined) ||
        socketIp ||
        "unknown"
      : socketIp || "unknown";

    return {
      requestIp: requestIp || "unknown",
      resolvedIp,
      socketIp: socketIp || "unknown",
      forwardedFor: forwardedFor || "unknown",
      forwardedForCandidate: forwardedForCandidate || "unknown",
      realIp: realIp || "unknown",
      clientIpHeader: clientIpHeader || "unknown",
      cfConnectingIp: cfConnectingIp || "unknown",
    };
  } catch (error) {
    logger.error("Failed to parse request IP details:", error);

    return {
      requestIp: "unknown",
      resolvedIp: "unknown",
      socketIp: "unknown",
      forwardedFor: "unknown",
      forwardedForCandidate: "unknown",
      realIp: "unknown",
      clientIpHeader: "unknown",
      cfConnectingIp: "unknown",
    };
  }
}
