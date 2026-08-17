import type { MasterProfileData } from "../schema/types.js";

import { createLocalOnlySyncState, type DocumentSyncState } from "./document.js";

/**
 * A resume body seeded from the master profile.
 *
 * Structurally the studio's `ResumeData` minus the two things a *document* owns and a
 * profile has no concept of: a section's `column` and a customization `theme`. Those stay
 * declared in apps/studio, and the studio's normaliser fills them in — this type is derived
 * from `MasterProfileData` rather than hand-written so the two can never drift.
 */
export interface ProjectedResume extends Omit<MasterProfileData, "updatedAt"> {
  id: string;
  title: string;
  sync: DocumentSyncState;
  updatedAt: string;
}

export interface ProjectToResumeOptions {
  resumeId: string;
  /** Overrides the profile's template. Used by "create with this template" entry points. */
  templateId?: string;
  title?: string;
  /** Injected so tests are deterministic; defaults to now. */
  now?: string;
}

/**
 * The one function that turns a master profile into a new resume.
 *
 * Pure and total: no I/O, no clock beyond `options.now`, and never throws for a profile the
 * schema accepts. Everything it returns is deep-cloned, which is what actually enforces the
 * fork-on-create rule — a resume that shared an array with the profile would let an edit in
 * the editor rewrite the profile through a reference nobody could see.
 *
 * Fields are listed one by one rather than spread. That is deliberate: a key added to the
 * master profile does not silently become part of every document, and `updatedAt` — which
 * means "when the profile changed" on one side and "when the document changed" on the other
 * — cannot leak across.
 *
 * Item ids are kept, not regenerated. They are stable handles, re-keying them buys nothing,
 * and keeping them makes a profile and the resumes forked from it diffable.
 */
export function projectToResume(
  master: MasterProfileData,
  options: ProjectToResumeOptions,
): ProjectedResume {
  const profile = structuredClone(master);

  return {
    id: options.resumeId,
    schemaVersion: profile.schemaVersion ?? 2,
    templateId: options.templateId ?? profile.templateId,
    title: options.title ?? profile.basics.fullName,

    basics: profile.basics,
    links: profile.links,
    summary: profile.summary,
    experience: profile.experience,
    education: profile.education,
    projects: profile.projects,
    skills: profile.skills,

    languages: profile.languages,
    interests: profile.interests,
    awards: profile.awards,
    certificates: profile.certificates,
    publications: profile.publications,
    volunteer: profile.volunteer,
    references: profile.references,
    achievements: profile.achievements,

    customSections: profile.customSections,
    sections: profile.sections,
    customization: profile.customization,

    sync: createLocalOnlySyncState(),
    updatedAt: options.now ?? new Date().toISOString(),
  };
}
