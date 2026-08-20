import { existsSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createEmptyMasterProfile, type MasterProfileData } from "@veriworkly/profile-core";

import type { TemplateRenderProps } from "@/types/template";

import {
  createDefaultCoverLetter,
  createCoverLetterFromProfile,
} from "@/features/cover-letter/defaults";
import type { CoverLetterSectionId } from "@/features/cover-letter/types";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { templateCatalogByType } from "@/features/documents/core/template-catalog";
import { loadTemplateComponentById, templateRegistry } from "@/templates";
import { pdfTemplateIds } from "@/templates/resume/pdf";
import { buildCoverLetterHtml } from "@/templates/cover-letter/web";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";

const COVER_LETTER_TEMPLATE_IDS = [
  "professional",
  "veriworkly-special",
  "minimalist",
  "executive",
  "ats-essential",
];

const SHIPPED_RESUME_TEMPLATE_IDS = [
  "executive-clarity",
  "precision-ats",
  "modern-minimal",
  "timeline-focus",
  "corporate-brief",
  "bold-impact",
];

describe("template render contract", () => {
  it("registers core templates and keeps ids unique", () => {
    const templateIds = templateRegistry.map((template) => template.id);
    const uniqueTemplateIds = new Set(templateIds);

    expect(uniqueTemplateIds.size).toBe(templateIds.length);
    expect(templateIds).toEqual(expect.arrayContaining(SHIPPED_RESUME_TEMPLATE_IDS));
  });

  it("keeps the web registry, picker catalog and PDF registry in sync", () => {
    const webIds = [...templateRegistry.map((template) => template.id)].sort();
    const catalogIds = [...templateCatalogByType.RESUME.map((template) => template.id)].sort();
    const pdfIds = [...pdfTemplateIds].sort();

    expect(catalogIds).toEqual(webIds);
    expect(pdfIds).toEqual(webIds);
  });

  it("ships a preview asset for every resume template", () => {
    for (const template of templateRegistry) {
      expect(template.previewImage).not.toBe("");
      expect(existsSync(join(process.cwd(), "public", template.previewImage))).toBe(true);
    }
  });

  it("renders every registered template for canonical resume data", async () => {
    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent
          resume={{
            ...defaultResume,
            templateId: template.id,
          }}
        />,
      );

      expect(html.length).toBeGreaterThan(500);
      expect(html).toContain(defaultResume.basics.fullName);
    }
  });

  it("prints every user-entered field in every template", async () => {
    // A typed certificate, not a flattened `customSections` entry: certificates have their
    // own array now, and the credential id has its own field rather than borrowing the
    // shared item's `referenceId` slot.
    const richResume = {
      ...defaultResume,
      certificates: [
        {
          id: "cert-1",
          title: "AWS Certified Developer",
          issuer: "Amazon Web Services",
          date: "2024-06",
          website: "https://verify.example.com/aws-cert",
          referenceId: "CRED-99182",
          description: "Associate level certification.",
          showLink: true,
        },
      ],
    };

    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...richResume, templateId: template.id }} />,
      );

      // School name used to be dropped by Precision ATS in both renderers.
      expect(html, `${template.id} must print the school`).toContain(
        defaultResume.education[0].school,
      );
      // Credential link + id used to be dropped by Executive Clarity's preview.
      expect(html, `${template.id} must print the credential link`).toContain(
        "verify.example.com/aws-cert",
      );
      expect(html, `${template.id} must print the credential id`).toContain("CRED-99182");
    }
  });

  it("returns safely for missing template props", async () => {
    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);

      expect(() =>
        renderToStaticMarkup(<TemplateComponent {...({} as unknown as TemplateRenderProps)} />),
      ).not.toThrow();

      expect(() =>
        renderToStaticMarkup(
          <TemplateComponent resume={null as unknown as TemplateRenderProps["resume"]} />,
        ),
      ).not.toThrow();
    }
  });

  it("omits basics header when basics section is hidden", async () => {
    const hiddenBasicsResume = {
      ...defaultResume,
      sections: defaultResume.sections.map((section) =>
        section.id === "basics" ? { ...section, visible: false } : section,
      ),
    };

    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...hiddenBasicsResume, templateId: template.id }} />,
      );

      expect(html).not.toContain(defaultResume.basics.fullName);
    }
  });

  it("omits links when links section is hidden", async () => {
    const linkedResume = {
      ...defaultResume,
      links: {
        displayMode: "icon-username" as const,
        items: [
          {
            id: "portfolio",
            type: "portfolio" as const,
            label: "Portfolio",
            url: "https://example.com/portfolio",
          },
        ],
      },
      sections: defaultResume.sections.map((section) =>
        section.id === "links" ? { ...section, visible: false } : section,
      ),
    };

    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...linkedResume, templateId: template.id }} />,
      );

      expect(html).not.toContain("Portfolio");
      expect(html).not.toContain("example.com/portfolio");
    }
  });

  it("omits empty resume sections", async () => {
    const emptySectionsResume = {
      ...defaultResume,
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: [],
      customSections: [],
    };

    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...emptySectionsResume, templateId: template.id }} />,
      );

      expect(html).not.toContain("Summary");
      expect(html).not.toContain("Experience");
      expect(html).not.toContain("Education");
      expect(html).not.toContain("Projects");
      expect(html).not.toContain("Skills");
    }
  });

  it("omits custom sections when custom section is hidden", async () => {
    const hiddenCustomResume = {
      ...defaultResume,
      customSections: [
        {
          id: "certifications-default",
          kind: "certifications" as const,
          title: "Certifications",
          editableTitle: false,
          items: [
            {
              id: "cert-1",
              name: "AWS Certified Developer",
              issuer: "Amazon",
              date: "2024",
              link: "",
              referenceId: "",
              description: "",
              details: [],
            },
          ],
        },
      ],
      sections: defaultResume.sections.map((section) =>
        section.id === "certifications" ? { ...section, visible: false } : section,
      ),
    };

    for (const template of templateRegistry) {
      const TemplateComponent = await loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...hiddenCustomResume, templateId: template.id }} />,
      );

      expect(html).not.toContain("AWS Certified Developer");
    }
  });

  /**
   * All five templates read the same six sender fields, so one projection has to fix all
   * five at once — until it landed, every one of them printed the hardcoded "Veriworkly
   * User" no matter whose profile it was.
   */
  it("renders the user's own identity in every cover-letter template", async () => {
    const master: MasterProfileData = {
      ...createEmptyMasterProfile(),
      basics: {
        fullName: "Ada Lovelace",
        role: "Analytical Engineer",
        headline: "",
        email: "ada@example.com",
        phone: "+442079460958",
        location: "London, UK",
        linkEmail: true,
        linkPhone: true,
        linkLocation: true,
      },
    };

    const content = createCoverLetterFromProfile("cover-letter-projection", master).content;

    for (const templateId of COVER_LETTER_TEMPLATE_IDS) {
      const html = await buildCoverLetterHtml(content, templateId);

      expect(html, `${templateId} must print the sender's name`).toContain("Ada Lovelace");
      expect(html, `${templateId} must print the sender's title`).toContain("Analytical Engineer");
      expect(html, `${templateId} must print the sender's email`).toContain("ada@example.com");
      expect(html, `${templateId} must print the sender's phone`).toContain("+442079460958");
      expect(html, `${templateId} must print the sender's location`).toContain("London, UK");

      expect(html, `${templateId} must not fall back to the sample identity`).not.toContain(
        "Veriworkly User",
      );
    }
  });

  it("exports professional and veriworkly cover-letter HTML with expected content", async () => {
    const content = createDefaultCoverLetter("cover-letter-contract").content;

    for (const templateId of COVER_LETTER_TEMPLATE_IDS) {
      const html = await buildCoverLetterHtml(content, templateId);

      expect(html).toContain(content.senderName);
      expect(html).toContain(content.recipientName);
      expect(html).toContain(content.subject);
      expect(html).toContain("Product Engineer role at Veriworkly");
      expect(html).toContain("Built React and TypeScript document workflows");
      expect(html).toContain("P.S.");
    }
  });

  it("honours the cover-letter appearance colours in every rendered element", async () => {
    const base = createDefaultCoverLetter("cover-letter-appearance").content;
    const content = {
      ...base,
      appearance: {
        ...base.appearance,
        textColor: "#1b3a2f",
        pageColor: "#fffdf7",
        sidebarColor: "#0b1220",
        accentColor: "#c2410c",
      },
    };

    for (const templateId of COVER_LETTER_TEMPLATE_IDS) {
      const html = await buildCoverLetterHtml(content, templateId);

      expect(html, `${templateId} must use the chosen text colour`).toContain("#1b3a2f");
      expect(html, `${templateId} must use the chosen page colour`).toContain("#fffdf7");
      expect(html, `${templateId} must use the chosen accent colour`).toContain("#c2410c");

      // Literals from the old hardcoded zinc/slate scales must not survive.
      for (const legacyColor of ["#09090b", "#0f172a", "#334155", "#475569", "#52525b"]) {
        expect(html.toLowerCase(), `${templateId} must not hardcode ${legacyColor}`).not.toContain(
          legacyColor,
        );
      }
    }
  });

  it("honours the cover-letter appearance colours in the live preview", async () => {
    const base = createDefaultCoverLetter("cover-letter-preview-appearance").content;
    const content = {
      ...base,
      appearance: {
        ...base.appearance,
        textColor: "#1b3a2f",
        pageColor: "#fffdf7",
        accentColor: "#c2410c",
      },
    };

    for (const templateId of COVER_LETTER_TEMPLATE_IDS) {
      const CoverLetterTemplate = await coverLetterTemplateRegistry.loadWeb(templateId);
      const html = renderToStaticMarkup(<CoverLetterTemplate content={content} />);

      expect(html, `${templateId} preview must use the chosen text colour`).toContain("#1b3a2f");
      expect(html, `${templateId} preview must use the chosen accent colour`).toContain("#c2410c");

      // Tailwind's fixed zinc/slate utilities used to override the setting.
      for (const legacyClass of [
        "text-zinc-950",
        "text-zinc-800",
        "text-zinc-600",
        "text-slate-950",
        "text-slate-700",
        "text-slate-600",
        "bg-zinc-50",
        "bg-white",
      ]) {
        expect(html, `${templateId} preview must not hardcode ${legacyClass}`).not.toContain(
          legacyClass,
        );
      }
    }
  });

  it("keeps cover-letter sidebar text readable on a dark rail", async () => {
    const base = createDefaultCoverLetter("cover-letter-dark-rail").content;
    const html = await buildCoverLetterHtml(
      { ...base, appearance: { ...base.appearance, sidebarColor: "#0b1220" } },
      "veriworkly-special",
    );

    // A dark rail must flip the rail text to the light contrast colour rather
    // than keeping the near-black document text.
    expect(html).toContain("background:#0b1220");
    expect(html, "rail name uses the light contrast colour").toMatch(
      /aside h1\{[^}]*color:#f8fafc/,
    );
    expect(html, "rail body text is muted against the rail, not the page").toMatch(
      /\.rail p\{[^}]*color:#a5a9af/,
    );
  });

  it("respects hidden cover-letter sections in HTML export", async () => {
    const content = {
      ...createDefaultCoverLetter("cover-letter-hidden-sections").content,
      links: {
        displayMode: "icon-username" as const,
        items: [
          {
            id: "github",
            type: "github" as const,
            label: "GitHub",
            url: "https://github.com/veriworkly",
          },
        ],
      },
      appearance: {
        ...createDefaultCoverLetter("cover-letter-hidden-sections").content.appearance,
        hiddenSections: ["letter", "profile", "links", "target"] as CoverLetterSectionId[],
      },
    };

    for (const templateId of COVER_LETTER_TEMPLATE_IDS) {
      const html = await buildCoverLetterHtml(content, templateId);

      expect(html).not.toContain(content.senderEmail);
      expect(html).not.toContain("github.com/veriworkly");
      expect(html).not.toContain(content.recipientName);
      expect(html).not.toContain(content.subject);
      expect(html).not.toContain(content.greeting);
      expect(html).not.toContain("P.S.");
    }
  });
});
