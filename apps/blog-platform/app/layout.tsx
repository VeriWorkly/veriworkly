import type { Metadata } from "next";

import "./globals.css";

import { ThemeProvider } from "next-themes";
import { RootProvider } from "fumadocs-ui/provider/next";

import { globalFontVariables } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: "VeriWorkly Blog | Resume Tips, Career Advice & Tech Insights",
    template: `%s | ${siteConfig.shortName} Blog`,
  },

  description:
    "Explore resume writing tips, ATS optimization strategies, career advice, and developer insights from VeriWorkly.",

  keywords: [
    "resume tips",
    "ATS resume guide",
    "career advice",
    "resume builder blog",
    "job application tips",
    "developer insights",
    "VeriWorkly blog",
  ],

  authors: [{ name: "VeriWorkly Team" }],
  creator: "Gautam Raj",
  publisher: "VeriWorkly",

  category: "technology",

  openGraph: {
    type: "website",
    url: `${siteConfig.url}`,
    title: "VeriWorkly Blog | Career Insights & Resume Tips",
    description:
      "Get expert resume tips, ATS strategies, and career insights to land your next job.",
    siteName: siteConfig.name,
    images: [
      {
        url: "/og/blog-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Blog Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "VeriWorkly Blog | Resume Tips & Career Advice",
    description: "Learn how to build better resumes and grow your career with actionable insights.",
    images: ["/og/blog-page-og.png"],
    creator: "@noober_boy",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: siteConfig.url,
  },
};

const BlogLayout = ({ children }: { children: React.ReactNode }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",

    name: "VeriWorkly Blog",
    url: siteConfig.url,

    description: "Career advice, resume tips, and technical insights from VeriWorkly.",

    publisher: {
      "@type": "Organization",
      name: "VeriWorkly",
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/veriworkly-logo.png`,
      },
    },
  };

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
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
          <RootProvider search={{ options: { delayMs: 450 } }}>{children}</RootProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default BlogLayout;
