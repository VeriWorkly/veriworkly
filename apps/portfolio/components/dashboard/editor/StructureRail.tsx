import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Monitor,
  PanelLeftClose,
  Plus,
  Trash2,
  FileText,
  FilePlus,
} from "lucide-react";
import { portfolioSectionTypes } from "@/lib/portfolio";
import Link from "next/link";
import { hasPortfolioAccess, upgradeHref } from "@/lib/portfolio-status";
import { usePortfolioStore } from "@/store/portfolio-store";
import { PORTFOLIO_LIMITS } from "@/lib/portfolio-limits";
import { RailButton } from "./RailButton";
import { ConfirmDelete, type DeleteRequest } from "./ConfirmDelete";
import { sectionInfo } from "./constants";

export interface StructureRailProps {
  /** Display classes from the editor layout (a tab below `lg`). */
  visibility: string;
  selectedSectionId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onOpenTemplates: () => void;
}

const PREDEFINED_PAGES = [
  { slug: "work", title: "Work" },
  { slug: "writing", title: "Writing" },
  { slug: "about", title: "About" },
  { slug: "contact", title: "Contact" },
];

export function StructureRail({
  visibility,
  selectedSectionId,
  onSelect,
  onClose,
  onOpenTemplates,
}: StructureRailProps) {
  const templateId = usePortfolioStore((state) => state.content.templateId);
  // The fallback stays outside the selector: a new [] per call makes the store loop forever.
  const pages = usePortfolioStore((state) => state.content.pages) ?? [];
  const selectedPageId = usePortfolioStore((state) => state.selectedPageId);
  const setSelectedPageId = usePortfolioStore((state) => state.setSelectedPageId);
  const addPage = usePortfolioStore((state) => state.addPage);
  const removePage = usePortfolioStore((state) => state.removePage);
  const isPremiumUser = usePortfolioStore((state) => hasPortfolioAccess(state.billing));

  const rootSections = usePortfolioStore((state) => state.content.sections);
  const sections = selectedPageId
    ? pages.find((p) => p.id === selectedPageId)?.sections || []
    : rootSections;

  const addSection = usePortfolioStore((state) => state.addSection);
  const updateSection = usePortfolioStore((state) => state.updateSection);
  const moveSection = usePortfolioStore((state) => state.moveSection);
  const removeSection = usePortfolioStore((state) => state.removeSection);
  const [open, setOpen] = useState(false);
  const [openPages, setOpenPages] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeleteRequest>(null);
  const sectionsFull = sections.length >= PORTFOLIO_LIMITS.sections;
  const pagesFull = pages.length >= PORTFOLIO_LIMITS.pages;

  const projectsSection = rootSections.find((s) => s.type === "projects");
  const projectItems = projectsSection?.items || [];
  const projectDetailPages = projectItems.map((item, index) => {
    const title = (item.title as string) || `Project ${index + 1}`;
    const slug = `work/${
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || index
    }`;
    return { slug, title: `Detail: ${title}` };
  });

  const availablePages = [...PREDEFINED_PAGES, ...projectDetailPages];

  return (
    <aside
      id="editor-panel-structure"
      role="tabpanel"
      aria-labelledby="editor-tab-structure"
      className={`border-line bg-panel ${visibility} min-h-0 flex-col overflow-y-auto border-r p-2`}
    >
      <button
        className="group bg-accent mb-2 grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg p-2 text-left text-white transition hover:-translate-y-0.5"
        onClick={onOpenTemplates}
        type="button"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-[var(--color-panel-18)]">
          <Monitor size={15} aria-hidden="true" />
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

      {isPremiumUser && (
        <div className="border-line relative mb-2 border-b px-2 pb-2">
          <div className="flex items-center justify-between py-2">
            <h2 className="text-xs font-extrabold">Pages</h2>
            <button
              className="text-accent hover:bg-accent-soft grid size-7 place-items-center rounded-lg disabled:opacity-40"
              onClick={() => setOpenPages(!openPages)}
              aria-label="Add page"
              disabled={pagesFull}
              type="button"
            >
              <FilePlus size={15} aria-hidden="true" />
            </button>
          </div>
          {pagesFull ? (
            <p className="text-muted mb-2 text-[11px]">
              A site can have up to {PORTFOLIO_LIMITS.pages} pages. Delete one to add another.
            </p>
          ) : null}
          {openPages && !pagesFull && (
            <div className="border-line mb-3 border-t p-2">
              <p className="text-muted mb-2 text-[10px] font-extrabold tracking-[.12em] uppercase">
                Add predefined page
              </p>
              <div className="grid gap-1">
                {availablePages.map((pageOption) => {
                  const isAdded = pages.some((p) => p.slug === pageOption.slug);
                  return (
                    <button
                      key={pageOption.slug}
                      className={`rounded-lg px-2 py-2 text-left text-xs font-bold ${
                        isAdded ? "cursor-not-allowed opacity-50" : "hover:bg-paper cursor-pointer"
                      }`}
                      onClick={() => {
                        if (isAdded) return;
                        addPage(pageOption.slug, pageOption.title);
                        setOpenPages(false);
                      }}
                      disabled={isAdded}
                      type="button"
                    >
                      {pageOption.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <button
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold ${
                selectedPageId === null ? "bg-accent text-accent-ink" : "hover:bg-paper"
              }`}
              aria-current={selectedPageId === null ? "page" : undefined}
              onClick={() => setSelectedPageId(null)}
              type="button"
            >
              <FileText
                size={14}
                aria-hidden="true"
                className={selectedPageId === null ? "text-accent-ink/65" : "text-muted"}
              />
              <span className="min-w-0 flex-1 truncate">Home</span>
            </button>
            {pages.map((page) => (
              <div
                key={page.id}
                className={`group flex items-center gap-2 rounded-lg px-2 py-2 ${
                  selectedPageId === page.id ? "bg-accent text-accent-ink" : "hover:bg-paper"
                }`}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-bold"
                  aria-current={selectedPageId === page.id ? "page" : undefined}
                  onClick={() => setSelectedPageId(page.id)}
                  type="button"
                >
                  <FileText
                    size={14}
                    aria-hidden="true"
                    className={selectedPageId === page.id ? "text-accent-ink/65" : "text-muted"}
                  />
                  <span className="truncate">{page.title}</span>
                </button>
                {selectedPageId === page.id && (
                  <RailButton
                    selected={true}
                    label="Delete page"
                    danger
                    onClick={() =>
                      setPendingDelete({
                        title: `Delete the ${page.title} page?`,
                        detail: "The page and every section on it will be removed from your draft.",
                        run: () => removePage(page.id),
                      })
                    }
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </RailButton>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {!isPremiumUser ? (
        <p className="border-line text-muted mb-2 border-b px-2 pt-1 pb-3 text-[11px] leading-5">
          Extra pages come with Creator Pro, the Job Hunter Bundle or a pass.{" "}
          <Link className="text-accent font-bold" href={upgradeHref("pages")}>
            See plans
          </Link>
        </p>
      ) : null}

      <div className="flex items-center justify-between px-2 py-2">
        <h2 className="text-xs font-extrabold">Page structure</h2>
        <div className="flex">
          <button
            className="text-accent hover:bg-accent-soft grid size-7 place-items-center rounded-lg disabled:opacity-40"
            onClick={() => setOpen(!open)}
            aria-label="Add section"
            disabled={sectionsFull}
            type="button"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
          <button
            className="text-muted hover:bg-paper hidden size-7 place-items-center rounded-lg lg:grid"
            onClick={onClose}
            aria-label="Close page structure"
            type="button"
          >
            <PanelLeftClose size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <button
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold ${
            selectedSectionId === "profile" ? "bg-accent text-accent-ink" : "hover:bg-paper"
          }`}
          onClick={() => onSelect("profile")}
          type="button"
        >
          <span className="w-5 text-[10px] opacity-60" aria-hidden="true">
            00
          </span>
          <span>Introduction</span>
        </button>
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`group flex items-center gap-1 rounded-lg px-2 py-2 ${
              selectedSectionId === section.id ? "bg-accent text-accent-ink" : "hover:bg-paper"
            }`}
          >
            <span
              className={`w-5 text-[10px] font-bold tabular-nums ${
                selectedSectionId === section.id ? "text-accent-ink/65" : "text-muted"
              }`}
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <button
              className="min-w-0 flex-1 truncate text-left text-xs font-bold"
              onClick={() => onSelect(section.id)}
              type="button"
            >
              {section.title.trim() || `${sectionInfo[section.type].label} (needs a title)`}
            </button>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Move up"
              onClick={() => moveSection(index, -1)}
            >
              <ArrowUp size={12} aria-hidden="true" />
            </RailButton>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Move down"
              onClick={() => moveSection(index, 1)}
            >
              <ArrowDown size={12} aria-hidden="true" />
            </RailButton>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Toggle visibility"
              onClick={() => updateSection(section.id, { visible: !section.visible })}
            >
              {section.visible ? (
                <Eye size={12} aria-hidden="true" />
              ) : (
                <EyeOff size={12} aria-hidden="true" />
              )}
            </RailButton>
            <RailButton
              selected={selectedSectionId === section.id}
              label="Delete section"
              danger
              onClick={() =>
                setPendingDelete({
                  title: `Delete ${section.title.trim() || sectionInfo[section.type].label}?`,
                  detail: `The section and its ${section.items.length} ${
                    section.items.length === 1 ? "item" : "items"
                  } will be removed from your draft.`,
                  run: () => removeSection(section.id),
                })
              }
            >
              <Trash2 size={12} aria-hidden="true" />
            </RailButton>
          </div>
        ))}
      </div>
      {sectionsFull ? (
        <p className="text-muted px-2 pt-2 text-[11px]">
          A page can have up to {PORTFOLIO_LIMITS.sections} sections. Delete one to add another.
        </p>
      ) : null}
      {open && !sectionsFull ? (
        <div className="border-line mt-3 border-t p-2">
          <p className="text-muted mb-2 text-[10px] font-extrabold tracking-[.12em] uppercase">
            Add section
          </p>
          <div className="grid gap-1">
            {portfolioSectionTypes.map((type) => (
              <button
                key={type}
                className="hover:bg-paper rounded-lg px-2 py-2 text-left"
                onClick={() => {
                  addSection(type);
                  setOpen(false);
                }}
                type="button"
              >
                <span className="block text-xs font-extrabold">{sectionInfo[type].label}</span>
                <span className="text-muted mt-0.5 block text-[10px]">
                  {sectionInfo[type].detail}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ConfirmDelete request={pendingDelete} onClose={() => setPendingDelete(null)} />
    </aside>
  );
}
