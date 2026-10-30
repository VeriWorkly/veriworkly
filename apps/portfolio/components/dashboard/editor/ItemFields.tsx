import { useState, type ReactNode } from "react";
import type { SectionField } from "@/lib/section-fields";
import { Field } from "./Field";
import { inputClass as input } from "./constants";
import { withScheme } from "@/lib/portfolio-limits";

/**
 * Renders one item's inputs from the section's field schema.
 *
 * List-shaped fields (`list`, `lines`) are edited as plain text and split on
 * save — comma-separated for tag-like values (skills, keywords) and
 * newline-separated for sentence-like values (highlights, service details),
 * because those read badly when comma-joined. The value is stored as a real
 * array so templates get the type they expect, but the *editing* experience
 * stays a single textbox rather than an add/remove/reorder widget.
 */
export interface ItemFieldsProps {
  fields: SectionField[];
  item: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

function joinList(value: unknown, separator: string): string {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string").join(separator);
  }
  return typeof value === "string" ? value : "";
}

function splitList(raw: string, type: "list" | "lines"): string[] {
  return raw
    .split(type === "lines" ? /\r?\n/ : ",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ItemFields({ fields, item, onChange }: ItemFieldsProps) {
  const rendered: ReactNode[] = [];

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const next = fields[i + 1];

    // Two consecutive `half` fields share a row.
    if (field.half && next?.half) {
      rendered.push(
        <div key={field.key} className="grid gap-3 sm:grid-cols-2">
          <Control field={field} item={item} onChange={onChange} />
          <Control field={next} item={item} onChange={onChange} />
        </div>,
      );
      i++;
      continue;
    }

    rendered.push(<Control key={field.key} field={field} item={item} onChange={onChange} />);
  }

  return <>{rendered}</>;
}

function Control({
  field,
  item,
  onChange,
}: {
  field: SectionField;
  item: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-2 py-1 text-xs font-bold text-[var(--color-ink-soft)] select-none">
        <input
          type="checkbox"
          className="border-line bg-paper text-accent focus:ring-accent rounded"
          checked={item[field.key] === true}
          onChange={(e) => onChange({ [field.key]: e.target.checked })}
        />
        {field.label}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <Field label={field.label} help={field.help}>
        <textarea
          className={input}
          rows={3}
          placeholder={field.placeholder}
          value={typeof item[field.key] === "string" ? (item[field.key] as string) : ""}
          onChange={(e) => onChange({ [field.key]: e.target.value })}
        />
      </Field>
    );
  }

  if (field.type === "list" || field.type === "lines") {
    return <ListControl field={field} item={item} onChange={onChange} />;
  }

  const isLink = field.key === "link";
  return (
    <Field label={field.label} help={field.help}>
      <input
        className={input}
        type={isLink ? "url" : undefined}
        placeholder={field.placeholder}
        value={typeof item[field.key] === "string" ? (item[field.key] as string) : ""}
        onChange={(e) => onChange({ [field.key]: e.target.value })}
        // "github.com/me" is meant as a web address; give it its https:// instead of losing it.
        onBlur={
          isLink
            ? (e) => {
                const fixed = withScheme(e.target.value);
                if (fixed !== e.target.value) onChange({ [field.key]: fixed });
              }
            : undefined
        }
      />
    </Field>
  );
}

/**
 * List/lines fields keep the raw text in local state while focused.
 *
 * Splitting on every keystroke and re-joining for display would eat the
 * separator as it's typed: entering "TypeScript, " parses to ["TypeScript"],
 * which re-joins to "TypeScript" and deletes the comma and space the user just
 * pressed. Holding the raw string locally and syncing the parsed array outward
 * keeps typing natural while the stored value stays a real array.
 */
function ListControl({
  field,
  item,
  onChange,
}: {
  field: SectionField;
  item: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const type = field.type as "list" | "lines";
  const separator = type === "lines" ? "\n" : ", ";
  const stored = joinList(item[field.key], separator);
  const [raw, setRaw] = useState(stored);

  // Re-sync when the item changes underneath us (switching items, undo, or a
  // cloud draft load) — but not while the user is mid-edit on this control.
  const [lastStored, setLastStored] = useState(stored);
  if (stored !== lastStored) {
    setLastStored(stored);
    setRaw(stored);
  }

  return (
    <Field label={field.label} help={field.help}>
      <textarea
        className={input}
        rows={type === "lines" ? 3 : 2}
        placeholder={field.placeholder}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const parsed = splitList(e.target.value, type);
          setLastStored(parsed.join(separator));
          onChange({ [field.key]: parsed });
        }}
      />
    </Field>
  );
}
