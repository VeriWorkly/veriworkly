import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

import { jobTextFromHtml, normalizeJobText } from "@veriworkly/ats-engine/job";

import { ApiError } from "#lib/errors";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

function isPrivateIp(address: string) {
  const normalized = address.replace(/^::ffff:/, "");
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
    /^(fc|fd|fe80|fe[c-f])/i.test(normalized) || // ULA + link-local + site-local
    /^ff/i.test(normalized) // IPv6 multicast
  );
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
  const addresses = isIP(rawHost)
    ? [{ address: rawHost }]
    : await lookup(url.hostname, { all: true, verbatim: true });
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
  static async fetch(urlValue: string) {
    let target = await validateUrl(urlValue);
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await requestPage(target);
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

function requestPage(target: Awaited<ReturnType<typeof validateUrl>>) {
  return new Promise<{ status: number; location: string; contentType: string; body: string }>(
    (resolve, reject) => {
      const req = request(
        target.url,
        {
          headers: { Accept: "text/html,text/plain", "User-Agent": "VeriWorkly-ATS/1.0" },
          lookup: ((
            _hostname: string,
            _options: unknown,
            callback: (
              error: NodeJS.ErrnoException | null,
              address: string,
              family: number,
            ) => void,
          ) => callback(null, target.address, target.family)) as never,
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
      req.on("error", reject);
      req.end();
    },
  );
}
