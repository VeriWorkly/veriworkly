import type * as React from "react";

export type IconType = React.ComponentType<{ className?: string }>;

export interface MarketingNavItem {
  name: string;
  href: string;
  external?: boolean;
  icon: IconType;
}

export interface MarketingSimpleLink {
  name: string;
  href: string;
}
