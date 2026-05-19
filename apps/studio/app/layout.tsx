import type { Metadata } from "next";

import "./globals.css";

import { siteConfig } from "@/config/site";

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
    title: "Build resumes, cover letters, portfolios, and link-in-bio pages | VeriWorkly",
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

    name: "VeriWorkly Studio",
    url: "https://app.veriworkly.com",
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
              url: "https://app.veriworkly.com",
              logo: "https://app.veriworkly.com/veriworkly-logo.png",
            }),
          }}
        />
      </head>

      <body
        className={`${globalFontVariables} bg-background text-foreground flex min-h-screen flex-col font-sans antialiased`}
      >
        <ThemeProvider
          enableSystem
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          storageKey="veriworkly-theme"
        >
          {children}
          <Toaster position="bottom-right" expand={false} richColors />
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
