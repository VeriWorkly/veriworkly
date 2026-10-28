import type { Metadata } from "next";

import { notFound } from "next/navigation";

import type { ResumeData } from "@/types/resume";
import type { ShareLinkPayload } from "@/features/documents/services/share-service";

import { PARITY_FIXTURE_IDS, PARITY_FIXTURES, type ParityFixtureId } from "@/tests/parity/fixtures";
import { PAPER_SIZES, type PaperSize } from "@/templates/shared/page-geometry";
import { resumeTemplateRegistry } from "@/templates/resume/registry";

import ShareDocumentClient from "@/app/share/[username]/[slug]/share-document-client";
import { renderSharedResumeTemplate } from "@/app/share/[username]/[slug]/shared-resume-template";

export const metadata: Metadata = {
  title: "Share page harness",
  robots: { index: false, follow: false },
};

/**
 * Test-only surface: `tests/browser/share-page.test.ts` opens the public share page here. The
 * real `/share/[username]/[slug]` reads the link from the API; this one builds the same
 * payload from a parity fixture and renders it exactly as that page does — the resume drawn
 * on the server, then cut into pages in the browser.
 *
 * It renders sample data with no auth, so it must never exist in a production build.
 */
export default async function ShareHarnessPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; paper?: string; template?: string; locked?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { fixture = "default", paper = "a4", template, locked } = await searchParams;

  // `?locked=1`: a password-protected link, as the API answers it before the unlock.
  if (locked === "1") {
    return (
      <ShareDocumentClient
        username="harness"
        slug="share"
        initialData={{ passwordRequired: true, expiresAt: null }}
        serverTemplate={null}
      />
    );
  }

  if (!PARITY_FIXTURE_IDS.includes(fixture as ParityFixtureId)) notFound();
  if (!PAPER_SIZES.includes(paper as PaperSize)) notFound();
  if (template !== undefined && !resumeTemplateRegistry.has(template)) notFound();

  const fixtureResume = PARITY_FIXTURES[fixture as ParityFixtureId].resume();
  const resume: ResumeData = {
    ...fixtureResume,
    templateId: template ?? fixtureResume.templateId,
    customization: { ...fixtureResume.customization, paperSize: paper as PaperSize },
  };
  const payload: ShareLinkPayload = {
    passwordRequired: false,
    documentTitle: "Shared resume",
    expiresAt: null,
    snapshot: { type: "RESUME", templateId: resume.templateId, content: resume },
  };

  return (
    <ShareDocumentClient
      username="harness"
      slug="share"
      initialData={payload}
      serverTemplate={await renderSharedResumeTemplate(payload)}
    />
  );
}
