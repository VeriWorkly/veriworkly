const isDev = process.env.NODE_ENV === "development";

export const siteConfig = {
  name: "VeriWorkly Docs",
  shortName: "VeriWorkly",

  creator: "Gautam Raj",

  tagline: "Docs and API reference for VeriWorkly.",
  description: "Technical documentation and API reference for the VeriWorkly platform.",
  url: process.env.SITE_URL || (isDev ? "http://localhost:3002" : "https://docs.veriworkly.com"),

  links: {
    twitter: "https://x.com/veriworkly",
    github: "https://github.com/VeriWorkly/veriworkly",
    linkedin: "https://linkedin.com/company/veriworkly",

    main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
    app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
    docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
    blog: isDev ? "http://localhost:3003" : "https://blogs.veriworkly.com",
  },

  keywords: ["VeriWorkly", "documentation", "API reference"],

  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VeriWorkly Docs",
  },

  navigation: [
    { href: "/docs", label: "Docs" },
    { href: "/api-reference", label: "API Reference" },
    { href: "https://blogs.veriworkly.com", label: "Blog" },
  ],
} as const;
