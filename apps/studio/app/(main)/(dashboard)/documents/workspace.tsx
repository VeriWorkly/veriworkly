"use client";

import { Grid2X2, LayoutList } from "lucide-react";

import { Card, Select } from "@veriworkly/ui";

import DestructiveModal from "@/components/modals/DestructiveModal";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";
import SyncDetailsModal from "@/components/modals/SyncDetailsModal";

import { DocumentListRow } from "./components/DocumentListRow";
import { DocumentPreviewCard } from "./components/DocumentPreviewCard";
import { IconToggle, TabButton } from "./components/DocumentWorkspaceControls";
import { DocumentWorkspaceEmptyState } from "./components/DocumentWorkspaceEmptyState";

import {
  type SortMode,
  type DocumentTypeFilter,
  useDocumentsWorkspace,
} from "./useDocumentsWorkspace";

export default function DocumentsWorkspace() {
  const {
    counts,
    activeTab,
    activeType,
    handleSyncNow,
    handleConfirmDelete,
    handleKeepLocalOnly,
    handleResolveUseCloud,
    handleResolveUseLocal,
    isDeleting,
    deleteTarget,
    syncDetailsTarget,
    setSortMode,
    setViewMode,
    setActiveTab,
    setActiveType,
    setDeleteTarget,
    setShareTarget,
    setSyncDetailsTargetId,
    sortMode,
    viewMode,
    shareTarget,
    shareTargetTitle,
    syncingDocumentId,
    syncTelemetryById,
    syncTargetTelemetry,
    totalCount,
    visibleDocs,
  } = useDocumentsWorkspace();

  return (
    <section className="space-y-7" aria-label="VeriWorkly dashboard">
      <header className="flex flex-col gap-3 pt-1">
        <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Documents</p>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Document library</h1>

            <p className="text-muted mt-2 max-w-2xl text-base">
              Saved resumes, cover letters, formal letters, and invoices.
            </p>
          </div>

          <div className="text-muted text-sm">
            {totalCount} saved document{totalCount === 1 ? "" : "s"}
          </div>
        </div>
      </header>

      <Card className="overflow-visible rounded-2xl p-0">
        <div className="border-border/70 flex flex-col gap-4 border-b p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <TabButton active={activeTab === "recent"} onClick={() => setActiveTab("recent")}>
              Recently opened
            </TabButton>

            <TabButton active={activeTab === "shared"} onClick={() => setActiveTab("shared")}>
              Shared files
            </TabButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              <option value="RESUME">Resume ({counts.RESUME})</option>
              <option value="COVER_LETTER">Cover letter ({counts.COVER_LETTER})</option>
              <option value="FORMAL_LETTER">Formal letter ({counts.FORMAL_LETTER})</option>
              <option value="INVOICE">Invoice ({counts.INVOICE})</option>
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
                  onShareAction={setShareTarget}
                  onDeleteAction={setDeleteTarget}
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
                  syncing={syncingDocumentId === doc.id}
                  onSyncDetailsAction={setSyncDetailsTargetId}
                  telemetry={syncTelemetryById[doc.id] ?? null}
                />
              ))}
            </div>
          )
        ) : (
          <DocumentWorkspaceEmptyState activeTab={activeTab} />
        )}
      </Card>

      <DestructiveModal
        loading={isDeleting}
        open={Boolean(deleteTarget)}
        onConfirmAction={handleConfirmDelete}
        onCloseAction={() => setDeleteTarget(null)}
        entityName={deleteTarget?.title ?? "document"}
      />

      {shareTarget ? (
        <ShareDocumentModal
          document={shareTarget}
          documentId={shareTarget.type === "RESUME" ? shareTarget.id : null}
          documentTitle={shareTargetTitle}
          onClose={() => setShareTarget(null)}
        />
      ) : null}

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
    </section>
  );
}
