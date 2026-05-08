import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { faqs } from "@/features/landing/data/faqItems";

import { Container } from "@veriworkly/ui";

import TrustBar from "@/features/landing/components/TrustBar";
import CTASection from "@/features/landing/components/CTASection";
import FAQSection from "@/features/landing/components/FAQSection";
import HeroSection from "@/features/landing/components/HeroSection";
import DocsSection from "@/features/landing/components/DocsSection";
import BlogSection from "@/features/landing/components/BlogSection";
import BenefitsSection from "@/features/landing/components/BenefitsSection";
import FeaturesSection from "@/features/landing/components/FeaturesSection";
import UseCasesSection from "@/features/landing/components/UseCasesSection";
import SecuritySection from "@/features/landing/components/SecuritySection";
import TemplatesPreview from "@/features/landing/components/TemplatesPreview";
import HowItWorksSection from "@/features/landing/components/HowItWorksSection";

const pageUrl = siteConfig.url;
const pageOgImage = `${siteConfig.url}/og/landing-page-og.png`;

export const metadata: Metadata = {
  title: `Free ATS Resume Builder – No Login Required | ${siteConfig.shortName}`,
  description:
    "Create ATS-friendly resumes instantly with VeriWorkly. Free, open-source, privacy-first, and no login required.",

  openGraph: {
    title: `Free ATS Resume Builder (No Login) | ${siteConfig.shortName}`,
    description:
      "Build professional ATS-friendly resumes in minutes with VeriWorkly for free. Free, open-source, privacy-first, and no signup required resume builder. Choose from modern resume templates, customize easily, and download instantly.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Resume Builder`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Free ATS Resume Builder (No Login) | ${siteConfig.shortName}`,
    description:
      "Create ATS-friendly resumes instantly. No signup required. Open-source and privacy-first.",
    images: [pageOgImage],
  },
};

const Home = () => {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "VeriWorkly",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: "Free ATS-friendly resume builder with no login required.",
            url: siteConfig.url,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            creator: {
              "@type": "Person",
              name: "Gautam Raj",
            },
            featureList: [
              "ATS-friendly resume builder",
              "No login required",
              "Open-source",
              "Privacy-first",
              "Resume PDF export",
              "Modern resume templates",
            ],
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      <main className="py-6 md:py-10">
        <Container className="space-y-12 md:space-y-24">
          <HeroSection />
          <TrustBar />
          <FeaturesSection />
          <HowItWorksSection />
          <BenefitsSection />
          <TemplatesPreview />
          <UseCasesSection />
          <SecuritySection />
          <DocsSection />
          <BlogSection />

          <FAQSection />
          <CTASection />
        </Container>

        <section className="sr-only">
          <h2>Free ATS-Friendly Resume Builder</h2>

          <p>
            VeriWorkly helps you create professional ATS-friendly resumes without requiring signup
            or login. Choose modern resume templates, customize your resume easily, and export
            ready-to-use resumes for job applications.
          </p>
        </section>
      </main>
    </>
  );
};

export default Home;
