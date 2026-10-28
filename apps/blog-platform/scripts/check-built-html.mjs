// Checks the prerendered HTML of every sitemap URL after `next build`: one h1, one canonical equal
// to the page URL, title <= 60 and description <= 155 characters, JSON-LD that parses, no noindex.
// Run with the SITE_URL the build used: `SITE_URL=http://localhost:3003 npm run check:html`.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = join(appRoot, ".next", "server", "app");
const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!siteUrl) fail("SITE_URL must be set to the value the build used.");

const sitemapFile = join(built, "sitemap.xml.body");
if (!existsSync(sitemapFile)) fail(`${sitemapFile} not found: run \`next build\` first.`);

const urls = [...readFileSync(sitemapFile, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => m[1],
);
if (urls.length === 0) fail("The built sitemap lists no URLs.");

const decode = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const attribute = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? [];

const offenders = [];

for (const url of urls) {
  if (!url.startsWith(siteUrl)) {
    offenders.push(`${url}: not under SITE_URL ${siteUrl}; the build used another SITE_URL`);
    continue;
  }

  const path = url.slice(siteUrl.length) || "/";
  const file = join(built, path === "/" ? "index.html" : `${path.slice(1)}.html`);
  const problems = [];

  if (!existsSync(file)) {
    offenders.push(`${path}: no prerendered HTML at ${file}`);
    continue;
  }

  const html = readFileSync(file, "utf8");
  const head = html.slice(0, html.indexOf("</head>"));

  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) problems.push(`${h1s} <h1> elements`);

  const canonicals = tags(html, "link")
    .filter((tag) => attribute(tag, "rel") === "canonical")
    .map((tag) => decode(attribute(tag, "href") ?? ""));
  if (canonicals.length !== 1) problems.push(`${canonicals.length} canonical links`);
  else if (canonicals[0] !== url) problems.push(`canonical ${canonicals[0]} is not ${url}`);

  const titles = [...head.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
  if (titles.length !== 1) problems.push(`${titles.length} <title> elements`);
  else if (titles[0].length > TITLE_LIMIT)
    problems.push(`title is ${titles[0].length} characters: "${titles[0]}"`);

  const descriptions = tags(head, "meta")
    .filter((tag) => attribute(tag, "name") === "description")
    .map((tag) => decode(attribute(tag, "content") ?? ""));
  if (descriptions.length !== 1) problems.push(`${descriptions.length} meta descriptions`);
  else if (descriptions[0].length > DESCRIPTION_LIMIT)
    problems.push(`description is ${descriptions[0].length} characters`);

  const ldBlocks = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ];
  if (ldBlocks.length === 0) problems.push("no JSON-LD");
  for (const [, json] of ldBlocks) {
    try {
      JSON.parse(json);
    } catch (error) {
      problems.push(`JSON-LD does not parse: ${error.message}`);
    }
  }

  const robots = tags(head, "meta").filter((tag) =>
    /^(robots|googlebot)$/i.test(attribute(tag, "name") ?? ""),
  );
  if (robots.some((tag) => /noindex/i.test(attribute(tag, "content") ?? "")))
    problems.push("meta robots noindex");

  if (problems.length) offenders.push(`${path}: ${problems.join("; ")}`);
}

if (offenders.length) {
  console.error(`${offenders.length} of ${urls.length} pages fail the built-HTML check:`);
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log(`Built HTML OK for all ${urls.length} sitemap URLs.`);
