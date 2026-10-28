import { openapi } from "@/lib/openapi";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : ["https://api.veriworkly.com"];

const proxy = openapi.createProxy({
  allowedOrigins,
  // The playground only calls the public API.
  filterRequest: (request) => new URL(request.url).pathname.startsWith("/api/v1/"),
});

/**
 * The visitor's cookies for this host are never forwarded: a session cookie scoped to the
 * parent domain would otherwise reach the API on any link to this route. A cookie the reader
 * types into the playground arrives as the `cookie` query parameter, which the proxy applies.
 */
async function handle(request: Request): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete("cookie");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  return proxy.handle(
    new Request(request.url, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    }),
  );
}

export const GET = handle;
export const PUT = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
