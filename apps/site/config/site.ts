const isDev = process.env.NODE_ENV === "development";

export const siteConfig = {
  name: "VeriWorkly",
  shortName: "VeriWorkly",

  creator: "Gautam Raj",
  email: "info@veriworkly.com",

  url: process.env.SITE_URL || "https://veriworkly.com",

  description:
    "Free-to-use, open-core, and privacy-first AI career workspace. Build and tailor professional resumes, cover letters, and web portfolios with local-first ownership, optional secure cloud sync, and advanced AI models (Claude & GPT-4o).",

  tagline: "Free AI resumes, cover letters & web portfolios. No login required.",

  links: {
    twitter: "https://x.com/veriworkly",
    github: "https://github.com/VeriWorkly/veriworkly",
    linkedin: "https://linkedin.com/company/veriworkly",

    main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
    app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
    docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
    blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
    portfolio: isDev ? "http://localhost:3004" : "https://portfolio.veriworkly.com",
  },

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
    "invoice generator free",
    "professional document builder",
    "github resume builder",
    "linkedin profile resume converter",
    "import linkedin pdf to resume",
    "master profile career sync",
    "open source resume builder",
    "privacy-first resume builder",
    "developer portfolio template",
    "student ambassador program career",
    "best free portfolio builder",
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
    { href: "/templates", label: "Templates" },
    { href: "/roadmap", label: "Roadmap" },
    { href: "/stats", label: "Development" },

    { href: "https://app.veriworkly.com", label: "Dashboard" },
    { href: "https://blog.veriworkly.com", label: "Blog" },
    { href: "https://docs.veriworkly.com", label: "Docs" },
    { href: "https://portfolio.veriworkly.com", label: "Portfolio" },
  ],
} as const;
