"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, HardDrive, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@veriworkly/ui";

import { downloadWorkspaceBackup } from "@/features/auth/services/current-user";
import { listDocuments } from "@/features/documents/services/document-workspace-service";
import { signInHref } from "@/lib/sign-in";
import {
  DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
  getDocumentLibrarySnapshot,
  subscribeToDocumentLibrary,
} from "@/features/documents/services/document-library";
import { useUserStore } from "@/store/useUserStore";

import {
  readGuestBackupDismissed,
  rememberGuestBackupDismissed,
  shouldShowGuestBackupBanner,
} from "./guest-backup-banner-state";

const subscribeNever = () => () => {};
const sessionStore = () => window.sessionStorage;

/**
 * Tells a guest, once they have a document, that it lives only in this browser, with the two
 * ways to keep it: sign in (sync) or download the same single-file backup sign-out offers.
 */
export function GuestBackupBanner() {
  const pathname = usePathname();
  const authResolved = useUserStore((state) => !state.loading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const documentCount = useSyncExternalStore(
    subscribeToDocumentLibrary,
    () => getDocumentLibrarySnapshot("ALL").docs.length,
    () => DOCUMENT_LIBRARY_SERVER_SNAPSHOT.docs.length,
  );

  // The server cannot read the browser's storage, so it renders the banner as dismissed.
  const storedDismissal = useSyncExternalStore(
    subscribeNever,
    () => readGuestBackupDismissed(sessionStore),
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);

  const visible = shouldShowGuestBackupBanner({
    authResolved,
    isLoggedIn,
    documentCount,
    dismissed: storedDismissal || dismissedNow,
  });

  // Not over the editor: its panels fill the screen and scroll inside it, so a fixed banner
  // would hide the last fields on a phone. The dashboard pages show it instead.
  if (!visible || pathname.startsWith("/editor")) return null;

  const handleDownload = () => {
    try {
      downloadWorkspaceBackup(listDocuments());
    } catch (error) {
      toast.error(
        `Could not download the backup: ${error instanceof Error ? error.message : "the download failed."}`,
      );
    }
  };

  const handleDismiss = () => {
    rememberGuestBackupDismissed(sessionStore);
    setDismissedNow(true);
  };

  return (
    <>
      {/* Room at the end of the page content, so the fixed reminder never covers its last row. */}
      <div aria-hidden="true" className="h-40 sm:h-32" />

      <section
        aria-label="Backup reminder"
        className="border-border bg-card fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-2xl border p-4 shadow-lg sm:bottom-5"
      >
        <div className="flex items-start gap-3">
          <span className="bg-accent/10 text-accent hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex">
            <HardDrive className="h-4 w-4" aria-hidden="true" />
          </span>

          <p className="min-w-0 flex-1 text-sm leading-6 font-semibold">
            Your documents are saved only in this browser. Sign in to back them up, or download a
            copy.
          </p>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss backup reminder"
            className="text-muted hover:bg-background hover:text-foreground -mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 sm:pl-12">
          <Button asChild size="sm" variant="primary" className="h-9 rounded-lg px-4">
            <Link href={signInHref()}>Sign in</Link>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownload}
            className="border-border h-9 gap-2 rounded-lg border px-4 shadow-none"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download backup
          </Button>
        </div>
      </section>
    </>
  );
}
