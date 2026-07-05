import { type TemplateId, isTemplateId } from "@/templates/catalog/templates";

export { templates } from "@/templates/catalog/templates";
export type { TemplateId } from "@/templates/catalog/templates";

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

export const portfolioSectionTypes: PortfolioSectionType[] = [
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
  settings?: Record<string, unknown>;
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
      headline: "Professional building useful web products.",
      bio: "I build responsive tools with clean code. Focused on performance and practical design decisions.",
      location: "San Francisco, CA",
      availability: "Available for contract roles",
      avatar: null,
    },
    seo: {
      title: `${name} | Portfolio`,
      description: "Professional portfolio site",
      socialImage: null,
    },
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
            name: "Your primary project",
            role: "Developer",
            link: "https://veriworkly.com",
            linkLabel: "Link",
            showLinkAsText: true,
            summary:
              "Describe the key problem you solved and the resulting performance metrics here.",
            highlights: ["Shipped fully responsive interface using React and Tailwind CSS."],
            skills: ["React", "CSS", "TypeScript"],
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
    name: "Gautam Raj",
    email: "info@veriworkly.com",
    headline: "Product engineer crafting clean tools at VeriWorkly.",
    bio: "I build interfaces, document sites, and template platforms for the VeriWorkly ecosystem. The main goal is to create fast, useful web applications that put users in control of their own professional profiles.",
    location: "Bangalore, India",
    availability: "Open to select product collaborations",
    avatar: null,
  },
  seo: {
    title: "Gautam Raj | Product Engineer",
    description: "Product and frontend engineering projects by Gautam Raj, creator at VeriWorkly.",
    socialImage: null,
  },
  socialLinks: [
    { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com/company/veriworkly" },
    { id: "github", label: "GitHub", url: "https://github.com/VeriWorkly/veriworkly" },
    { id: "writing", label: "VeriWorkly", url: "https://veriworkly.com" },
  ],
  sections: [
    {
      id: "projects",
      type: "projects",
      title: "Selected Projects",
      visible: true,
      items: [
        {
          id: "project-1",
          name: "VeriWorkly Portfolio Builder",
          role: "Lead Creator",
          link: "https://veriworkly.com",
          linkLabel: "Live Site",
          showLinkAsText: true,
          summary:
            "A builder that turns structured profile data into a live site with instant previews and custom subdomains.",
          highlights: [
            "Created responsive template engine displaying data in real time.",
            "Wrote clean interfaces with GSAP animations and static page generation.",
          ],
          skills: ["Next.js", "GSAP", "TypeScript"],
          coverImage: null,
        },
        {
          id: "project-2",
          name: "VeriWorkly Resume Editor",
          role: "Lead Developer",
          link: "https://veriworkly.com",
          linkLabel: "Live Editor",
          showLinkAsText: true,
          summary:
            "A privacy-first editor with real-time markdown parsing, print layouts, and local-only browser storage.",
          highlights: [
            "Designed a print CSS system to ensure PDF output matches ATS standards.",
            "Implemented IndexedDB caching, reducing save operations from database to client.",
          ],
          skills: ["React", "Tailwind CSS", "IndexedDB"],
          coverImage: null,
        },
        {
          id: "project-3",
          name: "Offline-First Markdown Editor",
          role: "Solo Creator",
          link: "https://veriworkly.com",
          linkLabel: "GitHub Repository",
          showLinkAsText: true,
          summary:
            "A desktop-grade markdown note app that saves document state in the browser and syncs with external drives via file system handles.",
          highlights: [
            "Designed canvas-based document outline tree with fluid interactive physics.",
            "Built local-first synchronization pipeline using the File System Access API.",
          ],
          skills: ["TypeScript", "Canvas API", "IndexedDB"],
          coverImage: null,
        },
      ],
    },
    {
      id: "experience",
      type: "experience",
      title: "Work Experience",
      visible: true,
      items: [
        {
          id: "experience-1",
          company: "VeriWorkly",
          role: "Founder & Product Engineer",
          location: "Remote",
          startDate: "2025-01",
          endDate: "",
          current: true,
          summary:
            "Directing product design and system engineering across publishing, document tools, and user analytics.",
          highlights: [
            "Shipped local-first state architecture, saving monthly infrastructure costs.",
            "Designed five responsive templates with modular CSS systems.",
          ],
          coverImage: null,
        },
        {
          id: "experience-2",
          company: "Decentralized Web Corp",
          role: "Frontend Engineer",
          location: "On-site",
          startDate: "2023-03",
          endDate: "2024-12",
          current: false,
          summary:
            "Created accessible web interfaces, customized UI components, and improved client-side bundle size.",
          highlights: [
            "Reduced load times by splitting CSS modules and optimizing static resources.",
            "Implemented WCAG AA accessibility compliance across core client dashboards.",
          ],
          coverImage: null,
        },
        {
          id: "experience-3",
          company: "Interactive UI Lab",
          role: "Freelance Frontend Developer",
          location: "Bangalore, India",
          startDate: "2021-02",
          endDate: "2023-02",
          current: false,
          summary:
            "Shipped modular styling systems and interactive features for consumer websites and early stage startups.",
          highlights: [
            "Developed canvas-based charting libraries, reducing reliance on heavy third party charting packages.",
            "Ported three jQuery applications to React and clean CSS, reducing client bundle weight by half.",
          ],
          coverImage: null,
        },
        {
          id: "experience-4",
          company: "System Tools LLC",
          role: "Software Engineering Intern",
          location: "On-site",
          startDate: "2020-05",
          endDate: "2020-08",
          current: false,
          summary: "Contributed to internal web tooling and automated build processes.",
          highlights: [
            "Wrote Node.js automation scripts to detect and prune unused asset files before deployment.",
            "Refactored styling of internal admin panel, improving load performance on legacy office laptops.",
          ],
          coverImage: null,
        },
      ],
    },
    {
      id: "education",
      type: "education",
      title: "Education",
      visible: true,
      items: [
        {
          id: "education-1",
          school: "Self-Taught & Internet Resources",
          degree: "Independent Study",
          field: "Computer Science and Web Standards",
          startDate: "2019-06",
          endDate: "2023-01",
          current: false,
          summary:
            "Learned web protocols, database management, and system architecture through codebases, documentation, and open source work.",
          coverImage: null,
        },
        {
          id: "education-2",
          school: "Technical Institute of Bangalore",
          degree: "Associate Degree",
          field: "Web Standards & Computer Applications",
          startDate: "2017-06",
          endDate: "2019-05",
          current: false,
          summary:
            "Focused on web protocols, database management systems, structures, and systems programming.",
          coverImage: null,
        },
      ],
    },
    {
      id: "services",
      type: "services",
      title: "Freelance & Consulting Services",
      visible: true,
      items: [
        {
          id: "service-1",
          name: "Interactive Frontend Architecture",
          issuer: "Contract",
          date: "Ongoing",
          link: "https://veriworkly.com",
          description:
            "Integrating spring physics, canvas widgets, and GSAP layouts into existing web pages.",
          details: ["Scroll-based pinning", "Responsive fluid grids", "Fluid micro-interactions"],
          coverImage: null,
        },
        {
          id: "service-2",
          name: "Performance Auditing & Core Web Vitals Optimization",
          issuer: "Contract",
          date: "Ongoing",
          link: "https://veriworkly.com",
          description:
            "Diagnosing rendering blocks, client-side lag, and styling bugs to hit maximum Lighthouse score.",
          details: ["Hydration fix", "Image pipelines", "Bundle splitting"],
          coverImage: null,
        },
        {
          id: "service-3",
          name: "Custom Design Systems & Tailwind Refactoring",
          issuer: "Contract",
          date: "Ongoing",
          link: "https://veriworkly.com",
          description:
            "Converting ad-hoc stylesheet configurations into modular, maintainable utility frameworks or plain CSS systems.",
          details: ["Tailwind config setup", "Classname cleanup", "Performance auditing"],
          coverImage: null,
        },
      ],
    },
    {
      id: "skills",
      type: "skills",
      title: "Skills & Toolbox",
      visible: true,
      items: [
        {
          id: "skill-1",
          name: "Core Languages",
          keywords: ["TypeScript", "JavaScript", "SQL", "CSS"],
        },
        {
          id: "skill-2",
          name: "Frameworks & Build Tools",
          keywords: ["Next.js", "React", "Node.js", "Vite", "PostgreSQL"],
        },
        {
          id: "skill-3",
          name: "Design & Motion",
          keywords: ["GSAP", "Figma", "Canvas API", "CSS Animation"],
        },
        {
          id: "skill-4",
          name: "Infrastructure & Security",
          keywords: ["Docker", "AWS", "Cloudflare", "OAuth"],
        },
      ],
    },
    {
      id: "certifications",
      type: "certifications",
      title: "Licenses & Certifications",
      visible: true,
      items: [
        {
          id: "cert-1",
          name: "Certified Web Performance Architect",
          issuer: "Web Standards Authority",
          date: "2024-09",
          link: "",
          description:
            "Advanced optimization strategies for Core Web Vitals, SSR caching, and image optimization.",
          details: [],
          coverImage: null,
        },
        {
          id: "cert-2",
          name: "Advanced CSS Layouts and Web Animation Specialist",
          issuer: "CSS Working Group Partner Program",
          date: "2025-01",
          link: "",
          description:
            "Expert level techniques for CSS Grid, Subgrid, Flexbox, custom property systems, and native scroll-driven animations.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "languages",
      type: "languages",
      title: "Languages",
      visible: true,
      items: [
        {
          id: "lang-1",
          name: "English",
          issuer: "Native or Bilingual Proficiency",
          date: "Native",
          link: "",
          description: "Fluent in technical documentation and developer communications.",
          details: [],
          coverImage: null,
        },
        {
          id: "lang-2",
          name: "Hindi",
          issuer: "Conversational Proficiency",
          date: "Conversational",
          link: "",
          description: "Used in business and team communications.",
          details: [],
          coverImage: null,
        },
        {
          id: "lang-3",
          name: "Kannada",
          issuer: "Conversational Proficiency",
          date: "Conversational",
          link: "",
          description: "Used in local business operations.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "interests",
      type: "interests",
      title: "Technical Interests",
      visible: true,
      items: [
        {
          id: "interest-1",
          name: "Interactive Graphics & Physics Engines",
          issuer: "Personal Research",
          date: "Ongoing",
          link: "",
          description:
            "Building physical gestures, canvas rendering layers, and spring-based layouts for browser sites.",
          details: [],
          coverImage: null,
        },
        {
          id: "interest-2",
          name: "Typography Design & Traditional Printmaking",
          issuer: "Personal Hobby",
          date: "Ongoing",
          link: "",
          description:
            "Studying the history of lead type and applying grid systems from mid-century print design to modern web layouts.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "publications",
      type: "publications",
      title: "Publications",
      visible: true,
      items: [
        {
          id: "pub-1",
          name: "Local-First Development: Designing Offline-First Web Apps",
          issuer: "VeriWorkly Engineering Blog",
          date: "2025-02",
          link: "https://veriworkly.com",
          description:
            "A comprehensive guide on storing state in IndexedDB and synchronization protocols for zero-server architectures.",
          details: [],
          coverImage: null,
        },
        {
          id: "pub-2",
          name: "Optimizing Cumulative Layout Shift in Dynamic Single Page Applications",
          issuer: "Web Engineering Journal",
          date: "2025-11",
          link: "https://veriworkly.com",
          description:
            "A technical study on using aspect-ratio boxes and placeholder skeletons to stabilize layout rendering on slow connections.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "patents",
      type: "patents",
      title: "Patents",
      visible: true,
      items: [
        {
          id: "patent-1",
          name: "Method and System for Client-Side PDF Generation",
          issuer: "WIPO",
          date: "2025-05",
          link: "",
          description:
            "Patent application for real-time sandbox client-side print-friendly CSS and PDF serialization.",
          details: [],
          coverImage: null,
        },
        {
          id: "patent-2",
          name: "System for Dynamic Animation Synchronization in Virtual DOM trees",
          issuer: "WIPO",
          date: "2026-03",
          link: "",
          description:
            "Patent application for registering render-loop timestamps on elements to prevent frame misalignment.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "testScores",
      type: "testScores",
      title: "Test Scores",
      visible: true,
      items: [
        {
          id: "score-1",
          name: "Core Web Vitals Assessment",
          issuer: "Lighthouse Audit Suite",
          date: "2025-01",
          link: "",
          description:
            "Score: 100/100 across Performance, Accessibility, Best Practices, and SEO audits.",
          details: [],
          coverImage: null,
        },
        {
          id: "score-2",
          name: "ATS Compatibility Score",
          issuer: "Resume Parser Suite",
          date: "2026-05",
          link: "",
          description:
            "Score: 98% readability score across major ATS engines, verifying syntax structure parsing.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "achievements",
      type: "achievements",
      title: "Achievements & Milestones",
      visible: true,
      items: [
        {
          id: "ach-1",
          name: "Zero-Server Infrastructure Launch",
          issuer: "VeriWorkly Core",
          date: "2025-02",
          link: "",
          description:
            "Successfully shipped the entire resume builder using purely local-first state, reducing hosting overhead.",
          details: [],
          coverImage: null,
        },
        {
          id: "ach-2",
          name: "First Place, Global Web Standards Hackathon",
          issuer: "Web Standards League",
          date: "2024-07",
          link: "",
          description:
            "Voted top developer entry out of 300 projects for building a lightweight canvas physics library under 10KB.",
          details: [],
          coverImage: null,
        },
        {
          id: "ach-3",
          name: "Open Source Contributor to GSAP Core Performance",
          issuer: "GreenSock Lab",
          date: "2025-10",
          link: "",
          description:
            "Contributed minor patches to improve element tick calculation speeds on high refresh-rate monitors.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "volunteer",
      type: "volunteer",
      title: "Volunteer Work",
      visible: true,
      items: [
        {
          id: "vol-1",
          name: "Open Source Contributor",
          issuer: "Free Code Camp",
          date: "2023 - 2024",
          link: "https://freecodecamp.org",
          description:
            "Helped translate documentation and build interactive challenges for beginner web developers.",
          details: [],
          coverImage: null,
        },
        {
          id: "vol-2",
          name: "Tech Mentor",
          issuer: "Bangalore Community Learning Center",
          date: "2024 - 2025",
          link: "",
          description:
            "Taught weekly introductory programming classes and reviewed projects for students starting careers in engineering.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "writing",
      type: "writing",
      title: "Writing & Notes",
      visible: true,
      items: [
        {
          id: "writing-1",
          name: "Designing Builders into Public Proof",
          issuer: "VeriWorkly Notes",
          date: "2026-04",
          link: "https://veriworkly.com",
          description: "How portfolio tools can turn structured information into trust quickly.",
          details: [],
          coverImage: null,
        },
        {
          id: "writing-2",
          name: "Why I Still Write Plain CSS in 2026",
          issuer: "VeriWorkly Notes",
          date: "2026-05",
          link: "https://veriworkly.com",
          description:
            "Discussing how new spec additions like native nesting and variables reduce the need for build steps in small projects.",
          details: [],
          coverImage: null,
        },
        {
          id: "writing-3",
          name: "The Subtle Cost of Over-Animating Interfaces",
          issuer: "VeriWorkly Notes",
          date: "2026-06",
          link: "https://veriworkly.com",
          description:
            "Analyzing battery drain and rendering latency on mobile browsers caused by high frequency animation loops.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "testimonials",
      type: "testimonials",
      title: "Kind Words",
      visible: true,
      items: [
        {
          id: "testimonial-1",
          name: "Sarah Jenkins",
          issuer: "Product Lead at Acme Corp",
          date: "2025",
          link: "",
          description:
            "Gautam has a rare ability to bridge the gap between design and engineering. The interfaces he builds are fast, accessible, and detailed.",
          details: [],
          coverImage: null,
        },
        {
          id: "testimonial-2",
          name: "Marcus Chen",
          issuer: "Lead Frontend Developer at DevFlow Studio",
          date: "2025",
          link: "",
          description:
            "Working with Gautam on our build tooling redesign was a breeze. He identified three rendering blocks in the first hour and shaved seconds off our bundle load.",
          details: [],
          coverImage: null,
        },
        {
          id: "testimonial-3",
          name: "Elena Rostova",
          issuer: "Director of Engineering at GridSystems",
          date: "2026",
          link: "",
          description:
            "Gautam delivered clean, well-tested code that integrated perfectly into our stack. His attention to detail in motion design is rare.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "awards",
      type: "awards",
      title: "Awards & Recognitions",
      visible: true,
      items: [
        {
          id: "award-1",
          name: "Product of the Day",
          issuer: "Product Hunt",
          date: "2025-03",
          link: "https://producthunt.com",
          description: "Voted Product of the Day for its privacy-first resume builder interface.",
          details: [],
          coverImage: null,
        },
        {
          id: "award-2",
          name: "Most Creative Layout Award",
          issuer: "DesignCon 2025",
          date: "2025-05",
          link: "",
          description:
            "Received top jury recognition for our experimental matrix-rain styled CLI terminal lab.",
          details: [],
          coverImage: null,
        },
      ],
    },
    {
      id: "custom",
      type: "custom",
      title: "Additional Projects & Labs",
      visible: true,
      items: [
        {
          id: "custom-1",
          name: "Side Project: Terminal CLI Mockup",
          issuer: "Experimental Lab",
          date: "2026-01",
          link: "https://github.com",
          description:
            "Built a fully draggable, matrix-rain styled interactive terminal component in vanilla canvas.",
          details: [],
          coverImage: null,
        },
        {
          id: "custom-2",
          name: "Personal Lab: Spring-Physics Canvas Graph Layout",
          issuer: "Experimental Lab",
          date: "2026-03",
          link: "https://github.com",
          description:
            "Built an interactive node link graph layout that simulates spring tension and charge dynamics in real time.",
          details: [],
          coverImage: null,
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
  if (value.schemaVersion !== 1 || !value.identity || !Array.isArray(value.sections))
    return fallback;
  const identity = value.identity as Record<string, unknown>;
  const seo = (value.seo ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: 1,
    templateId:
      typeof value.templateId === "string" && isTemplateId(value.templateId)
        ? value.templateId
        : "signal",
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
        settings:
          section.settings && typeof section.settings === "object" ? section.settings : undefined,
      })),
  };
}
