import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AtelierTemplate from "@/template-library/atelier/AtelierTemplate";
import SignalTemplate from "@/template-library/signal/SignalTemplate";
import { itemLabel, itemProse } from "@/template-library/types";
import {
  createDefaultPortfolio,
  mergeMasterProfileIntoPortfolio,
  projectToPortfolio,
  type PortfolioContent,
} from "@/lib/portfolio";
import {
  assertProjectionIsPure,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_CUSTOMIZATION,
  type MasterProfileData,
} from "@veriworkly/profile-core";

const fullMasterFixture: MasterProfileData = {
  templateId: "precision-ats",
  basics: {
    fullName: "Alex Rivera",
    role: "Staff Software Engineer",
    headline: "Distributed Systems & Web Platform Architect",
    email: "alex@example.com",
    phone: "+15550102026",
    location: "Seattle, WA",
    linkEmail: true,
    linkPhone: true,
    linkLocation: true,
  },
  links: {
    displayMode: "icon-username",
    items: [
      { id: "l1", type: "github", label: "", url: "https://github.com/alexrivera" },
      {
        id: "l2",
        type: "linkedin",
        label: "Alex on LinkedIn",
        url: "https://linkedin.com/in/alex",
      },
      { id: "l3", type: "custom", label: "", url: "" }, // empty url -> should be dropped
    ],
  },
  summary:
    "Engineering leader with 10+ years designing high-throughput web systems, offline-first architectures, and developer platforms.",
  experience: [
    {
      id: "exp1",
      company: "CloudScale Inc",
      role: "Lead Platform Engineer",
      location: "San Francisco, CA",
      startDate: "2022-01",
      endDate: "",
      current: true,
      summary: "Scaled edge caching infrastructure processing 50k req/sec.",
      highlights: ["Reduced TTFB by 40%", "Migrated legacy monolith to Go microservices"],
    },
  ],
  education: [
    {
      id: "edu1",
      school: "University of Washington",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2014",
      endDate: "2018",
      current: false,
      summary: "Focused on distributed databases and operating systems.",
    },
  ],
  projects: [
    {
      id: "proj1",
      name: "FastKV Storage Engine",
      role: "Creator",
      link: "https://github.com/alexrivera/fastkv",
      linkLabel: "Repository",
      showLinkAsText: true,
      summary: "An embedded LSM-tree key-value store in Rust.",
      highlights: ["Achieved 1.2M writes/sec", "Zero external dependencies"],
      skills: ["Rust", "Storage Systems"],
    },
  ],
  skills: [
    {
      id: "sk1",
      name: "Core Systems",
      keywords: ["Rust", "TypeScript", "PostgreSQL", "Redis"],
    },
  ],
  certificates: [
    {
      id: "cert1",
      title: "AWS Solutions Architect Professional",
      issuer: "Amazon Web Services",
      date: "2024-05",
      website: "https://aws.amazon.com",
      description: "Advanced cloud networking and disaster recovery.",
      showLink: false,
    },
  ],
  awards: [
    {
      id: "aw1",
      title: "Innovator of the Year",
      awarder: "CloudScale Inc",
      date: "2023-12",
      website: "",
      description: "Recognized for architecting the global caching mesh.",
      showLink: false,
    },
  ],
  publications: [
    {
      id: "pub1",
      title: "Designing Resilient Offline-First Data Layers",
      publisher: "ACM Queue",
      date: "2024-08",
      website: "https://acm.org",
      description: "Practical guide to client-side vector clocks and delta replication.",
      showLink: false,
    },
  ],
  volunteer: [
    {
      id: "vol1",
      organization: "Code For Community",
      role: "Technical Mentor",
      startDate: "2021-01",
      endDate: "2023-12",
      current: false,
      summary: "Mentored underrepresented students entering software engineering.",
      location: "Seattle, WA",
    },
  ],
  achievements: [
    {
      id: "ach1",
      title: "Top 1% Open Source Contributor",
      description: "Authored major PRs to popular web framework ecosystems.",
    },
  ],
  languages: [
    {
      id: "lang1",
      language: "English",
      fluency: "native",
    },
    {
      id: "lang2",
      language: "Spanish",
      fluency: "professional",
    },
  ],
  interests: [
    {
      id: "int1",
      name: "Hardware Hacking",
      keywords: ["FPGA", "Embedded C", "Robotics"],
    },
  ],
  references: [
    {
      id: "ref1",
      name: "Dana Whitfield",
      title: "Director of Engineering",
      organization: "CloudScale Inc",
      email: "dana@example.com",
      phone: "+15550109988",
      relationship: "Former manager",
    },
  ],
  customSections: [],
  sections: [],
  schemaVersion: CURRENT_SCHEMA_VERSION,
  customization: structuredClone(DEFAULT_CUSTOMIZATION),
  updatedAt: "2026-08-19T00:00:00.000Z",
};

