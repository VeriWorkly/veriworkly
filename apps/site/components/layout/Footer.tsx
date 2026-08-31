import {
  LandingFooter,
  LandingFooterLink,
  LandingFooterColumn,
  LandingFooterSocialLink,
} from "./LandingFooter";

import { siteConfig } from "@/config/site";

const footerColumns: LandingFooterColumn[] = [
  {
    title: "Platform",
    links: [
      { name: "Resume Builder", href: siteConfig.links.app, external: true },
      { name: "Portfolio Builder", href: siteConfig.links.portfolio, external: true },
      { name: "Free ATS Checker", href: "/ats-checker" },
      { name: "Core Features", href: "/features" },
      { name: "How It Works", href: "/how-it-works" },
      { name: "Template Gallery", href: "/templates" },
      { name: "Pricing", href: "/pricing" },
      { name: "Compare", href: "/compare" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Docs & APIs", href: siteConfig.links.docs, external: true },
      { name: "Engineering Blog", href: siteConfig.links.blog, external: true },
      { name: "System Security", href: "/security" },
      { name: "Design System", href: "/style-guide" },
      { name: "Brand Kit", href: "/brand-kit" },
      { name: "Changelog", href: "/changelog" },
      { name: "FAQ & Help", href: "/faq" },
    ],
  },
  {
    title: "Organization",
    links: [
      { name: "Open Source", href: siteConfig.links.github, external: true },
      { name: "Our Mission", href: "/about" },
      { name: "Contact Team", href: "/contact" },
      { name: "Product Roadmap", href: "/roadmap" },
      { name: "Affiliate Program", href: "/affiliate" },
      { name: "Student Ambassador", href: "/ambassador" },
    ],
  },
];

const socialLinks: LandingFooterSocialLink[] = [
  { name: "GitHub", href: siteConfig.links.github, iconSrc: "/icons/socials/github.svg" },
  { name: "X (Twitter)", href: siteConfig.links.twitter, iconSrc: "/icons/socials/twitter-x.svg" },
  { name: "LinkedIn", href: siteConfig.links.linkedin, iconSrc: "/icons/socials/linkedIn.svg" },
];

/**
 * The bottom bar previously repeated the affiliate and ambassador links that already
 * appear under "Organization" above, while /ats-checker - the flagship acquisition
 * page - had no footer link at all. These are the two utility pages that earn a slot
 * here instead.
 */
const navLinks: LandingFooterLink[] = [
  { name: "Free ATS Checker", href: "/ats-checker" },
  { name: "Public Stats", href: "/stats" },
];

const legalLinks: LandingFooterLink[] = [
  { name: "Terms & Conditions", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
];

const Footer = () => {
  return (
    <LandingFooter
      shortName={siteConfig.shortName}
      headingPrefix="Are You Interested"
      ctaText="Talk to the team"
      ctaHref="/contact"
      logoSrc="/veriworkly-logo.png"
      authorName="Gautam Raj"
      socialLinks={socialLinks}
      footerColumns={footerColumns}
      navLinks={navLinks}
      legalLinks={legalLinks}
    />
  );
};

export default Footer;
