import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

import { jobTextFromHtml, normalizeJobText } from "@veriworkly/ats-engine/job";

import { ApiError } from "#lib/errors";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;
/** The whole request, however slowly the page sends: `TIMEOUT_MS` only bounds a silent gap. */
const TOTAL_TIMEOUT_MS = 15_000;
/**
 * `getaddrinfo` runs on libuv's threadpool, shared with crypto and file I/O, and has no timeout
 * of its own: one slow resolver for an attacker's hostname held a thread for as long as the OS
 * allowed, once per redirect hop. The request gives up on the name after this long instead.
 */
const LOOKUP_TIMEOUT_MS = 5_000;

/**
 * IPv6 ranges no job page lives in, matched as prefixes rather than by spelling: `fe80::/10`
 * covers `fe80`–`febf` (the old `fe80` literal let `fe90::` through), and a literal written
 * uncompressed or upper-case still matches. IPv4-mapped and -translated addresses are blocked
 * outright here as well as checked by their embedded IPv4 below.
 */
const BLOCKED_IPV6 = new BlockList();
for (const [subnet, prefix] of [
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated, still routed by some stacks)
  ["fc00::", 7], // unique local
  ["ff00::", 8], // multicast
  ["2002::", 16], // 6to4: carries an IPv4 destination
  ["64:ff9b:1::", 48], // local-use NAT64
  ["::ffff:0:0", 96], // IPv4-mapped
  ["::ffff:0:0:0", 96], // IPv4-translated (SIIT)
  ["2001:db8::", 32], // documentation
] as const)
  BLOCKED_IPV6.addSubnet(subnet, prefix, "ipv6");

/**
 * The IPv4 address an IPv6 one carries in its last 32 bits: IPv4-mapped (`::ffff:7f00:1`, which
 * is how URL parsing writes `[::ffff:127.0.0.1]`), IPv4-compatible (`::7f00:1`) and NAT64
 * (`64:ff9b::7f00:1`). Checked as IPv4, so none of them reaches a private network.
 */
function embeddedIpv4(address: string) {
  const match =
    /^(?:::ffff:|::|64:ff9b::)(?:(\d{1,3}(?:\.\d{1,3}){3})|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/i.exec(
      address,
    );
  if (!match) return undefined;
  if (match[1]) return match[1];
  const [high, low] = [parseInt(match[2]!, 16), parseInt(match[3]!, 16)];
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function isPrivateIp(address: string) {
  const normalized = embeddedIpv4(address) ?? address;
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized === "0.0.0.0" ||
    /^0\./.test(normalized) || // "this network" — 0.x.x.x can route to localhost on some stacks
    /^10\./.test(normalized) ||
    /^127\./.test(normalized) ||
    /^169\.254\./.test(normalized) || // link-local, incl. the 169.254.169.254 cloud metadata IP
    /^192\.168\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(normalized) || // 100.64/10 CGNAT
    /^192\.0\.0\./.test(normalized) || // IETF protocol assignments
    /^192\.0\.2\./.test(normalized) || // TEST-NET-1
    /^198\.1[89]\./.test(normalized) || // 198.18/15 benchmarking
    /^198\.51\.100\./.test(normalized) || // TEST-NET-2
    /^203\.0\.113\./.test(normalized) || // TEST-NET-3
    /^(22[4-9]|23\d)\./.test(normalized) || // multicast 224/4
    /^(24\d|25[0-5])\./.test(normalized) || // reserved 240/4 + broadcast
    (isIP(address) === 6 && BLOCKED_IPV6.check(address, "ipv6"))
  );
}

/** `lookup` bounded by `LOOKUP_TIMEOUT_MS`; a name that cannot be resolved is the caller's 400. */
async function resolveHost(hostname: string) {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new ApiError(400, "Job URL could not be resolved in time.")),
      LOOKUP_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([lookup(hostname, { all: true, verbatim: true }), expired]);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Job URL could not be resolved.");
  } finally {
    clearTimeout(timer);
  }
}

async function validateUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port)
    throw new ApiError(400, "Job URL must use HTTPS on the standard port.");
  if (
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local")
  )
    throw new ApiError(400, "Job URL host is not allowed.");
  const rawHost = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(rawHost) ? [{ address: rawHost }] : await resolveHost(url.hostname);
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address)))
    throw new ApiError(400, "Job URL resolves to a blocked network.");
  return { url, address: addresses[0].address, family: isIP(addresses[0].address) };
}

