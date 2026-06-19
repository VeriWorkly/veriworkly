import { siteConfig } from "@/config/site";
import { landingFaqs } from "@/features/faq/constants";

import LandingMotion from "@/components/LandingMotion";
import Navigation from "@/components/Navigation";
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
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "11.99",
      offerCount: "7",
      offers: [
        {
          "@type": "Offer",
          name: "Draft Tier",
          price: "0",
          priceCurrency: "USD",
        },

        {
          "@type": "Offer",
          name: "1-Day Pass",
          price: "0.69",
          priceCurrency: "USD",
        },

        {
          "@type": "Offer",
          name: "7-Day Sprint",
          price: "3.99",
          priceCurrency: "USD",
        },

        {
          "@type": "Offer",
          name: "Full Bundle (Annual)",
          price: "9.99",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "9.99",
            priceCurrency: "USD",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: "1",
              unitCode: "MON",
            },
          },
        },

        {
          "@type": "Offer",
          name: "Full Bundle (Monthly)",
          price: "11.99",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "11.99",
            priceCurrency: "USD",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: "1",
              unitCode: "MON",
            },
          },
        },

        {
          "@type": "Offer",
          name: "Portfolio Pro Only",
          price: "8.99",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "8.99",
            priceCurrency: "USD",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: "1",
              unitCode: "MON",
            },
          },
        },

        {
          "@type": "Offer",
          name: "AI Credits Only",
          price: "4.99",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "4.99",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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
