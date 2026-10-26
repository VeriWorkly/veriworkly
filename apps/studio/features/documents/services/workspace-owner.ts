"use client";

import type { DocumentIndexEntry } from "@/types/document";
import type { DocumentMeta } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";

import { DocumentApi } from "./document-api";
import { SyncEngine } from "./sync-engine";
import { listLocalStorageKeys } from "./document-index";
import { safeSetLocalStorageItem } from "./storage/safe-local-storage";
import { WORKSPACE_OWNER_STORAGE_KEY } from "./storage-keys";
import {
  entriesOwnedBy,
  getWorkspaceViewer,
  readDeviceOwner,
  setWorkspaceViewer,
  UNKNOWN_DOCUMENT_OWNER,
} from "./workspace-viewer";
import {
  deleteDocument,
  getWorkspaceStorage,
  listAllDocumentEntries,
  rekeyDocument,
  setDocumentOwners,
} from "./document-workspace-service";

/**
 * Who this device's documents belong to.
 *
 * A shared or public computer keeps one browser workspace across people: a session that
 * expires leaves its documents behind, and a guest's work stays after they leave. Each
 * document records its owner (`DocumentIndexEntry.owner`; null for a guest's), only the
 * current viewer's documents are shown (workspace-viewer.ts), and nothing on the device is
 * uploaded to, or mixed into, the signed-in account until it is known to be theirs: because
 * they made it, or because they said so.
 */

/** Set by the sign-in state on every render; null for a guest. */
export function setWorkspaceUser(userId: string | null) {
  setWorkspaceViewer(userId);
}

/**
 * The sync layer's gate: a signed-in user's uploads and pulls run only once every document
 * on the device is theirs. A guest has no account to mix documents into (and no session the
 * API would accept), so nothing is held back for them.
 */
export function canWorkspaceReachCloud(): boolean {
  const viewer = getWorkspaceViewer();
  if (viewer === null) return true;

  const all = listAllDocumentEntries();

  return entriesOwnedBy(all, viewer).length === all.length;
}

function entryKey(entry: Pick<DocumentIndexEntry, "type" | "id">) {
  return `${entry.type}:${entry.id}`;
}

function toMeta(entry: DocumentIndexEntry): DocumentMeta {
  return {
    id: entry.id,
    type: entry.type as DocumentType,
    title: entry.title,
    templateId: entry.templateId,
    updatedAt: entry.updatedAt,
    sync: entry.sync,
  };
}

/**
 * Records `userId` as the device's owner. Entries from before owners were recorded keep the
 * previous owner first. Taking over from another account drops its cloud cursors (the next
 * pull must list this account from the start) and its cached Master Profile; a device that had
 * no owner (a guest's, or any device before owners were recorded) keeps both.
 */
function claimWorkspace(userId: string) {
  const previous = readDeviceOwner();

  if (previous === userId) return;

  const legacy = listAllDocumentEntries().filter((entry) => entry.owner === undefined);

  if (legacy.length > 0 && !setDocumentOwners(legacy, previous).ok) {
    throw new Error("This device's storage is full.");
  }

  if (previous !== null) {
    for (const key of listLocalStorageKeys()) {
      if (key.startsWith("veriworkly:cloud-hydrate-meta:")) window.localStorage.removeItem(key);
    }

    window.localStorage.removeItem(MASTER_PROFILE_STORAGE_KEY);
  }

  if (!safeSetLocalStorageItem(window.localStorage, WORKSPACE_OWNER_STORAGE_KEY, userId).ok) {
    throw new Error("This device's storage is full.");
  }
}

/**
 * Claims the device for `userId` when every document on it is already theirs (or there are
 * none). Synchronous, so a sign-in opens the gate before any pull or upload asks. False means
 * the documents here need {@link findUnclaimedDocuments}.
 */
