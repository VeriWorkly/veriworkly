import { siteConfig } from "@/config/site";
import { landingFaqs } from "@/features/faq/constants";
import { aggregateOffer } from "@/features/pricing/data/offers";

import LandingMotion from "@/components/LandingMotion";
import Navigation from "@/components/Navigation";
import { JsonLd } from "@/components/JsonLd";
import SeoSection from "@/components/landing/SeoSection";
import CtaSection from "@/components/landing/CtaSection";
import FaqSection from "@/components/landing/FaqSection";
import HeroSection from "@/components/landing/HeroSection";
import MarqueeSection from "@/components/landing/MarqueeSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import FeatureGridSection from "@/components/landing/FeatureGridSection";
import TemplateLinksSection from "@/components/landing/TemplateLinksSection";

const HomePage = () => {
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VeriWorkly Portfolio Builder",
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: aggregateOffer(`${siteConfig.links.portfolio}/pricing`),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landingFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <JsonLd data={webAppSchema} />
      <JsonLd data={faqSchema} />
      <LandingMotion>
        <main className="text-ink-2 bg-paper w-full max-w-full overflow-x-clip">
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
          <FaqSection />
          <CtaSection />
          <PortfolioPublicFooter />
        </main>
      </LandingMotion>
    </>
  );
};

export default HomePage;
