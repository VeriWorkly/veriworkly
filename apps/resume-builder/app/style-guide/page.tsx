import type { Metadata } from "next";
import { Container } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

import { StyleGuideHeader } from "./_components/StyleGuideHeader";
import { ColorSection } from "./_components/ColorSection";
import { TypographySection } from "./_components/TypographySection";
import { ComponentsSection } from "./_components/ComponentsSection";
import { BrandAssetsSection } from "./_components/BrandAssetsSection";
import { LayoutSection } from "./_components/LayoutSection";

const pageUrl = `${siteConfig.url}/style-guide`;
const pageOgImage = `${siteConfig.url}/og/style-page-og.png`;

export const metadata: Metadata = {
  title: `Resume Builder Style Guide | ${siteConfig.shortName}`,
  description:
    "Explore the VeriWorkly design system including colors, typography, UI components, and branding guidelines.",

  openGraph: {
    title: `Resume Builder Style System | ${siteConfig.shortName}`,
    description:
      "Official VeriWorkly style guide with UI components, typography, layout, and branding standards.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Design System`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} Design System`,
    description:
      "Explore the official VeriWorkly UI kit, typography, colors, and design system guidelines.",
    images: [pageOgImage],
  },
};

const StyleGuidePage = () => {
  return (
    <main className="surface-grid min-h-screen py-14 md:py-20">
      <Container className="space-y-16 md:space-y-24">
        <StyleGuideHeader />
        <ColorSection />
        <TypographySection />
        <ComponentsSection />
        <BrandAssetsSection />
        <LayoutSection />
      </Container>
    </main>
  );
};

export default StyleGuidePage;
