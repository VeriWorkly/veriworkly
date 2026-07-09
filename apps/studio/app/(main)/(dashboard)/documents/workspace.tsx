"use client";

import { Grid2X2, LayoutList, Upload } from "lucide-react";

import { Card, Select, Button } from "@veriworkly/ui";

import DestructiveModal from "@/components/modals/DestructiveModal";
import SyncDetailsModal from "@/components/modals/SyncDetailsModal";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";
import RenameDocumentModal from "@/components/modals/RenameDocumentModal";

import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";
import { getDocumentDefinition } from "@/features/documents/core/registry";

import { DocumentListRow } from "./components/DocumentListRow";
import { IconToggle } from "./components/DocumentWorkspaceControls";
import { DocumentPreviewCard } from "./components/DocumentPreviewCard";
import { DocumentWorkspaceEmptyState } from "./components/DocumentWorkspaceEmptyState";

import {
  type SortMode,
  type DocumentTypeFilter,
  useDocumentsWorkspace,
} from "./useDocumentsWorkspace";

export default function DocumentsWorkspace() {
  const {
    counts,
    activeType,
    handleSyncNow,
    handleConfirmDelete,
    handleKeepLocalOnly,
    handleResolveUseCloud,
    handleResolveUseLocal,
    isDeleting,
    deleteTarget,
    shareTarget,
    renameTarget,
    syncDetailsTarget,
    setSortMode,
    setViewMode,
    setActiveType,
    setDeleteTarget,
    setShareTarget,
    setRenameTarget,
    setSyncDetailsTargetId,
    sortMode,
    viewMode,
    syncingDocumentId,
    syncTelemetryById,
    syncTargetTelemetry,
    totalCount,
    visibleDocs,
    bump,
  } = useDocumentsWorkspace();

  return (
    <section className="space-y-7" aria-label="VeriWorkly dashboard">
      <header className="flex flex-col gap-3 pt-1">
        <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Documents</p>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Document library</h1>

            <p className="text-muted mt-2 max-w-2xl text-base">Saved resumes and cover letters.</p>
          </div>

          <div className="text-muted text-sm">
            {totalCount} saved document{totalCount === 1 ? "" : "s"}
          </div>
        </div>
      </header>

      <Card className="overflow-visible rounded-2xl p-0">
        <div className="border-border/70 flex flex-col gap-4 border-b p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <span className="text-foreground text-sm font-semibold">Recently opened</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.dispatchEvent(new CustomEvent("open-import-profile"))}
              className="h-10 rounded-xl gap-2 font-semibold shadow-none border border-border"
            >
              <Upload className="h-4 w-4" />
              <span>Import Profile</span>
            </Button>

            <label className="sr-only" htmlFor="document-type-filter">
              Filter by document type
            </label>

            <Select
              id="document-type-filter"
              value={activeType}
              onChange={(event) => setActiveType(event.target.value as DocumentTypeFilter)}
              className="h-10 w-auto min-w-36 rounded-xl px-3 shadow-none"
            >
              <option value="ALL">All documents ({totalCount})</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getDocumentDefinition(type).label} ({counts[type]})
                </option>
              ))}
            </Select>

            <label className="sr-only" htmlFor="document-sort">
              Sort documents
            </label>

            <Select
              id="document-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="h-10 w-auto min-w-32 rounded-xl px-3 shadow-none"
            >
              <option value="updated">Last viewed</option>
              <option value="title">Title</option>
            </Select>

            <div className="border-border bg-background inline-flex rounded-xl border p-1">
              <IconToggle
                label="Grid view"
                active={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              >
                <Grid2X2 className="h-4 w-4" />
              </IconToggle>

              <IconToggle
                label="List view"
                active={viewMode === "list"}
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </IconToggle>
            </div>
          </div>
        </div>

        {visibleDocs.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleDocs.map((doc) => (
                <DocumentPreviewCard
                  doc={doc}
                  key={doc.id}
                  onSyncNowAction={handleSyncNow}
                  onDeleteAction={setDeleteTarget}
                  onShareAction={setShareTarget}
                  onRenameAction={setRenameTarget}
                  syncing={syncingDocumentId === doc.id}
                  onSyncDetailsAction={setSyncDetailsTargetId}
                  telemetry={syncTelemetryById[doc.id] ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="divide-border divide-y">
              {visibleDocs.map((doc) => (
                <DocumentListRow
                  doc={doc}
                  key={doc.id}
                  onSyncNowAction={handleSyncNow}
                  onDeleteAction={setDeleteTarget}
                  onShareAction={setShareTarget}
                  onRenameAction={setRenameTarget}
                  syncing={syncingDocumentId === doc.id}
                  onSyncDetailsAction={setSyncDetailsTargetId}
                  telemetry={syncTelemetryById[doc.id] ?? null}
                />
              ))}
            </div>
          )
        ) : (
          <DocumentWorkspaceEmptyState />
        )}
      </Card>

      <DestructiveModal
        loading={isDeleting}
        open={Boolean(deleteTarget)}
        onConfirmAction={handleConfirmDelete}
        onCloseAction={() => setDeleteTarget(null)}
        entityName={deleteTarget?.title ?? "document"}
      />

      {syncDetailsTarget ? (
        <SyncDetailsModal
          document={syncDetailsTarget}
          onSyncNow={handleSyncNow}
          telemetry={syncTargetTelemetry}
          syncingDocumentId={syncingDocumentId}
          onKeepLocalOnly={handleKeepLocalOnly}
          onResolveUseCloud={handleResolveUseCloud}
          onResolveUseLocal={handleResolveUseLocal}
          onClose={() => setSyncDetailsTargetId(null)}
        />
      ) : null}

      {shareTarget ? (
        <ShareDocumentModal
          document={shareTarget}
          documentId={shareTarget.id}
          documentTitle={shareTarget.title}
          onClose={() => setShareTarget(null)}
        />
      ) : null}

      {renameTarget ? (
        <RenameDocumentModal
          open={Boolean(renameTarget)}
          doc={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSuccess={bump}
        />
      ) : null}
    </section>
  );
}
