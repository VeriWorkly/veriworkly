"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSearch, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Input, Select, TextArea } from "@veriworkly/ui";

import {
  deleteDocument,
  loadDocumentById,
  saveDocument,
} from "@/features/documents/services/document-workspace-service";
import { exportDocumentByType } from "@/features/documents/export/export-dispatcher";
import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";
import { templateCatalogByType } from "@/features/documents/core/template-catalog";
import { fontOptions, type FontFamilyId } from "@/features/documents/constants/fonts";
import type { CoverLetterAppearance, CoverLetterContent } from "@/features/cover-letter/types";
import { CoverLetterPreview } from "@/templates/cover-letter/web";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";
import ToolbarHeader from "@/app/(main)/editor/components/toolbar/ToolbarHeader";
import ToolbarActionsMenu from "@/app/(main)/editor/components/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/app/(main)/editor/components/toolbar/ToolbarDownloadMenu";
import { linkTypeOptions } from "@/app/(main)/editor/components/content/editor-options";
import { cn } from "@/lib/utils";
import type { ResumeLinkDisplayMode, ResumeLinkItem, ResumeLinkType } from "@/types/resume";

interface Props {
  documentId: string;
}

type EditorPanel = "content" | "settings";

function getInitialDocument(documentId: string) {
  return loadDocumentById("COVER_LETTER", documentId) as BaseDocument<CoverLetterContent> | null;
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-muted text-xs font-semibold">{label}</span>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  className,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-muted text-xs font-semibold">{label}</span>
      <TextArea
        className={cn("min-h-28 leading-6", className)}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input
        className="accent-accent w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input
        className="border-border bg-background h-11 w-full rounded-2xl border p-1"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function CoverLetterEditor({ documentId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState<BaseDocument<CoverLetterContent> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<EditorPanel>("content");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [activeDownload, setActiveDownload] = useState<ExportFormat | null>(null);
  const [message, setMessage] = useState("Autosave ready");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setDoc(getInitialDocument(documentId));
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="space-y-3 text-center">
          <h1 className="text-foreground text-xl font-semibold">Loading cover letter</h1>
          <p className="text-muted text-sm">Preparing your editor.</p>
        </Card>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="space-y-3 text-center">
          <h1 className="text-foreground text-xl font-semibold">Cover letter not found</h1>
          <p className="text-muted text-sm">Return to documents and choose another letter.</p>
          <Button asChild variant="secondary">
            <Link href="/documents">Back to documents</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const currentDoc = doc;
  const content = currentDoc.content;
  const appearance = content.appearance;
  const links = content.links ?? { displayMode: "icon-username" as const, items: [] };

  function updateDocument(next: BaseDocument<CoverLetterContent>) {
    setDoc(next);
    saveDocument(next);
    setMessage("Saved locally");
  }

  function updateContent(patch: Partial<CoverLetterContent>) {
    updateDocument({
      ...currentDoc,
      title:
        patch.jobTitle || patch.companyName
          ? [patch.jobTitle ?? content.jobTitle, patch.companyName ?? content.companyName]
              .filter(Boolean)
              .join(" - ") || currentDoc.title
          : currentDoc.title,
      updatedAt: new Date().toISOString(),
      content: { ...content, ...patch },
    });
  }

  function updateAppearance(patch: Partial<CoverLetterAppearance>) {
    updateContent({ appearance: { ...appearance, ...patch } });
  }

  function updateLinks(patch: Partial<CoverLetterContent["links"]>) {
    updateContent({ links: { ...links, ...patch } });
  }

  function addLink() {
    const next: ResumeLinkItem = {
      id: `cover-link-${Date.now().toString(36)}`,
      type: "linkedin",
      label: "",
      url: "",
    };
    updateLinks({ items: [...links.items, next] });
  }

  function updateLink(index: number, patch: Partial<ResumeLinkItem>) {
    updateLinks({
      items: links.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeLink(index: number) {
    updateLinks({ items: links.items.filter((_, itemIndex) => itemIndex !== index) });
  }

  async function download(format: ExportFormat) {
    setActiveDownload(format);
    try {
      await exportDocumentByType(currentDoc, format);
      setMessage(`${format.toUpperCase()} downloaded`);
    } catch {
      setMessage(`Could not generate ${format.toUpperCase()}`);
    } finally {
      setActiveDownload(null);
    }
  }

  function saveCurrentDocument() {
    saveDocument(currentDoc);
    setMessage("Draft saved locally");
  }

  function deleteCurrentDocument() {
    const confirmed = window.confirm(`Delete "${currentDoc.title}"? This cannot be undone.`);
    if (!confirmed) return;
    deleteDocument("COVER_LETTER", currentDoc.id);
    router.push("/documents");
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const imported =
        typeof parsed === "object" && parsed && "content" in parsed
          ? (parsed as BaseDocument<CoverLetterContent>)
          : ({ ...currentDoc, content: parsed } as BaseDocument<CoverLetterContent>);

      const next = {
        ...currentDoc,
        title: imported.title || currentDoc.title,
        templateId: imported.templateId || currentDoc.templateId,
        updatedAt: new Date().toISOString(),
        content: {
          ...content,
          ...(imported.content as Partial<CoverLetterContent>),
          appearance: {
            ...appearance,
            ...((imported.content as Partial<CoverLetterContent>).appearance ?? {}),
          },
        },
      };

      updateDocument(next);
      toast.success("Cover letter imported");
    } catch {
      toast.error("Import failed. Use a valid cover letter JSON file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex h-[calc(100dvh-2rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <header className="border-border bg-card/95 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-3xl border p-4 shadow-sm backdrop-blur">
        <ToolbarHeader
          title="Cover Letter Editor"
          message={message}
          onBack={() => router.push("/documents")}
        />

        <div className="flex flex-wrap items-center gap-2">
          {process.env.NODE_ENV === "development" ? (
            <Button asChild size="sm" variant="secondary">
              <Link
                href={`/pdf-debug/cover-letter/${currentDoc.templateId}?id=${currentDoc.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <FileSearch className="mr-2 h-4 w-4" />
                PDF Debug
              </Link>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/editor/cover_letter/${currentDoc.id}/preview`)}
          >
            Full Preview
          </Button>

          <Button size="sm" variant="secondary" onClick={saveCurrentDocument}>
            Save
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => void importJson(event.target.files?.[0])}
          />

          <ToolbarDownloadMenu
            activeDownload={activeDownload}
            onDownloadPdf={() => download("pdf")}
            onDownloadDocx={() => download("docx")}
            onDownloadHtml={() => void download("html")}
            onDownloadText={() => void download("txt")}
            onDownloadJson={() => void download("json")}
            onDownloadMarkdown={() => void download("markdown")}
          />

          <ToolbarActionsMenu
            onShare={() => setShareModalOpen(true)}
            onDelete={deleteCurrentDocument}
            onExport={() => void download("json")}
            onImport={() => fileInputRef.current?.click()}
            onReset={() => {
              const reset = createDefaultCoverLetter(currentDoc.id);
              updateDocument({ ...reset, updatedAt: new Date().toISOString() });
              setMessage("Cover letter reset to defaults");
            }}
          />
        </div>
      </header>

      <div className="border-border bg-card inline-flex shrink-0 rounded-2xl border p-1 md:hidden">
        <button
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium",
            activeTab === "editor" ? "bg-accent text-accent-foreground" : "text-muted",
          )}
          onClick={() => setActiveTab("editor")}
          type="button"
        >
          Edit
        </button>
        <button
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium",
            activeTab === "preview" ? "bg-accent text-accent-foreground" : "text-muted",
          )}
          onClick={() => setActiveTab("preview")}
          type="button"
        >
          Preview
        </button>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4 overflow-hidden",
          panelOpen ? "xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "grid-cols-1",
        )}
      >
        {panelOpen ? (
          <Card
            className={cn(
              "flex h-full min-h-0 flex-col p-4",
              activeTab === "preview" && "hidden md:flex",
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="border-border bg-background inline-flex rounded-2xl border p-1">
                <button
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-medium",
                    activePanel === "content" ? "bg-accent text-accent-foreground" : "text-muted",
                  )}
                  onClick={() => setActivePanel("content")}
                  type="button"
                >
                  Content
                </button>
                <button
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-medium",
                    activePanel === "settings" ? "bg-accent text-accent-foreground" : "text-muted",
                  )}
                  onClick={() => setActivePanel("settings")}
                  type="button"
                >
                  Settings
                </button>
              </div>
              <button
                className="border-border bg-background text-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl border"
                onClick={() => setPanelOpen(false)}
                type="button"
                aria-label="Collapse editor panel"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {activePanel === "content" ? (
                <div className="space-y-6">
                  <EditorBlock title="Profile">
                    <Field
                      label="Full name"
                      value={content.senderName}
                      onChange={(senderName) => updateContent({ senderName })}
                    />
                    <Field
                      label="Professional title"
                      value={content.senderTitle}
                      onChange={(senderTitle) => updateContent({ senderTitle })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Email"
                        value={content.senderEmail}
                        onChange={(senderEmail) => updateContent({ senderEmail })}
                      />
                      <Field
                        label="Phone"
                        value={content.senderPhone}
                        onChange={(senderPhone) => updateContent({ senderPhone })}
                      />
                    </div>
                    <Field
                      label="Location"
                      value={content.senderLocation}
                      onChange={(senderLocation) => updateContent({ senderLocation })}
                    />
                    <Field
                      label="Website"
                      value={content.senderWebsite}
                      onChange={(senderWebsite) => updateContent({ senderWebsite })}
                    />
                  </EditorBlock>

                  <EditorBlock title="Links">
                    <label className="grid gap-1.5">
                      <span className="text-muted text-xs font-semibold">Display style</span>
                      <Select
                        value={links.displayMode}
                        onChange={(event) =>
                          updateLinks({ displayMode: event.target.value as ResumeLinkDisplayMode })
                        }
                      >
                        <option value="icon">Icons only</option>
                        <option value="icon-username">Icon + username</option>
                      </Select>
                    </label>

                    <div className="grid gap-3">
                      {links.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="border-border grid gap-3 rounded-xl border p-3"
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1.5">
                              <span className="text-muted text-xs font-semibold">Link type</span>
                              <Select
                                value={item.type}
                                onChange={(event) =>
                                  updateLink(index, {
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
                              onChange={(label) => updateLink(index, { label })}
                            />
                          </div>
                          <Field
                            label="URL"
                            value={item.url}
                            placeholder="https://..."
                            onChange={(url) => updateLink(index, { url })}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-self-start"
                            onClick={() => removeLink(index)}
                          >
                            Remove link
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button size="sm" variant="secondary" onClick={addLink}>
                      Add link
                    </Button>
                  </EditorBlock>

                  <EditorBlock title="Target">
                    <Field
                      label="Target role"
                      value={content.jobTitle}
                      onChange={(jobTitle) => updateContent({ jobTitle })}
                    />
                    <Field
                      label="Company"
                      value={content.companyName}
                      onChange={(companyName) => updateContent({ companyName })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Hiring manager"
                        value={content.recipientName}
                        onChange={(recipientName) => updateContent({ recipientName })}
                      />
                      <Field
                        label="Recipient title"
                        value={content.recipientTitle}
                        onChange={(recipientTitle) => updateContent({ recipientTitle })}
                      />
                    </div>
                    <Field
                      label="Company location"
                      value={content.companyLocation}
                      onChange={(companyLocation) => updateContent({ companyLocation })}
                    />
                    <Field
                      label="Date"
                      value={content.date}
                      onChange={(date) => updateContent({ date })}
                    />
                  </EditorBlock>

                  <EditorBlock title="Letter">
                    <Field
                      label="Subject"
                      value={content.subject}
                      placeholder="Application for Senior Product Engineer"
                      onChange={(subject) => updateContent({ subject })}
                    />
                    <Field
                      label="Greeting"
                      value={content.greeting}
                      onChange={(greeting) => updateContent({ greeting })}
                    />
                    <TextField
                      label="Opening"
                      value={content.opening}
                      onChange={(opening) => updateContent({ opening })}
                    />
                    <TextField
                      label="Main body"
                      value={content.body}
                      className="min-h-44 font-mono text-[13px]"
                      onChange={(body) => updateContent({ body })}
                    />
                    <TextField
                      label="Proof points"
                      value={content.highlights}
                      className="min-h-32 font-mono text-[13px]"
                      onChange={(highlights) => updateContent({ highlights })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Closing"
                        value={content.closing}
                        onChange={(closing) => updateContent({ closing })}
                      />
                      <Field
                        label="Signature"
                        value={content.signature}
                        onChange={(signature) => updateContent({ signature })}
                      />
                    </div>
                    <Field
                      label="Postscript"
                      value={content.postscript}
                      onChange={(postscript) => updateContent({ postscript })}
                    />
                  </EditorBlock>
                </div>
              ) : (
                <div className="space-y-6">
                  <EditorBlock title="Template">
                    <label className="grid gap-2 text-sm font-medium">
                      <span>Template</span>
                      <Select
                        value={currentDoc.templateId}
                        onChange={(event) =>
                          updateDocument({
                            ...currentDoc,
                            templateId: event.target.value,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                      >
                        {templateCatalogByType.COVER_LETTER.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </EditorBlock>

                  <EditorBlock title="Layout">
                    <label className="grid gap-2 text-sm font-medium">
                      <span>Font style</span>
                      <Select
                        value={appearance.fontFamily}
                        onChange={(event) =>
                          updateAppearance({ fontFamily: event.target.value as FontFamilyId })
                        }
                      >
                        {fontOptions.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </Select>
                    </label>

                    <RangeField
                      label={`Page margin (${appearance.pageMargin}px)`}
                      min={24}
                      max={72}
                      value={appearance.pageMargin}
                      onChange={(pageMargin) => updateAppearance({ pageMargin })}
                    />
                    <RangeField
                      label={`Paragraph gap (${appearance.paragraphSpacing}px)`}
                      min={4}
                      max={24}
                      value={appearance.paragraphSpacing}
                      onChange={(paragraphSpacing) => updateAppearance({ paragraphSpacing })}
                    />
                    <RangeField
                      label={`Line height (${appearance.lineHeight.toFixed(2)})`}
                      min={1.25}
                      max={1.8}
                      step={0.05}
                      value={appearance.lineHeight}
                      onChange={(lineHeight) => updateAppearance({ lineHeight })}
                    />
                  </EditorBlock>

                  <EditorBlock title="Colors">
                    <ColorField
                      label="Accent color"
                      value={appearance.accentColor}
                      onChange={(accentColor) => updateAppearance({ accentColor })}
                    />
                    <ColorField
                      label="Sidebar color"
                      value={appearance.sidebarColor}
                      onChange={(sidebarColor) => updateAppearance({ sidebarColor })}
                    />
                    <ColorField
                      label="Page color"
                      value={appearance.pageColor}
                      onChange={(pageColor) => updateAppearance({ pageColor })}
                    />
                    <ColorField
                      label="Text color"
                      value={appearance.textColor}
                      onChange={(textColor) => updateAppearance({ textColor })}
                    />
                  </EditorBlock>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className={cn("space-y-3 p-3", activeTab === "preview" && "hidden md:block")}>
            <p className="text-muted px-1 text-xs font-semibold tracking-[0.2em] uppercase">
              Panels
            </p>
            <Button variant="secondary" size="sm" onClick={() => setPanelOpen(true)}>
              <PanelLeftOpen className="mr-2 h-4 w-4" />
              Open editor
            </Button>
          </Card>
        )}

        <Card
          className={cn(
            "h-full min-h-0 flex-col overflow-hidden p-0",
            activeTab === "editor" ? "hidden md:flex" : "flex",
          )}
        >
          <div className="from-background via-card to-background flex min-h-0 flex-1 flex-col bg-linear-to-br">
            <div className="border-border/80 bg-card/80 shrink-0 border-b px-4 py-3 backdrop-blur md:px-6">
              <p className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase">
                Live Preview
              </p>
              <p className="text-foreground text-sm font-medium">
                {currentDoc.title || "Cover Letter"}
              </p>
            </div>
            <div className="relative min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
              <div className="relative flex min-h-full justify-center rounded-3xl border border-dashed border-[color-mix(in_oklab,var(--border)_70%,transparent)] bg-[color-mix(in_oklab,var(--background)_92%,white)] p-3 md:p-6">
                <CoverLetterPreview content={content} templateId={currentDoc.templateId} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {shareModalOpen ? (
        <ShareDocumentModal
          documentId={null}
          document={{
            source: "document",
            id: currentDoc.id,
            type: "COVER_LETTER",
            title: currentDoc.title,
            description: content.subject || content.jobTitle || "Cover letter",
            templateId: currentDoc.templateId,
            templateName: "Cover Letter",
            templateDescription: "Cover letter",
            previewImage: "",
            updatedAt: currentDoc.updatedAt,
            sync: currentDoc.sync,
          }}
          onClose={() => setShareModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function EditorBlock({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-muted text-xs font-semibold tracking-[0.22em] uppercase">{title}</p>
      </div>
      {children}
    </section>
  );
}
