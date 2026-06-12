"use client";

import { useState } from "react";

import { Button, Select } from "@veriworkly/ui";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { CoverLetterSectionId } from "@/features/cover-letter/types";
import type { ResumeLinkDisplayMode, ResumeLinkItem, ResumeLinkType } from "@/types/resume";

import { linkTypeOptions } from "@/features/documents/editor/link-options";
import SectionAccordion from "@/features/resume/editor/content/SectionAccordion";
import { AiFieldAssist } from "@/features/ai/AiFieldAssist";

import { EditorBlock, Field, TextField } from "./CoverLetterFields";

interface CoverLetterContentPanelProps {
  content: CoverLetterContent;
  documentId: string;
  links: CoverLetterContent["links"];
  onAddLink: () => void;
  onRemoveLink: (index: number) => void;
  onUpdateContent: (patch: Partial<CoverLetterContent>) => void;
  onUpdateLink: (index: number, patch: Partial<ResumeLinkItem>) => void;
  onUpdateLinks: (patch: Partial<CoverLetterContent["links"]>) => void;
}

export function CoverLetterContentPanel({
  content,
  documentId,
  links,
  onAddLink,
  onRemoveLink,
  onUpdateContent,
  onUpdateLink,
  onUpdateLinks,
}: CoverLetterContentPanelProps) {
  const [openSectionId, setOpenSectionId] = useState<CoverLetterSectionId | null>("profile");

  function toggleSection(sectionId: string) {
    setOpenSectionId((currentSectionId) =>
      currentSectionId === sectionId ? null : (sectionId as CoverLetterSectionId),
    );
  }

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
          <Field
            label="Full name"
            value={content.senderName}
            onChange={(senderName) => onUpdateContent({ senderName })}
          />

          <Field
            label="Professional title"
            value={content.senderTitle}
            onChange={(senderTitle) => onUpdateContent({ senderTitle })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Email"
              value={content.senderEmail}
              onChange={(senderEmail) => onUpdateContent({ senderEmail })}
            />

            <Field
              label="Phone"
              value={content.senderPhone}
              onChange={(senderPhone) => onUpdateContent({ senderPhone })}
            />
          </div>

          <Field
            label="Location"
            value={content.senderLocation}
            onChange={(senderLocation) => onUpdateContent({ senderLocation })}
          />

          <Field
            label="Website"
            value={content.senderWebsite}
            onChange={(senderWebsite) => onUpdateContent({ senderWebsite })}
          />
        </EditorBlock>
      </SectionAccordion>

      <SectionAccordion
        id="links"
        isOpen={openSectionId === "links"}
        label="Links"
        onToggle={toggleSection}
      >
        <EditorBlock title="Links">
          <label className="grid gap-1.5">
            <span className="text-muted text-xs font-semibold">Display style</span>

            <Select
              value={links.displayMode}
              onChange={(event) =>
                onUpdateLinks({ displayMode: event.target.value as ResumeLinkDisplayMode })
              }
            >
              <option value="icon">Icons only</option>
              <option value="icon-username">Icon + username</option>
            </Select>
          </label>

          <div className="grid gap-3">
            {links.items.map((item, index) => (
              <div key={item.id} className="border-border grid gap-3 rounded-xl border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-muted text-xs font-semibold">Link type</span>

                    <Select
                      value={item.type}
                      onChange={(event) =>
                        onUpdateLink(index, {
                          type: event.target.value as ResumeLinkType,
                        })
                      }
                    >
                      {linkTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <Field
                    label="Label"
                    value={item.label}
                    placeholder="veriworkly-user"
                    onChange={(label) => onUpdateLink(index, { label })}
                  />
                </div>

                <Field
                  label="URL"
                  value={item.url}
                  placeholder="https://..."
                  onChange={(url) => onUpdateLink(index, { url })}
                />

                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-self-start"
                  onClick={() => onRemoveLink(index)}
                >
                  Remove link
                </Button>
              </div>
            ))}
          </div>

          <Button size="sm" variant="secondary" onClick={onAddLink}>
            Add link
          </Button>
        </EditorBlock>
      </SectionAccordion>

      <SectionAccordion
        id="target"
        label="Target"
        onToggle={toggleSection}
        isOpen={openSectionId === "target"}
      >
        <EditorBlock title="Target">
          <Field
            label="Target role"
            value={content.jobTitle}
            onChange={(jobTitle) => onUpdateContent({ jobTitle })}
          />

          <Field
            label="Company"
            value={content.companyName}
            onChange={(companyName) => onUpdateContent({ companyName })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Hiring manager"
              value={content.recipientName}
              onChange={(recipientName) => onUpdateContent({ recipientName })}
            />

            <Field
              label="Recipient title"
              value={content.recipientTitle}
              onChange={(recipientTitle) => onUpdateContent({ recipientTitle })}
            />
          </div>

          <Field
            label="Company location"
            value={content.companyLocation}
            onChange={(companyLocation) => onUpdateContent({ companyLocation })}
          />

          <Field label="Date" value={content.date} onChange={(date) => onUpdateContent({ date })} />
        </EditorBlock>
      </SectionAccordion>

      <SectionAccordion
        id="letter"
        label="Letter"
        onToggle={toggleSection}
        isOpen={openSectionId === "letter"}
      >
        <EditorBlock title="Letter">
          <Field
            label="Subject"
            value={content.subject}
            placeholder="Application for Senior Product Engineer"
            onChange={(subject) => onUpdateContent({ subject })}
          />

          <Field
            label="Greeting"
            value={content.greeting}
            onChange={(greeting) => onUpdateContent({ greeting })}
          />

          <TextField
            label="Opening"
            value={content.opening}
            onChange={(opening) => onUpdateContent({ opening })}
          />

          <TextField
            label="Main body"
            value={content.body}
            className="min-h-44 font-mono text-[13px]"
            onChange={(body) => onUpdateContent({ body })}
          />
          <AiFieldAssist
            action="generate_cover_letter"
            context={JSON.stringify(content)}
            documentId={documentId}
            onApply={(body) => onUpdateContent({ body })}
            text={content.body}
          />

          <TextField
            label="Proof points"
            value={content.highlights}
            className="min-h-32 font-mono text-[13px]"
            onChange={(highlights) => onUpdateContent({ highlights })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Closing"
              value={content.closing}
              onChange={(closing) => onUpdateContent({ closing })}
            />

            <Field
              label="Signature"
              value={content.signature}
              onChange={(signature) => onUpdateContent({ signature })}
            />
          </div>

          <Field
            label="Postscript"
            value={content.postscript}
            onChange={(postscript) => onUpdateContent({ postscript })}
          />
        </EditorBlock>
      </SectionAccordion>
    </div>
  );
}
