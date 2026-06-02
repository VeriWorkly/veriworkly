import type { TemplateId } from "@/templates/catalog/templates";

export { templates } from "@/templates/catalog/templates";
export type { TemplateId } from "@/templates/catalog/templates";

export type PortfolioSectionType =
  | "projects"
  | "experience"
  | "services"
  | "skills"
  | "education"
  | "writing"
  | "testimonials"
  | "awards"
  | "contact";

export const portfolioSectionTypes: PortfolioSectionType[] = [
  "projects",
  "experience",
  "services",
  "skills",
  "education",
  "writing",
  "testimonials",
  "awards",
  "contact",
];

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
  visible: boolean;
  items: Array<Record<string, unknown>>;
}

export interface PortfolioContent {
  schemaVersion: 1;
  templateId: TemplateId;
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
}

export interface CloudPortfolioDraft {
  id: string;
  slug: string;
  templateId: TemplateId;
  content: PortfolioContent;
  revision: number;
  updatedAt: string;
}

export const PORTFOLIO_CACHE_KEY = "veriworkly:portfolio:draft-cache:v4";

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultPortfolio(user?: {
  name?: string | null;
  email?: string | null;
}): PortfolioContent {
  const name = user?.name?.trim() || "VeriWorkly User";
  const email = user?.email?.trim() || "hello@veriworkly.com";
  return {
    schemaVersion: 1,
    templateId: "signal",
    identity: {
      name,
      email,
      headline: "Professional building useful, considered work.",
      bio: "Introduce your work, your point of view, and the problems you solve.",
      location: "",
      availability: "Available for selected opportunities",
      avatar: null,
    },
    seo: { title: `${name} | Portfolio`, description: "Professional portfolio", socialImage: null },
    socialLinks: [],
    sections: [
      {
        id: createId("section"),
        type: "projects",
        title: "Selected work",
        visible: true,
        items: [
          {
            id: createId("project"),
            title: "Your strongest project",
            summary: "Explain the problem, the work, and the result with specific details.",
            description: "",
            year: new Date().getFullYear().toString(),
            tags: ["Case study"],
            links: [],
            coverImage: null,
          },
        ],
      },
      { id: createId("section"), type: "contact", title: "Contact", visible: true, items: [] },
    ],
  };
}

