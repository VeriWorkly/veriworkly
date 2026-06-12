import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { createId, type PortfolioSection } from "@/lib/portfolio";
import { usePortfolioStore } from "@/store/portfolio-store";
import { EditorPanel } from "./EditorPanel";
import { Field } from "./Field";
import { ItemAction } from "./ItemAction";
import { AssetUpload } from "./AssetUpload";
import { actionClass as action, inputClass as input, sectionInfo } from "./constants";
import { PortfolioAiAssist } from "./PortfolioAiAssist";

export interface SectionEditorProps {
  section: PortfolioSection;
}

export function SectionEditor({ section }: SectionEditorProps) {
  const updateSection = usePortfolioStore((state) => state.updateSection);
  const documentId = usePortfolioStore((state) => state.draft?.id);
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
        <p className="bg-paper text-muted rounded-xl p-3 text-xs leading-5">
          The contact section uses your public email and availability from Introduction.
        </p>
      ) : null}
      <div className="space-y-3">
        {section.items.map((item, index) => (
          <div
            key={String(item.id ?? index)}
            className="border-line bg-paper rounded-xl border p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-muted text-[10px] font-extrabold tracking-[.12em] uppercase">
                Item {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-1">
                <ItemAction
                  label="Move item up"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ArrowUp size={13} aria-hidden="true" />
                </ItemAction>
                <ItemAction
                  label="Move item down"
                  disabled={index === section.items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ArrowDown size={13} aria-hidden="true" />
                </ItemAction>
                <ItemAction
                  label="Delete item"
                  danger
                  onClick={() =>
                    replaceItems(section.items.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Trash2 size={13} aria-hidden="true" />
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
            <PortfolioAiAssist
              context={JSON.stringify({
                sectionType: section.type,
                sectionTitle: section.title,
                itemTitle: item.title,
                year: item.year,
              })}
              documentId={documentId}
              onApply={(summary) => updateItem(index, { summary })}
              text={String(item.summary ?? "")}
            />
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
            className={`${action} border-line bg-panel text-ink border`}
            onClick={() =>
              updateSection(section.id, {
                items: [
                  ...section.items,
                  { id: createId("item"), title: "", summary: "", year: "" },
                ],
              })
            }
            type="button"
          >
            <Plus size={14} aria-hidden="true" /> Add item
          </button>
        ) : null}
      </div>
    </EditorPanel>
  );
}

function assetUrl(value: unknown) {
  return value && typeof value === "object" && "url" in value
    ? String((value as { url?: unknown }).url ?? "")
    : undefined;
}
