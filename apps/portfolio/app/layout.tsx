import type { Metadata } from "next";

import "./globals.css";

import { siteConfig } from "@/config/site";

import { ThemeProvider } from "@/provider/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: "Professional Portfolio Builder | VeriWorkly",
    template: "%s | VeriWorkly",
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
    title: "Professional Portfolio Builder | VeriWorkly",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og/landing-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Portfolio preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Professional Portfolio Builder | VeriWorkly",
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
    title: "VeriWorkly Portfolio",
    statusBarStyle: "default",
    capable: true,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.links.main,
    logo: `${siteConfig.links.main}/veriworkly-logo.png`,
    sameAs: [siteConfig.links.twitter, siteConfig.links.linkedin, siteConfig.links.github],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>

      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
