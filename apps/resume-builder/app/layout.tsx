import type { Metadata } from "next";

import "./globals.css";
import { globalFontVariables } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: "VeriWorkly Resume Builder",
  description: siteConfig.description,

  keywords: [...siteConfig.keywords],

  authors: [{ name: "VeriWorkly Team" }],
  creator: "Gautam Raj",
  publisher: "Gautam Raj",

  category: "technology",

  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: "Free Resume Builder with No Login | VeriWorkly",
    description:
      "Create professional resumes instantly with VeriWorkly. No login required. 100% free, open-source, and privacy-first — your data stays on your device.",
    siteName: "VeriWorkly",
    images: [
      {
        url: "/og/landing-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Resume Builder Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Free Resume Builder (No Login) | VeriWorkly",
    description: "Build resumes instantly with no login. Free, open-source, and privacy-first.",
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

    name: "VeriWorkly Resume Builder",
    url: "https://veriworkly.com",
    description:
      "Free resume builder with no login. Create professional ATS-friendly resumes instantly with full privacy.",

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
              url: "https://veriworkly.com",
              logo: "https://veriworkly.com/veriworkly-logo.png",
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
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