describe("projectToPortfolio contract", () => {
  it("projects all populated sections in exact canonical order and omits empty source arrays", () => {
    const portfolio = projectToPortfolio(fullMasterFixture, {
      templateId: "signal",
      availability: "Available for Q3 projects",
    });

    expect(portfolio.identity.name).toBe("Alex Rivera");
    expect(portfolio.identity.headline).toBe("Distributed Systems & Web Platform Architect");
    expect(portfolio.identity.bio).toContain("Engineering leader with 10+ years");
    expect(portfolio.identity.location).toBe("Seattle, WA");
    expect(portfolio.identity.email).toBe("alex@example.com");
    expect(portfolio.identity.availability).toBe("Available for Q3 projects");
    expect(portfolio.identity.avatar).toBeNull();

    expect(portfolio.seo.title).toBe("Alex Rivera | Portfolio");
    expect(portfolio.seo.description).toContain("Engineering leader");

    // Social links (dropped empty url, humanized github)
    expect(portfolio.socialLinks).toHaveLength(2);
    expect(portfolio.socialLinks[0].label).toBe("GitHub");
    expect(portfolio.socialLinks[0].url).toBe("https://github.com/alexrivera");
    expect(portfolio.socialLinks[1].label).toBe("Alex on LinkedIn");

    const sectionTypes = portfolio.sections.map((s) => s.type);
    expect(sectionTypes).toEqual([
      "projects",
      "experience",
      "education",
      "skills",
      "certifications",
      "awards",
      "publications",
      "volunteer",
      "achievements",
      "languages",
      "interests",
      "contact",
    ]);
  });

  it("handles an empty master profile safely emitting only contact section", () => {
    const emptyMaster: MasterProfileData = {
      templateId: "precision-ats",
      basics: {
        fullName: "",
        role: "",
        headline: "",
        email: "",
        phone: "",
        location: "",
        linkEmail: false,
        linkPhone: false,
        linkLocation: false,
      },
      links: { displayMode: "icon", items: [] },
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: [],
      certificates: [],
      awards: [],
      publications: [],
      volunteer: [],
      achievements: [],
      languages: [],
      interests: [],
      references: [],
      customSections: [],
      sections: [],
      schemaVersion: CURRENT_SCHEMA_VERSION,
      customization: structuredClone(DEFAULT_CUSTOMIZATION),
      updatedAt: "2026-08-19T00:00:00.000Z",
    };

    const portfolio = projectToPortfolio(emptyMaster, { templateId: "signal" });
    expect(portfolio.identity.name).toBe("");
    expect(portfolio.seo.title).toBe("Portfolio");
    expect(portfolio.sections).toHaveLength(1);
    expect(portfolio.sections[0].type).toBe("contact");
  });

  it("writes dual fields (summary+description, name+title) compatible with itemProse and itemLabel", () => {
    const portfolio = projectToPortfolio(fullMasterFixture, { templateId: "signal" });

    // Project item
    const projSection = portfolio.sections.find((s) => s.type === "projects")!;
    const projectItem = projSection.items[0];
    expect(itemLabel(projectItem)).toBe("FastKV Storage Engine");
    expect(itemProse(projectItem)).toBe("An embedded LSM-tree key-value store in Rust.");

    // Experience item
    const expSection = portfolio.sections.find((s) => s.type === "experience")!;
    const expItem = expSection.items[0];
    expect(itemProse(expItem)).toBe("Scaled edge caching infrastructure processing 50k req/sec.");

    // Certification item
    const certSection = portfolio.sections.find((s) => s.type === "certifications")!;
    const certItem = certSection.items[0];
    expect(itemLabel(certItem)).toBe("AWS Solutions Architect Professional");
    expect(itemProse(certItem)).toBe("Advanced cloud networking and disaster recovery.");

    // Award item
    const awardSection = portfolio.sections.find((s) => s.type === "awards")!;
    const awardItem = awardSection.items[0];
    expect(itemLabel(awardItem)).toBe("Innovator of the Year");
    expect(itemProse(awardItem)).toBe("Recognized for architecting the global caching mesh.");

    // Publication item
    const pubSection = portfolio.sections.find((s) => s.type === "publications")!;
    const pubItem = pubSection.items[0];
    expect(itemLabel(pubItem)).toBe("Designing Resilient Offline-First Data Layers");
    expect(itemProse(pubItem)).toBe(
      "Practical guide to client-side vector clocks and delta replication.",
    );

    // Volunteer item
    const volSection = portfolio.sections.find((s) => s.type === "volunteer")!;
    const volItem = volSection.items[0];
    expect(itemLabel(volItem)).toBe("Code For Community");
    expect(itemProse(volItem)).toBe(
      "Mentored underrepresented students entering software engineering.",
    );
  });

  it("is pure and does not mutate master profile or share references", () => {
    assertProjectionIsPure(
      (master) => projectToPortfolio(master, { templateId: "signal" }),
      fullMasterFixture,
    );
  });

  it("renders projected portfolio content smoothly in real templates", () => {
    const portfolio = projectToPortfolio(fullMasterFixture, { templateId: "signal" });

    const signalHtml = renderToStaticMarkup(<SignalTemplate project={portfolio} />);
    expect(signalHtml).toContain("Alex Rivera");
    expect(signalHtml).toContain("FastKV Storage Engine");
    expect(signalHtml).toContain("CloudScale Inc");

    const atelierHtml = renderToStaticMarkup(<AtelierTemplate project={portfolio} />);
    expect(atelierHtml).toContain("Alex Rivera");
    expect(atelierHtml).toContain("FastKV Storage Engine");
  });
});

