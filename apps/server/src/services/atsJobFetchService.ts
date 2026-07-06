import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

import { ApiError } from "#lib/errors";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

function isPrivateIp(address: string) {
  const normalized = address.replace(/^::ffff:/, "");
  return (
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    /^10\./.test(normalized) ||
    /^127\./.test(normalized) ||
    /^169\.254\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    /^(fc|fd|fe80):/i.test(normalized)
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
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address)))
    throw new ApiError(400, "Job URL resolves to a blocked network.");
  return { url, address: addresses[0].address, family: isIP(addresses[0].address) };
}

function visibleText(source: string) {
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
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
      const text = visibleText(response.body);
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
