import { env, googleToken, save, sitemapUrls } from "./lib.mjs";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const CONCURRENCY = 4;

const property = env("GSC_PROPERTY");
const { token } = await googleToken(SCOPE);

const urls = await sitemapUrls();
console.log(`inspecting ${urls.length} URLs from the sitemaps`);

async function inspect(url) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: property, languageCode: "en-US" }),
  });
  if (!res.ok) return { url, error: `${res.status}: ${(await res.text()).slice(0, 200)}` };
  const r = (await res.json()).inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: r.verdict,
    coverage: r.coverageState,
    indexing: r.indexingState,
    robots: r.robotsTxtState,
    fetch: r.pageFetchState,
    lastCrawl: r.lastCrawlTime,
    crawledAs: r.crawledAs,
    googleCanonical: r.googleCanonical,
    userCanonical: r.userCanonical,
  };
}

const results = new Array(urls.length);
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < urls.length) {
      const i = next++;
      results[i] = await inspect(urls[i]);
    }
  }),
);

await save("gsc-inspection.json", results);
const tally = {};
for (const r of results) tally[r.error ? "ERROR" : r.coverage ?? "unknown"] = (tally[r.error ? "ERROR" : r.coverage ?? "unknown"] ?? 0) + 1;
console.table(tally);
