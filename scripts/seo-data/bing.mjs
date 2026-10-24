import { env, save, step } from "./lib.mjs";

const API = "https://ssl.bing.com/webmaster/api.svc/json";
const apiKey = env("BING_API_KEY");
const siteUrl = env("BING_SITE_URL");

async function call(method) {
  const url = `${API}/${method}?${new URLSearchParams({ apikey: apiKey, siteUrl })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const body = await res.json();
  return body.d ?? body;
}

for (const [file, method] of [
  ["bing-queries.json", "GetQueryStats"],
  ["bing-pages.json", "GetPageStats"],
  ["bing-crawl-stats.json", "GetCrawlStats"],
  ["bing-crawl-issues.json", "GetCrawlIssues"],
  ["bing-sitemaps.json", "GetFeeds"],
]) {
  const data = await step(file, () => call(method));
  if (data) await save(file, data);
}
