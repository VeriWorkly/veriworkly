import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ResumeData } from "@/types/resume";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { createCustomItem, createTypedSectionItem } from "@/features/resume/utils/factories";

import AwardsSection from "@/features/resume/editor/content/sections/AwardsSection";
import CustomSection from "@/features/resume/editor/content/sections/CustomSection";
import PublicationsSection from "@/features/resume/editor/content/sections/PublicationsSection";
import CertificationsSection from "@/features/resume/editor/content/sections/CertificationsSection";

/**
 * A server render reads a zustand store's initial state, never one set in a test, so the
 * section editors get a store that answers every selector from `state`; actions are no-ops.
 */
const state = vi.hoisted(() => ({ resume: null as unknown }));

vi.mock("@/features/resume/store/resume-store", () => ({
  useResumeStore: (selector: (store: unknown) => unknown) =>
    selector(
      new Proxy(state, {
        get: (target, key) => (key in target ? target[key as "resume"] : () => {}),
      }),
    ),
}));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

function openWith(patch: Partial<ResumeData>) {
  state.resume = { ...structuredClone(defaultResume), ...patch };
}

beforeEach(() => {
  state.resume = structuredClone(defaultResume);
});

describe("what the resume editor prints, it can edit", () => {
  it("S-406 certifications and publications have a description and a show-link switch", () => {
    openWith({
      certificates: [createTypedSectionItem("certificates")],
      publications: [createTypedSectionItem("publications")],
      awards: [createTypedSectionItem("awards")],
    });

    const certificates = renderToStaticMarkup(<CertificationsSection isOpen onToggle={() => {}} />);
    const publications = renderToStaticMarkup(<PublicationsSection isOpen onToggle={() => {}} />);
    const awards = renderToStaticMarkup(<AwardsSection isOpen onToggle={() => {}} />);

    for (const html of [certificates, publications]) {
      expect(html).toContain("Description");
      expect(html).toContain("Show the link on the resume");
    }
    expect(awards).toContain("Show the link on the resume");
  });

  it("S-406 a custom section item edits every field it prints", () => {
    openWith({
      customSections: [
        {
          id: "custom-1",
          kind: "custom",
          title: "Speaking",
          editableTitle: true,
          items: [createCustomItem()],
        } as ResumeData["customSections"][number],
      ],
    });

    const html = renderToStaticMarkup(
      <CustomSection customSectionId="custom-1" isOpen onToggle={() => {}} />,
    );

    for (const label of ["Issuer", "Date (YYYY-MM)", "Credential ID", "Details"]) {
      expect(html).toContain(label);
    }
  });
});
