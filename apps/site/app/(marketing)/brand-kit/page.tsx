import type { Metadata } from "next";

import { Container } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";
import { buildPageMetadata } from "@/utils/metadata";

import LogoSection from "./_components/LogoSection";
import ColorSection from "./_components/ColorSection";
import VoiceSection from "./_components/VoiceSection";
import PressSection from "./_components/PressSection";
import SocialSection from "./_components/SocialSection";
import BrandKitHeader from "./_components/BrandKitHeader";
import BoilerplateSection from "./_components/BoilerplateSection";
import BrandTypographySection from "./_components/BrandTypographySection";

const ogImage = `/api/og?title=${encodeURIComponent("Brand Kit")}&description=${encodeURIComponent(
  "Logos, colors, typography, and voice guidelines for VeriWorkly.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/brand-kit",
  title: `Brand Kit: Logos, Colors & Guidelines | ${siteConfig.shortName}`,
  description:
    "Download the VeriWorkly logo, color palette, typography, and voice guidelines - everything you need to write or design about VeriWorkly accurately.",
  ogTitle: "The VeriWorkly Brand Kit",
  ogDescription: "Logos, colors, typography, and voice guidelines in one downloadable kit.",
  twitterTitle: "VeriWorkly Brand Kit",
  twitterDescription: "Logos, colors, typography, and voice guidelines for VeriWorkly.",
  image: ogImage,
  imageAlt: `${siteConfig.shortName} Brand Kit`,
  keywords: [
    "VeriWorkly brand kit",
    "VeriWorkly logo",
    "VeriWorkly press kit",
    "VeriWorkly colors",
    "VeriWorkly assets",
  ],
});

const BrandKitPage = () => {
  return (
    <div className="surface-grid min-h-screen pt-28 pb-20 lg:pt-36">
      <Container className="space-y-16 md:space-y-24">
        <BrandKitHeader />
        <LogoSection />
        <ColorSection />
        <BrandTypographySection />
        <SocialSection />
        <VoiceSection />
        <BoilerplateSection />
        <PressSection />
      </Container>
    </div>
  );
};

export default BrandKitPage;
