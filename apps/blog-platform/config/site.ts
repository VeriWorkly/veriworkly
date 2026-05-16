export const siteConfig = {
  name: "VeriWorkly Blog",
  shortName: "VeriWorkly",
  creator: "Gautam Raj",
  url: process.env.SITE_URL || "https://blogs.veriworkly.com",
  description: "Insights, product notes, and career guidance from the VeriWorkly team.",
  tagline: "Career platform ideas and architecture stories.",

  links: {
    github: "https://github.com/VeriWorkly/veriworkly",
    docs: "https://docs.veriworkly.com",
    app: "https://app.veriworkly.com",
  },

  keywords: ["VeriWorkly", "blog", "career tips", "architecture"],
} as const;
