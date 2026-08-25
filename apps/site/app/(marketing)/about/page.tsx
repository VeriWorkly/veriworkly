import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { buildPageMetadata } from "@/utils/metadata";

import AboutHero from "@/features/about/AboutHero";
import AboutPrinciples from "@/features/about/AboutPrinciples";
import AboutProductScope from "@/features/about/AboutProductScope";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import AboutStudentProgram from "@/features/about/AboutStudentProgram";

export const revalidate = false;
export const dynamic = "force-static";

export const metadata: Metadata = buildPageMetadata({
  path: "/about",
  title: `About Us: Privacy-First AI Career Workspace | ${siteConfig.shortName}`,
  description:
    "VeriWorkly is a local-first, privacy-focused AI career workspace: resumes, cover letters, ATS scoring, and web portfolios built around one Master Profile.",
  ogTitle: "Why We Built VeriWorkly",
  ogDescription:
    "Career tools shouldn't hold your résumé hostage behind a subscription. Here's why VeriWorkly is local-first, AI-powered, and free to start.",
  twitterTitle: "Career tools shouldn't paywall your own résumé",
  twitterDescription:
    "The story behind VeriWorkly: a privacy-first, AI-powered career workspace with no paywalled downloads and no sold data.",
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
  return (
    <>
      <AboutHero />
      <AboutPrinciples />
      <AboutProductScope />
      <AboutStudentProgram />
      <InteractiveCTA />
    </>
  );
};

export default AboutPage;
