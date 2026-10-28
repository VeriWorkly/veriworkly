import type { Metadata } from "next";

import "./globals.css";

import { RootProvider } from "fumadocs-ui/provider/next";

import { feedAlternates, siteConfig, titleTemplate } from "@/config/site";
import { globalFontVariables } from "@veriworkly/ui";
import { buildSiteSchema, serializeSchema } from "@/lib/structured-data";

import { MainLayout } from "../components/layout/MainLayout";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: "VeriWorkly Blog | Resume Tips, Career Advice & Tech Insights",
    template: titleTemplate,
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

  category: "career",

  // Declaring the feeds is what makes readers and aggregators able to discover them.
  // Each page declares its own canonical.
  alternates: {
    types: feedAlternates,
  },

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
    site: siteConfig.twitterHandle,
    creator: "@noober_boy",
  },

  // No `index, follow` here: it is the default, and on a 404 it would contradict the `noindex`.
  robots: {
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

const BlogLayout = ({ children }: { children: React.ReactNode }) => {
  // Site-level entities only. Post pages emit their own graph that references these
  // by `@id`, so the Organization is declared once rather than three times under
  // three different names.
  const jsonLd = buildSiteSchema();

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeSchema(jsonLd) }}
        />
      </head>

      <body
        className={`${globalFontVariables} bg-background text-foreground flex min-h-screen flex-col font-sans antialiased`}
      >
        <RootProvider
          search={{ enabled: false }}
          theme={{ storageKey: "veriworkly-theme", hotKey: false }}
        >
          <MainLayout>{children}</MainLayout>
        </RootProvider>
      </body>
    </html>
  );
};

export default BlogLayout;
