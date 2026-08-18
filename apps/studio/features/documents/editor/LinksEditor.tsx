"use client";

import { Button, Select } from "@veriworkly/ui";

import type {
  DocumentLinks,
  DocumentLinkItem,
  DocumentLinkType,
  DocumentLinkDisplayMode,
} from "@/features/documents/core/link-types";

import { linkTypeOptions } from "@/features/documents/editor/link-options";
import { validateLinkItem } from "@/features/documents/validation/rules";

import { Field, TextInputField } from "@/features/documents/editor/form";

interface LinksEditorProps {
  links: DocumentLinks;
  onUpdateLinks: (patch: Partial<DocumentLinks>) => void;
  onAddLink: () => void;
  onUpdateLink: (index: number, patch: Partial<DocumentLinkItem>) => void;
  onRemoveLink: (index: number) => void;
  /** Copy for the empty state; the two editors word it differently on purpose. */
  emptyMessage: string;
}

/**
 * The one link editor, used by both document types.
 *
 * Link editing was written twice over identical data and identical operations, and the two
 * had already diverged on everything the user can see: the resume showed one link at a time
 * behind an index dropdown with raw `<select>` elements, the cover letter showed stacked
 * cards with the UI-kit `Select`; the resume offered three display modes, the cover letter
 * two; the resume validated URLs, the cover letter validated nothing.
 *
 * Resolved in favour of the cover letter's stacked-card layout — every link is visible at
 * once, which is the better interaction for a list that is rarely longer than four items —
 * plus the resume's URL validation, and all three display modes. `"url"` was the missing
 * one; both types' templates render it via the shared `getLinkDisplayText`, so cover-letter
 * users simply could not select an option that already worked.
 *
 * Both stores already expose exactly this action set, so neither needed changing.
 */
export function LinksEditor({
  links,
  onUpdateLinks,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
  emptyMessage,
}: LinksEditorProps) {
  return (
    <>
      <Field label="Display style">
        <Select
          value={links.displayMode}
          onChange={(event) =>
            onUpdateLinks({ displayMode: event.target.value as DocumentLinkDisplayMode })
          }
        >
          <option value="icon">Icons only</option>
          <option value="url">URL only</option>
          <option value="icon-username">Icon + username</option>
        </Select>
      </Field>

      {links.items.length ? (
        <div className="mt-4 grid gap-3">
          {links.items.map((item, index) => {
            // Advisory only, matching the resume's existing severity model: an invalid URL
            // is flagged inline but never blocks saving or exporting.
            const errors = validateLinkItem(item);

            return (
              <div key={item.id} className="border-border grid gap-3 rounded-xl border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Link type">
                    <Select
                      value={item.type}
                      onChange={(event) =>
                        onUpdateLink(index, { type: event.target.value as DocumentLinkType })
                      }
                    >
                      {linkTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <TextInputField
                    label="Label (optional)"
                    value={item.label}
                    placeholder="e.g. myusername"
                    onValueChange={(label) => onUpdateLink(index, { label })}
                  />
                </div>

                <TextInputField
                  label="URL"
                  type="url"
                  value={item.url}
                  error={errors.url}
                  placeholder="https://..."
                  onValueChange={(url) => onUpdateLink(index, { url })}
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
            );
          })}
        </div>
      ) : (
        <p className="text-muted mt-4 text-sm">{emptyMessage}</p>
      )}

      <Button className="mt-3" size="sm" variant="secondary" onClick={onAddLink}>
        Add link
      </Button>
    </>
  );
}
