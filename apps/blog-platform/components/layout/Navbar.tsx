"use client";

import { siteConfig } from "@/config/site";

import {
  MarketingNavbar,
  MarketingNavLogo,
  MarketingMobileNav,
  MarketingDesktopNav,
  MarketingNavActions,
} from "@veriworkly/ui";

import { NAVIGATION_ITEMS } from "./navbar/constants";

const Navbar = () => {
  return (
    <MarketingNavbar
      logo={
        <MarketingNavLogo
          logoSrc="/veriworkly-logo.png"
          homeHref={siteConfig.links.blog}
          shortName={siteConfig.shortName}
        />
      }
      desktopNav={<MarketingDesktopNav items={NAVIGATION_ITEMS} />}
      actions={
        <MarketingNavActions githubHref={siteConfig.links.github} appHref={siteConfig.links.app} />
      }
      mobileNav={({ isOpen, onClose }) => (
        <MarketingMobileNav
          isOpen={isOpen}
          onClose={onClose}
          items={NAVIGATION_ITEMS}
          resourceLinks={[
            { name: "Help Center", href: `${siteConfig.links.main}/faq` },
            { name: "Security", href: `${siteConfig.links.main}/security` },
            { name: "Brand assets", href: `${siteConfig.links.main}/style-guide` },
          ]}
          legalLinks={[
            { name: "Privacy Policy", href: `${siteConfig.links.main}/privacy` },
            { name: "Terms of Service", href: `${siteConfig.links.main}/terms` },
          ]}
          githubHref={siteConfig.links.github}
          appHref={siteConfig.links.app}
        />
      )}
    />
  );
};

export default Navbar;
