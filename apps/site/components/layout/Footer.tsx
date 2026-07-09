"use client";

import React from "react";
import { siteConfig } from "@/config/site";
import { LandingFooter, LandingFooterColumn, LandingFooterSocialLink, LandingFooterLink } from "./LandingFooter";

const footerColumns: LandingFooterColumn[] = [
  {
    title: "Platform",
    links: [
      { name: "Resume Builder", href: siteConfig.links.app, external: true },
      { name: "Portfolio Builder", href: siteConfig.links.portfolio, external: true },
      { name: "Core Features", href: "/features" },
      { name: "How It Works", href: "/how-it-works" },
      { name: "Template Gallery", href: "/templates" },
      { name: "Pricing", href: "/pricing" },
      { name: "Product Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Docs & APIs", href: "https://docs.veriworkly.com", external: true },
      { name: "Engineering Blog", href: "https://blog.veriworkly.com", external: true },
      { name: "System Security", href: "/security" },
      { name: "Design System", href: "/style-guide" },
      { name: "FAQ & Help", href: "/faq" },
      { name: "Affiliate Program", href: "/affiliate" },
      { name: "Student Ambassador", href: "/ambassador" },
    ],
  },
  {
    title: "Organization",
    links: [
      { name: "Our Mission", href: "/about" },
      { name: "Open Source", href: siteConfig.links.github, external: true },
      { name: "Contact Team", href: "/contact" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Use", href: "/terms" },
    ],
  },
];

const socialLinks: LandingFooterSocialLink[] = [
  { name: "GitHub", href: siteConfig.links.github, iconSrc: "/icons/socials/github.svg" },
  { name: "X (Twitter)", href: siteConfig.links.twitter, iconSrc: "/icons/socials/twitter-x.svg" },
  { name: "LinkedIn", href: siteConfig.links.linkedin, iconSrc: "/icons/socials/linkedIn.svg" },
];

const navLinks: LandingFooterLink[] = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Reviews", href: "/reviews" },
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
      ctaText="Contact Sales"
      ctaHref={siteConfig.links.app}
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
