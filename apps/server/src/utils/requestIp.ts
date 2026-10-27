import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import type { Request } from "express";

import { config } from "#config";
import { logger } from "#lib/logger";

/**
 * Constant-time check of a presented shared secret against the configured one. An unset secret
 * never matches. Both sides are hashed first so `timingSafeEqual` always compares equal-length
 * buffers and the real secret's length does not leak through an early return.
 */
export function matchesSharedSecret(presented: unknown, secret: string | undefined): boolean {
  if (!secret || typeof presented !== "string" || presented.length === 0) return false;

  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(secret).digest();

  return left.length === right.length && timingSafeEqual(left, right);
}

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

/**
 * The client IP a trusted server-to-server caller (studio/portfolio SSR) forwards for the
 * browser it acts for (V-151). Honoured only when the same request carries `x-internal-key`
 * equal to `INTERNAL_API_KEY`; from anyone else the header is ignored.
 */
function readTrustedForwardedClientIp(req: Request): string | undefined {
  const forwarded = readHeaderValue(req.headers, "x-forwarded-client-ip")?.trim();
  if (!forwarded || isIP(forwarded.replace(/^::ffff:/, "")) === 0) return undefined;

  const key = readHeaderValue(req.headers, "x-internal-key");
  if (!matchesSharedSecret(key, config.internal?.apiKey)) return undefined;

  return normalizeIpValue(forwarded);
}

/** The longest user agent kept for analytics; anything longer is cut. */
const MAX_USER_AGENT_LENGTH = 512;

/**
 * The browser's user agent (V-245). A server render (studio, portfolio) fetches on the viewer's
 * behalf, so its own agent is Node's; it names the browser in `x-forwarded-client-user-agent`,
 * honoured under the same rule as the forwarded IP: only with `x-internal-key` equal to
 * `INTERNAL_API_KEY`. Anyone else gets their own `User-Agent`.
 */
export function getRequestUserAgent(req: Request): string | null {
  const key = readHeaderValue(req.headers, "x-internal-key");
  const forwarded = readHeaderValue(req.headers, "x-forwarded-client-user-agent")?.trim();
  const agent =
    forwarded && matchesSharedSecret(key, config.internal?.apiKey)
      ? forwarded
      : readHeaderValue(req.headers, "user-agent");

  return agent ? agent.slice(0, MAX_USER_AGENT_LENGTH) : null;
}

type RequestIpDetails = ReturnType<typeof computeRequestIpDetails>;

/**
 * Computed once per request: the rate limiter, the request logger, auth and the controllers all
 * ask, and the answer cannot change mid-request (`trust proxy` is set at boot). Later header
 * rewrites (`authRequestDiagnostics` sets `x-client-ip`) therefore do not move it.
 */
const detailsByRequest = new WeakMap<Request, RequestIpDetails>();

export function getRequestIpDetails(req: Request): RequestIpDetails {
  let details = detailsByRequest.get(req);
  if (!details) {
    details = computeRequestIpDetails(req);
    detailsByRequest.set(req, details);
  }
  return details;
}

function computeRequestIpDetails(req: Request) {
  try {
    const trustedForwardedIp = readTrustedForwardedClientIp(req);
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

    const resolvedIp = trustedForwardedIp
      ? trustedForwardedIp
      : isProxyTrusted
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

/**
 * The part of a client address that names one network, which quotas and rate limits count by: an
 * IPv4 address whole, an IPv6 address's /64. One home connection holds a whole /64 and can move
 * within it at will, so counting single IPv6 addresses counted nothing.
 */
export function addressBucket(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head = "", tail] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = [
    ...left,
    ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"),
    ...right,
  ];
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
