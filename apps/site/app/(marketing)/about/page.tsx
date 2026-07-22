import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import AboutHero from "@/features/about/AboutHero";
import AboutPrinciples from "@/features/about/AboutPrinciples";
import AboutProductScope from "@/features/about/AboutProductScope";
import AboutStudentProgram from "@/features/about/AboutStudentProgram";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";

const pageUrl = `${siteConfig.url}/about`;
const pageOgImage = `${siteConfig.url}/og/about-page-og.png`;

export const metadata: Metadata = {
  title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
  description:
    "We believe job seekers should own their data and use AI safely. VeriWorkly is a local-first, privacy-focused AI career workspace for resumes, cover letters, and portfolios.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
    description:
      "We build career tools that put job seekers in control of their data and AI assistant usage. No paywalls, no sold profiles, no data locking.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "About VeriWorkly Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
    description:
      "Explore the open-source, AI-powered career workspace focused on data sovereignty and client-side security.",
    images: [pageOgImage],
  },
};

const AboutPage = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    sameAs: [siteConfig.links.github, siteConfig.links.twitter, siteConfig.links.linkedin],
    founder: {
      "@type": "Person",
      name: siteConfig.creator,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />

      <AboutHero />
      <AboutPrinciples />
      <AboutProductScope />
      <AboutStudentProgram />
      <InteractiveCTA />
    </>
  );
};

export default AboutPage;
