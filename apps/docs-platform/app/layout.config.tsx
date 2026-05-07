import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import Image from "next/image";

import { siteConfig } from "@/config/site";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <Image
          width={24}
          height={24}
          alt="VeriWorkly Logo"
          className="rounded-md"
          src="/veriworkly-logo.png"
        />

        <span className="font-semibold">{siteConfig.name}</span>
      </div>
    ),
    url: "/",
  },

  links: [
    {
      text: "Docs",
      url: "/docs",
    },
    {
      text: "API Reference",
      url: "/api-reference",
    },
    {
      text: "Blog",
      url: siteConfig.links.blog,
    },
  ],

  githubUrl: siteConfig.links.github,
};
