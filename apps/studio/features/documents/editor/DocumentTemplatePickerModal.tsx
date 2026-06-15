/* eslint-disable @next/next/no-img-element */

import { Check, LayoutTemplate, X } from "lucide-react";

import type { TemplateMeta } from "@/features/documents/core/types";

import { Button, Modal } from "@veriworkly/ui";

interface DocumentTemplatePickerModalProps {
  activeTemplateId: string;
  description?: string;
  onChange: (templateId: string) => void;
  onClose: () => void;
  open: boolean;
  templates: TemplateMeta[];
  title?: string;
}

export function DocumentTemplateSummary({
  activeTemplate,
  onOpen,
}: {
  activeTemplate: TemplateMeta | undefined;
  onOpen: () => void;
}) {
  return (
    <section className="border-border bg-background/70 border-b">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold">Template</p>

          <p className="text-muted truncate text-xs">
            {activeTemplate?.name || "Choose a document layout"}
          </p>
        </div>

        <Button className="shrink-0 rounded-xl" onClick={onOpen} size="sm" variant="secondary">
          <LayoutTemplate className="mr-2 h-4 w-4" />
          Browse
        </Button>
      </div>

      {activeTemplate ? (
        <button
          type="button"
          onClick={onOpen}
          className="hover:bg-card/80 border-border/70 flex w-full items-center gap-3 border-t p-3 text-left transition"
        >
          <span className="bg-card h-16 w-12 shrink-0 overflow-hidden rounded-lg border">
            {activeTemplate.previewImage ? (
              <img
                alt=""
                className="h-full w-full object-cover object-top"
                src={activeTemplate.previewImage}
              />
            ) : null}
          </span>

          <span className="min-w-0">
            <span className="text-foreground block truncate text-sm font-medium">
              {activeTemplate.name}
            </span>

            <span className="text-muted line-clamp-2 text-xs">{activeTemplate.description}</span>
          </span>
        </button>
      ) : null}
    </section>
  );
}

export function DocumentTemplatePickerModal({
  activeTemplateId,
  description = "Choose a layout for this document.",
  onChange,
  onClose,
  open,
  templates,
  title = "Choose template",
}: DocumentTemplatePickerModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="overflow-hidden p-0 md:max-w-4xl">
        <div className="flex items-center gap-3 border-b p-4 md:bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="bg-accent/10 text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <LayoutTemplate className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <Modal.Title className="text-foreground truncate text-base font-semibold">
              {title}
            </Modal.Title>

            <p className="text-muted text-xs">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close template picker"
            className="text-muted hover:bg-background hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Modal.Body className="max-h-[68vh] p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((template) => {
              const active = template.id === activeTemplateId;

              return (
                <button
                  type="button"
                  key={template.id}
                  className={[
                    "border-border bg-card hover:border-accent/40 group flex min-w-0 items-center gap-3 rounded-xl border p-2 text-left transition",
                    active ? "border-accent bg-accent/5 ring-accent/20 ring-2" : "",
                  ].join(" ")}
                  onClick={() => {
                    onChange(template.id);
                    onClose();
                  }}
                >
                  <span className="bg-background relative h-24 w-18 shrink-0 overflow-hidden rounded-lg border">
                    {template.previewImage ? (
                      <img
                        alt=""
                        className="h-full w-full object-cover object-top"
                        src={template.previewImage}
                      />
                    ) : (
                      <span className="text-muted grid h-full place-items-center text-xs">
                        Preview
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-foreground truncate text-sm font-semibold">
                        {template.name}
                      </span>

                      {active ? (
                        <span className="bg-accent text-accent-foreground grid h-5 w-5 shrink-0 place-items-center rounded-full">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </span>

                    <span className="text-muted mt-1 line-clamp-2 text-xs">
                      {template.description}
                    </span>

                    {template.tags.length > 0 ? (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            className="bg-background text-muted rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-zinc-50/50 dark:bg-zinc-900/50">
          <Button
            size="sm"
            onClick={onClose}
            variant="secondary"
            className="w-full font-semibold md:w-fit"
          >
            Done
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
