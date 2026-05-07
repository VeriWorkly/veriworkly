export const siteConfig = {
  name: "VeriWorkly Docs",
  shortName: "VeriWorkly",
  creator: "Gautam Raj",
  url: process.env.SITE_URL || "https://docs.veriworkly.com",
  description: "Technical documentation and API reference for the VeriWorkly platform.",
  tagline: "Docs and API reference for VeriWorkly.",

  links: {
    github: "https://github.com/Gautam25Raj/veriworkly-resume",
    blog: "https://blogs.veriworkly.com",
    app: "https://veriworkly.com",
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
