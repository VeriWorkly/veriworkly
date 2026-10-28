const isDev = process.env.NODE_ENV === "development";

const links = {
  twitter: "https://x.com/veriworkly",
  github: "https://github.com/VeriWorkly/veriworkly",
  linkedin: "https://linkedin.com/company/veriworkly",

  main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
  app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
  blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
  portfolio: isDev ? "http://localhost:3004" : "https://portfolio.veriworkly.com",
} as const;

export const siteConfig = {
  name: "VeriWorkly Docs",
  shortName: "VeriWorkly",

  url: process.env.SITE_URL || "https://docs.veriworkly.com",
  twitterHandle: "@veriworkly",

  links,
} as const;
