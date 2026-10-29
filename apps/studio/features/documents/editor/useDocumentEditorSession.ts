"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DocumentType } from "@/features/documents/core/document-types";
import type {
  SaveDocumentOptions,
  SaveDocumentResult,
} from "@/features/documents/services/local-storage-service";

import { getDocumentEditorPath } from "@/features/documents/core/routes";
import {
  startDocumentSyncWorker,
  subscribeToRemoteDeletions,
  resolveDocumentConflictUseCloud,
  resolveDocumentConflictUseLocal,
  hydrateCloudDocumentByIdToLocalStorage,
} from "@/features/documents/services/document-sync";
import {
  clearRecoveredEdits,
  discardPendingSave,
  readRecoveredEdits,
  saveRecoveredEdits,
  type RecoveredEdits,
  isOwnVersion,
  getDocumentIndexEntry,
  forgetDocumentRemovedElsewhere,
} from "@/features/documents/services/document-workspace-service";
import {
  DOCUMENT_INDEX_STORAGE_KEY,
  DOCUMENT_STORAGE_UPDATED_EVENT,
} from "@/features/documents/services/storage-keys";
import {
  loadStateFor,
  editorStatusMessage,
  INITIAL_LOAD_STATE,
  cloudLoadFailureState,
  shouldRefreshBeforeEditing,
  LOADING_LATEST_MESSAGE,
  OPEN_REFRESH_TIMEOUT_MS,
  type KeyedLoadState,
} from "@/features/documents/editor/editor-load-status";
import {
  describeSaveResult,
  leavingLosesEdits,
  SAVE_QUEUED_MESSAGE,
  SAVE_PERSISTED_MESSAGE,
} from "@/features/documents/services/save-failure-message";
import { loadWorkspaceSettingsFromLocalStorage } from "@/features/documents/services/workspace-settings";
import { useFlushPendingSavesOnExit } from "@/features/documents/editor/useFlushPendingSavesOnExit";

import { useUserStore } from "@/store/useUserStore";

interface DocumentEditorSessionOptions {
  type: DocumentType;
  documentId: string;
  /** Puts the locally stored document with this id into the editor store; false when absent. */
  loadIntoStore: (id: string) => boolean;
  saveToStorage: (options?: SaveDocumentOptions) => SaveDocumentResult;
  /** The store's document. Every change to it is autosaved once the session has loaded. */
  document: unknown;
  /**
   * The id of the document the store holds, when the store can outlive the route and still
   * hold the previous document after a client-side navigation.
   */
  storeDocumentId?: string | null;
  /** Puts a document into the editor store as unsaved changes (restoring recovered edits). */
  replaceInStore?: (document: unknown) => void;
}

/**
 * Where a version the editor did not write came from, while it holds edits of its own:
 * `tab` another tab (or a pull) rewrote the stored copy; `device` the cloud has a newer
 * revision than the one these edits started from.
 */
export type ChangedElsewhere = "tab" | "device";

/** Both stores stamp `updatedAt` on every edit, so it names a version of the document. */
function versionOf(document: unknown): string | null {
  const updatedAt = (document as { updatedAt?: unknown } | null)?.updatedAt;
  return typeof updatedAt === "string" ? updatedAt : null;
}

/** How many of its own versions an editor remembers, to tell its own writes from others'. */
const SEEN_VERSIONS_LIMIT = 50;

/**
 * Everything an open document editor does besides rendering: resolve the URL id (local
 * first, then the cloud), autosave on a debounce and report the result, follow a document
 * that moved to a new id, react to remote deletions and to changes made elsewhere, run the
 * sync worker, and flush pending saves on exit.
 */
