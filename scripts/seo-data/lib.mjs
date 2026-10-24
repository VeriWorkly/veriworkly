import { createSign } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const OUT_DIR = resolve(import.meta.dirname, "../../apps/site/audit/data");

export function env(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env var ${name}. See scripts/seo-data/README.md`);
    process.exit(1);
  }
  return value;
}

export async function save(name, data) {
  await mkdir(OUT_DIR, { recursive: true });
  const file = resolve(OUT_DIR, name);
  await writeFile(file, JSON.stringify(data, null, 2));
  const count = Array.isArray(data) ? data.length : Object.keys(data ?? {}).length;
  console.log(`wrote ${name} (${count} entries)`);
}

// Runs one fetch step; a failure is reported but does not stop the other steps.
export async function step(label, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`FAILED ${label}: ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

const b64url = (input) => Buffer.from(input).toString("base64url");

// Service-account JWT exchanged for an access token; no Google SDK needed.
export async function googleToken(scope) {
  const key = JSON.parse(await readFile(env("GSC_KEY_FILE"), "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: key.client_email, scope, aud: key.token_uri, iat: now, exp: now + 3600 }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key.private_key, "base64url");

  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`token request ${res.status}: ${await res.text()}`);
  return { token: (await res.json()).access_token, email: key.client_email };
}

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

export const DEFAULT_SITEMAPS = [
  "https://veriworkly.com/sitemap.xml",
  "https://blog.veriworkly.com/sitemap.xml",
  "https://docs.veriworkly.com/sitemap.xml",
  "https://portfolio.veriworkly.com/sitemap.xml",
  "https://app.veriworkly.com/sitemap.xml",
];

// Every URL listed in the given sitemaps (follows sitemap indexes), de-duplicated.
export async function sitemapUrls(sitemaps = process.env.SITEMAPS?.split(",") ?? DEFAULT_SITEMAPS) {
  const read = async (url) => {
    const xml = await (await fetch(url)).text();
    const found = locs(xml);
    return xml.includes("<sitemapindex") ? (await Promise.all(found.map(read))).flat() : found;
  };
  return [...new Set((await Promise.all(sitemaps.map(read))).flat())];
}
