"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { InitialUserContext } from "../store/session-user";
import { useUserStore } from "../store/useUserStore";

import type { SessionUser } from "@/features/auth/services/current-user";

import { downloadWorkspaceBackup } from "@/features/auth/services/current-user";
import { UnclaimedDocumentsDialog } from "@/features/auth/components/UnclaimedDocumentsDialog";
import {
  setAutoSyncEnabledInLocalStorage,
  loadWorkspaceSettingsFromLocalStorage,
} from "@/features/documents/services/workspace-settings";
import {
  hydrateAllDocumentsFromCloud,
  setAllDocumentsSyncEnabled,
  startAllDocumentSyncWorkers,
} from "@/features/documents/services/document-sync";
import {
  announceSignedIn,
  subscribeToAccountSwitches,
  subscribeToIndexRebuilds,
  subscribeToWorkspaceClears,
} from "@/features/documents/services/document-workspace-service";
import {
  claimWorkspaceIfUncontested,
  resolveUnclaimedDocuments,
  setWorkspaceUser,
  settleWorkspaceOwnership,
  type UnclaimedDocuments,
  type UnclaimedDocumentsChoice,
} from "@/features/documents/services/workspace-owner";

/** Applies the account's sync choice to this device and starts the workers. */
function applyAccountSync(user: SessionUser) {
  const autoSyncEnabled = user.autoSyncEnabled ?? false;

  if (loadWorkspaceSettingsFromLocalStorage().autoSyncEnabled !== autoSyncEnabled) {
    setAutoSyncEnabledInLocalStorage(autoSyncEnabled);
    setAllDocumentsSyncEnabled(autoSyncEnabled);
  }

  // Back up pending documents of every type as soon as the user is signed in, not only
  // once an editor of that type is opened.
  startAllDocumentSyncWorkers({ enabled: autoSyncEnabled });
}

async function pullAccountDocuments() {
  const failure = (await hydrateAllDocumentsFromCloud()).find((result) => !result.ok);

  if (failure) toast.error(`Could not load your cloud documents: ${failure.message}`);
}

const BACKUP_PAUSED_TOAST_ID = "backup-paused";

/**
 * Asks about the next group of documents on this device that are not the user's or, once none
 * is left, starts their sync and pulls their documents. While the account cannot be reached a
 * standing notice says backup is paused, with a way to try again now.
 */
function startSettling(user: SessionUser, onUnclaimed: (found: UnclaimedDocuments) => void) {
  const settler = settleWorkspaceOwnership(user.id, {
    onUnclaimed,
    onSettled: () => {
      applyAccountSync(user);
      void pullAccountDocuments();
    },
    onPaused: (paused) => {
      if (!paused) {
        toast.dismiss(BACKUP_PAUSED_TOAST_ID);
        return;
      }

      toast.warning(
        "Backup is paused: we couldn't reach your account. Your documents are safe on this device; we'll keep trying.",
        {
          id: BACKUP_PAUSED_TOAST_ID,
          duration: Infinity,
          action: { label: "Try now", onClick: () => settler.retryNow() },
        },
      );
    },
  });

  return settler;
}

/**
 * What loading the studio does to this device's sync (S-239): a signed-in user's workers start
 * at once, for every document type, once the documents here are known to be theirs; otherwise
 * they wait for the user's answer. `setUser` runs after the claim: the library pulls as soon as
 * it sees a signed-in user. Returns the settler asking about unclaimed documents, if any.
 */
export function startWorkspaceSession(
  user: SessionUser | null,
  setUser: (user: SessionUser | null) => void,
  onUnclaimed: (found: UnclaimedDocuments) => void,
) {
  const claimed = user ? claimWorkspaceIfUncontested(user.id) : false;

  setUser(user);

  if (user) announceSignedIn(user.id);

  if (!user) {
    startAllDocumentSyncWorkers({ enabled: false });
  } else if (claimed) {
    applyAccountSync(user);
  } else {
    // Nothing syncs until the documents already here are claimed or the user has chosen.
    startAllDocumentSyncWorkers({ enabled: false });

    return startSettling(user, onUnclaimed);
  }

  return null;
}

/** Hands the server's user to `useSessionUser`, for the render before the store has it. */
export function InitialUserProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return <InitialUserContext value={user}>{children}</InitialUserContext>;
}

export function AuthInitializer({ initialUser }: { initialUser: SessionUser | null }) {
  const setUser = useUserStore((state) => state.setUser);

  // During render, not in an effect: the pages below read storage on their first render, and
  // a guest must never see, even for a frame, the documents a signed-in account left here.
  setWorkspaceUser(initialUser?.id ?? null);

  const [unclaimed, setUnclaimed] = useState<UnclaimedDocuments | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const settlerRef = useRef<ReturnType<typeof startSettling> | null>(null);

  useEffect(() => {
    settlerRef.current = startWorkspaceSession(initialUser, setUser, setUnclaimed);

    return () => {
      settlerRef.current?.cancel();
      toast.dismiss(BACKUP_PAUSED_TOAST_ID);
    };
  }, [initialUser, setUser]);

  // Another tab signed out or deleted the account: leave whatever this tab shows. The reload
  // lands on the sign-in page, or on an empty studio for a guest.
  useEffect(() => subscribeToWorkspaceClears(() => window.location.reload()), []);

  // The browser is now signed in as another account (in another tab, or found on focus): this
  // tab must not upload what it shows with that account's cookie. The reload shows the new one.
  useEffect(
    () =>
      subscribeToAccountSwitches(() => {
        startAllDocumentSyncWorkers({ enabled: false });
        window.location.reload();
      }),
    [],
  );

  // A rebuilt index leaves every document of unknown owner, which pauses backup: ask now.
  useEffect(() => {
    if (!initialUser) return;

    return subscribeToIndexRebuilds(() => {
      settlerRef.current?.cancel();
      settlerRef.current = startSettling(initialUser, setUnclaimed);
    });
  }, [initialUser]);

  const choose = useCallback(
    (choice: UnclaimedDocumentsChoice) => {
      if (!initialUser || !unclaimed) return;

      setResolving(true);
      setResolveError(null);

      try {
        resolveUnclaimedDocuments(
          initialUser.id,
          unclaimed,
          choice,
          initialUser.autoSyncEnabled ?? false,
        );
      } catch (error) {
        setResolveError(error instanceof Error ? error.message : String(error));
        setResolving(false);
        return;
      }

      setUnclaimed(null);
      setResolving(false);
      // Another account's documents are asked about first; a guest's may follow.
      settlerRef.current?.cancel();
      settlerRef.current = startSettling(initialUser, setUnclaimed);
    },
    [initialUser, unclaimed],
  );

  const downloadBackup = useCallback(() => {
    if (!unclaimed) return;

    try {
      downloadWorkspaceBackup(unclaimed.documents);
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : String(error));
    }
  }, [unclaimed]);

  if (!unclaimed) return null;

  return (
    <UnclaimedDocumentsDialog
      unclaimed={unclaimed}
      busy={resolving}
      error={resolveError}
      onChoose={choose}
      onDownloadBackup={downloadBackup}
    />
  );
}
