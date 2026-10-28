"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback, useMemo, type ReactNode } from "react";

import type { TemplateComponent } from "@/types/template";

import { loadTemplateComponentById } from "@/templates";

import {
  type ShareLinkPayload,
  verifyShareLinkByUsernameAndSlug,
} from "@/features/documents/services/share-service";
import { readShareSnapshot } from "@/features/documents/services/share-snapshot";
import { CoverLetterPreview } from "@/templates/cover-letter/web";

import {
  ResumeCanvas,
  ShareHeaderBar,
  DownloadActions,
  FullScreenMessage,
  PasswordGateModal,
} from "../../components";

interface TemplateState {
  templateId: string | null;
  error: string | null;
  component: TemplateComponent | null;
}

const ShareDocumentClient = ({
  username,
  slug,
  initialData,
  serverTemplate = null,
}: {
  username: string;
  slug: string;
  initialData: ShareLinkPayload;
  /**
   * `initialData`'s resume drawn by its template on the server, so the page's HTML carries
   * the resume (`renderSharedResumeTemplate`). Null for a locked link: once unlocked, the
   * template loads here.
   */
  serverTemplate?: ReactNode;
}) => {
  const sharePreviewId = `share-document-preview-${username}-${slug}`;

  const [payload, setPayload] = useState<ShareLinkPayload>(initialData);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [templateState, setTemplateState] = useState<TemplateState>({
    templateId: null,
    error: null,
    component: null,
  });

  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  const shared = useMemo(() => readShareSnapshot(payload.snapshot), [payload.snapshot]);
  const resume = shared.kind === "resume" ? shared.resume : null;
  const templateId = resume?.templateId ?? null;
  // The server drew the resume the page opened with; one unlocked here is drawn here.
  const drawnOnServer = serverTemplate !== null && payload === initialData;

  useEffect(() => {
    if (!payload.passwordRequired && payload.documentTitle) {
      document.title = `${payload.documentTitle} | VeriWorkly`;
    }
  }, [payload]);

  useEffect(() => {
    if (!templateId || drawnOnServer) return;

    let isActive = true;

    loadTemplateComponentById(templateId)
      .then((component) => {
        if (isActive) setTemplateState({ templateId, error: null, component });
      })
      .catch((error: unknown) => {
        console.error("Shared resume template failed to load", error);

        if (isActive) {
          setTemplateState({
            templateId,
            error: "This resume could not be displayed. Reload the page to try again.",
            component: null,
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [templateId, drawnOnServer]);

  const handleUnlock = useCallback(async () => {
    if (!password) {
      setUnlockError("Enter the password to unlock this document.");
      return;
    }

    setVerifying(true);
    setUnlockError(null);

    try {
      setPayload(await verifyShareLinkByUsernameAndSlug(username, slug, password));
    } catch (err: unknown) {
      setUnlockError(err instanceof Error ? err.message : "Could not unlock this document.");
    } finally {
      setVerifying(false);
    }
  }, [username, slug, password]);

  if (payload.passwordRequired) {
    return (
      <PasswordGateModal
        password={password}
        error={unlockError}
        verifying={verifying}
        onUnlock={handleUnlock}
        onPasswordChange={setPassword}
      />
    );
  }

  if (shared.kind === "empty") {
    return (
      <FullScreenMessage
        title="Nothing to show"
        description="This shared document has no content."
      />
    );
  }

  if (shared.kind === "unsupported") {
    return (
      <FullScreenMessage
        title="This document can't be shown here"
        description="Ask the person who shared it to send it as a PDF instead."
      />
    );
  }

  if (shared.kind === "cover-letter") {
    return (
      <main className="bg-background relative min-h-screen">
        <ShareHeaderBar title={payload.documentTitle} expiresAt={payload.expiresAt} />

        <section className="mx-auto max-w-5xl px-4 py-8">
          <CoverLetterPreview content={shared.content} templateId={shared.templateId} />
        </section>
      </main>
    );
  }

  const template = templateState.templateId === templateId ? templateState : null;

  if (!drawnOnServer && template?.error) {
    return (
      <FullScreenMessage
        title="This resume could not be displayed"
        description={template.error}
        icon={<AlertCircle className="text-destructive" />}
      />
    );
  }

  const Template = template?.component ?? null;
  const rendered = drawnOnServer
    ? serverTemplate
    : Template && resume && <Template resume={resume} className="" />;

  if (!resume || !rendered) {
    return (
      <FullScreenMessage
        title="Loading resume"
        icon={<Loader2 className="text-accent animate-spin" />}
      />
    );
  }

  return (
    <main className="bg-background relative min-h-screen">
      <ShareHeaderBar
        title={payload.documentTitle}
        expiresAt={payload.expiresAt}
        actions={<DownloadActions resume={resume} sharePreviewId={sharePreviewId} />}
      />

      <ResumeCanvas resume={resume} sharePreviewId={sharePreviewId} template={rendered} />
    </main>
  );
};

export default ShareDocumentClient;
