import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import AboutHero from "@/features/about/AboutHero";
import AboutPrinciples from "@/features/about/AboutPrinciples";
import AboutProductScope from "@/features/about/AboutProductScope";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import AboutStudentProgram from "@/features/about/AboutStudentProgram";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/about`;

export const metadata: Metadata = buildPageMetadata({
  path: "/about",

  title: `About Us: Privacy-First AI Career Workspace | ${siteConfig.shortName}`,

  description:
    "VeriWorkly is a local-first, privacy-focused AI career workspace: resumes, cover letters, ATS scoring, and web portfolios built around one Master Profile.",

  ogTitle: "Why We Built VeriWorkly",
  ogDescription:
    "You shouldn't have to pay a monthly subscription just to download your own resume. Here's why VeriWorkly is local-first, open-source, and free to export.",

  twitterTitle: "Free ATS Resumes & Web Portfolios | VeriWorkly",
  twitterDescription:
    "The story behind VeriWorkly: a privacy-first career workspace with unlocked PDF exports and local data storage.",

  image: "/og/about-page-og.png",
  imageAlt: "About VeriWorkly Platform",

  keywords: [
    "about VeriWorkly",
    "privacy-first career workspace",
    "AI resume writer company",
    "open source resume builder company",
    "Gautam Raj VeriWorkly",
  ],
});

const AboutPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "About", item: pageUrl },
    ],
  };

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About Us: Privacy-First AI Career Workspace | ${siteConfig.shortName}`,
    description:
      "VeriWorkly is a local-first, privacy-focused AI career workspace: resumes, cover letters, ATS scoring, and web portfolios built around one Master Profile.",
    url: pageUrl,
    mainEntity: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      founder: {
        "@type": "Person",
        name: "Gautam Raj",
      },
      sameAs: [siteConfig.links.github, siteConfig.links.twitter, siteConfig.links.linkedin],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(aboutSchema)} />

      <AboutHero />
      <AboutPrinciples />
      <AboutProductScope />
      <AboutStudentProgram />
      <InteractiveCTA />
    </>
  );
};

export default AboutPage;
