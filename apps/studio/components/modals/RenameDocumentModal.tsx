"use client";

import { toast } from "sonner";
import { useState } from "react";
import { Edit2, AlertTriangle, Info } from "lucide-react";

import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import { Modal, Input, Button, Checkbox } from "@veriworkly/ui";

import {
  saveDocument,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import { DocumentApi } from "@/features/documents/services/document-api";
import { getDocumentDefinition } from "@/features/documents/core/registry";

interface RenameDocumentModalProps {
  open: boolean;
  doc: DocumentLibraryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RenameDocumentModal({
  open,
  doc,
  onClose,
  onSuccess,
}: RenameDocumentModalProps) {
  const [title, setTitle] = useState(doc.title);
  const [loading, setLoading] = useState(false);
  const [updateShareSlug, setUpdateShareSlug] = useState(false);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);

    try {
      const fullDoc = loadDocumentById(doc.type, doc.id);

      if (!fullDoc) throw new Error("Local document not found");

      const nextTitle = title.trim();
      const updatedDoc = {
        ...fullDoc,
        title: nextTitle,
        updatedAt: new Date().toISOString(),
      };

      if (doc.sync?.cloudDocumentId) {
        const cloudDoc = await DocumentApi.update(doc.id, {
          title: nextTitle,
          updateShareSlug,
          revision: fullDoc.sync.revision,
        });

        updatedDoc.sync = {
          ...fullDoc.sync,
          status: "synced",
          revision: cloudDoc.revision,
          lastSyncedAt: cloudDoc.lastSyncedAt ?? cloudDoc.updatedAt,
        };
      }

      saveDocument(updatedDoc);

      toast.success("Document renamed successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="overflow-hidden p-0">
        <form onSubmit={handleRename}>
          <div className="border-border/10 bg-accent/5 flex items-center gap-3 border-b p-4 md:bg-zinc-50/50 dark:md:bg-zinc-900/10">
            <div className="bg-accent/15 text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-2 ring-zinc-500/10 ring-inset">
              <Edit2 className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <Modal.Title className="text-foreground truncate text-base font-semibold">
                Rename Document
              </Modal.Title>

              <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                {getDocumentDefinition(doc.type).label}
              </p>
            </div>
          </div>

          <Modal.Body className="space-y-6 p-4">
            <div className="space-y-2">
              <label
                htmlFor="rename-title-input"
                className="text-muted-foreground/85 text-[10px] font-bold tracking-widest uppercase"
              >
                Document Title
              </label>

              <Input
                required
                autoFocus
                value={title}
                inputSize="sm"
                className="h-10"
                variant="outline"
                id="rename-title-input"
                placeholder="Enter new title"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {doc.sync?.cloudDocumentId && (
              <div className="space-y-4 rounded-xl border bg-zinc-50/30 p-4 dark:bg-zinc-900/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="update-share-slug"
                      className="text-foreground text-xs font-bold"
                    >
                      Sync Public Share Link Slug
                    </label>

                    <p className="text-muted-foreground text-[11px]">
                      Update the shared URL path to match the new title.
                    </p>
                  </div>

                  <Checkbox
                    id="update-share-slug"
                    checked={updateShareSlug}
                    onCheckedChange={setUpdateShareSlug}
                  />
                </div>

                {updateShareSlug ? (
                  <div className="flex gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-orange-500">
                        Warning: Old URL will break
                      </p>

                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Selecting this option will update your public share link slug. Anyone
                        visiting the previous URL will get a 404 error.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
                    <Info className="h-5 w-5 shrink-0 text-blue-500" />

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-blue-500">Public link unchanged</p>

                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Your public link slug remains unchanged. Your existing shared links will
                        continue to function normally.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>

          <div className="flex flex-col-reverse gap-2 border-t bg-zinc-50/50 p-4 sm:flex-row sm:justify-end dark:bg-zinc-900/50">
            <Button
              size="sm"
              type="button"
              onClick={onClose}
              variant="secondary"
              className="w-full text-xs sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              type="submit"
              loading={loading}
              disabled={loading || !title.trim()}
              className="w-full text-xs font-semibold sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
}
