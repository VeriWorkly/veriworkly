# SEO data pulls

Snapshots of Google Search Console and Bing Webmaster Tools data, written to
`apps/site/audit/data/` (gitignored). No dependencies; Node 22+.

## Environment

| Variable | Value |
| --- | --- |
| `GSC_KEY_FILE` | Path to the service-account JSON key (keep it outside the repo) |
| `GSC_PROPERTY` | Exact property, e.g. `sc-domain:veriworkly.com` or `https://veriworkly.com/` |
| `BING_API_KEY` | Bing Webmaster Tools → Settings → API access |
| `BING_SITE_URL` | Verified site URL, e.g. `https://veriworkly.com/` |

The service account email must be added as a user on the Search Console property.

## Run

```
npm run seo:gsc        # Google queries, pages, daily, devices, countries, sitemaps
npm run seo:bing       # Bing traffic, crawl stats, sitemaps
npm run seo:all        # both of the above
npm run seo:inspect    # Google index status for every sitemap URL (~6 min)
npm run seo:bing-urls  # Bing crawl status for every sitemap URL (~8 min, rate-limited)
```

Search Console data lags ~2 days; the script pulls the 90 days ending 3 days ago.
A 403 from Google means the service account was not added to the property, or
`GSC_PROPERTY` does not match exactly.
