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
          homeHref={siteConfig.links.main}
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
          appHref={siteConfig.links.app}
          githubHref={siteConfig.links.github}
          resourceLinks={[
            { name: "Help Center", href: "/faq" },
            { name: "Security", href: "/security" },
            { name: "Brand assets", href: "/style-guide" },
          ]}
          legalLinks={[
            { name: "Privacy Policy", href: "/privacy" },
            { name: "Terms of Service", href: "/terms" },
          ]}
        />
      )}
    />
  );
};

export default Navbar;
