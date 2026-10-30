import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Modal } from "@veriworkly/ui";
import { templates as templateCatalog } from "@/templates/catalog/templates";
import { usePortfolioStore } from "@/store/portfolio-store";
import { hasPortfolioAccess, upgradeHref } from "@/lib/portfolio-status";

export interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
}

export function TemplatePicker({ open, onClose }: TemplatePickerProps) {
  const activeTemplateId = usePortfolioStore((state) => state.content.templateId);
  const updateContent = usePortfolioStore((state) => state.updateContent);
  const isPremiumUser = usePortfolioStore((state) => hasPortfolioAccess(state.billing));

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content
        titleId="template-picker-title"
        descriptionId="template-picker-description"
        className="workspace-theme bg-panel flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden rounded-xl p-0"
      >
        <header className="border-line flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 id="template-picker-title" className="text-base font-extrabold">
              Choose a template
            </h2>
            <p id="template-picker-description" className="text-muted mt-1 text-xs">
              Preview the complete layout before applying it.
            </p>
          </div>
          <button
            className="text-muted hover:bg-paper grid size-9 place-items-center rounded-lg"
            onClick={onClose}
            aria-label="Close template picker"
            type="button"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-2">
          {templateCatalog.map((template) => {
            const isDisabled = template.isPremium && !isPremiumUser;
            const card = (
              <>
                {template.isPremium && (
                  <div className="bg-accent absolute top-3 right-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
                    PRO
                  </div>
                )}
                <div className="bg-paper-2 relative aspect-[16/10] overflow-hidden">
                  <Image
                    fill
                    src={template.image}
                    alt={`${template.name} template preview`}
                    sizes="(max-width: 768px) 90vw, 45vw"
                    className={`object-cover ${isDisabled ? "opacity-50 grayscale" : ""}`}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{template.name}</strong>
                    <span className="text-muted text-[10px] font-extrabold tracking-widest uppercase">
                      {template.mood}
                    </span>
                  </div>
                  <p className="text-muted mt-2 text-xs leading-5">{template.note}</p>
                  {isDisabled ? (
                    <p className="text-accent mt-2 text-xs font-bold">
                      Creator Pro, the Job Hunter Bundle or a pass unlocks {template.name}. See
                      plans
                    </p>
                  ) : null}
                </div>
              </>
            );
            // A locked template leads to the plans that unlock it instead of doing nothing.
            if (isDisabled) {
              return (
                <Link
                  key={template.id}
                  href={upgradeHref(template.id)}
                  className={`group relative overflow-hidden rounded-xl border text-left transition ${
                    activeTemplateId === template.id
                      ? "border-accent ring-accent-soft ring-2"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  {card}
                </Link>
              );
            }
            return (
              <button
                key={template.id}
                className={`group relative overflow-hidden rounded-xl border text-left transition ${
                  activeTemplateId === template.id
                    ? "border-accent ring-accent-soft ring-2"
                    : "border-line hover:border-line-strong"
                }`}
                onClick={() => {
                  updateContent({ templateId: template.id });
                  onClose();
                }}
                type="button"
              >
                {card}
              </button>
            );
          })}
        </div>
      </Modal.Content>
    </Modal>
  );
}
