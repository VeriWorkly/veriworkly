import { NextRequest } from "next/server";

import { openapi } from "@/lib/openapi";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["https://api.veriworkly.com", "https://veriworkly.com"];

const proxyHandlers = openapi.createProxy({
  allowedOrigins,
});

const handleRequest = async (req: NextRequest): Promise<Response> => {
  const url = new URL(req.url);

  const smuggledCookie = url.searchParams.get("cookie");

  const headers = new Headers(req.headers);

  if (smuggledCookie) {
    const decodedCookie = decodeURIComponent(smuggledCookie);
    headers.set("Cookie", decodedCookie);
  }

  const docsApiKey = req.cookies.get("docs_api_key")?.value;

  if (docsApiKey && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", docsApiKey);
  }

  const requestInit: RequestInit & { duplex?: string } = {
    method: req.method,
    headers,
    body: req.body,
    signal: req.signal ?? undefined,
    duplex: req.method !== "GET" && req.method !== "HEAD" ? "half" : undefined,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modifiedReq = new NextRequest(req.url, requestInit as any);

  const method = req.method as keyof typeof proxyHandlers;
  const handler = proxyHandlers[method] as (request: Request) => Promise<Response>;

  return handler(modifiedReq);
};

export const GET = (req: NextRequest) => handleRequest(req);
export const PUT = (req: NextRequest) => handleRequest(req);
export const POST = (req: NextRequest) => handleRequest(req);
export const PATCH = (req: NextRequest) => handleRequest(req);
export const DELETE = (req: NextRequest) => handleRequest(req);
export const HEAD = (req: NextRequest) => handleRequest(req);
