const isDev = process.env.NODE_ENV === "development";

export const siteConfig = {
  name: "VeriWorkly Portfolio",

  url:
    process.env.SITE_URL ||
    (isDev ? "http://portfolio.localhost:3004" : "https://portfolio.veriworkly.com"),

  description:
    "Build and publish a professional developer or designer portfolio website in minutes. Switch templates freely, configure custom SEO controls, track analytics, and showcase your best projects.",

  links: {
    github: "https://github.com/VeriWorkly/veriworkly",
    twitter: "https://x.com/veriworkly",
    linkedin: "https://linkedin.com/company/veriworkly",

    main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
    app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
    docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
    blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
    portfolio: isDev ? "http://localhost:3004" : "https://portfolio.veriworkly.com",
  },

  keywords: [
    "portfolio builder",
    "professional portfolio website",
    "developer portfolio",
    "designer portfolio",
    "online portfolio builder",
  ],

  twitter: {
    handle: "@veriworkly",
    site: "@veriworkly",
    cardType: "summary_large_image",
  },
} as const;

export const veriworklyProductLinks = {
  studio: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
  docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
  blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
} as const;

export function portfolioPublicUrl(subdomain: string) {
  return isDev ? `http://${subdomain}.localhost:3004` : `https://${subdomain}.veriworkly.com`;
}
