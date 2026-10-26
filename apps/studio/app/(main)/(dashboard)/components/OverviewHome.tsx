"use client";

import type { LucideIcon } from "lucide-react";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BookOpen, FolderOpen, ArrowRight, BriefcaseBusiness } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import ConfirmDialog, { documentDeleteNotice } from "@/components/modals/ConfirmDialog";
import SyncDetailsModal from "@/components/modals/SyncDetailsModal";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";
import RenameDocumentModal from "@/components/modals/RenameDocumentModal";

import { useDocumentsWorkspace } from "../documents/useDocumentsWorkspace";
import { CreateDocumentActions } from "../documents/components/CreateDocumentActions";
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

const subscribeNever = () => () => {};

/** What a new user sees instead of an empty list: one next step, and the faster alternative. */
function FirstRunGuide() {
  return (
    <div className="border-border bg-background/70 col-span-full rounded-xl border p-5 sm:p-6">
      <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Start here</p>

      <h3 className="mt-2 text-xl font-black tracking-tight">Make your first resume</h3>

      <ol className="text-muted mt-3 list-decimal space-y-1 pl-5 text-sm leading-6">
        <li>Create a resume and choose what it starts from.</li>
        <li>Fill in each section. Your work saves as you type.</li>
        <li>Pick a template, then download it as a PDF.</li>
      </ol>

      <CreateDocumentActions createLabel="Create your first resume" showImport className="mt-5" />

      <Link href="/templates" className="text-accent mt-4 inline-block text-sm font-bold">
        Or browse templates first
      </Link>
    </div>
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
    syncingDocumentIds,
    syncTargetTelemetry,
    totalCount,
    visibleDocs,
    isPullingFromCloud,
    bump,
  } = useDocumentsWorkspace();

  const resumeCount = counts.RESUME;
  const coverLetterCount = counts.COVER_LETTER;

  const recentDocs = visibleDocs.slice(0, 6);

  // Documents live in this browser, so the server render cannot tell a new user from one with
  // files: the list waits for hydration rather than flashing the first-run guide.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <section className="flex flex-col gap-7" aria-label="Studio overview">
      <OverviewHomeHeader
        totalCount={totalCount}
        resumeCount={resumeCount}
        coverLetterCount={coverLetterCount}
      />

      <OverviewReferenceCard className="order-last lg:order-none" />

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
              {!hydrated ? (
                <div className="col-span-full min-h-48" aria-hidden="true" />
              ) : recentDocs.length > 0 ? (
                recentDocs.map((doc) => (
                  <RecentCard
                    key={`${doc.type}-${doc.id}`}
                    doc={doc}
                    syncing={syncingDocumentIds.has(doc.id)}
                    onDeleteAction={setDeleteTarget}
                    onShareAction={setShareTarget}
                    onRenameAction={setRenameTarget}
                    onSyncNowAction={handleSyncNow}
                    onSyncDetailsAction={setSyncDetailsTargetId}
                  />
                ))
              ) : isPullingFromCloud ? (
                // A returning user on a new device: their documents are still on the way.
                <p className="text-muted col-span-full min-h-48 text-sm" role="status">
                  Loading your documents from your account…
                </p>
              ) : (
                <FirstRunGuide />
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
              <MiniLink href={`${siteConfig.links.main}/roadmap`} icon={BookOpen} label="Roadmap" />
            </div>
          </aside>
        </div>
      </Card>

      <ConfirmDialog
        tone="destructive"
        confirmPhrase="DELETE"
        loading={isDeleting}
        open={Boolean(deleteTarget)}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.title ?? "document"}?`}
        cancelLabel={`Keep ${deleteTarget?.title ?? "document"}`}
        description={documentDeleteNotice(Boolean(deleteTarget?.sync.cloudDocumentId))}
      />

      {syncDetailsTarget ? (
        <SyncDetailsModal
          document={syncDetailsTarget}
          onSyncNow={handleSyncNow}
          telemetry={syncTargetTelemetry}
          syncingDocumentIds={syncingDocumentIds}
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
