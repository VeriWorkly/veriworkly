import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { faqs } from "@/features/landing/faq/data/faqItems";

import { HeroHeader } from "@/features/landing/hero/HeroHeader";
import BrandTrust from "@/features/landing/brand-trust/BrandTrust";
import PremiumFAQ from "@/features/landing/faq/PremiumFAQ";
import GaplessBento from "@/features/landing/bento/GaplessBento";
import PrivacyWhyUs from "@/features/landing/privacy/PrivacyWhyUs";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import ComparisonMatrix from "@/features/landing/comparison/ComparisonMatrix";
import MetricsProofBar from "@/features/landing/metrics-proof/MetricsProofBar";
import TemplateShowcase from "@/features/landing/template-showcase/TemplateShowcase";
import InteractiveProcess from "@/features/landing/process/InteractiveProcess";
import DocumentPortfolioSwitcher from "@/features/landing/document-switcher/DocumentPortfolioSwitcher";

const pageUrl = siteConfig.url;
const pageOgImage = `${siteConfig.url}/og/landing-page-og.png`;

export const metadata: Metadata = {
  title: `Free AI Resume Builder, Cover Letters & Web Portfolios | ${siteConfig.shortName}`,
  description:
    "Build ATS-friendly resumes, targeted cover letters, and live web portfolios in minutes. Privacy-first, local-first data storage, open-core, and zero login required.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Free AI Resumes, Cover Letters & Web Portfolios | ${siteConfig.shortName}`,
    description:
      "Create professional resumes, cover letters, and web portfolios in minutes with VeriWorkly's privacy-first AI tools. Free, open-core, and no signup required. Customize professional templates, sync dynamic sections with AI tailoring, and publish instantly.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Resume, Cover Letter & Web Portfolio Platform`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Free AI Resumes, Cover Letters & Web Portfolios | ${siteConfig.shortName}`,
    description:
      "Build ATS-friendly resumes, cover letters, and custom web portfolios instantly with private AI assistance. No signup required. Open-core and privacy-first.",
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
            description:
              "Free-to-use privacy-first career workspace with AI resume builder, AI cover letter writer, and AI portfolio builder.",
            url: siteConfig.url,
            offers: [
              {
                "@type": "Offer",
                name: "Free Tier",
                price: "0",
                priceCurrency: "USD",
                description:
                  "Unlimited local resumes, cover letters, and PDF exports without login.",
              },
              {
                "@type": "Offer",
                name: "3-Day Sprint Pass",
                price: "2.99",
                priceCurrency: "USD",
                description: "3 days of Portfolio Pro hosting + 150 AI writing credits.",
              },
              {
                "@type": "Offer",
                name: "7-Day Hunt Pass",
                price: "5.99",
                priceCurrency: "USD",
                description: "7 days of Portfolio Pro hosting + 400 AI writing credits.",
              },
            ],
            creator: {
              "@type": "Organization",
              name: "VeriWorkly",
              url: siteConfig.url,
              founder: {
                "@type": "Person",
                name: "Gautam Raj",
              },
            },
            featureList: [
              "ATS-friendly AI resume builder & tailoring",
              "AI cover letter generator",
              "Live web portfolio publisher with custom subdomains",
              "No login required & local-first storage",
              "Open-core platform",
              "GitHub & LinkedIn data imports",
              "Master Profile dynamic synchronization",
            ],
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "VeriWorkly",
            url: siteConfig.url,
            logo: `${siteConfig.url}/icon1.png`,
            founder: {
              "@type": "Person",
              name: "Gautam Raj",
            },
            sameAs: ["https://github.com/VeriWorkly/veriworkly", "https://twitter.com/VeriWorkly"],
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to Build an ATS Resume & Web Portfolio with VeriWorkly",
            description:
              "Learn how to build a professional, ATS-friendly resume and web portfolio in 4 simple steps without signing up.",
            step: [
              {
                "@type": "HowToStep",
                name: "Launch the Studio",
                text: "Open the VeriWorkly Studio editor at app.veriworkly.com.",
                url: "https://app.veriworkly.com",
              },
              {
                "@type": "HowToStep",
                name: "Choose a Template",
                text: "Select an ATS-optimized resume template or developer web portfolio layout.",
                url: "https://veriworkly.com/templates",
              },
              {
                "@type": "HowToStep",
                name: "Enter Your Experience",
                text: "Fill in your details or import experience from LinkedIn/GitHub straight into your Master Profile.",
              },
              {
                "@type": "HowToStep",
                name: "Export PDF or Publish Portfolio",
                text: "Download your resume as an ATS PDF instantly or publish your web portfolio to a custom subdomain.",
              },
            ],
            totalTime: "PT5M",
            estimatedCost: {
              "@type": "HowToSupply",
              name: "Free",
            },
          }),
        }}
      />

      <HeroHeader />
      <BrandTrust />
      <MetricsProofBar />
      <GaplessBento />
      <TemplateShowcase />
      <InteractiveProcess />
      <DocumentPortfolioSwitcher />
      <PrivacyWhyUs />
      <ComparisonMatrix />
      <PremiumFAQ />
      <InteractiveCTA />
    </>
  );
};

export default Home;
