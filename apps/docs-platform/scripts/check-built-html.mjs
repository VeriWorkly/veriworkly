// After `next build`, checks every prerendered page the sitemap lists: one <h1>, one canonical
// equal to the page's own URL, a title within 60 characters, a description within 155, JSON-LD
// that parses, and no noindex. Exits 1 with the list of offenders.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(appRoot, ".next", "server", "app");
const siteUrl = (process.env.SITE_URL || "https://docs.veriworkly.com").replace(/\/$/, "");

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 155;

const sitemapFile = path.join(built, "sitemap.xml.body");
if (!fs.existsSync(sitemapFile)) {
  console.error(`No prerendered sitemap at ${sitemapFile}. Run \`next build\` first.`);
  process.exit(1);
}

const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const attribute = (tag, name) => {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? decode(match[1]) : undefined;
};

const sitemap = fs.readFileSync(sitemapFile, "utf8");
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
const problems = [];

if (entries.length === 0) problems.push("sitemap.xml: no <url> entries");

let checked = 0;

for (const entry of entries) {
  const url = decode(/<loc>([^<]+)<\/loc>/.exec(entry)?.[1] ?? "");
  const report = (message) => problems.push(`${url}: ${message}`);

  if (!/<lastmod>[^<]+<\/lastmod>/.test(entry)) report("no <lastmod> in the sitemap");
  if (!url.startsWith(siteUrl)) {
    report(`not under SITE_URL ${siteUrl}`);
    continue;
  }

  const route = url.slice(siteUrl.length).replace(/\/$/, "");
  const file = path.join(built, route ? `${route}.html` : "index.html");

  if (!fs.existsSync(file)) {
    report(`no prerendered HTML at ${path.relative(appRoot, file)}`);
    continue;
  }

  checked += 1;
  const html = fs.readFileSync(file, "utf8");
  const head = html.slice(0, html.indexOf("</head>") === -1 ? undefined : html.indexOf("</head>"));

  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1s !== 1) report(`${h1s} <h1> elements`);

  const canonicals = [...html.matchAll(/<link[^>]*\srel="canonical"[^>]*>/g)].map((m) =>
    attribute(m[0], "href"),
  );
  if (canonicals.length !== 1) report(`${canonicals.length} canonical links`);
  else if (canonicals[0] !== url) report(`canonical is ${canonicals[0]}`);

  const titles = [...head.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
  if (titles.length !== 1) report(`${titles.length} <title> elements in <head>`);
  else if (titles[0].length > MAX_TITLE)
    report(`title is ${titles[0].length} characters: ${titles[0]}`);

  const descriptions = [...head.matchAll(/<meta[^>]*\sname="description"[^>]*>/g)].map((m) =>
    attribute(m[0], "content"),
  );
  if (descriptions.length !== 1) report(`${descriptions.length} meta descriptions`);
  else if (descriptions[0].length > MAX_DESCRIPTION)
    report(`description is ${descriptions[0].length} characters`);

  for (const [, json] of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      JSON.parse(json);
    } catch (error) {
      report(`JSON-LD does not parse: ${error.message}`);
    }
  }

  if (/<meta[^>]*name="robots"[^>]*noindex/i.test(html)) report("noindex");
}

for (const route of ["llms.txt", "llms-full.txt", ".well-known/agent.json"]) {
  if (!fs.existsSync(path.join(built, `${route}.body`)))
    problems.push(`/${route} was not prerendered`);
}

if (problems.length) {
  console.error(`${problems.length} problem(s) in ${checked} prerendered pages:\n`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Checked ${checked} prerendered pages from the sitemap: all pass.`);
