"use client";

import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

import type { TemplateComponent } from "@/types/template";

import { Button } from "@veriworkly/ui";

import { loadTemplateComponentById } from "@/templates";

import { type ShareLinkPayload, verifyShareLink } from "@/features/resume/services/public-share";
import { DocumentFontLoader } from "@/features/documents/components/DocumentFontLoader";

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

const ShareResumeClient = ({
  token,
  initialData,
}: {
  token: string;
  initialData: ShareLinkPayload;
}) => {
  const sharePreviewId = `share-resume-preview-${token}`;

  const [dataState, setDataState] = useState<{
    loading: boolean;
    error: string | null;
    payload: ShareLinkPayload;
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

  const resume = dataState.payload?.snapshot;

  useEffect(() => {
    if (dataState.payload.passwordRequired) {
      document.title = "Protected Resume | VeriWorkly";
    } else if (dataState.payload.resumeTitle) {
      document.title = `${dataState.payload.resumeTitle} | VeriWorkly Shared`;
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
      const payload = await verifyShareLink(token, password);
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

  if (!resume) {
    return <FullScreenMessage title="Empty Content" description="The resume data is missing." />;
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
        title={dataState.payload.resumeTitle}
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

export default ShareResumeClient;
