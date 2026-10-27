"use client";

import type { ReactNode, Ref } from "react";
import { useRouter } from "next/navigation";

import type { EditorLoadState } from "./editor-load-status";

import { Button, Card } from "@veriworkly/ui";

/**
 * Pre-editor state frame — "loading" and "not found" — shared by the resume and cover
 * letter editors so a missing document looks and reads the same in both.
 */
export function DocumentStateCard({
  title,
  message,
  children,
  headingRef,
}: {
  title: string;
  message: string;
  children?: ReactNode;
  /** Given when the card asks something: the caller moves focus to the question. */
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="space-y-3 text-center">
        <h1
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="text-foreground text-xl font-semibold focus:outline-none"
        >
          {title}
        </h1>
        <p className="text-muted text-sm">{message}</p>
        {children}
      </Card>
    </div>
  );
}

/**
 * The card an editor shows instead of itself until its document is ready: loading, not
 * found, or a load error with a retry. Renders nothing once the document is ready.
 */
export function DocumentLoadStateCard({
  load,
  isReady,
  noun,
  notFoundMessage,
  onRetry,
}: {
  load: EditorLoadState;
  isReady: boolean;
  /** Lower case, e.g. "cover letter". */
  noun: string;
  notFoundMessage: string;
  onRetry: () => void;
}) {
  const router = useRouter();
  const backToDocuments = (
    <Button onClick={() => router.push("/documents")} variant="secondary">
      Back to documents
    </Button>
  );

  if (load.status === "not-found") {
    return (
      <DocumentStateCard
        title={`${noun[0].toUpperCase()}${noun.slice(1)} not found`}
        message={notFoundMessage}
      >
        {backToDocuments}
      </DocumentStateCard>
    );
  }

  if (load.status === "error") {
    return (
      <DocumentStateCard title={`Could not load this ${noun}`} message={load.message}>
        <div className="flex justify-center gap-2">
          <Button onClick={onRetry}>Try again</Button>
          {backToDocuments}
        </div>
      </DocumentStateCard>
    );
  }

  if (!isReady) {
    return <DocumentStateCard title={`Loading ${noun}`} message="Preparing your editor." />;
  }

  return null;
}
