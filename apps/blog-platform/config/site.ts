const isDev = process.env.NODE_ENV === "development";

export const siteConfig = {
  name: "VeriWorkly Blog",
  shortName: "VeriWorkly",

  creator: "Gautam Raj",
  email: "info@veriworkly.com",

  tagline: "Career platform ideas and architecture stories.",
  description: "Insights, product notes, and career guidance from the VeriWorkly team.",
  url: process.env.SITE_URL || (isDev ? "http://localhost:3003" : "https://blog.veriworkly.com"),

  links: {
    twitter: "https://x.com/veriworkly",
    github: "https://github.com/VeriWorkly/veriworkly",
    linkedin: "https://linkedin.com/company/veriworkly",

    main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
    app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
    blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
    docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
  },

  keywords: ["VeriWorkly", "blog", "career tips", "architecture"],
} as const;
