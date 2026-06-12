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
} from "lucide-react";
import { portfolioSectionTypes } from "@/lib/portfolio";
import { usePortfolioStore } from "@/store/portfolio-store";
import { RailButton } from "./RailButton";
import { sectionInfo } from "./constants";

export interface StructureRailProps {
  selectedSectionId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onOpenTemplates: () => void;
}

export function StructureRail({
  selectedSectionId,
  onSelect,
  onClose,
  onOpenTemplates,
}: StructureRailProps) {
  const templateId = usePortfolioStore((state) => state.content.templateId);
  const sections = usePortfolioStore((state) => state.content.sections);
  const addSection = usePortfolioStore((state) => state.addSection);
  const updateSection = usePortfolioStore((state) => state.updateSection);
  const moveSection = usePortfolioStore((state) => state.moveSection);
  const removeSection = usePortfolioStore((state) => state.removeSection);
  const [open, setOpen] = useState(false);

  return (
    <aside className="border-line bg-panel hidden min-h-0 flex-col overflow-y-auto border-r p-2 lg:flex">
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
      <div className="flex items-center justify-between px-2 py-2">
        <h2 className="text-xs font-extrabold">Page structure</h2>
        <div className="flex">
          <button
            className="text-accent hover:bg-accent-soft grid size-7 place-items-center rounded-lg"
            onClick={() => setOpen(!open)}
            aria-label="Add section"
            type="button"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
          <button
            className="text-muted hover:bg-paper grid size-7 place-items-center rounded-lg"
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
              {section.title.trim() || `Untitled ${sectionInfo[section.type].label}`}
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
              label="Delete"
              danger
              onClick={() => removeSection(section.id)}
            >
              <Trash2 size={12} aria-hidden="true" />
            </RailButton>
          </div>
        ))}
      </div>
      {open ? (
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
    </aside>
  );
}
