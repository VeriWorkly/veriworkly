import { siteConfig } from "@/config/site";

import { GithubIcon, LinkedInIcon, MarketingFooter, TwitterXIcon } from "@veriworkly/ui";

const Footer = () => {
  return (
    <MarketingFooter
      homeHref="/"
      logoAlt="VeriWorkly Logo"
      logoSrc="/veriworkly-logo.png"
      email={siteConfig.email}
      brandName={siteConfig.name}
      shortName={siteConfig.shortName}
      location="Open Source Everywhere"
      description="Empowering job seekers with most advanced, privacy-first, and open-source resume building experience. 100% free, forever."
      socialLinks={[
        { name: "GitHub", href: siteConfig.links.github, icon: GithubIcon },
        { name: "Twitter", href: siteConfig.links.twitter, icon: TwitterXIcon },
        { name: "LinkedIn", href: siteConfig.links.linkedin, icon: LinkedInIcon },
      ]}
      footerColumns={[
        {
          title: "Platform",
          links: [
            { name: "Resume Builder", href: siteConfig.links.app, external: true },
            { name: "Template Gallery", href: "/templates" },
            { name: "Product Roadmap", href: "/roadmap" },
            { name: "GitHub Activity", href: "/stats" },
            { name: "Release Notes", href: "/roadmap/done" },
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
          ],
        },
        {
          title: "Organization",
          links: [
            { name: "Our Mission", href: "/about" },
            { name: "Open Source", href: siteConfig.links.github, external: true },
            { name: "Privacy Policy", href: "/privacy" },
            { name: "Terms of Use", href: "/terms" },
            { name: "Contact Team", href: "/contact" },
          ],
        },
      ]}
      legalLinks={[
        { name: "Privacy", href: "/privacy" },
        { name: "Terms", href: "/terms" },
        { name: "FAQ", href: "/faq" },
        { name: "Security", href: "/security" },
      ]}
      tagline="Build for future of work."
      statusText="SYSTEMS OPERATIONAL | ALL TEMPLATES FREE"
    />
  );
};

export default Footer;
