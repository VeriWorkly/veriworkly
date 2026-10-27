import type { Metadata } from "next";
import { headers } from "next/headers";

import "./globals.css";

import { siteConfig } from "@/config/site";
import { toSafeJsonLd } from "@/lib/json-ld";
import { globalFontVariables } from "@veriworkly/ui";

import { Toaster } from "@/components/Toaster";

import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: "VeriWorkly Studio",
    template: "%s | VeriWorkly Studio",
  },
  description: siteConfig.description,

  keywords: [...siteConfig.keywords],

  authors: [{ name: "VeriWorkly Team" }],
  creator: "Gautam Raj",
  publisher: "Gautam Raj",

  category: "technology",

  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: "Build resumes, cover letters and portfolios | VeriWorkly",
    description: siteConfig.description,
    siteName: siteConfig.shortName,
    images: [
      {
        url: "/og/dashboard-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Studio preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "VeriWorkly Studio",
    description: siteConfig.description,
    images: ["/og/dashboard-page-og.png"],
    creator: siteConfig.twitter.handle,
  },

  appleWebApp: {
    title: "VeriWorkly",
    statusBarStyle: "default",
    capable: true,
  },

  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  // Set by `proxy.ts`. Reading it renders every page per request, which a nonce needs anyway.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],

    name: "VeriWorkly Studio",
    url: siteConfig.url,
    description: siteConfig.description,

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
      "No login required",
      "Privacy-first",
      "ATS-friendly templates",
      "Real-time preview",
      "Open-source",
    ],
  };

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: toSafeJsonLd(jsonLd),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: toSafeJsonLd({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "VeriWorkly",
              url: siteConfig.links.main,
              logo: `${siteConfig.url}/veriworkly-logo.png`,
            }),
          }}
        />
      </head>

      <body
        className={`${globalFontVariables} bg-background text-foreground flex min-h-screen flex-col font-sans antialiased`}
      >
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster position="bottom-right" expand={false} richColors />
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