export function claimWorkspaceIfUncontested(userId: string): boolean {
  try {
    // No owner yet: the first sign-in since owners were recorded. Documents written before
    // then (no owner field) were made on this device by whoever uses it, so they are adopted
    // without asking. A guest's document (owner null, made after owners were recorded, e.g.
    // after a sign-out cleared the device) is still put to the user, and a copy linked to the
    // cloud has to be shown to be this account's (findUnclaimedDocuments).
    if (readDeviceOwner() === null) {
      const ownerless = listAllDocumentEntries().filter(
        (entry) => entry.owner === undefined && !entry.sync.cloudDocumentId,
      );

      if (ownerless.length > 0 && !setDocumentOwners(ownerless, userId).ok) {
        throw new Error("This device's storage is full.");
      }
    }

    const all = listAllDocumentEntries();

    if (entriesOwnedBy(all, userId).length !== all.length) return false;

    claimWorkspace(userId);
  } catch (error) {
    console.error("Could not record this device's owner.", error);
    return false;
  }

  return true;
}

export interface UnclaimedDocuments {
  /** `account`: left by another signed-in account. `guest`: made here without signing in. */
  origin: "account" | "guest";
  documents: DocumentMeta[];
}

/**
 * The next group of documents on this device that are not `userId`'s: another account's
 * first, then a guest's. A copy linked to a document the account holds in the cloud is
 * theirs (a device used before owners were recorded) and is claimed on the spot. Returns
 * null, with the device claimed, when nothing is left to ask about. Throws when the account's
 * documents cannot be listed: without that list the user's own copies would be put to them as
 * another account's, so the caller keeps sync blocked and asks again later.
 */
export async function findUnclaimedDocuments(userId: string): Promise<UnclaimedDocuments | null> {
  const all = listAllDocumentEntries();
  const mine = new Set(entriesOwnedBy(all, userId).map(entryKey));
  let others = all.filter((entry) => !mine.has(entryKey(entry)));

  if (others.some((entry) => entry.sync.cloudDocumentId)) {
    const { documents: accountDocuments } = await DocumentApi.list();
    const accountIds = new Set(accountDocuments.map((item) => item.id));
    const provable = others.filter(
      (entry) => entry.sync.cloudDocumentId && accountIds.has(entry.sync.cloudDocumentId),
    );

    if (provable.length > 0 && !setDocumentOwners(provable, userId).ok) {
      throw new Error("This device's storage is full.");
    }

    others = others.filter((entry) => !provable.includes(entry));
  }

  if (others.length === 0) {
    claimWorkspace(userId);
    return null;
  }

  // Made on this device without an account: a guest's, or of unknown owner after an index
  // rebuild. Either may be added to the account.
  const fromGuest = [
    ...entriesOwnedBy(others, null),
    ...entriesOwnedBy(others, UNKNOWN_DOCUMENT_OWNER),
  ].filter((entry) => !entry.sync.cloudDocumentId);
  const fromAccount = others.filter((entry) => !fromGuest.includes(entry));

  return fromAccount.length > 0
    ? { origin: "account", documents: fromAccount.map(toMeta) }
    : { origin: "guest", documents: fromGuest.map(toMeta) };
}

/**
 * - `add`: the documents become the account's and take the account's auto-sync setting, like a
 *   new document (guest documents only). The account's other documents are not touched.
 * - `keep`: they become the account's, but stay on this device only, opted out of every bulk
 *   sync toggle. Another account's documents also get fresh ids, so backing one up by hand
 *   later creates a new cloud document instead of colliding with theirs.
 * - `remove`: they are deleted from this device.
 */
export type UnclaimedDocumentsChoice = "add" | "keep" | "remove";

