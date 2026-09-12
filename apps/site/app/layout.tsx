import type { Metadata, Viewport } from "next";

import "./globals.css";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { globalFontVariables } from "@veriworkly/ui";

import { ThemeProvider } from "@/providers/theme-provider";
import { MotionProvider } from "@/providers/motion-provider";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: "VeriWorkly | Privacy-First AI Resume Builder & Portfolio Platform",
  description: siteConfig.description,

  keywords: [...siteConfig.keywords],

  authors: [{ name: "VeriWorkly Team" }],
  creator: "Gautam Raj",
  publisher: "Gautam Raj",

  category: "technology",

  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: "Free AI Resumes, Cover Letters & Web Portfolios | VeriWorkly",
    description:
      "Build and tailor professional resumes, cover letters, and web portfolios instantly using frontier AI models, accessed through a privacy-conscious gateway. Free, open-core, and no signup required.",
    siteName: "VeriWorkly",
    images: [
      {
        url: "/og/landing-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Platform Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Free AI Resumes, Cover Letters & Web Portfolios | VeriWorkly",
    description:
      "Build career documents and portfolios instantly with private AI assistance. Free, open-core, and privacy-first.",
    images: ["/og/landing-page-og.png"],
    creator: siteConfig.twitter.handle,
    site: siteConfig.twitter.site,
  },

  appleWebApp: {
    title: "VeriWorkly",
    statusBarStyle: "default",
    capable: true,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: "/",
  },
};

const WEBSITE_ID = `${siteConfig.url}/#website`;
const PERSON_ID = `${siteConfig.url}/#gautam-raj`;
const ORGANIZATION_ID = `${siteConfig.url}/#organization`;

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: siteConfig.creator,
  url: `${siteConfig.url}/about`,
  jobTitle: "Founder and sole maintainer",
  description:
    "Builds and maintains VeriWorkly single-handedly: the document studio, the ATS scoring engine, the portfolio publisher, and the API. Works in the open — the codebase, the roadmap, and the development metrics are all public.",
  worksFor: { "@id": ORGANIZATION_ID },
  knowsAbout: [
    "AI resume writing",
    "ATS resume optimization",
    "Applicant tracking system parsing",
    "Cover letter generation",
    "Portfolio website publishing",
    "Privacy-first and local-first data storage",
  ],
  sameAs: [siteConfig.links.github, siteConfig.links.linkedin, siteConfig.links.twitter],
};

const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": ["WebApplication", "SoftwareApplication"],
  "@id": `${siteConfig.url}/#app`,

  name: "VeriWorkly",
  url: siteConfig.url,
  description:
    "Free privacy-first career workspace with AI resume builder, cover letter writer, and portfolio builder. No signup required. Create, tailor, and export professional resumes, cover letters, and web portfolios privately.",

  applicationCategory: "BusinessApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript",

  creator: { "@id": PERSON_ID },
  publisher: { "@id": ORGANIZATION_ID },

  featureList: [
    "No login required & local-first",
    "Privacy-first AI resume builder & tailoring",
    "AI cover letter generator",
    "AI portfolio publishing with subdomain hosting",
    "GitHub & LinkedIn profile imports",
    "Master Profile dynamic data sync",
    "ATS-friendly visual customizers",
  ],
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: siteConfig.name,
  url: siteConfig.url,
  logo: {
    "@type": "ImageObject",
    url: `${siteConfig.url}/veriworkly-logo.png`,
    width: 512,
    height: 512,
  },
  description: siteConfig.description,
  email: siteConfig.email,
  founder: { "@id": PERSON_ID },
  sameAs: [siteConfig.links.github, siteConfig.links.twitter, siteConfig.links.linkedin],
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "en",
  publisher: { "@id": ORGANIZATION_ID },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScriptProps(webSiteSchema)}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScriptProps(organizationSchema)}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScriptProps(personSchema)}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScriptProps(webApplicationSchema)}
        />
      </head>

      <body
        className={`${globalFontVariables} bg-background text-foreground font-sans antialiased`}
      >
        <ThemeProvider
          enableSystem
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          storageKey="veriworkly-theme"
        >
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
