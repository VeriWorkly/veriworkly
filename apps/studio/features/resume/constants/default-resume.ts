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
 * A structurally complete resume with no content.
 *
 * The base every partial resume is normalised over, so a key a stored, synced or imported
 * document lacks comes back empty rather than filled with someone else's sample content.
 */
export const blankResume: ResumeData = {
  id: "blank-resume",
  templateId: "executive-clarity",

  basics: {
    fullName: "",
    role: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    linkEmail: true,
    linkPhone: true,
    linkLocation: false,
  },

  links: {
    displayMode: "icon-username",
    items: [],
  },

  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],

  // Empty, but present: a resume declares every typed section so templates and exporters
  // can read them without a guard, and so the master -> resume projection has a slot for
  // each one.
  languages: [],
  interests: [],
  awards: [],
  certificates: [],
  publications: [],
  volunteer: [],
  references: [],
  achievements: [],

  customSections: [],

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

/**
 * Sample content: a fictional person, for a guest's first document, previews and tests.
 *
 * Never the seed or the fallback for anything a signed-in user owns; that is
 * {@link blankResume} or their master profile.
 */
export const defaultResume: ResumeData = {
  ...blankResume,
  id: "default-resume",

  basics: {
    fullName: "Alex Morgan",
    role: "Product Engineer",
    headline: "Building fast, accessible web products from first sketch to production.",

    email: "alex.morgan@example.com",
    phone: "+1 415 555 2671",
    location: "Remote",

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
        url: "https://github.com/example",
      },
      {
        id: "link-2",
        type: "linkedin",
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/example",
      },
      {
        id: "link-3",
        type: "portfolio",
        label: "Portfolio",
        url: "https://example.com",
      },
    ],
  },

  summary:
    "Product engineer with six years of experience shipping web applications end to end. I enjoy turning rough ideas into polished, reliable user experiences with modern web technologies, and I care about performance, accessibility and clear communication with the people who use what I build.",

  experience: [
    {
      id: "exp-1",
      company: "Acme Corp",
      role: "Senior Product Engineer",
      location: "Remote",
      startDate: "2022-03",
      endDate: "",
      current: true,

      summary: "Lead engineer on the customer-facing document editor and its export pipeline.",

      highlights: [
        "Designed and shipped a real-time editor with live preview and multi-template support.",
        "Moved document drafts to local-first storage with background sync, cutting save latency to near zero.",
        "Built a modular section system that let the team add new content types without editor changes.",
        "Raised performance and accessibility scores across the product using Next.js and TypeScript.",
      ],
    },
  ],

  education: [
    {
      id: "edu-1",
      school: "State University",
      degree: "B.Sc.",
      field: "Computer Science",
      startDate: "2015",
      endDate: "2019",
      current: false,

      summary:
        "Focused on human-computer interaction and distributed systems; final-year project on collaborative editing.",
    },
  ],

  projects: [
    {
      id: "proj-1",
      name: "Open-source Markdown Editor",
      role: "Creator",
      link: "https://example.com/markdown-editor",
      linkLabel: "Link",
      showLinkAsText: true,
      skills: ["Next.js", "TypeScript", "UX"],

      summary: "A fast, keyboard-first Markdown editor with live preview and flexible themes.",

      highlights: [
        "Built with Next.js App Router, TypeScript, and modern state management.",
        "Supports custom themes, JSON import/export, and PDF generation.",
        "Focused on UX simplicity and performance with a clean, minimal interface.",
      ],
    },

    {
      id: "proj-2",
      name: "Realtime Task Board",
      role: "Full Stack Developer",
      link: "https://example.com/task-board",
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
      keywords: ["System Design", "Performance", "Accessibility"],
    },
  ],
};
