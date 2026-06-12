"use client";

import type { ReactNode } from "react";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button, Card } from "@veriworkly/ui";

import { useUserStore } from "@/store/useUserStore";

import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { CoverLetterPreview } from "@/templates/cover-letter/web";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";
import { DocumentEditorShell } from "@/features/documents/editor/DocumentEditorShell";
import { startDocumentSyncWorker } from "@/features/documents/services/document-sync";
import { importCoverLetterMarkdownFile } from "@/features/cover-letter/markdown-import";
import { deleteDocument } from "@/features/documents/services/document-workspace-service";
import { loadWorkspaceSettingsFromLocalStorage } from "@/features/documents/services/workspace-settings";

import { CoverLetterToolbar } from "./components/CoverLetterToolbar";
import { useCoverLetterDocument } from "./hooks/useCoverLetterDocument";
import { CoverLetterContentPanel } from "./components/CoverLetterContentPanel";
import { CoverLetterSettingsPanel } from "./components/CoverLetterSettingsPanel";

interface CoverLetterEditorProps {
  documentId: string;
}

export default function CoverLetterEditor({ documentId }: CoverLetterEditorProps) {
  const router = useRouter();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const {
    doc,
    hydrated,
    message,
    setMessage,
    updateDocument,
    updateContent,
    updateAppearance,
    updateLinks,
    addLink,
    updateLink,
    removeLink,
    saveCurrentDocument,
  } = useCoverLetterDocument(documentId);

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;

    const workspaceSettings = loadWorkspaceSettingsFromLocalStorage();

    startDocumentSyncWorker("COVER_LETTER", {
      enabled: isLoggedIn && workspaceSettings.autoSyncEnabled,
      idleDelayMs: 12_000,
    });
  }, [hydrated, isLoggedIn, doc?.updatedAt]);

  const links = useMemo(
    () => doc?.content.links ?? { displayMode: "icon-username" as const, items: [] },
    [doc?.content.links],
  );

  if (!hydrated) {
    return <CoverLetterStateCard title="Loading cover letter" message="Preparing your editor." />;
  }

  if (!doc) {
    return (
      <CoverLetterStateCard
        title="Cover letter not found"
        message="Return to documents and choose another letter."
      >
        <Button onClick={() => router.push("/documents")} variant="secondary">
          Back to documents
        </Button>
      </CoverLetterStateCard>
    );
  }

  const currentDoc = doc;

  async function importJson(file: File | undefined) {
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const imported =
        typeof parsed === "object" && parsed && "content" in parsed
          ? (parsed as BaseDocument<CoverLetterContent>)
          : ({ ...currentDoc, content: parsed } as BaseDocument<CoverLetterContent>);

      updateDocument(
        {
          ...currentDoc,
          title: imported.title || currentDoc.title,
          templateId: imported.templateId || currentDoc.templateId,
          updatedAt: new Date().toISOString(),
          content: {
            ...currentDoc.content,
            ...(imported.content as Partial<CoverLetterContent>),
            appearance: {
              ...currentDoc.content.appearance,
              ...((imported.content as Partial<CoverLetterContent>).appearance ?? {}),
            },
          },
        },
        { flush: true },
      );

      toast.success("Cover letter imported");
    } catch {
      toast.error("Import failed. Use a valid cover letter JSON file.");
    }
  }

  async function importMarkdown(file: File | undefined) {
    if (!file) return;

    try {
      const importedContent = await importCoverLetterMarkdownFile(file, currentDoc.content);

      updateDocument(
        {
          ...currentDoc,
          title: importedContent.jobTitle || currentDoc.title,
          updatedAt: new Date().toISOString(),
          content: importedContent,
        },
        { flush: true },
      );

      toast.success("Cover letter markdown imported");
    } catch {
      toast.error("Import failed. Use a valid cover letter Markdown file.");
    }
  }

  function deleteCurrentDocument() {
    const confirmed = window.confirm(`Delete "${currentDoc.title}"? This cannot be undone.`);
    if (!confirmed) return;

    deleteDocument("COVER_LETTER", currentDoc.id);
    router.push("/documents");
  }

  const content = currentDoc.content;

  return (
    <>
      <DocumentEditorShell
        toolbar={
          <CoverLetterToolbar
            document={currentDoc}
            message={message}
            onDelete={deleteCurrentDocument}
            onImportJson={importJson}
            onImportMarkdown={importMarkdown}
            onOpenShare={() => setShareModalOpen(true)}
            onSave={saveCurrentDocument}
            onSetMessage={setMessage}
            onUpdateDocument={updateDocument}
          />
        }
        contentPanel={
          <CoverLetterContentPanel
            content={content}
            documentId={currentDoc.id}
            links={links}
            onAddLink={addLink}
            onRemoveLink={removeLink}
            onUpdateContent={updateContent}
            onUpdateLink={updateLink}
            onUpdateLinks={updateLinks}
          />
        }
        settingsPanel={
          <CoverLetterSettingsPanel
            document={currentDoc}
            appearance={content.appearance}
            onUpdateDocument={updateDocument}
            onUpdateAppearance={updateAppearance}
          />
        }
        preview={<CoverLetterPreview content={content} templateId={currentDoc.templateId} />}
        previewTitle={currentDoc.title || "Cover Letter"}
      />

      {shareModalOpen ? (
        <ShareDocumentModal
          documentId={null}
          document={{
            source: "document",
            id: currentDoc.id,
            type: "COVER_LETTER",
            title: currentDoc.title,
            description: content.subject || content.jobTitle || "Cover letter",
            templateId: currentDoc.templateId,
            templateName: "Cover Letter",
            templateDescription: "Cover letter",
            previewImage: "",
            updatedAt: currentDoc.updatedAt,
            sync: currentDoc.sync,
          }}
          onClose={() => setShareModalOpen(false)}
        />
      ) : null}
    </>
  );
}

function CoverLetterStateCard({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="space-y-3 text-center">
        <h1 className="text-foreground text-xl font-semibold">{title}</h1>
        <p className="text-muted text-sm">{message}</p>
        {children}
      </Card>
    </div>
  );
}
