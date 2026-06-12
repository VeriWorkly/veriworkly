import { X } from "lucide-react";
import { Modal } from "@veriworkly/ui";
import { templates as templateCatalog } from "@/templates/catalog/templates";
import { usePortfolioStore } from "@/store/portfolio-store";

export interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
}

export function TemplatePicker({ open, onClose }: TemplatePickerProps) {
  const activeTemplateId = usePortfolioStore((state) => state.content.templateId);
  const updateContent = usePortfolioStore((state) => state.updateContent);

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
          {templateCatalog.map((template) => (
            <button
              key={template.id}
              className={`group overflow-hidden rounded-xl border text-left transition ${
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
              <div className="bg-paper-2 aspect-[16/10] overflow-hidden">
                <iframe
                  loading="lazy"
                  tabIndex={-1}
                  title={`${template.name} template preview`}
                  src={`/templates/${template.id}/preview`}
                  className="bg-panel pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0"
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
              </div>
            </button>
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
}
