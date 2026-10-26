"use client";

import { useMemo, useState } from "react";

import type { CoverLetterSectionId } from "@/features/cover-letter/types";

import { validateCoverLetterContent } from "@/features/cover-letter/validation";
import { useCoverLetterStore } from "@/features/cover-letter/store/cover-letter-store";
import { LinksEditor } from "@/features/documents/editor/LinksEditor";
import { veriworklyRailOverflows } from "@/templates/cover-letter/shared";
import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { AiFieldAssist } from "@/features/ai/AiFieldAssist";
import { coverLetterAiContext } from "@/features/ai/ai-context";
import { listDocuments } from "@/features/documents/services/document-workspace-service";
import { readResumeById } from "@/features/resume/services/resume-service";

import {
  EditorBlock,
  SelectField,
  TextAreaField,
  TextInputField,
} from "@/features/documents/editor/form";

interface CoverLetterContentPanelProps {
  documentId: string;
}

const EMPTY_LINKS = { displayMode: "icon-username" as const, items: [] };

/**
 * Reads state through narrow store selectors, the same pattern the resume section
 * components use (`features/resume/editor/content/sections/`). It previously took eight
 * props threaded down from the editor.
 */
export function CoverLetterContentPanel({ documentId }: CoverLetterContentPanelProps) {
  const [openSectionId, setOpenSectionId] = useState<CoverLetterSectionId | null>("profile");
  // The resume the AI writes the letter from: the most recent one unless the user picks.
  const [resumes] = useState(() => listDocuments("RESUME"));
  const [basedOnResumeId, setBasedOnResumeId] = useState(() => resumes[0]?.id ?? "");

  const content = useCoverLetterStore((state) => state.document?.content);
  const templateId = useCoverLetterStore((state) => state.document?.templateId);
  const onUpdateContent = useCoverLetterStore((state) => state.updateContent);
  const onUpdateLinks = useCoverLetterStore((state) => state.updateLinks);
  const onAddLink = useCoverLetterStore((state) => state.addLinkItem);
  const onUpdateLink = useCoverLetterStore((state) => state.updateLinkItem);
  const onRemoveLink = useCoverLetterStore((state) => state.removeLinkItem);

  // Advisory, never blocking — the same model the resume uses. Link URLs are validated
  // inside `LinksEditor`, which both editors share.
  const contactErrors = useMemo(
    () => (content ? validateCoverLetterContent(content) : {}),
    [content],
  );

  // The VeriWorkly rail is one page tall and clips the rest, in the preview and every export.
  const railOverflows = useMemo(
    () => templateId === "veriworkly-special" && !!content && veriworklyRailOverflows(content),
    [content, templateId],
  );
  const railNotice = railOverflows ? (
    <p className="text-muted text-xs" role="note">
      These contact details and links are too long for the VeriWorkly rail, and whatever does not
      fit is cut off. Shorten them, remove some, or pick another template.
    </p>
  ) : null;

  function toggleSection(sectionId: string) {
    setOpenSectionId((currentSectionId) =>
      currentSectionId === sectionId ? null : (sectionId as CoverLetterSectionId),
    );
  }

  if (!content) return null;

  const links = content.links ?? EMPTY_LINKS;

  return (
    <div>
      <div className="border-border/70 border-b p-3">
        <h2 className="text-foreground text-base font-semibold">Content editor</h2>
        <p className="text-muted text-sm">Edit cover letter sections.</p>
      </div>

      <SectionAccordion
        id="profile"
        isOpen={openSectionId === "profile"}
        label="Profile"
        onToggle={toggleSection}
      >
        <EditorBlock title="Profile">
          <TextInputField
            label="Full name"
            value={content.senderName}
            onValueChange={(senderName) => onUpdateContent({ senderName })}
          />

          <TextInputField
            label="Professional title"
            value={content.senderTitle}
            onValueChange={(senderTitle) => onUpdateContent({ senderTitle })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextInputField
              label="Email"
              type="email"
              value={content.senderEmail}
              error={contactErrors.senderEmail}
              onValueChange={(senderEmail) => onUpdateContent({ senderEmail })}
            />

            <TextInputField
              label="Phone"
              inputMode="tel"
              type="tel"
              value={content.senderPhone}
              error={contactErrors.senderPhone}
              onValueChange={(senderPhone) => onUpdateContent({ senderPhone })}
            />
          </div>

          <TextInputField
            label="Location"
            value={content.senderLocation}
            onValueChange={(senderLocation) => onUpdateContent({ senderLocation })}
          />

          <TextInputField
            label="Website"
            value={content.senderWebsite}
            error={contactErrors.senderWebsite}
            onValueChange={(senderWebsite) => onUpdateContent({ senderWebsite })}
          />

          {railNotice}
        </EditorBlock>
      </SectionAccordion>

      <SectionAccordion
        id="links"
        isOpen={openSectionId === "links"}
        label="Links"
        onToggle={toggleSection}
      >
        <EditorBlock title="Links">
          <LinksEditor
            links={links}
            onAddLink={onAddLink}
            onUpdateLink={onUpdateLink}
            onUpdateLinks={onUpdateLinks}
            onRemoveLink={onRemoveLink}
            emptyMessage="No links yet. Add LinkedIn, a portfolio, or anything worth contacting you through."
          />

          {railNotice}
        </EditorBlock>
      </SectionAccordion>

      <SectionAccordion
        id="target"
        label="Target"
        onToggle={toggleSection}
        isOpen={openSectionId === "target"}
      >
        <EditorBlock title="Target">
          <TextInputField
            label="Target role"
            value={content.jobTitle}
            onValueChange={(jobTitle) => onUpdateContent({ jobTitle })}
          />

          <TextInputField
            label="Company"
            value={content.companyName}
            onValueChange={(companyName) => onUpdateContent({ companyName })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextInputField
              label="Hiring manager"
              value={content.recipientName}
              onValueChange={(recipientName) => onUpdateContent({ recipientName })}
            />

            <TextInputField
              label="Recipient title"
              value={content.recipientTitle}
              onValueChange={(recipientTitle) => onUpdateContent({ recipientTitle })}
            />
          </div>

          <TextInputField
            label="Company location"
            value={content.companyLocation}
            onValueChange={(companyLocation) => onUpdateContent({ companyLocation })}
          />

          <TextInputField
            label="Date"
            value={content.date}
            onValueChange={(date) => onUpdateContent({ date })}
          />

          <TextAreaField
            label="Job post (optional)"
            value={content.jobPost ?? ""}
            className="min-h-32 text-[13px]"
            placeholder="Paste the job post. AI uses it to write the letter; it is not printed."
            onValueChange={(jobPost) => onUpdateContent({ jobPost })}
          />
        </EditorBlock>
      </SectionAccordion>

      <SectionAccordion
        id="letter"
        label="Letter"
        onToggle={toggleSection}
        isOpen={openSectionId === "letter"}
      >
        <EditorBlock title="Letter">
          <TextInputField
            label="Subject"
            value={content.subject}
            placeholder="Application for Senior Product Engineer"
            onValueChange={(subject) => onUpdateContent({ subject })}
          />

          <TextInputField
            label="Greeting"
            value={content.greeting}
            onValueChange={(greeting) => onUpdateContent({ greeting })}
          />

          <TextAreaField
            label="Opening"
            value={content.opening}
            onValueChange={(opening) => onUpdateContent({ opening })}
          />

          <TextAreaField
            label="Main body"
            value={content.body}
            className="min-h-44 font-mono text-[13px]"
            onValueChange={(body) => onUpdateContent({ body })}
          />
          {resumes.length ? (
            <SelectField
              label="Write from resume"
              value={basedOnResumeId}
              onValueChange={setBasedOnResumeId}
            >
              <option value="">None</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title || "Untitled resume"}
                </option>
              ))}
            </SelectField>
          ) : null}
          <AiFieldAssist
            action="generate_cover_letter"
            getContext={() =>
              coverLetterAiContext(
                content,
                basedOnResumeId ? readResumeById(basedOnResumeId) : null,
              )
            }
            getJobDescription={() => content.jobPost ?? ""}
            documentId={documentId}
            onApply={(body) => onUpdateContent({ body })}
            text={content.body}
          />

          <TextAreaField
            label="Proof points"
            value={content.highlights}
            className="min-h-32 font-mono text-[13px]"
            onValueChange={(highlights) => onUpdateContent({ highlights })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextInputField
              label="Closing"
              value={content.closing}
              onValueChange={(closing) => onUpdateContent({ closing })}
            />

            <TextInputField
              label="Signature"
              value={content.signature}
              onValueChange={(signature) => onUpdateContent({ signature })}
            />
          </div>

          <TextInputField
            label="Postscript"
            value={content.postscript}
            onValueChange={(postscript) => onUpdateContent({ postscript })}
          />
        </EditorBlock>
      </SectionAccordion>
    </div>
  );
}
