import React from "react";

import { GithubIcon, LinkedInIcon } from "@veriworkly/ui";

export interface Logo {
  name: string;
  svg: React.ReactNode;
}

export const logos: Logo[] = [
  {
    name: "Next.js",
    svg: (
      <svg className="h-5 w-auto" viewBox="0 0 180 180" fill="none" aria-hidden="true">
        <circle cx="90" cy="90" r="90" fill="currentColor" />
        <path
          d="M149.5 157.5L69.1 54H54V126H67.1V70.8L136.9 160.8C141.3 159.9 145.5 158.8 149.5 157.5Z"
          fill="var(--background, #000)"
        />
        <rect x="115" y="54" width="13" height="72" fill="var(--background, #000)" />
      </svg>
    ),
  },

  {
    name: "React",
    svg: (
      <svg
        className="h-5 w-auto"
        viewBox="-11.5 -10.2 23 20.4"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="0" cy="0" r="2.05" />
        <g stroke="currentColor" strokeWidth="1" fill="none">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    ),
  },

  {
    name: "Dodo Payments",
    svg: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>
    ),
  },

  {
    name: "GitHub",
    svg: <GithubIcon />,
  },

  {
    name: "LinkedIn",
    svg: <LinkedInIcon />,
  },
];
