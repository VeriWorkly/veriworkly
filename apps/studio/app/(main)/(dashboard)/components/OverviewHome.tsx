"use client";

import type { LucideIcon } from "lucide-react";

import Link from "next/link";
import { BookOpen, FolderOpen, ArrowRight, BriefcaseBusiness } from "lucide-react";

import { Card } from "@veriworkly/ui";

import DestructiveModal from "@/components/modals/DestructiveModal";
import SyncDetailsModal from "@/components/modals/SyncDetailsModal";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";
import RenameDocumentModal from "@/components/modals/RenameDocumentModal";

import { useDocumentsWorkspace } from "../documents/useDocumentsWorkspace";
import RecentCard from "./RecentCard";
import OverviewHomeHeader from "./OverviewHomeHeader";
import OverviewReferenceCard from "./OverviewReferenceCard";

function MiniLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="border-border hover:bg-card bg-background/70 flex items-center gap-3 rounded-xl border p-3 text-sm font-bold transition"
    >
      <Icon className="text-accent h-4 w-4" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ArrowRight className="text-muted h-4 w-4" />
    </Link>
  );
}

const OverviewHome = () => {
  const {
    counts,
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
    setDeleteTarget,
    setShareTarget,
    setRenameTarget,
    setSyncDetailsTargetId,
    syncingDocumentId,
    syncTargetTelemetry,
    totalCount,
    visibleDocs,
    bump,
  } = useDocumentsWorkspace();

  const resumeCount = counts.RESUME;
  const coverLetterCount = counts.COVER_LETTER;

  const recentDocs = visibleDocs.slice(0, 6);

  return (
    <section className="space-y-7" aria-label="Studio overview">
      <OverviewHomeHeader
        totalCount={totalCount}
        resumeCount={resumeCount}
        coverLetterCount={coverLetterCount}
      />

      <OverviewReferenceCard />

      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="border-border/70 border-b p-5 sm:p-6 lg:border-r lg:border-b-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black">Recently opened</h2>
                <p className="text-muted text-sm">Compact view of your recent documents.</p>
              </div>

              <Link href="/documents" className="text-accent text-sm font-bold">
                All documents
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentDocs.length > 0 ? (
                recentDocs.map((doc) => (
                  <RecentCard
                    key={`${doc.type}-${doc.id}`}
                    doc={doc}
                    syncing={syncingDocumentId === doc.id}
                    onDeleteAction={setDeleteTarget}
                    onShareAction={setShareTarget}
                    onRenameAction={setRenameTarget}
                    onSyncNowAction={handleSyncNow}
                    onSyncDetailsAction={setSyncDetailsTargetId}
                  />
                ))
              ) : (
                <div className="border-border bg-background/70 col-span-full rounded-xl border p-5">
                  <p className="font-bold">No files yet</p>

                  <p className="text-muted mt-1 text-sm">
                    Use New Document in sidebar to create your first file.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-black">Workspace shortcuts</h2>
              <p className="text-muted mt-1 text-xs">
                Profile data, roadmap, and document library.
              </p>
            </div>

            <div className="grid gap-2">
              <MiniLink href="/profile" icon={BriefcaseBusiness} label="Profile workspace" />
              <MiniLink href="/documents" icon={FolderOpen} label="Document library" />
              <MiniLink href="/admin/roadmap" icon={BookOpen} label="Roadmap" />
            </div>
          </aside>
        </div>
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
};

export default OverviewHome;
