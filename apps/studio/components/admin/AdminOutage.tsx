"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@veriworkly/ui";

/**
 * What `/admin` shows when the session check itself failed (the API or its auth is down).
 *
 * Nobody can tell yet whether the visitor is the admin, so it says nothing about the admin
 * console and shows no error text: those are for a verified admin. The real error is in the
 * server log. The admin layout renders it, because a layout's own error skips
 * `app/admin/error.tsx` and would land on the studio's "Workspace error" page instead.
 */
export default function AdminOutage() {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-6 text-center">
        <div className="bg-destructive/10 mx-auto flex h-10 w-10 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive h-5 w-5" aria-hidden="true" />
        </div>

        <h1 className="text-foreground mt-4 text-base font-semibold">This page could not load</h1>

        <p className="text-muted mt-2 text-sm leading-6">
          The service did not answer in time. Try again in a moment.
        </p>

        <Button
          size="sm"
          className="mt-5"
          loading={retrying}
          onClick={() => startRetry(() => router.refresh())}
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      </div>
    </main>
  );
}
