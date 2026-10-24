import { env, save, sitemapUrls } from "./lib.mjs";

const API = "https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo";
const DELAY_MS = 1500;
const NEVER = "3939-01-01";

const apiKey = env("BING_API_KEY");
const siteUrl = env("BING_SITE_URL");

const day = (value) => {
  const iso = new Date(Number(value.match(/\d+/)[0])).toISOString().slice(0, 10);
  return iso === NEVER ? null : iso;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Bing answers a burst with "ThrottleHost" (HTTP 400), so retry with backoff.
async function info(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API}?${new URLSearchParams({ apikey: apiKey, siteUrl, url })}`);
    const text = await res.text();
    if (res.ok) {
      const d = JSON.parse(text).d ?? {};
      return { url, http: d.HttpCode, discovered: day(d.DiscoveryDate), lastCrawled: day(d.LastCrawledDate) };
    }
    if (!text.includes("ThrottleHost")) return { url, error: `${res.status}: ${text.slice(0, 120)}` };
    await sleep(5000 * (attempt + 1));
  }
  return { url, error: "throttled" };
}

const urls = await sitemapUrls();
console.log(`checking ${urls.length} URLs against Bing (about ${Math.ceil((urls.length * DELAY_MS) / 60000)} min)`);

const results = [];
for (const url of urls) {
  results.push(await info(url));
  await sleep(DELAY_MS);
}

await save("bing-url-info.json", results);
const crawled = results.filter((r) => r.lastCrawled).length;
console.log(`crawled by Bing: ${crawled}/${results.length}; never crawled: ${results.filter((r) => !r.error && !r.lastCrawled).length}; errors: ${results.filter((r) => r.error).length}`);
