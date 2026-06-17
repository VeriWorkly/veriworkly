import { siteConfig } from "@/config/site";

import LandingMotion from "@/components/LandingMotion";
import Navigation from "@/components/landing/Navigation";
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
    mainEntity: [
      {
        "@type": "Question",
        name: "How does the portfolio builder differ from the resume builder?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The resume builder is optimized for structured, print-ready documents (PDFs, ATS trackers). The portfolio builder takes your resume data and transforms it into a public, fully styled website hosted on a custom subdomain, designed for online discovery and showcase.",
        },
      },

      {
        "@type": "Question",
        name: "What plans are available and how do AI writing credits work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We offer flexible options: 1-Day Pass ($0.69, 25 AI credits) and 7-Day Sprint ($3.99, 220 AI credits) where credits expire when the pass ends. For long-term use, the Full Bundle subscription is $11.99/mo (or $9.99/mo annual) with 1,000 monthly AI credits that reset each billing cycle. You can also purchase Portfolio Pro only ($8.99/mo) or AI Credits only ($4.99/mo) if you prefer a single service. Unused credits do not roll over.",
        },
      },

      {
        "@type": "Question",
        name: "How do custom subdomains work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "With Portfolio Pro, you can choose a unique VeriWorkly subdomain (like yourname.veriworkly.com) to share your site with the world. All subdomains include automatic, secure SSL certificates.",
        },
      },

      {
        "@type": "Question",
        name: "How do page templates work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can switch templates at any time with a single click. Your profile data, project details, testimonials, and SEO tags remain intact. Only the presentation layer morphs, letting you redesign your portfolio instantly.",
        },
      },

      {
        "@type": "Question",
        name: "Can I build my portfolio before paying?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can create a private draft, fill your content, and preview live templates before upgrading to Portfolio Pro.",
        },
      },
    ],
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
        <main className="text-ink-2 w-full max-w-full overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif]">
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
