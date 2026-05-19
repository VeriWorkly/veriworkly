"use client";

import type { TemplateComponent } from "@/types/template";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@veriworkly/ui";

import { loadTemplateComponentById } from "@/templates";

import { useResume } from "@/features/resume/hooks/use-resume";
import { loadResumeById } from "@/features/resume/services/resume-service";

interface PreviewClientProps {
  resumeId: string;
}

export function PreviewClient({ resumeId }: PreviewClientProps) {
  const { resume, setResume } = useResume();
  const [templateComponent, setTemplateComponent] = useState<TemplateComponent | null>(null);

  const routeResume = useMemo(() => loadResumeById(resumeId), [resumeId]);

  useEffect(() => {
    if (!routeResume) return;
    setResume(routeResume);
  }, [routeResume, setResume]);

  useEffect(() => {
    let cancelled = false;
    const nextTemplate = loadTemplateComponentById(resume.templateId);

    queueMicrotask(() => {
      if (!cancelled) setTemplateComponent(() => nextTemplate);
    });

    return () => {
      cancelled = true;
    };
  }, [resume.templateId]);

  const TemplateComponent = templateComponent;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card/95 sticky top-4 z-20 flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase">
            Resume Preview
          </p>
          <p className="text-foreground text-sm font-medium">
            {resume.basics.fullName || "Untitled Resume"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/editor/resume/${resumeId}`}
            className="text-foreground hover:bg-card inline-flex h-9 items-center justify-center rounded-full bg-transparent px-3 text-sm font-medium transition"
          >
            Back to editor
          </Link>
          <Link
            href="/documents"
            className="bg-card text-foreground ring-border hover:bg-background inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ring-inset"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {!routeResume ? (
        <Card className="space-y-3 text-center">
          <h1 className="text-foreground text-xl font-semibold">Resume not found</h1>
          <p className="text-muted text-sm">
            This resume may have been deleted. Return to dashboard to pick another one.
          </p>
          <div>
            <Link
              className="bg-card text-foreground ring-border hover:bg-background inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ring-inset"
              href="/documents"
            >
              Go to dashboard
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-4">
          <div className="bg-background rounded-3xl p-4 md:p-6">
            <div className="mx-auto w-full max-w-212.5">
              {TemplateComponent ? <TemplateComponent resume={resume} /> : null}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
