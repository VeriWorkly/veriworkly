const isDev = process.env.NODE_ENV === "development";

const links = {
  github: "https://github.com/VeriWorkly/veriworkly",
  twitter: "https://x.com/veriworkly",
  linkedin: "https://linkedin.com/company/veriworkly",

  main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
  app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
  docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
  blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
  portfolio: isDev ? "http://localhost:3004" : "https://portfolio.veriworkly.com",
} as const;

export const siteConfig = {
  name: "VeriWorkly Studio",
  shortName: "VeriWorkly",

  creator: "Gautam Raj",

  url: process.env.SITE_URL || "https://app.veriworkly.com",

  description:
    "Free, open-source, and privacy-first studio for resumes, cover letters, portfolios, link-in-bio pages, ATS checks, and AI-assisted content.",

  tagline: "Build career assets. No login. 100% private.",

  links,

  keywords: [
    "free resume builder",
    "ATS resume builder",
    "ATS-friendly resume builder",
    "resume builder no login",
    "online resume builder",
    "resume maker",
    "CV builder",
    "professional resume templates",
    "resume creator",
    "resume generator",
    "PDF resume builder",
    "open source resume builder",
    "privacy-first resume builder",
    "developer resume builder",
    "modern resume templates",
    "free CV maker",
    "resume templates free",
    "AI resume builder",
    "job resume maker",
    "best free resume builder",
  ],

  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VeriWorkly",
  },

  twitter: {
    handle: "@veriworkly",
    site: "@veriworkly",
    cardType: "summary_large_image",
  },

  navigation: [
    { href: "/", label: "Overview" },
    { href: `${links.main}/templates`, label: "Templates" },
    { href: "/profile", label: "Profile" },
    { href: `${links.main}/roadmap`, label: "Roadmap" },
    { href: `${links.main}/stats`, label: "Development" },
  ],
} as const;
