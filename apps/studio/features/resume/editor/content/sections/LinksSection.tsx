"use client";

import { useState } from "react";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateLinkItem } from "@/features/resume/utils/validation";

import { Field, invalidClass } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";
import type { BaseSectionProps } from "./section-types";
import { linkTypeOptions } from "@/features/documents/editor/link-options";

const LinksSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const links = useResumeStore((state) => state.resume.links);
  const addLinkItem = useResumeStore((state) => state.addLinkItem);
  const removeLinkItem = useResumeStore((state) => state.removeLinkItem);
  const updateLinkItem = useResumeStore((state) => state.updateLinkItem);
  const updateLinkDisplayMode = useResumeStore((state) => state.updateLinkDisplayMode);
  const [linkIndex, setLinkIndex] = useState(0);

  const safeLinkIndex = Math.min(linkIndex, Math.max(0, links.items.length - 1));

  const activeLink = links.items[safeLinkIndex];
  const linkErrors = activeLink ? validateLinkItem(activeLink) : {};

  return (
    <DraggableSection
      id="links"
      label="Links"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {links.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setLinkIndex(Number(event.target.value))}
            value={safeLinkIndex}
          >
            {links.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.type || `Link ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={addLinkItem} size="sm" variant="secondary">
          Add link
        </Button>

        <Button
          disabled={!links.items.length}
          onClick={() => removeLinkItem(safeLinkIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      <Field label="Display style">
        <select
          className="border-border bg-background h-11 w-full rounded-2xl border px-4 text-sm"
          onChange={(event) =>
            updateLinkDisplayMode(event.target.value as "icon" | "url" | "icon-username")
          }
          value={links.displayMode}
        >
          <option value="icon">Icons only</option>
          <option value="url">URL only</option>
          <option value="icon-username">Icon + username</option>
        </select>
      </Field>

      {activeLink ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Link type">
            <select
              value={activeLink.type}
              className="border-border bg-background h-11 w-full rounded-2xl border px-4 text-sm"
              onChange={(event) =>
                updateLinkItem(safeLinkIndex, {
                  type: event.target.value as (typeof linkTypeOptions)[number],
                })
              }
            >
              {linkTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Label (optional)">
            <Input
              value={activeLink.label}
              placeholder="e.g. myusername"
              onChange={(event) =>
                updateLinkItem(safeLinkIndex, {
                  label: event.target.value,
                })
              }
            />
          </Field>

          <Field error={linkErrors.url} label="URL">
            <Input
              className={invalidClass(linkErrors.url)}
              value={activeLink.url}
              placeholder="https://..."
              type="url"
              onChange={(event) =>
                updateLinkItem(safeLinkIndex, {
                  url: event.target.value,
                })
              }
            />
          </Field>
        </div>
      ) : (
        <p className="text-muted text-sm">
          No links yet. Add GitHub, LinkedIn, portfolio, X, or custom links.
        </p>
      )}
    </DraggableSection>
  );
};

export default LinksSection;
