"use client";

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Modal } from "@veriworkly/ui";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Laptop,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createId,
  portfolioSectionTypes,
  type PortfolioSection,
  type PortfolioSectionType,
} from "@/lib/portfolio";
import { portfolioPublicUrl } from "@/config/site";
import { templates as templateCatalog } from "@/templates/catalog/templates";
import { usePortfolioStore, type PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

const sectionInfo: Record<PortfolioSectionType, { label: string; detail: string }> = {
  projects: { label: "Projects", detail: "Case studies and shipped work" },
  experience: { label: "Experience", detail: "Roles, teams, and outcomes" },
  services: { label: "Services", detail: "Ways people can work with you" },
  skills: { label: "Skills", detail: "Capabilities and tools" },
  education: { label: "Education", detail: "Degrees and training" },
  writing: { label: "Writing", detail: "Articles and talks" },
  testimonials: { label: "Testimonials", detail: "Words from collaborators" },
  awards: { label: "Awards", detail: "Recognition and milestones" },
  contact: { label: "Contact", detail: "Your closing invitation" },
};

const input =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2.5 text-sm outline-none transition hover:border-[var(--color-line-strong)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]";
const action =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 text-xs font-extrabold whitespace-nowrap transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-45";

export function PortfolioEditorWorkspace({
  initialData,
}: {
  initialData: PortfolioWorkspaceBootstrap;
}) {
  const hydrate = usePortfolioStore((state) => state.hydrateWorkspace);
  const load = usePortfolioStore((state) => state.loadWorkspace);
  const save = usePortfolioStore((state) => state.saveDraft);
  const ready = usePortfolioStore((state) => state.ready);
  const sections = usePortfolioStore((state) => state.content.sections);
  const { resolvedTheme } = useTheme();
  const [selectedSectionId, setSelectedSectionId] = useState("profile");
  const [structureOpen, setStructureOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const validSelectedSectionId =
    selectedSectionId === "profile" || sections.some((section) => section.id === selectedSectionId)
      ? selectedSectionId
      : "profile";

  useEffect(() => {
    if (initialData.workspace) hydrate(initialData);
    else void load();
  }, [hydrate, initialData, load]);
  useEffect(() => {
    if (!ready || usePortfolioStore.getState().draft) return;
    void save();
  }, [ready, save]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (usePortfolioStore.getState().isDirty) void save();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [save]);
  return (
    <main
      className={`workspace-theme ${resolvedTheme === "dark" ? "dark" : ""} flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--color-paper-2)] text-[var(--color-ink)]`}
    >
      <EditorCommandBar />
      <div
        className={`grid min-h-0 flex-1 ${
          structureOpen && contentOpen
            ? "lg:grid-cols-[15rem_minmax(23rem,31rem)_minmax(0,1fr)]"
            : structureOpen
              ? "lg:grid-cols-[15rem_minmax(0,1fr)]"
              : contentOpen
                ? "lg:grid-cols-[minmax(23rem,31rem)_minmax(0,1fr)]"
                : "lg:grid-cols-1"
        }`}
      >
        {structureOpen ? (
          <StructureRail
            selectedSectionId={validSelectedSectionId}
            onSelect={setSelectedSectionId}
            onClose={() => setStructureOpen(false)}
            onOpenTemplates={() => setTemplatePickerOpen(true)}
          />
        ) : null}
        {contentOpen ? (
          <ContentCanvas
            selectedSectionId={validSelectedSectionId}
            onClose={() => setContentOpen(false)}
          />
        ) : null}
        <PreviewStage
          structureOpen={structureOpen}
          contentOpen={contentOpen}
          onOpenStructure={() => setStructureOpen(true)}
          onOpenContent={() => setContentOpen(true)}
          onFocusDesktop={() => {
            setStructureOpen(false);
            setContentOpen(false);
          }}
          onOpenEditingPanels={() => {
            setStructureOpen(true);
            setContentOpen(true);
          }}
        />
      </div>
      <TemplatePicker open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} />
      <WorkspaceNotice />
    </main>
  );
}

function EditorCommandBar() {
  const { slug, status, billing, publication, draft, saveDraft, publish } = usePortfolioStore();
  return (
    <header className="z-40 grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-[#171717] px-3 text-white sm:px-4">
      <Link className="flex items-center gap-2" href="/dashboard">
        <Image src="/veriworkly-logo.png" width={30} height={30} alt="" priority />
        <span className="hidden text-sm font-black sm:block">VeriWorkly</span>
      </Link>
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-extrabold">Portfolio editor</p>
        <a
          className="mx-auto mt-0.5 flex w-fit max-w-full items-center gap-1 text-[11px] font-bold text-white/45"
          href={portfolioPublicUrl(slug)}
          target="_blank"
          rel="noreferrer"
        >
          <span className="truncate">{slug}.veriworkly.com</span>
          <ExternalLink size={10} />
        </a>
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <span className="hidden text-xs font-bold text-white/45 lg:block">{status}</span>
        {draft ? (
          <Link
            className={`${action} border border-white/15 bg-white/8`}
            href={`/preview/${draft.id}`}
            target="_blank"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Preview</span>
          </Link>
        ) : null}
        <button
          className={`${action} border border-white/15 bg-white/8`}
          onClick={() => void saveDraft()}
        >
          <Save size={14} /> Save
        </button>
        <button
          className={`${action} bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-strong)]`}
          disabled={!billing.canPublish}
          onClick={() => void publish()}
        >
          <Globe2 size={14} /> {publication?.status === "LIVE" ? "Update live" : "Publish"}
        </button>
      </div>
    </header>
  );
}

function StructureRail({
  selectedSectionId,
  onSelect,
  onClose,
  onOpenTemplates,
}: {
  selectedSectionId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onOpenTemplates: () => void;
}) {
  const templateId = usePortfolioStore((state) => state.content.templateId);
  const sections = usePortfolioStore((state) => state.content.sections);
  const addSection = usePortfolioStore((state) => state.addSection);
  const updateSection = usePortfolioStore((state) => state.updateSection);
  const moveSection = usePortfolioStore((state) => state.moveSection);
  const removeSection = usePortfolioStore((state) => state.removeSection);
  const [open, setOpen] = useState(false);
  return (
    <aside className="hidden min-h-0 flex-col overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-panel)] p-2 lg:flex">
      <button
        className="group mb-2 grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] p-2 text-left text-white transition hover:-translate-y-0.5"
        onClick={onOpenTemplates}
      >
        <span className="grid size-9 place-items-center rounded-lg bg-[var(--color-panel-18)]">
          <Monitor size={15} />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-extrabold tracking-[.12em] text-white/60 uppercase">
            Active template
          </span>
          <span className="mt-0.5 block truncate text-xs font-extrabold capitalize">
            {templateId}
          </span>
        </span>
        <span className="text-[10px] font-extrabold text-white/70">Change</span>
      </button>
      <div className="flex items-center justify-between px-2 py-2">
        <h2 className="text-xs font-extrabold">Page structure</h2>
        <div className="flex">
          <button
            className="grid size-7 place-items-center rounded-lg text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
            onClick={() => setOpen(!open)}
            aria-label="Add section"
          >
            <Plus size={15} />
          </button>
          <button
            className="grid size-7 place-items-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper)]"
            onClick={onClose}
            aria-label="Close page structure"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <button
          className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left text-xs font-bold ${selectedSectionId === "profile" ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "hover:bg-[var(--color-paper)]"}`}
          onClick={() => onSelect("profile")}
        >
          <span className="w-5 text-[10px] opacity-60">00</span>
          <span>Introduction</span>
        </button>
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`group flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-2 ${selectedSectionId === section.id ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "hover:bg-[var(--color-paper)]"}`}
          >
            <span
              className={`w-5 text-[10px] font-bold tabular-nums ${selectedSectionId === section.id ? "text-[var(--color-accent-ink)]/65" : "text-[var(--color-muted)]"}`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <button
              className="min-w-0 flex-1 truncate text-left text-xs font-bold"
              onClick={() => onSelect(section.id)}
            >
              {section.title.trim() || `Untitled ${sectionInfo[section.type].label}`}
            </button>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Move up"
              onClick={() => moveSection(index, -1)}
            >
              <ArrowUp size={12} />
            </RailButton>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Move down"
              onClick={() => moveSection(index, 1)}
            >
              <ArrowDown size={12} />
            </RailButton>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Toggle visibility"
              onClick={() => updateSection(section.id, { visible: !section.visible })}
            >
              {section.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </RailButton>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Delete"
              danger
              onClick={() => removeSection(section.id)}
            >
              <Trash2 size={12} />
            </RailButton>
          </div>
        ))}
      </div>
      {open ? (
        <div className="mt-3 border-t border-[var(--color-line)] p-2">
          <p className="mb-2 text-[10px] font-extrabold tracking-[.12em] text-[var(--color-muted)] uppercase">
            Add section
          </p>
          <div className="grid gap-1">
            {portfolioSectionTypes.map((type) => (
              <button
                key={type}
                className="rounded-lg px-2 py-2 text-left hover:bg-[var(--color-paper)]"
                onClick={() => {
                  addSection(type);
                  setOpen(false);
                }}
              >
                <span className="block text-xs font-extrabold">{sectionInfo[type].label}</span>
                <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">
                  {sectionInfo[type].detail}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function RailButton({
  label,
  danger,
  selected,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`grid size-6 place-items-center rounded-md transition hover:opacity-100 ${
        selected
          ? danger
            ? "bg-white/10 text-red-300"
            : "text-white/70 hover:bg-white/10 hover:text-white"
          : danger
            ? "text-[var(--color-danger)] opacity-65"
            : "text-[var(--color-muted)] opacity-60"
      }`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ContentCanvas({
  selectedSectionId,
  onClose,
}: {
  selectedSectionId: string;
  onClose: () => void;
}) {
  const content = usePortfolioStore((state) => state.content);
  const updateIdentity = usePortfolioStore((state) => state.updateIdentity);
  const selectedSection = content.sections.find((section) => section.id === selectedSectionId);

  return (
    <section className="hidden min-h-0 overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-paper)] p-3 lg:block">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-extrabold">
            {selectedSectionId === "profile" ? "Introduction" : selectedSection?.title || "Section"}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
            Edit only the selected area.
          </p>
        </div>
        <button
          className="grid size-8 place-items-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
          onClick={onClose}
          aria-label="Close content editor"
        >
          <PanelRightClose size={15} />
        </button>
      </div>

      {selectedSectionId === "profile" ? (
        <EditorPanel title="Introduction" detail="Write the first screen people should remember.">
          <Field label="Name">
            <input
              className={input}
              value={content.identity.name}
              onChange={(e) => updateIdentity({ name: e.target.value })}
            />
          </Field>
          <Field label="Professional headline">
            <textarea
              className={input}
              rows={2}
              value={content.identity.headline}
              onChange={(e) => updateIdentity({ headline: e.target.value })}
            />
          </Field>
          <Field label="Short introduction">
            <textarea
              className={input}
              rows={5}
              value={content.identity.bio}
              onChange={(e) => updateIdentity({ bio: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Location">
              <input
                className={input}
                value={content.identity.location}
                onChange={(e) => updateIdentity({ location: e.target.value })}
              />
            </Field>
            <Field label="Availability">
              <input
                className={input}
                value={content.identity.availability}
                onChange={(e) => updateIdentity({ availability: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Public email">
            <input
              className={input}
              type="email"
              value={content.identity.email}
              onChange={(e) => updateIdentity({ email: e.target.value })}
            />
          </Field>
          <AssetUpload
            kind="AVATAR"
            label="Profile image"
            value={content.identity.avatar?.url}
            onUploaded={(avatar) => updateIdentity({ avatar })}
          />
        </EditorPanel>
      ) : selectedSection ? (
        <SectionEditor section={selectedSection} />
      ) : (
        <EditorPanel
          title="Select a section"
          detail="Choose a page section from the structure panel."
        >
          <p className="text-xs text-[var(--color-muted)]">Nothing is selected.</p>
        </EditorPanel>
      )}
    </section>
  );
}

function SectionEditor({ section }: { section: PortfolioSection }) {
  const updateSection = usePortfolioStore((state) => state.updateSection);
  const replaceItems = (items: Array<Record<string, unknown>>) =>
    updateSection(section.id, { items });
  const updateItem = (index: number, patch: Record<string, unknown>) =>
    replaceItems(section.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= section.items.length) return;
    const items = [...section.items];
    [items[index], items[target]] = [items[target], items[index]];
    replaceItems(items);
  };
  return (
    <EditorPanel
      title={section.title.trim() || `Untitled ${sectionInfo[section.type].label}`}
      detail={`${section.items.length} ${section.items.length === 1 ? "item" : "items"} · ${sectionInfo[section.type].detail}`}
    >
      <Field label="Section title">
        <input
          className={input}
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
        />
      </Field>
      {section.type === "contact" ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-paper)] p-3 text-xs leading-5 text-[var(--color-muted)]">
          The contact section uses your public email and availability from Introduction.
        </p>
      ) : null}
      <div className="space-y-3">
        {section.items.map((item, index) => (
          <div
            key={String(item.id ?? index)}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper)] p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[10px] font-extrabold tracking-[.12em] text-[var(--color-muted)] uppercase">
                Item {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-1">
                <ItemAction
                  label="Move item up"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ArrowUp size={13} />
                </ItemAction>
                <ItemAction
                  label="Move item down"
                  disabled={index === section.items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ArrowDown size={13} />
                </ItemAction>
                <ItemAction
                  label="Delete item"
                  danger
                  onClick={() =>
                    replaceItems(section.items.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Trash2 size={13} />
                </ItemAction>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
              <Field label="Title">
                <input
                  className={input}
                  value={String(item.title ?? "")}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                />
              </Field>
              <Field label="Year">
                <input
                  className={input}
                  value={String(item.year ?? "")}
                  onChange={(e) => updateItem(index, { year: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Summary">
              <textarea
                className={input}
                rows={3}
                value={String(item.summary ?? "")}
                onChange={(e) => updateItem(index, { summary: e.target.value })}
              />
            </Field>
            {section.type === "projects" ? (
              <AssetUpload
                kind="PROJECT_COVER"
                label="Project cover"
                value={assetUrl(item.coverImage)}
                onUploaded={(coverImage) => updateItem(index, { coverImage })}
              />
            ) : null}
          </div>
        ))}
        {section.type !== "contact" ? (
          <button
            className={`${action} border border-[var(--color-line)] bg-[var(--color-panel)]`}
            onClick={() =>
              updateSection(section.id, {
                items: [
                  ...section.items,
                  { id: createId("item"), title: "", summary: "", year: "" },
                ],
              })
            }
          >
            <Plus size={14} /> Add item
          </button>
        ) : null}
      </div>
    </EditorPanel>
  );
}

function ItemAction({
  label,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`grid size-7 place-items-center rounded-md border transition hover:-translate-y-0.5 ${
        danger
          ? "border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
          : "border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      }`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PreviewStage({
  structureOpen,
  contentOpen,
  onOpenStructure,
  onOpenContent,
  onFocusDesktop,
  onOpenEditingPanels,
}: {
  structureOpen: boolean;
  contentOpen: boolean;
  onOpenStructure: () => void;
  onOpenContent: () => void;
  onFocusDesktop: () => void;
  onOpenEditingPanels: () => void;
}) {
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const content = usePortfolioStore((state) => state.content);
  const draft = usePortfolioStore((state) => state.draft);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const width = { mobile: 390, tablet: 768, desktop: "100%" }[viewport];

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "veriworkly:portfolio-preview", content },
      window.location.origin,
    );
  }, [content]);

  function setPreviewViewport(next: "mobile" | "tablet" | "desktop") {
    setViewport(next);
    if (next === "desktop") onFocusDesktop();
    else onOpenEditingPanels();
  }

  return (
    <aside className="min-h-0 overflow-hidden bg-[var(--color-panel)]">
      <div className="flex h-11 items-center justify-between border-b border-[var(--color-line)] px-3">
        <div className="flex items-center gap-1">
          {!structureOpen ? (
            <button
              className="grid size-7 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-paper)]"
              onClick={onOpenStructure}
              aria-label="Open page structure"
            >
              <PanelLeftOpen size={14} />
            </button>
          ) : null}
          {!contentOpen ? (
            <button
              className="grid size-7 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-paper)]"
              onClick={onOpenContent}
              aria-label="Open content editor"
            >
              <PanelRightOpen size={14} />
            </button>
          ) : null}
          <span className="ml-1 text-xs font-extrabold">Live preview</span>
        </div>
        <div className="flex rounded-lg bg-[var(--color-paper)] p-1">
          {(
            [
              ["mobile", Smartphone],
              ["tablet", Laptop],
              ["desktop", Monitor],
            ] as const
          ).map(([id, Icon]) => (
            <button
              key={id}
              className={`grid size-7 place-items-center rounded-md ${viewport === id ? "bg-[var(--color-panel)] text-[var(--color-accent)] shadow-sm" : "text-[var(--color-muted)]"}`}
              onClick={() => setPreviewViewport(id)}
              aria-label={`${id} preview`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex h-[calc(100%-2.75rem)] justify-center overflow-auto bg-[var(--color-paper-2)] p-3">
        {draft ? (
          <iframe
            ref={frameRef}
            title="Live portfolio preview"
            src={`/preview/${draft.id}`}
            onLoad={() =>
              frameRef.current?.contentWindow?.postMessage(
                { type: "veriworkly:portfolio-preview", content },
                window.location.origin,
              )
            }
            style={{ width }}
            className="h-full min-h-[640px] shrink-0 border-0 bg-white shadow-[0_6px_18px_var(--color-shadow)] transition-[width] duration-300"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-center text-xs font-bold text-[var(--color-muted)]">
            Saving the first draft to start live preview...
          </div>
        )}
      </div>
    </aside>
  );
}

function TemplatePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeTemplateId = usePortfolioStore((state) => state.content.templateId);
  const updateContent = usePortfolioStore((state) => state.updateContent);

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content
        titleId="template-picker-title"
        descriptionId="template-picker-description"
        className="workspace-theme flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-panel)] p-0"
      >
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
          <div>
            <h2 id="template-picker-title" className="text-base font-extrabold">
              Choose a template
            </h2>
            <p id="template-picker-description" className="mt-1 text-xs text-[var(--color-muted)]">
              Preview the complete layout before applying it.
            </p>
          </div>
          <button
            className="grid size-9 place-items-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper)]"
            onClick={onClose}
            aria-label="Close template picker"
          >
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-2">
          {templateCatalog.map((template) => (
            <button
              key={template.id}
              className={`group overflow-hidden rounded-[var(--radius-md)] border text-left transition ${activeTemplateId === template.id ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent-soft)]" : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"}`}
              onClick={() => {
                updateContent({ templateId: template.id });
                onClose();
              }}
            >
              <div className="aspect-[16/10] overflow-hidden bg-[var(--color-paper-2)]">
                <iframe
                  loading="lazy"
                  tabIndex={-1}
                  title={`${template.name} template preview`}
                  src={`/templates/${template.id}/preview`}
                  className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{template.name}</strong>
                  <span className="text-[10px] font-extrabold tracking-[.1em] text-[var(--color-muted)] uppercase">
                    {template.mood}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">{template.note}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
}

function EditorPanel({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
      <h2 className="text-sm font-extrabold">{title}</h2>
      <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">{detail}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-[var(--color-ink-soft)]">
      {label}
      {children}
    </label>
  );
}
function AssetUpload({
  kind,
  label,
  value,
  onUploaded,
}: {
  kind: "AVATAR" | "PROJECT_COVER";
  label: string;
  value?: string;
  onUploaded: (asset: { id: string; url: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const { authenticatedFetch } = await import("@/lib/authenticated-fetch");
      const prepared = await authenticatedFetch("/portfolio-assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, mimeType: file.type, sizeBytes: file.size }),
      }).then((r) => r.json());
      const put = await fetch(prepared.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Image upload failed.");
      const complete = await authenticatedFetch("/portfolio-assets/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: prepared.data.assetId }),
      }).then((r) => r.json());
      onUploaded(complete.data);
    } finally {
      setLoading(false);
    }
  };
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line)] p-3 text-xs font-bold text-[var(--color-muted)] hover:border-[var(--color-accent)]">
      {value ? (
        <Image
          unoptimized
          src={value}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-lg object-cover"
        />
      ) : (
        <Upload size={16} />
      )}
      <span>
        {loading
          ? "Uploading..."
          : value
            ? `Replace ${label.toLowerCase()}`
            : `Upload ${label.toLowerCase()}`}
      </span>
      <input
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={loading}
        onChange={(e) => void upload(e.target.files?.[0])}
      />
    </label>
  );
}
function assetUrl(value: unknown) {
  return value && typeof value === "object" && "url" in value
    ? String((value as { url?: unknown }).url ?? "")
    : undefined;
}
function WorkspaceNotice() {
  const message = usePortfolioStore((state) => state.message);
  return message ? (
    <p
      className="fixed right-4 bottom-4 z-50 max-w-sm rounded-[var(--radius-sm)] bg-[#171717] px-4 py-3 text-xs font-bold text-white shadow-xl"
      role="status"
    >
      {message}
    </p>
  ) : null;
}
