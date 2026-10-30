const isDev = process.env.NODE_ENV === "development";

const links = {
  twitter: "https://x.com/veriworkly",
  github: "https://github.com/VeriWorkly/veriworkly",
  linkedin: "https://linkedin.com/company/veriworkly",

  main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
  app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
  docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
  blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
  portfolio: isDev ? "http://localhost:3004" : "https://portfolio.veriworkly.com",
} as const;

export const siteConfig = {
  name: "VeriWorkly",
  shortName: "VeriWorkly",

  creator: "Gautam Raj",
  email: "info@veriworkly.com",
  /** Where security reports go; public/.well-known/security.txt and SECURITY.md name the same inbox. */
  securityEmail: "grievance@veriworkly.com",

  creatorLinks: {
    github: "https://github.com/Gautam25Raj",
    twitter: "https://x.com/noober_boy",
    /** GitHub serves the profile picture; github.com/*.png is an allowed image host. */
    avatar: "https://github.com/Gautam25Raj.png",
  },

  /** One named person, not an alias: an India-based service hosting user content is expected to publish a named contact. */
  legalContact: {
    name: "Gautam Raj",
    role: "Grievance Officer & Data Protection Contact",
    email: "grievance@veriworkly.com",
    postalAddress: "Phase-3, DLF Cyber City, Gurugram, Haryana 122010, India",
  },

  url: process.env.NEXT_PUBLIC_SITE_URL || links.main,

  description:
    "Free-to-use, open-core, and privacy-first AI career workspace. Build and tailor professional resumes, cover letters, and web portfolios with local-first ownership, optional secure cloud sync, and frontier AI models accessed through a privacy-conscious gateway.",

  tagline: "Free AI resumes, cover letters & web portfolios. No login required.",

  links,

  keywords: [
    "AI resume builder",
    "AI resume generator",
    "AI-powered resume writer",
    "AI resume tailoring",
    "free AI cover letter generator",
    "AI portfolio builder",
    "free career builder",
    "free resume builder",
    "cover letter generator",
    "portfolio builder website",
    "personal website builder",
    "resume builder no login",
    "ATS resume builder",
    "ATS-friendly resume builder",
    "free ATS resume checker",
    "resume score checker",
    "professional document builder",
    "github resume builder",
    "github portfolio import",
    "linkedin profile resume converter",
    "import linkedin pdf to resume",
    "master profile career sync",
    "open source resume builder",
    "open source career platform",
    "privacy-first resume builder",
    "privacy-first career workspace",
    "developer portfolio template",
    "portfolio website with custom subdomain",
    "student ambassador program career",
    "career affiliate program",
    "best free portfolio builder",
    "AI career workspace",
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
} as const;
