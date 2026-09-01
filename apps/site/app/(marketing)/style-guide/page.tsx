import type { Metadata } from "next";

import { Container } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";
import { buildPageMetadata } from "@/utils/metadata";

import { ColorSection } from "./_components/ColorSection";
import { LayoutSection } from "./_components/LayoutSection";
import { MotionSection } from "./_components/MotionSection";
import { EffectsSection } from "./_components/EffectsSection";
import { StyleGuideHeader } from "./_components/StyleGuideHeader";
import { TypographySection } from "./_components/TypographySection";
import { ComponentsSection } from "./_components/ComponentsSection";
import { BrandAssetsSection } from "./_components/BrandAssetsSection";

export const metadata: Metadata = buildPageMetadata({
  path: "/style-guide",
  title: `Design System Style Guide | ${siteConfig.shortName}`,
  description:
    "Explore the VeriWorkly design system including colors, typography, UI components, and branding guidelines.",
  ogTitle: "The Design System Behind VeriWorkly",
  ogDescription:
    "Colors, typography, components, and brand assets - the same design system that powers the whole VeriWorkly product.",
  twitterTitle: "VeriWorkly's design system, in the open",
  twitterDescription:
    "Explore the official VeriWorkly UI kit, typography, colors, and design system guidelines.",
  image: "/og/style-page-og.png",
  imageAlt: `${siteConfig.shortName} Design System`,
  keywords: [
    "VeriWorkly design system",
    "VeriWorkly style guide",
    "open source design system",
    "brand guidelines",
  ],
});

const StyleGuidePage = () => {
  return (
    <div className="surface-grid min-h-screen pt-28 pb-20 lg:pt-36">
      <Container className="space-y-16 md:space-y-24">
        <StyleGuideHeader />
        <ColorSection />
        <TypographySection />
        <ComponentsSection />
        <BrandAssetsSection />
        <EffectsSection />
        <LayoutSection />
        <MotionSection />
      </Container>
    </div>
  );
};

export default StyleGuidePage;
