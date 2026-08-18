import type { ResumeData, ResumeSection } from "@/types/resume";

export const defaultSections: ResumeSection[] = [
  { id: "basics", label: "Basics", visible: true, order: 0 },
  { id: "links", label: "Links", visible: true, order: 1 },
  { id: "summary", label: "Summary", visible: true, order: 2 },
  { id: "experience", label: "Experience", visible: true, order: 3 },
  { id: "education", label: "Education", visible: true, order: 4 },
  { id: "projects", label: "Projects", visible: true, order: 5 },
  { id: "skills", label: "Skills", visible: true, order: 6 },
  { id: "certifications", label: "Certifications", visible: true, order: 7 },
  { id: "awards", label: "Awards", visible: true, order: 8 },
  { id: "publications", label: "Publications", visible: true, order: 9 },
  { id: "languages", label: "Languages", visible: true, order: 10 },
  { id: "interests", label: "Interests", visible: true, order: 11 },
  { id: "volunteer", label: "Volunteer", visible: true, order: 12 },
  { id: "references", label: "References", visible: true, order: 13 },
  { id: "achievements", label: "Achievements", visible: true, order: 14 },
  { id: "custom", label: "Custom", visible: true, order: 15, customSectionId: "custom-default" },
];

/**
 * Sample content, for guests and for tests. Nothing else.
 *
 * It must never again be the seed for a signed-in user's document. Every creation path now
 * goes through a `projectTo*` in `@veriworkly/profile-core` with the user's master profile;
 * this is only what a user who has no profile at all is shown, so that a first visit is not
 * a blank page. It is also the base the studio normalises a partial profile over — see
 * `getDefaultProfile` in features/resume/services/master-profile.ts.
 */
export const defaultResume: ResumeData = {
  id: "default-resume",
  templateId: "executive-clarity",

  basics: {
    fullName: "VeriWorkly User",
    role: "Indie Developer & Product Builder",
    headline: "Building useful, fast, and privacy-first web products - one idea at a time.",

    email: "hello@veriworkly.com",
    phone: "0000000000",
    location: "Internet (occasionally Earth)",

    linkEmail: true,
    linkPhone: true,
    linkLocation: false,
  },

  links: {
    displayMode: "icon-username",
    items: [
      {
        id: "link-1",
        type: "github",
        label: "GitHub",
        url: "https://github.com/VeriWorkly/veriworkly",
      },
      {
        id: "link-2",
        type: "linkedin",
        label: "LinkedIn",
        url: "https://linkedin.com/in/-gautam-raj",
      },
      {
        id: "link-3",
        type: "portfolio",
        label: "Portfolio",
        url: "https://veriworkly.com",
      },
    ],
  },

  summary:
    "Self-taught developer focused on building practical, real-world products. I enjoy turning ideas into polished user experiences using modern web technologies. Currently building VeriWorkly — a privacy-first resume builder with no login and a focus on simplicity.",

  experience: [
    {
      id: "exp-1",
      company: "VeriWorkly",
      role: "Founder & Developer",
      location: "Remote",
      startDate: "2025-01",
      endDate: "",
      current: true,

      summary: "Building a modern resume builder focused on speed, privacy, and user control.",

      highlights: [
        "Designed and developed a full-featured resume builder with real-time preview and multi-template support.",
        "Implemented local-first architecture ensuring zero data storage on servers.",
        "Built modular editor system enabling dynamic sections, customization, and export workflows.",
        "Focused on performance, clean UX, and developer-friendly architecture using Next.js and TypeScript.",
      ],
    },
  ],

  education: [
    {
      id: "edu-1",
      school: "Self-Taught",
      degree: "Internet Degree",
      field: "Computer Science (Unofficial but Effective)",
      startDate: "2019",
      endDate: "",
      current: true,

      summary:
        "Learned software development through building real-world projects, debugging production issues, and reading way too many docs.",
    },
  ],

  projects: [
    {
      id: "proj-1",
      name: "VeriWorkly Resume Builder",
      role: "Creator",
      link: "https://veriworkly.com",
      linkLabel: "Link",
      showLinkAsText: true,
      skills: ["Next.js", "TypeScript", "UX"],

      summary:
        "A privacy-first resume builder with no login, real-time preview, and flexible templates.",

      highlights: [
        "Built with Next.js App Router, TypeScript, and modern state management.",
        "Supports dynamic sections, JSON import/export, and PDF generation.",
        "Focused on UX simplicity and performance with a clean, minimal interface.",
      ],
    },

    {
      id: "proj-2",
      name: "Realtime Task Board",
      role: "Full Stack Developer",
      link: "https://github.com/gautam25raj",
      linkLabel: "Link",
      showLinkAsText: true,
      skills: ["WebSockets", "Node.js", "PostgreSQL"],

      summary: "Collaborative Kanban board with real-time updates and team workflows.",

      highlights: [
        "Implemented real-time sync using WebSockets.",
        "Designed role-based permissions and activity tracking.",
        "Built scalable backend with Node.js and PostgreSQL.",
      ],
    },
  ],

  skills: [
    {
      id: "skills-1",
      name: "Languages",
      keywords: ["TypeScript", "JavaScript", "SQL"],
    },
    {
      id: "skills-2",
      name: "Frontend",
      keywords: ["React", "Next.js", "Tailwind CSS"],
    },
    {
      id: "skills-3",
      name: "Backend",
      keywords: ["Node.js", "Express", "PostgreSQL"],
    },
    {
      id: "skills-4",
      name: "Other",
      keywords: ["System Design", "Performance", "UX Thinking"],
    },
  ],

  // Empty, but present: a resume declares every typed section so templates and exporters
  // can read them without a guard, and so the master -> resume projection has a slot for
  // each one. Sample content lives only in the sections above.
  languages: [],
  interests: [],
  awards: [],
  certificates: [],
  publications: [],
  volunteer: [],
  references: [],
  achievements: [],

  customSections: [
    {
      id: "custom-default",
      kind: "custom",
      title: "Custom Section",
      editableTitle: true,
      items: [],
    },
  ],

  sections: defaultSections,

  customization: {
    accentColor: "#2563eb",
    textColor: "#0f172a",
    mutedTextColor: "#475569",
    pageBackgroundColor: "#ffffff",
    sectionBackgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    sectionHeadingColor: "#334155",
    fontFamily: "geist",
    sectionSpacing: 28,
    pagePadding: 32,
    bodyLineHeight: 1.5,
    headingLineHeight: 1.2,
  },

  sync: {
    enabled: false,
    status: "local-only",
    cloudDocumentId: null,
    lastSyncedAt: null,
    revision: 1,
  },
  updatedAt: new Date().toISOString(),
};