/** Applies the user's answer to one group. Throws with what failed. */
export function resolveUnclaimedDocuments(
  userId: string,
  unclaimed: UnclaimedDocuments,
  choice: UnclaimedDocumentsChoice,
  autoSyncEnabled: boolean,
): void {
  const claimed: Array<Pick<DocumentIndexEntry, "type" | "id">> = [];

  for (const meta of unclaimed.documents) {
    if (choice === "remove") {
      if (!deleteDocument(meta.type, meta.id).ok) {
        throw new Error(`"${meta.title}" could not be removed from this device.`);
      }

      continue;
    }

    if (choice === "add") {
      const enabled = autoSyncEnabled && !SyncEngine.isSyncOptedOut(meta.id, meta.type);
      const saved = getWorkspaceStorage(meta.type).patchSync(meta.id, {
        enabled,
        status: enabled ? "pending" : "local-only",
      });

      if (!saved.ok) throw new Error(`"${meta.title}" could not be added to your account.`);

      claimed.push(meta);
      continue;
    }

    const id =
      unclaimed.origin === "account" ? (rekeyDocument(meta.type, meta.id)?.id ?? null) : meta.id;
    const saved =
      id === null
        ? null
        : getWorkspaceStorage(meta.type).patchSync(id, {
            enabled: false,
            status: "local-only",
            cloudDocumentId: null,
            lastSyncedAt: null,
            revision: 1,
          });

    if (id === null || !saved?.ok || !SyncEngine.setSyncOptedOut(id, true, meta.type).ok) {
      throw new Error(`"${meta.title}" could not be set to stay on this device.`);
    }

    SyncEngine.removeOutboxItem(id, meta.type);
    claimed.push({ type: meta.type, id });
  }

  if (claimed.length > 0 && !setDocumentOwners(claimed, userId).ok) {
    throw new Error("This device's storage is full.");
  }

  const all = listAllDocumentEntries();
  if (entriesOwnedBy(all, userId).length === all.length) claimWorkspace(userId);
}

/** Pauses before asking the server again after a failed lookup (the last one repeats). */
const SETTLE_RETRY_DELAYS_MS = [30_000, 60_000, 120_000, 300_000, 600_000];

/** Consecutive failed lookups after which the user is told backup is paused. */
const PAUSED_AFTER_FAILURES = 2;

export interface WorkspaceSettleHandlers {
  /** A group of documents to ask the user about. */
  onUnclaimed: (found: UnclaimedDocuments) => void;
  /** Every document is the user's: sync can start. */
  onSettled: () => void;
  /** Backup is paused (true) or running again (false) because the account could not be reached. */
  onPaused: (paused: boolean) => void;
}

type Schedule = (retry: () => void, delayMs: number) => () => void;

const scheduleOnWindow: Schedule = (retry, delayMs) => {
  const timer = window.setTimeout(retry, delayMs);
  return () => window.clearTimeout(timer);
};

/**
 * Runs {@link findUnclaimedDocuments} until it gets an answer. A failed lookup keeps sync
 * blocked and asks nothing (asking then would put the user's own copies to them as another
 * account's); it is retried after a pause, and from the second failure in a row the user is
 * told backup is paused, with `retryNow` behind a "Try now" action.
 */
export function settleWorkspaceOwnership(
  userId: string,
  handlers: WorkspaceSettleHandlers,
  schedule: Schedule = scheduleOnWindow,
) {
  let failures = 0;
  let running = false;
  let cancelled = false;
  let cancelRetry: (() => void) | null = null;

  const attempt = () => {
    if (cancelled || running) return;

    cancelRetry?.();
    cancelRetry = null;
    running = true;

    findUnclaimedDocuments(userId).then(
      (found) => {
        running = false;
        if (cancelled) return;

        if (failures >= PAUSED_AFTER_FAILURES) handlers.onPaused(false);
        failures = 0;

        if (found) handlers.onUnclaimed(found);
        else handlers.onSettled();
      },
      (error: unknown) => {
        running = false;
        if (cancelled) return;

        failures += 1;
        console.warn("Could not match this device's documents to the account.", error);

        if (failures === PAUSED_AFTER_FAILURES) handlers.onPaused(true);

        const delay =
          SETTLE_RETRY_DELAYS_MS[Math.min(failures - 1, SETTLE_RETRY_DELAYS_MS.length - 1)];
        cancelRetry = schedule(attempt, delay);
      },
    );
  };

  attempt();

  return {
    retryNow: attempt,
    cancel() {
      cancelled = true;
      cancelRetry?.();
    },
  };
}
