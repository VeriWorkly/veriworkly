import Link from "next/link";

import { Button } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

export default function EditorPreviewNotFound() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card rounded-2xl border p-4">
        {/* Type-neutral: this route serves every document type, and a Next.js error/
            not-found boundary cannot read route params, so neutral copy is the answer
            rather than plumbing the type in. Matches PreviewClient's own header. */}
        <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
          Document Preview
        </p>

        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Preview not available
        </h1>

        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          This preview link is invalid, or the document is no longer available on this device.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary">
            <Link href="/documents">Go to Documents</Link>
          </Button>

          {/*
            Absolute, to the marketing site. Studio has no `/templates` route — template
            browsing here happens inside the editor's Design panel — so the previous
            relative link sent a user who had already hit a not-found page to another one.
            `siteConfig.links` is the established way to cross apps; see StudioNavigation.
          */}
          <Button asChild variant="ghost">
            <Link href={`${siteConfig.links.main}/templates`}>View Templates</Link>
          </Button>
        </div>
      </div>

      <div className="border-border bg-card rounded-3xl border p-4 md:p-6">
        <div className="bg-border border-border h-[62vh] w-full rounded-2xl border border-dashed" />
      </div>
    </div>
  );
}
