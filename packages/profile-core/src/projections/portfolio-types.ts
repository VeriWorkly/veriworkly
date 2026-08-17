/**
 * Portfolio types declared in @veriworkly/profile-core.
 * Re-exported by apps/portfolio to ensure a single contract across the monorepo.
 */

export type PortfolioSectionType =
  | "projects"
  | "experience"
  | "education"
  | "services"
  | "skills"
  | "writing"
  | "testimonials"
  | "awards"
  | "certifications"
  | "languages"
  | "interests"
  | "publications"
  | "patents"
  | "testScores"
  | "achievements"
  | "volunteer"
  | "custom"
  | "contact";

export const portfolioSectionTypes: readonly PortfolioSectionType[] = [
  "projects",
  "experience",
  "services",
  "skills",
  "education",
  "writing",
  "testimonials",
  "awards",
  "certifications",
  "languages",
  "interests",
  "publications",
  "patents",
  "testScores",
  "achievements",
  "volunteer",
  "custom",
  "contact",
] as const;

export interface PortfolioAssetReference {
  id: string;
  url: string;
}

export interface PortfolioLink {
  id: string;
  label: string;
  url: string;
}

export interface PortfolioSection {
  id: string;
  type: PortfolioSectionType;
  title: string;
  subtitle?: string;
  visible: boolean;
  items: Array<Record<string, unknown>>;
  settings?: Record<string, unknown>;
}

export interface PortfolioPage {
  id: string;
  slug: string;
  title: string;
  sections: PortfolioSection[];
}

export interface PortfolioContent<TTemplateId extends string = string> {
  schemaVersion: 1;
  templateId: TTemplateId;
  identity: {
    name: string;
    headline: string;
    bio: string;
    location: string;
    email: string;
    availability: string;
    avatar: PortfolioAssetReference | null;
  };
  seo: {
    title: string;
    description: string;
    socialImage: PortfolioAssetReference | null;
  };
  socialLinks: PortfolioLink[];
  sections: PortfolioSection[];
  pages?: PortfolioPage[];
  removeWatermark?: boolean;
}

export interface CloudPortfolioDraft<TTemplateId extends string = string> {
  id: string;
  slug: string;
  templateId: TTemplateId;
  content: PortfolioContent<TTemplateId>;
  revision: number;
  updatedAt: string;
}
