import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { faqs } from "@/features/landing/data/faqItems";
import { HeroHeader } from "@/components/marketing/HeroHeader";

const pageUrl = siteConfig.url;
const pageOgImage = `${siteConfig.url}/og/landing-page-og.png`;

export const metadata: Metadata = {
  title: `Free AI Resume Builder, Cover Letters & Portfolios | ${siteConfig.shortName}`,
  description:
    "Build and tailor ATS-friendly resumes, cover letters, and web portfolios instantly with advanced AI tools. Free, privacy-first, open-core, and no login required.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Free AI Resumes, Cover Letters & Portfolios | ${siteConfig.shortName}`,
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
        alt: `${siteConfig.shortName} Document & Portfolio Platform`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Free AI Resumes, Cover Letters & Portfolios | ${siteConfig.shortName}`,
    description:
      "Build ATS-friendly resumes, cover letters, and custom portfolios instantly with private AI assistance. No signup required. Open-core and privacy-first.",
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
              "ATS-friendly AI resume builder & tailoring",
              "AI cover letter generator",
              "AI portfolio publisher with custom subdomains",
              "No login required",
              "Open-core platform",
              "Privacy-first & local-first",
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
            name: "How to Create a Professional Resume with VeriWorkly",
            description:
              "Learn how to build a professional, ATS-friendly resume in 4 simple steps without signing up.",
            step: [
              {
                "@type": "HowToStep",
                name: "Launch the Studio",
                text: "Visit the VeriWorkly Resume Studio at app.veriworkly.com.",
                url: "https://app.veriworkly.com",
              },
              {
                "@type": "HowToStep",
                name: "Choose a Template",
                text: "Select one of our professional, ATS-optimized resume templates.",
                url: "https://veriworkly.com/templates",
              },
              {
                "@type": "HowToStep",
                name: "Enter Your Information",
                text: "Fill in your personal details, experience, education, and skills. Changes are previewed in real-time.",
              },
              {
                "@type": "HowToStep",
                name: "Export and Download",
                text: "Download your resume as a professional PDF instantly. No login required.",
              },
            ],
            totalTime: "PT10M",
            estimatedCost: {
              "@type": "HowToSupply",
              name: "Free",
            },
          }),
        }}
      />

      <HeroHeader />

      <section className="sr-only">
        <h2>Free ATS-Friendly Resume Builder</h2>

        <p>
          VeriWorkly helps you create professional ATS-friendly resumes without requiring signup
          or login. Choose modern resume templates, customize your resume easily, and export
          ready-to-use resumes for job applications.
        </p>
      </section>
    </>
  );
};

export default Home;
