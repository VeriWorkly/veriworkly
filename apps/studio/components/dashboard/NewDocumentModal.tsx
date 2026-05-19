"use client";

import { FileText, Mail, Plus, ReceiptText, ScrollText, X } from "lucide-react";

import { Button, Modal } from "@veriworkly/ui";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { DOCUMENT_TYPES, type DocumentType } from "@/features/documents/core/document-types";

const iconMap = {
  RESUME: FileText,
  COVER_LETTER: Mail,
  FORMAL_LETTER: ScrollText,
  INVOICE: ReceiptText,
} satisfies Record<DocumentType, typeof FileText>;

export function NewDocumentButton({
  collapsed,
  compact,
  onClick,
}: {
  collapsed?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="primary"
      onClick={onClick}
      aria-label="Create document"
      className={compact ? "h-10 w-10 rounded-xl px-0" : "h-9 w-full gap-2 rounded-lg"}
    >
      <Plus className="h-4 w-4" />
      {!collapsed && !compact ? <span>New Document</span> : null}
    </Button>
  );
}

export function NewDocumentModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (type: DocumentType) => void;
}) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="w-full max-w-2xl overflow-hidden rounded-2xl p-0">
        <div className="border-border/70 flex items-start justify-between gap-4 border-b p-5 sm:p-6">
          <div>
            <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Create</p>

            <h2 id="new-document-title" className="mt-2 text-2xl font-black tracking-tight">
              New document
            </h2>

            <p className="text-muted mt-1 text-sm">
              Choose document type. Template comes next in editor.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close create document modal"
            className="text-muted hover:bg-background flex h-10 w-10 items-center justify-center rounded-xl"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Modal.Body className="grid max-h-[70vh] gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {DOCUMENT_TYPES.map((type) => {
            const Icon = iconMap[type];
            const definition = getDocumentDefinition(type);

            return (
              <button
                key={type}
                type="button"
                className="border-border bg-background/70 hover:border-accent/50 hover:bg-card focus-visible:border-accent focus-visible:ring-accent/25 group rounded-xl border p-4 text-left transition outline-none focus-visible:ring-2"
                onClick={() => {
                  onClose();
                  onCreate(type);
                }}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" />
                  </span>

                  <Plus className="text-muted group-hover:text-accent h-5 w-5 transition" />
                </span>

                <span className="mt-5 block text-base font-black">{definition.label}</span>

                <span className="text-muted mt-1 block text-sm leading-6">
                  Start a clean {definition.label.toLowerCase()} with saved local workspace state.
                </span>
              </button>
            );
          })}
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
}
