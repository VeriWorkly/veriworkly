import { siteConfig } from "@/config/site";

import LandingMotion from "@/components/LandingMotion";
import Navigation from "@/components/landing/Navigation";
import SeoSection from "@/components/landing/SeoSection";
import CtaSection from "@/components/landing/CtaSection";
import HeroSection from "@/components/landing/HeroSection";
import MarqueeSection from "@/components/landing/MarqueeSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import FeatureGridSection from "@/components/landing/FeatureGridSection";
import TemplateLinksSection from "@/components/landing/TemplateLinksSection";

export default function HomePage() {
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VeriWorkly Portfolio Builder",
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "12",
      offerCount: "2",
      offers: [
        {
          "@type": "Offer",
          name: "Draft Tier",
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Portfolio Pro Tier",
          price: "12",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "12",
            priceCurrency: "USD",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: "1",
              unitCode: "MON",
            },
          },
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <LandingMotion>
        <main className="w-full max-w-full overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] text-[#11110f]">
          <div
            aria-hidden="true"
            data-scroll-progress
            className="bg-accent fixed inset-x-0 top-0 z-100 h-40 origin-left scale-x-0"
          />

          <Navigation />
          <HeroSection />
          <MarqueeSection />
          <HowItWorksSection />
          <FeatureGridSection />
          <TemplateLinksSection />
          <SeoSection />
          <CtaSection />
          <PortfolioPublicFooter />
        </main>
      </LandingMotion>
    </>
  );
}