export const demoPortfolio: PortfolioContent = {
  schemaVersion: 1,
  templateId: "signal",
  identity: {
    name: "Avery Morgan",
    email: "hello@averymorgan.dev",
    headline: "Product engineer turning complex systems into calm software.",
    bio: "I design and build digital products for teams working through operational complexity. My practice combines product thinking, interface design, and frontend engineering.",
    location: "Brooklyn, New York",
    availability: "Available for selected collaborations",
    avatar: null,
  },
  seo: {
    title: "Avery Morgan | Product engineer",
    description: "Selected product engineering work by Avery Morgan.",
    socialImage: null,
  },
  socialLinks: [
    { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com" },
    { id: "github", label: "GitHub", url: "https://github.com" },
    { id: "writing", label: "Writing", url: "https://example.com" },
  ],
  sections: [
    {
      id: "projects",
      type: "projects",
      title: "Selected work",
      visible: true,
      items: [
        {
          id: "project-1",
          title: "Field Notes",
          summary:
            "A planning workspace that helps distributed product teams turn research into clear delivery decisions.",
          year: "2026",
          tags: ["Product design", "Frontend", "Systems"],
        },
        {
          id: "project-2",
          title: "Northline",
          summary:
            "A service operations platform redesigned around the daily decisions of dispatch teams and field managers.",
          year: "2025",
          tags: ["UX strategy", "Design system"],
        },
        {
          id: "project-3",
          title: "Ledger",
          summary:
            "A focused financial reporting experience for independent studios that need clarity without accounting overhead.",
          year: "2024",
          tags: ["Research", "React", "Data"],
        },
      ],
    },
    {
      id: "experience",
      type: "experience",
      title: "Experience",
      visible: true,
      items: [
        {
          id: "experience-1",
          title: "Independent product engineer",
          summary:
            "Partnering with early-stage teams on product strategy, interface systems, and production frontend builds.",
          year: "2023 — now",
        },
        {
          id: "experience-2",
          title: "Senior product designer · Northstar",
          summary:
            "Led the design system and core workflow redesign for a multi-product operations platform.",
          year: "2020 — 2023",
        },
      ],
    },
    {
      id: "services",
      type: "services",
      title: "Ways to work together",
      visible: true,
      items: [
        {
          id: "service-1",
          title: "Product direction",
          summary:
            "Clarify the problem, shape the experience, and define the smallest useful release.",
        },
        {
          id: "service-2",
          title: "Interface systems",
          summary: "Build a reusable visual language that remains coherent as the product grows.",
        },
      ],
    },
    {
      id: "skills",
      type: "skills",
      title: "Capabilities",
      visible: true,
      items: [
        {
          id: "skill-1",
          title: "Design and research",
          summary:
            "Product strategy, interface design, prototyping, usability testing, design systems.",
        },
        {
          id: "skill-2",
          title: "Engineering",
          summary:
            "React, Next.js, TypeScript, accessible component systems, frontend architecture.",
        },
      ],
    },
    {
      id: "writing",
      type: "writing",
      title: "Writing and notes",
      visible: true,
      items: [
        {
          id: "writing-1",
          title: "Designing for the decision",
          summary:
            "Why the best workflow interfaces reduce interpretation before they reduce clicks.",
          year: "2026",
        },
        {
          id: "writing-2",
          title: "A smaller, stronger design system",
          summary: "How product teams can choose consistency without flattening every interaction.",
          year: "2025",
        },
      ],
    },
    {
      id: "testimonials",
      type: "testimonials",
      title: "Kind words",
      visible: true,
      items: [
        {
          id: "testimonial-1",
          title: "Mina Patel · Northline",
          summary:
            "Avery made a complicated product feel obvious without making it simplistic. The work changed how our team makes decisions.",
        },
        {
          id: "testimonial-2",
          title: "Jon Bell · Field Notes",
          summary:
            "The rare partner who can move from product framing to a production interface without losing the thread.",
        },
      ],
    },
    {
      id: "awards",
      type: "awards",
      title: "Recognition",
      visible: true,
      items: [
        {
          id: "award-1",
          title: "Independent Site of the Day",
          summary: "Field Notes product story.",
          year: "2026",
        },
      ],
    },
    { id: "contact", type: "contact", title: "Contact", visible: true, items: [] },
  ],
};

function text(value: unknown, fallback = "", max = 2000) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function asset(value: unknown): PortfolioAssetReference | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.url === "string"
    ? { id: item.id, url: item.url }
    : null;
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

export function isPortfolioSectionType(value: unknown): value is PortfolioSectionType {
  return typeof value === "string" && portfolioSectionTypes.includes(value as PortfolioSectionType);
}

export function parsePortfolioContent(input: unknown, fallback = demoPortfolio): PortfolioContent {
  if (!input || typeof input !== "object") return fallback;
  const value = input as Record<string, unknown>;
  if (value.schemaVersion !== 1 || !value.identity || !Array.isArray(value.sections)) {
    const legacy = value as Record<string, unknown>;
    const migrated = createDefaultPortfolio({
      name: text(legacy.name, fallback.identity.name, 120),
      email: text(legacy.email, fallback.identity.email, 254),
    });
    migrated.templateId = legacy.templateId === "atelier" ? "atelier" : "signal";
    migrated.identity.headline = text(legacy.role, migrated.identity.headline, 240);
    migrated.identity.bio = text(legacy.intro, migrated.identity.bio, 1600);
    migrated.identity.location = text(legacy.location, "", 120);
    migrated.identity.availability = text(legacy.availability, migrated.identity.availability, 160);
    if (Array.isArray(legacy.projects))
      migrated.sections[0].items = legacy.projects as Array<Record<string, unknown>>;
    return migrated;
  }
  const identity = value.identity as Record<string, unknown>;
  const seo = (value.seo ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: 1,
    templateId: value.templateId === "atelier" ? "atelier" : "signal",
    identity: {
      name: text(identity.name, fallback.identity.name, 120),
      headline: text(identity.headline, fallback.identity.headline, 240),
      bio: text(identity.bio, fallback.identity.bio, 1600),
      location: text(identity.location, "", 120),
      email: text(identity.email, fallback.identity.email, 254),
      availability: text(identity.availability, fallback.identity.availability, 160),
      avatar: asset(identity.avatar),
    },
    seo: {
      title: text(seo.title, fallback.seo.title, 120),
      description: text(seo.description, fallback.seo.description, 300),
      socialImage: asset(seo.socialImage),
    },
    socialLinks: Array.isArray(value.socialLinks)
      ? (value.socialLinks as PortfolioLink[]).slice(0, 12)
      : [],
    sections: (value.sections as PortfolioSection[])
      .slice(0, 24)
      .filter((section) => isPortfolioSectionType(section.type))
      .map((section) => ({
        id: text(section.id, createId("section"), 128),
        type: section.type,
        title: text(section.title, "Section", 120),
        visible: section.visible !== false,
        items: Array.isArray(section.items) ? section.items.slice(0, 24) : [],
      })),
  };
}
