import type { ComponentType } from "react";

export interface LegalSubsection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  orderedList?: string[];
}

export interface LegalSection {
  id: string;
  title: string;
  intro?: string[];
  subsections?: LegalSubsection[];
}

export interface LegalTopic {
  icon: ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  description: string;
}

export interface LegalHeroAction {
  label: string;
  href: string;
  primary?: boolean;
}

export interface LegalHeroProps {
  badgeLabel: string;
  effectiveDate: string;
  badgeDotClass?: string;
  title: string;
  description: string;
  primaryAction?: LegalHeroAction;
  secondaryAction?: LegalHeroAction;
}

export interface LegalTopicsGridProps {
  label?: string;
  countLabel?: string;
  topics: LegalTopic[];
  columns?: 3 | 4;
}

export interface LegalContactBannerProps {
  tagline: string;
  title: string;
  description: string;
  primaryActionText: string;
  primaryActionEmail: string;
  secondaryActionText: string;
  secondaryActionHref: string;
  secondaryActionIcon?: ComponentType<{ className?: string }>;
}
