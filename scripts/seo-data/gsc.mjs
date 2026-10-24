import { env, googleToken, save, step } from "./lib.mjs";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const DAYS = 90;
const ROW_LIMIT = 25000;

const isoDay = (offsetDays) => new Date(Date.now() - offsetDays * 864e5).toISOString().slice(0, 10);

const property = env("GSC_PROPERTY");
const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}`;
const { token } = await googleToken(SCOPE);
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

// Search Console data lags ~2 days, so the window ends 3 days ago.
const range = { startDate: isoDay(DAYS + 3), endDate: isoDay(3) };

async function query(dimensions) {
  const res = await fetch(`${base}/searchAnalytics/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...range, dimensions, rowLimit: ROW_LIMIT }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const { rows = [] } = await res.json();
  return rows.map(({ keys, clicks, impressions, ctr, position }) => ({
    ...Object.fromEntries(dimensions.map((d, i) => [d, keys[i]])),
    clicks,
    impressions,
    ctr: +ctr.toFixed(4),
    position: +position.toFixed(2),
  }));
}

for (const [file, dimensions] of [
  ["gsc-queries.json", ["query"]],
  ["gsc-pages.json", ["page"]],
  ["gsc-query-page.json", ["query", "page"]],
  ["gsc-countries.json", ["country"]],
  ["gsc-devices.json", ["device"]],
  ["gsc-daily.json", ["date"]],
]) {
  const rows = await step(file, () => query(dimensions));
  if (rows) await save(file, rows);
}

const sites = await step("gsc-sites.json", async () => {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()).siteEntry ?? [];
});
if (sites) await save("gsc-sites.json", sites);

const sitemaps = await step("gsc-sitemaps.json", async () => {
  const res = await fetch(`${base}/sitemaps`, { headers });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()).sitemap ?? [];
});
if (sitemaps) await save("gsc-sitemaps.json", sitemaps);

console.log(`GSC window ${range.startDate} → ${range.endDate}`);
