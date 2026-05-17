import { siteConfig } from "@/config/site";

import { GithubIcon, LinkedInIcon, MarketingFooter, TwitterXIcon } from "@veriworkly/ui";

const Footer = () => {
  return (
    <MarketingFooter
      logoAlt="VeriWorkly Logo"
      logoSrc="/veriworkly-logo.png"
      homeHref={siteConfig.links.main}
      brandName={siteConfig.name}
      shortName={siteConfig.shortName}
      email="hello@veriworkly.com"
      location="Open Source Everywhere"
      description="Empowering job seekers with the most advanced, privacy-first, and open-source resume building experience. 100% free, forever."
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
            {
              name: "Template Gallery",
              href: `${siteConfig.links.main}/templates`,
              external: true,
            },
            { name: "Product Roadmap", href: `${siteConfig.links.main}/roadmap`, external: true },
            { name: "GitHub Activity", href: `${siteConfig.links.main}/stats`, external: true },
            {
              name: "Release Notes",
              href: `${siteConfig.links.main}/roadmap/done`,
              external: true,
            },
          ],
        },
        {
          title: "Resources",
          links: [
            { name: "Docs & APIs", href: siteConfig.links.docs, external: true },
            { name: "Engineering Blog", href: "/", external: false },
            { name: "System Security", href: `${siteConfig.links.main}/security`, external: true },
            { name: "Design System", href: `${siteConfig.links.main}/style-guide`, external: true },
            { name: "FAQ & Help", href: `${siteConfig.links.main}/faq`, external: true },
          ],
        },
        {
          title: "Organization",
          links: [
            { name: "Our Mission", href: `${siteConfig.links.main}/about`, external: true },
            { name: "Open Source", href: siteConfig.links.github, external: true },
            { name: "Privacy Policy", href: `${siteConfig.links.main}/privacy`, external: true },
            { name: "Terms of Use", href: `${siteConfig.links.main}/terms`, external: true },
            { name: "Contact Team", href: `${siteConfig.links.main}/contact`, external: true },
          ],
        },
      ]}
      legalLinks={[
        { name: "Privacy", href: `${siteConfig.links.main}/privacy` },
        { name: "Terms", href: `${siteConfig.links.main}/terms` },
        { name: "FAQ", href: `${siteConfig.links.main}/faq` },
        { name: "Security", href: `${siteConfig.links.main}/security` },
      ]}
      tagline="Build for the future of work."
      statusText="SYSTEMS OPERATIONAL | ALL TEMPLATES FREE"
    />
  );
};

export default Footer;
