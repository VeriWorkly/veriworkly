import type { Metadata } from "next";
import "./globals.css";
import { portfolioSiteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(portfolioSiteConfig.url),
  title: {
    default: "Professional Portfolio Builder | VeriWorkly",
    template: "%s | VeriWorkly Portfolio",
  },
  description: portfolioSiteConfig.description,
  keywords: [...portfolioSiteConfig.keywords],
  authors: [{ name: "VeriWorkly" }],
  creator: "VeriWorkly",
  publisher: "VeriWorkly",
  openGraph: {
    type: "website",
    url: portfolioSiteConfig.url,
    title: "Professional Portfolio Builder | VeriWorkly",
    description: portfolioSiteConfig.description,
    siteName: portfolioSiteConfig.name,
  },
  twitter: {
    card: "summary",
    title: "Professional Portfolio Builder | VeriWorkly",
    description: portfolioSiteConfig.description,
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
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
