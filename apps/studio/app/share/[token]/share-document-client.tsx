"use client";

import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

import type { TemplateComponent } from "@/types/template";
import type { ResumeData } from "@/types/resume";

import { Button } from "@veriworkly/ui";

import { loadTemplateComponentById } from "@/templates";

import {
  type ShareLinkPayload,
  verifyShareLink,
} from "@/features/documents/services/share-service";
import type { BaseDocument } from "@/features/documents/core/types";
import { DocumentFontLoader } from "@/features/documents/components/DocumentFontLoader";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import { CoverLetterPreview } from "@/templates/cover-letter/web";

import {
  ResumeCanvas,
  ShareHeaderBar,
  DownloadActions,
  FullScreenMessage,
  PasswordGateModal,
} from "./components";

interface TemplateState {
  loading: boolean;
  error: string | null;
  component: TemplateComponent | null;
}

const ShareDocumentClient = ({
  token,
  initialData,
}: {
  token: string;
  initialData: ShareLinkPayload<ResumeData | BaseDocument>;
}) => {
  const sharePreviewId = `share-document-preview-${token}`;

  const [dataState, setDataState] = useState<{
    loading: boolean;
    error: string | null;
    payload: ShareLinkPayload<ResumeData | BaseDocument>;
  }>({
    loading: false,
    error: null,
    payload: initialData,
  });

  const [templateState, setTemplateState] = useState<TemplateState>({
    loading: false,
    error: null,
    component: null,
  });

  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  const snapshot = dataState.payload?.snapshot;
  const sharedDocument =
    snapshot &&
    typeof snapshot === "object" &&
    "type" in snapshot &&
    (snapshot as { type?: unknown }).type !== "RESUME"
      ? (snapshot as BaseDocument)
      : null;
  const resume = sharedDocument ? null : (snapshot as ResumeData | undefined);

  useEffect(() => {
    if (dataState.payload.passwordRequired) {
      document.title = "Protected Resume | VeriWorkly";
    } else if (dataState.payload.documentTitle) {
      document.title = `${dataState.payload.documentTitle} | VeriWorkly Shared`;
    }
  }, [dataState.payload]);

  useEffect(() => {
    let isActive = true;

    if (!resume) {
      setTemplateState({ loading: false, error: null, component: null });
      return;
    }

    setTemplateState((prev) => ({ ...prev, loading: true, error: null }));

    const component = loadTemplateComponentById(resume.templateId);
    if (isActive) setTemplateState({ loading: false, error: null, component });

    return () => {
      isActive = false;
    };
  }, [resume]);

  const handleUnlock = useCallback(async () => {
    if (!password) return;

    setVerifying(true);
    setDataState((prev) => ({ ...prev, error: null }));

    try {
      const payload = await verifyShareLink<ResumeData | BaseDocument>(token, password);
      setDataState({ loading: false, error: null, payload });
    } catch (err: unknown) {
      setDataState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Invalid password",
      }));
    } finally {
      setVerifying(false);
    }
  }, [token, password]);

  if (dataState.payload.passwordRequired) {
    return (
      <PasswordGateModal
        password={password}
        error={dataState.error}
        verifying={verifying}
        onUnlock={handleUnlock}
        onPasswordChange={setPassword}
      />
    );
  }

  if (!snapshot) {
    return (
      <FullScreenMessage title="Empty Content" description="Shared document data is missing." />
    );
  }

  if (sharedDocument) {
    return (
      <main className="bg-background surface-grid selection:bg-accent/20 relative min-h-screen">
        <ShareHeaderBar
          title={dataState.payload.documentTitle}
          expiresAt={dataState.payload.expiresAt}
        />

        <section className="mx-auto max-w-5xl px-4 py-8">
          {sharedDocument.type === "COVER_LETTER" ? (
            <CoverLetterPreview
              content={sharedDocument.content as CoverLetterContent}
              templateId={sharedDocument.templateId}
            />
          ) : (
            <div className="bg-card text-foreground rounded-2xl border p-6 shadow-sm">
              <h1 className="text-xl font-semibold">{sharedDocument.title}</h1>
              <pre className="text-muted mt-4 text-sm whitespace-pre-wrap">
                {JSON.stringify(sharedDocument.content, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!resume) {
    return <FullScreenMessage title="Empty Content" description="Resume data is missing." />;
  }

  if (templateState.error) {
    return (
      <FullScreenMessage
        title="Template Error"
        description={templateState.error}
        icon={<AlertCircle className="text-destructive" />}
        action={
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        }
      />
    );
  }

  if (templateState.loading || !templateState.component) {
    return (
      <FullScreenMessage
        title="Loading Template"
        description="Preparing the selected template architecture..."
        icon={<Loader2 className="text-accent animate-spin" />}
      />
    );
  }

  return (
    <main className="bg-background surface-grid selection:bg-accent/20 relative min-h-screen">
      <DocumentFontLoader fontFamily={resume.customization.fontFamily} />
      <ShareHeaderBar
        title={dataState.payload.documentTitle}
        expiresAt={dataState.payload.expiresAt}
        actions={<DownloadActions resume={resume} sharePreviewId={sharePreviewId} />}
      />

      <ResumeCanvas
        resume={resume}
        sharePreviewId={sharePreviewId}
        templateComponent={templateState.component}
      />
    </main>
  );
};

export default ShareDocumentClient;
