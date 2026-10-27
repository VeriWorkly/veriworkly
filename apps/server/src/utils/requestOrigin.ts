import type { IncomingHttpHeaders } from "node:http";

/**
 * Whether `Host` and `X-Forwarded-Proto` can be assembled into a URL that `new Request()` accepts.
 *
 * better-auth's node handler builds `new Request(`${proto}://${host}${url}`)` from these two raw
 * headers (it does not consult Express's `trust proxy`), and the WHATWG URL parser throws on an
 * out-of-range port, an empty host, or a scheme that is not http/https. Those throws happen
 * outside any try/catch, so they must be refused before the handler runs.
 */
export function hasWellFormedHostAndProto(headers: IncomingHttpHeaders): boolean {
  const host = firstHeaderValue(headers.host);
  if (!host) return false;

  const proto = firstHeaderValue(headers["x-forwarded-proto"]) ?? "http";
  if (!/^https?$/i.test(proto)) return false;

  try {
    const scheme = proto.toLowerCase();
    const url = new URL(`${scheme}://${host}/`);
    // The parser accepts credentials and paths inside a host string; a real Host header has none.
    // It also drops the scheme's default port, which a client or proxy may write out (`:443`
    // over https, `:80` over http); compare without it, as `isAllowedHost` does (V-396).
    const defaultPort = scheme === "https" ? ":443" : ":80";
    const written = host.toLowerCase();
    const bare = written.endsWith(defaultPort) ? written.slice(0, -defaultPort.length) : written;
    return url.host === bare;
  } catch {
    return false;
  }
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Whether the request's `Host` names this API (V-155): the host of `AUTH_BASE_URL`, any loopback
 * host (health checks, the smoke boot, same-machine SSR), or one listed in `ALLOWED_HOSTS`
 * (comma-separated, with or without a port). better-auth builds its request URL from the raw
 * Host, so a forged one (Host header poisoning) is refused before it reaches the handler.
 */
export function isAllowedHost(
  headers: IncomingHttpHeaders,
  allowed: { baseUrl: string; extraHosts: readonly string[] },
): boolean {
  const host = firstHeaderValue(headers.host)?.toLowerCase();
  if (!host) return false;

  let hostname: string;
  try {
    hostname = new URL(`http://${host}/`).hostname;
  } catch {
    return false;
  }
  if (LOOPBACK_HOSTNAMES.has(hostname)) return true;

  const accepted = new Set<string>();
  try {
    const base = new URL(allowed.baseUrl);
    accepted.add(base.host.toLowerCase());
    accepted.add(base.hostname.toLowerCase());
  } catch {
    // An unparsable base URL accepts nothing beyond loopback and the explicit list.
  }
  for (const extra of allowed.extraHosts) accepted.add(extra.trim().toLowerCase());

  return accepted.has(host) || accepted.has(hostname);
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return undefined;

  const first = raw.split(",")[0]?.trim();
  return first ? first : undefined;
}