describe("mergeMasterProfileIntoPortfolio contract", () => {
  it("smart import skips sections with existing filled items and populates empty ones", () => {
    const existing: PortfolioContent = createDefaultPortfolio({
      name: "Existing Alex",
      email: "existing@example.com",
    });

    // User manually created a custom project in their portfolio
    existing.sections = [
      {
        id: "sec-user-proj",
        type: "projects",
        title: "My Custom Projects",
        visible: true,
        items: [
          {
            id: "custom-p1",
            title: "Hand-crafted Project",
            summary: "User wrote this manually.",
          },
        ],
      },
      {
        id: "sec-empty-exp",
        type: "experience",
        title: "Experience",
        visible: true,
        items: [], // empty items -> should be populated from master
      },
      {
        id: "sec-contact",
        type: "contact",
        title: "Contact",
        visible: true,
        items: [],
      },
    ];

    const projected = projectToPortfolio(fullMasterFixture, { templateId: "signal" });
    const merged = mergeMasterProfileIntoPortfolio(existing, projected, "fill-empty");

    // Existing identity preserved
    expect(merged.identity.name).toBe("Existing Alex");
    expect(merged.identity.email).toBe("existing@example.com");
    // Missing identity fields filled
    expect(merged.identity.headline).toBe("Distributed Systems & Web Platform Architect");

    // Projects section was NOT overwritten (skipped master projects, kept user's custom project)
    const mergedProjects = merged.sections.find((s) => s.type === "projects")!;
    expect(mergedProjects.title).toBe("My Custom Projects");
    expect(mergedProjects.items).toHaveLength(1);
    expect(mergedProjects.items[0].title).toBe("Hand-crafted Project");

    // Experience section was empty, so it got populated from master
    const mergedExp = merged.sections.find((s) => s.type === "experience")!;
    expect(mergedExp.items).toHaveLength(1);
    expect(mergedExp.items[0].company).toBe("CloudScale Inc");

    // Other missing sections (education, skills, etc.) were added from master
    expect(merged.sections.some((s) => s.type === "education")).toBe(true);
    expect(merged.sections.some((s) => s.type === "skills")).toBe(true);

    // Contact is preserved last
    expect(merged.sections[merged.sections.length - 1].type).toBe("contact");
  });

  it("replace mode overwrites all sections while preserving avatar asset", () => {
    const existing: PortfolioContent = createDefaultPortfolio({
      name: "Old Draft",
      email: "old@example.com",
    });
    existing.identity.avatar = { id: "asset-123", url: "https://example.com/avatar.png" };

    const projected = projectToPortfolio(fullMasterFixture, { templateId: "signal" });
    const merged = mergeMasterProfileIntoPortfolio(existing, projected, "replace");

    expect(merged.identity.name).toBe("Alex Rivera");
    expect(merged.identity.avatar).toEqual({
      id: "asset-123",
      url: "https://example.com/avatar.png",
    });

    const projectSec = merged.sections.find((s) => s.type === "projects")!;
    expect(projectSec.items[0].name).toBe("FastKV Storage Engine");
  });
});