export function useDocumentEditorSession({
  type,
  documentId,
  loadIntoStore,
  saveToStorage,
  document,
  storeDocumentId,
  replaceInStore,
}: DocumentEditorSessionOptions) {
  const router = useRouter();

  const hasHydratedRef = useRef(false);
  const lastSaveFailureRef = useRef<string | null>(null);

  // Versions this editor loaded or wrote (its own writes come back as storage events), the
  // last one known to be in storage, and the store's current document.
  const seenVersionsRef = useRef(new Set<string>());
  const storedVersionRef = useRef<string | null>(null);
  const latestDocumentRef = useRef<unknown>(document);
  // The document whose cloud copy was already asked for during this visit.
  const cloudCheckedRef = useRef<string | null>(null);

  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const accountAutoSync = useUserStore((state) => state.user?.autoSyncEnabled);

  const [loadState, setLoadState] = useState<KeyedLoadState>(INITIAL_LOAD_STATE);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [message, setMessage] = useState("Autosave ready");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [changedElsewhere, setChangedElsewhere] = useState<ChangedElsewhere | null>(null);
  const [resolvingChange, setResolvingChange] = useState(false);
  const [recovered, setRecovered] = useState<RecoveredEdits | null>(null);
  // True from the moment edits are held for another tab's version until the user chooses.
  const heldRef = useRef(false);

  const load = loadStateFor(loadState, documentId);
  const isReady =
    load.status === "ready" && (storeDocumentId === undefined || storeDocumentId === loadState.id);

  const rememberVersion = useCallback((version: string | null) => {
    if (!version) return;

    const seen = seenVersionsRef.current;
    seen.add(version);

    if (seen.size > SEEN_VERSIONS_LIMIT) seen.delete(seen.values().next().value as string);
  }, []);

  /** Puts the stored copy into the store and records it as the version on disk. */
  const loadStored = useCallback(
    (id: string) => {
      if (!loadIntoStore(id)) return false;

      const version = getDocumentIndexEntry(type, id)?.updatedAt ?? null;
      rememberVersion(version);
      storedVersionRef.current = version;

      return true;
    },
    [type, loadIntoStore, rememberVersion],
  );

  useEffect(() => {
    latestDocumentRef.current = document;
  });

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!documentId) {
        setLoadState({ id: documentId, status: "not-found" });
        return;
      }

      if (loadStored(documentId)) {
        const entry = getDocumentIndexEntry(type, documentId);

        if (shouldRefreshBeforeEditing(entry, useUserStore.getState().isLoggedIn)) {
          // Not editable until the cloud answers (or the wait runs out): a keystroke on the
          // older copy would turn another device's edit into a conflict (S-364).
          setLoadState({ id: documentId, status: "loading", message: LOADING_LATEST_MESSAGE });
          cloudCheckedRef.current = documentId;

          const result = await Promise.race([
            hydrateCloudDocumentByIdToLocalStorage(type, documentId),
            new Promise<null>((resolve) =>
              window.setTimeout(resolve, OPEN_REFRESH_TIMEOUT_MS, null),
            ),
          ]);

          if (cancelled) return;

          // A merged newer copy replaces the older one in the store; otherwise this reloads the same.
          loadStored(documentId);

          if (result && !result.ok && result.reason !== "in-progress") {
            setMessage(`Could not check the cloud for a newer version: ${result.message}`);
          }
        }

        hasHydratedRef.current = true;
        setLoadState({ id: documentId, status: "ready" });
        return;
      }

      const cloudResult = await hydrateCloudDocumentByIdToLocalStorage(type, documentId);

      if (cancelled) return;

      if (cloudResult.ok && loadStored(documentId)) {
        // Just fetched: no need to ask the cloud for a newer copy again.
        cloudCheckedRef.current = documentId;
        hasHydratedRef.current = true;
        setLoadState({ id: documentId, status: "ready" });
        return;
      }

      // Deliberately no fallback to another document: autosave would then write the user's
      // edits onto a document the URL does not name.
      setLoadState({ id: documentId, ...cloudLoadFailureState(cloudResult) });
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [type, documentId, loadAttempt, loadStored]);

  const retryLoad = useCallback(() => {
    setLoadState(INITIAL_LOAD_STATE);
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  const reportSaveResult = useCallback((failure: string | null) => {
    setMessage(failure ?? SAVE_PERSISTED_MESSAGE);

    // Only on transition — a persistent failure would otherwise toast per keystroke.
    if (failure && failure !== lastSaveFailureRef.current) {
      toast.error(failure, {
        description: "Use Download → JSON to keep a copy of your latest edits.",
      });
    }

    lastSaveFailureRef.current = failure;
  }, []);

  // The edits since a failed save exist only in this page: unloading it asks first (S-408).
  // The back arrow asks too (ToolbarHeader).
  const savesFailing = leavingLosesEdits(message);

  useEffect(() => {
    if (!savesFailing) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [savesFailing]);

  // The document moved to a new id (its cloud copy had been deleted). The store switches to
  // it before the route does, so typing in between is saved to the new id, not the old one.
  const followMove = useCallback(
    (newId: string) => {
      // Already loaded: no "loading" flash that would unmount the field being typed in.
      if (loadStored(newId)) {
        setLoadState({ id: newId, movedFrom: documentId, status: "ready" });
      }

      router.replace(getDocumentEditorPath(type, newId));
    },
    [type, documentId, router, loadStored],
  );

  // A save refused because the document was deleted (here, or on another device by the sync
  // worker) has nothing left to edit: say so and leave the dead editor.
  const handleSaveResult = useCallback(
    (result: SaveDocumentResult) => {
      reportSaveResult(describeSaveResult(result));

      if (result.ok && result.movedTo) followMove(result.movedTo);
      if (!result.ok && result.reason === "removed") router.replace("/documents");
    },
    [followMove, reportSaveResult, router],
  );

  useEffect(
    () =>
      subscribeToRemoteDeletions((detail) => {
        if (detail.type !== type || detail.id !== documentId) return;

        if (detail.newId) {
          toast.info(detail.message);
          followMove(detail.newId);
          return;
        }

        if (detail.kept) {
          toast.warning(detail.message);
          return;
        }

        toast.error(detail.message);
        router.replace("/documents");
      }),
    [type, documentId, followMove, router],
  );

  // Autosave. A debounced save returns `{ queued: true }` before the write happens, so the
  // real result (a quota failure, or "Saved on this device") only ever comes from `onFlush`.
  // Held while another tab's version is waiting on the user's choice: saving would write over
  // it. A cloud conflict is not held: the edits keep saving here (storage keeps the document
  // conflicted, and sync will not send it until the user chooses).
  useEffect(() => {
    if (!hasHydratedRef.current || !document || changedElsewhere === "tab") return;

    const version = versionOf(document);
    rememberVersion(version);

    const recordResult = (result: SaveDocumentResult) => {
      if (result.ok) storedVersionRef.current = version;
      handleSaveResult(result);
    };

    const receipt = saveToStorage({
      debounceMs: 300,
      onFlush: recordResult,
    });

    if (receipt.ok && receipt.queued) {
      // The autosave itself is the external system this effect drives; the status line is
      // that system reporting back, and the queued half of it is only knowable here.
      setMessage(SAVE_QUEUED_MESSAGE);
      return;
    }

    recordResult(receipt);
  }, [document, saveToStorage, handleSaveResult, rememberVersion, changedElsewhere]);

  // Another tab, "Use cloud version" in the library or a cloud pull rewrote the stored copy.
  // An editor with nothing unsaved shows the new version; one holding edits asks which to
  // keep instead of saving over it, and a cloud conflict always asks.
  useEffect(() => {
    if (!isReady) return;

    // The queued autosave would land on the other tab's version within 300 ms; it is dropped,
    // and the edits stay in the editor until the user chooses ("Keep my version" saves them).
    const holdEdits = () => {
      discardPendingSave(type, documentId);
      heldRef.current = true;
      setChangedElsewhere("tab");
    };

    const check = () => {
      const entry = getDocumentIndexEntry(type, documentId);

      // A deletion is handled by the remote-deletion and save paths.
      if (!entry) return;

      if (entry.sync.status === "conflicted") {
        // Never over a hold: "device" saves again, which would write over the other tab's
        // version before the user has chosen.
        if (!heldRef.current) setChangedElsewhere("device");
        return;
      }

      if (
        seenVersionsRef.current.has(entry.updatedAt) ||
        isOwnVersion(type, documentId, entry.updatedAt)
      ) {
        return;
      }

      const unsaved = versionOf(latestDocumentRef.current) !== storedVersionRef.current;

      if (unsaved) {
        holdEdits();
        return;
      }

      if (loadStored(documentId)) setMessage("Updated with changes made elsewhere");
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== DOCUMENT_INDEX_STORAGE_KEY) return;

      // Deleted in another tab. This tab's storage never saw the delete, so a local-only
      // document would be written back by the next keystroke (S-403). A delete in this tab, or
      // by the sync worker, is handled by the remote-deletion and save paths.
      if (forgetDocumentRemovedElsewhere(type, documentId)) {
        toast.error("This document was deleted in another tab.");
        router.replace("/documents");
        return;
      }

      check();
    };

    // Opened on a document that is already in conflict.
    if (getDocumentIndexEntry(type, documentId)?.sync.status === "conflicted") {
      queueMicrotask(() => setChangedElsewhere("device"));
    }

    window.addEventListener(DOCUMENT_STORAGE_UPDATED_EVENT, check);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(DOCUMENT_STORAGE_UPDATED_EVENT, check);
      window.removeEventListener("storage", onStorage);
    };
  }, [type, documentId, isReady, loadStored, router]);

  // Held edits exist only in this page until the user chooses. Unloading the page asks first;
  // any leave (in-app navigation fires no unload) keeps them to be offered back next time.
  useEffect(() => {
    if (changedElsewhere !== "tab") return;

    const keepForLater = () => {
      if (!saveRecoveredEdits(type, documentId, latestDocumentRef.current).ok) {
        console.error("Could not keep the unsaved edits: this device's storage is full.");
      }
    };

    const warn = (event: BeforeUnloadEvent) => {
      keepForLater();
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
      // Still held: the editor is being left, not the choice made.
      if (heldRef.current) keepForLater();
    };
  }, [changedElsewhere, type, documentId]);

  // Edits held when this document was last left: offered back once it is open.
  useEffect(() => {
    if (!isReady || !replaceInStore) return;

    const found = readRecoveredEdits(type, documentId);
    if (found) queueMicrotask(() => setRecovered(found));
  }, [type, documentId, isReady, replaceInStore]);

  const restoreRecovered = useCallback(() => {
    if (!recovered || !replaceInStore) return;

    // Back in the editor as unsaved changes; autosave and the usual checks take it from here.
    replaceInStore(recovered.document);
    clearRecoveredEdits(type, documentId);
    setRecovered(null);
    setMessage("Restored your unsaved edits");
  }, [recovered, replaceInStore, type, documentId]);

  const discardRecovered = useCallback(() => {
    clearRecoveredEdits(type, documentId);
    setRecovered(null);
  }, [type, documentId]);

  // A linked document opened from this device's copy: ask the cloud once for a newer
  // revision, so a second device does not edit a stale copy and 409 on the next backup. A
  // newer clean copy reloads through the listener above; against local edits it conflicts.
  useEffect(() => {
    if (!isReady || !isLoggedIn || cloudCheckedRef.current === documentId) return;

    cloudCheckedRef.current = documentId;

    if (!getDocumentIndexEntry(type, documentId)?.sync.cloudDocumentId) return;

    void hydrateCloudDocumentByIdToLocalStorage(type, documentId).then((result) => {
      // `in-progress`: the device's documents still await their owner's answer.
      if (!result.ok && result.reason !== "in-progress") {
        setMessage(`Could not check the cloud for a newer version: ${result.message}`);
      }
    });
  }, [type, documentId, isReady, isLoggedIn]);

  const keepMine = useCallback(async () => {
    setResolvingChange(true);

    try {
      // The editor's version is written over the other one first (other tabs then see it as a
      // change made elsewhere); the autosave was held, so this is the first write of it.
      const version = versionOf(latestDocumentRef.current);
      rememberVersion(version);

      const saved = saveToStorage({ flush: true });
      handleSaveResult(saved);
      if (!saved.ok) return;

      storedVersionRef.current = version;

      if (changedElsewhere === "device") {
        const result = await resolveDocumentConflictUseLocal(type, documentId);

        toast[result.ok ? "success" : "error"](result.message);
        if (!result.ok) return;
      }

      heldRef.current = false;
      clearRecoveredEdits(type, documentId);
      setChangedElsewhere(null);
    } finally {
      setResolvingChange(false);
    }
  }, [changedElsewhere, type, documentId, rememberVersion, saveToStorage, handleSaveResult]);

  const keepOther = useCallback(async () => {
    setResolvingChange(true);

    try {
      discardPendingSave(type, documentId);

      if (changedElsewhere === "device") {
        const result = await resolveDocumentConflictUseCloud(type, documentId);

        if (!result.ok) {
          toast.error(result.message);
          return;
        }
      }

      if (!loadStored(documentId)) {
        toast.error("The other version could not be loaded. Refresh and try again.");
        return;
      }

      heldRef.current = false;
      clearRecoveredEdits(type, documentId);
      setChangedElsewhere(null);
      setMessage("Showing the version from elsewhere");
    } finally {
      setResolvingChange(false);
    }
  }, [changedElsewhere, type, documentId, loadStored]);

  useFlushPendingSavesOnExit(type);

  // Keyed on the ready state rather than a ref, so the worker starts even when the store
  // already held this document; `accountAutoSync` re-runs it when sign-in changes the setting
  // (`AuthInitializer` writes it to the workspace settings read here).
  useEffect(() => {
    if (!isReady || !isLoggedIn) return;

    startDocumentSyncWorker(type, {
      enabled: loadWorkspaceSettingsFromLocalStorage().autoSyncEnabled,
      idleDelayMs: 12_000,
    });
  }, [type, isReady, isLoggedIn, accountAutoSync, documentId]);

  // Stable identities so the memoised toolbar and modals can bail out.
  const openShare = useCallback(() => setShareModalOpen(true), []);
  const closeShare = useCallback(() => setShareModalOpen(false), []);
  const openDelete = useCallback(() => setDeleteModalOpen(true), []);
  const closeDelete = useCallback(() => setDeleteModalOpen(false), []);

  return {
    load,
    isReady,
    retryLoad,
    message: editorStatusMessage(message, changedElsewhere),
    setMessage,
    shareModalOpen,
    openShare,
    closeShare,
    deleteModalOpen,
    openDelete,
    closeDelete,
    changedElsewhere,
    resolvingChange,
    keepMine,
    keepOther,
    recovered,
    restoreRecovered,
    discardRecovered,
  };
}
