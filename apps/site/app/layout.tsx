import type { Metadata } from "next";

import "./globals.css";

import { siteConfig } from "@/config/site";
import { globalFontVariables } from "@veriworkly/ui";

import { ThemeProvider } from "@/providers/theme-provider";

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
      "Build and tailor professional resumes, cover letters, and web portfolios instantly using privacy-first AI tools (Claude & GPT-4o). Free, open-core, and no signup required.",
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
    creator: "@noober_boy",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
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
    languages: {
      "en-US": "/",
    },
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],

    name: "VeriWorkly",
    url: "https://veriworkly.com",
    description:
      "Free privacy-first career workspace with AI resume builder, cover letter writer, and portfolio builder. No signup required. Create, tailor, and export professional resumes, cover letters, and web portfolios privately.",

    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",

    creator: {
      "@type": "Person",
      name: "Gautam Raj",
    },

    publisher: {
      "@type": "Organization",
      name: "VeriWorkly",
    },

    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },

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

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "VeriWorkly",
              url: "https://veriworkly.com",
              logo: "https://veriworkly.com/veriworkly-logo.png",
            }),
          }}
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