/**
 * The job text in a fetched page: the page's schema.org `JobPosting` when it publishes one, its
 * visible text otherwise (`@veriworkly/ats-engine/job`, which parses in linear time — the regexes
 * this replaced were quadratic on a hostile page). Plain text is taken as written.
 */
function jobText(body: string, contentType: string) {
  return contentType.includes("text/html") ? jobTextFromHtml(body) : normalizeJobText(body);
}

export class AtsJobFetchService {
  /**
   * `signal` is the request's (client gone or AI deadline). One `TOTAL_TIMEOUT_MS` budget covers
   * every redirect hop together (V-241): per hop, a chain of slow redirects could eat most of the
   * AI deadline before the analysis even started.
   */
  static async fetch(urlValue: string, signal?: AbortSignal) {
    const budget = AbortSignal.timeout(TOTAL_TIMEOUT_MS);
    const deadline = signal ? AbortSignal.any([budget, signal]) : budget;
    let target = await validateUrl(urlValue);
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      if (deadline.aborted) throw new ApiError(400, "Job page request timed out.");
      const response = await requestPage(target, deadline);
      if (response.status >= 300 && response.status < 400) {
        const location = response.location;
        if (!location || redirect === MAX_REDIRECTS)
          throw new ApiError(400, "Job page redirect limit exceeded.");
        target = await validateUrl(new URL(location, target.url).toString());
        continue;
      }
      if (response.status < 200 || response.status >= 300)
        throw new ApiError(400, "Job page could not be retrieved.");
      const contentType = response.contentType.toLowerCase();
      if (!contentType.includes("text/html") && !contentType.includes("text/plain"))
        throw new ApiError(400, "Job page must be HTML or plain text.");
      const text = jobText(response.body, contentType);
      if (text.length < 100)
        throw new ApiError(400, "Job page did not contain enough readable text.");
      return text;
    }
    throw new ApiError(400, "Job page could not be retrieved.");
  }
}

/**
 * A DNS lookup that answers with the address `validateUrl` checked, so the connection goes where
 * the check looked. Node 20+ asks for every address (`{ all: true }`, to try IPv4 and IPv6 in
 * turn) and takes a list; answering that with one address failed every hostname with
 * `ERR_INVALID_IP_ADDRESS`.
 */
export function pinnedLookup(target: { address: string; family: number }) {
  return (
    _hostname: string,
    options: { all?: boolean } | number | undefined,
    callback: (error: NodeJS.ErrnoException | null, ...result: unknown[]) => void,
  ) =>
    typeof options === "object" && options?.all
      ? callback(null, [{ address: target.address, family: target.family }])
      : callback(null, target.address, target.family);
}

function requestPage(target: Awaited<ReturnType<typeof validateUrl>>, signal: AbortSignal) {
  return new Promise<{ status: number; location: string; contentType: string; body: string }>(
    (resolve, reject) => {
      const req = request(
        target.url,
        {
          headers: { Accept: "text/html,text/plain", "User-Agent": "VeriWorkly-ATS/1.0" },
          lookup: pinnedLookup(target) as never,
          signal,
        },
        (response) => {
          const declaredLength = Number(response.headers["content-length"] ?? 0);
          if (declaredLength > MAX_BYTES) {
            response.destroy();
            reject(new ApiError(400, "Job page exceeds the download limit."));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_BYTES) {
              response.destroy();
              reject(new ApiError(400, "Job page exceeds the download limit."));
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () =>
            resolve({
              status: response.statusCode ?? 500,
              location: String(response.headers.location ?? ""),
              contentType: String(response.headers["content-type"] ?? ""),
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
          response.on("error", reject);
        },
      );
      req.setTimeout(TIMEOUT_MS, () =>
        req.destroy(new ApiError(400, "Job page request timed out.")),
      );
      req.on("error", (error: Error) =>
        reject(
          error.name === "AbortError" || error.name === "TimeoutError"
            ? new ApiError(400, "Job page request timed out.")
            : error,
        ),
      );
      req.end();
    },
  );
}
