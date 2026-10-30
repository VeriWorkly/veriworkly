"use client";

import type { DocumentIndexEntry } from "@/types/document";
import type { DocumentMeta } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

import { DocumentApi, DOCUMENT_PAGE_SIZE } from "./document-api";
import { SyncEngine } from "./sync-engine";
import { listLocalStorageKeys } from "./document-index";
import { safeSetLocalStorageItem } from "./storage/safe-local-storage";
import { WORKSPACE_OWNER_STORAGE_KEY } from "./storage-keys";
import {
  entriesAwaitingAnswer,
  getWorkspaceViewer,
  readDeviceOwner,
  setWorkspaceViewer,
} from "./workspace-viewer";
import {
  deleteDocument,
  getWorkspaceStorage,
  leaveSwitchedAccount,
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
 * they made it, or because they said so. Another account's documents are never put to the
 * user at all: they stay on the device, hidden, until that account signs in again (S-372).
 */

/** Set by the sign-in state on every render; null for a guest. */
export function setWorkspaceUser(userId: string | null) {
  setWorkspaceViewer(userId);
}

/**
 * The sync layer's gate: a signed-in user's uploads and pulls wait while the device holds a
 * guest's documents, or ones of unknown owner, until the user says whether they are theirs.
 * Another account's documents hold nothing back: every sync path skips them. A guest has no
 * account to mix documents into (and no session the API would accept), so nothing is held
 * back for them.
 */
export function canWorkspaceReachCloud(): boolean {
  if (getWorkspaceViewer() === null) return true;

  return entriesAwaitingAnswer(listAllDocumentEntries()).length === 0;
}

/**
 * Whether the signed-in user has documents on this device still waiting for their answer (a
 * guest's, or of unknown owner): until then they are not listed as the user's, so an overview
 * reading "0 documents" would be wrong (S-368).
 */
export function hasDocumentsAwaitingAnswer(): boolean {
  return getWorkspaceViewer() !== null && !canWorkspaceReachCloud();
}

const sessionEndedListeners = new Set<() => void>();

/**
 * Called when a session check finds the browser signed out while this tab still shows the
 * account. Returns the unsubscribe function.
 */
export function subscribeToSessionEnded(listener: () => void): () => void {
  sessionEndedListeners.add(listener);
  return () => {
    sessionEndedListeners.delete(listener);
  };
}

/** The check in flight, and the viewer it asks about. */
let sessionCheck: { viewer: string; answer: Promise<boolean> } | null = null;
/** The last answer that the session is the viewer's, and when it came. */
let confirmedSession: { viewer: string; at: number } | null = null;

/**
 * How long a session check may take before it counts as unanswered. Every caller shares the
 * one in flight, so a request that never settled (a dropped connection) held every upload
 * and every later check behind it for as long as the tab stayed open.
 */
export const SESSION_CHECK_TIMEOUT_MS = 15_000;

/**
 * Asks the server whose session this browser holds before a worker uploads: another tab may
 * have signed in as someone else while this one still shows the previous account, and the
 * upload would carry the new account's cookie. A different account leaves this tab
 * (`leaveSwitchedAccount`). Concurrent callers share one request; a guest needs none.
 *
 * `maxAgeMs` lets a caller reuse an answer that recent (the worker, between uploads); a tab
 * coming back into focus asks again whatever the last answer was.
 *
 * Always settles. A 401 is "not confirmed", not a reason to leave for /login: the check runs
 * on focus, from a background worker, and a session that expired while the tab sat unused
 * would otherwise send the user away from what they were looking at just for switching back
 * to it (and leave this promise, and every upload waiting on it, pending forever). The
 * worker retries after its backoff; a page that needs the session redirects on its own. The
 * 401 is announced ({@link subscribeToSessionEnded}), so the user is told backup stopped.
 */
export function confirmSessionIsViewer(options: { maxAgeMs?: number } = {}): Promise<boolean> {
  const viewer = getWorkspaceViewer();
  if (viewer === null) return Promise.resolve(true);

  const maxAgeMs = options.maxAgeMs ?? 0;
  if (
    maxAgeMs > 0 &&
    confirmedSession?.viewer === viewer &&
    Date.now() - confirmedSession.at < maxAgeMs
  ) {
    return Promise.resolve(true);
  }

  if (sessionCheck?.viewer === viewer) return sessionCheck.answer;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);

  const answer: Promise<boolean> = fetchApiData<{ id: string }>("/users/me", {
    method: "GET",
    signal: controller.signal,
    redirectOnInvalidSession: false,
  })
    .then((account) => {
      if (account.id === viewer) {
        confirmedSession = { viewer, at: Date.now() };
        return true;
      }

      confirmedSession = null;
      leaveSwitchedAccount();
      return false;
    })
    .catch((error: unknown) => {
      if (confirmedSession?.viewer === viewer) confirmedSession = null;
      console.error("Could not confirm the signed-in account before syncing", error);

      // The session ended (revoked, expired, signed out elsewhere): nothing backs up until the
      // user signs in again, and they have to be told (S-374). A network failure is not that.
      if (error instanceof ApiRequestError && error.status === 401) {
        sessionEndedListeners.forEach((listener) => listener());
      }

      return false;
    })
    .finally(() => {
      window.clearTimeout(timer);
      if (sessionCheck?.answer === answer) sessionCheck = null;
    });

  sessionCheck = { viewer, answer };
  return answer;
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
 * previous owner first, so another account's documents stay its own. Taking over from another
 * account drops its cloud cursors (the next pull must list this account from the start) and its
 * cached Master Profile, which holds that account's personal details; a device that had no
 * owner (a guest's, or any device before owners were recorded) keeps both.
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
 * Claims the device for `userId` unless documents on it need {@link findUnclaimedDocuments}: a
 * guest's or of unknown owner, to ask about. Another account's documents need nothing and stay
 * as they are; they are never looked for in this account. Synchronous, so a sign-in opens the
 * gate before any pull or upload asks.
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

    if (entriesAwaitingAnswer(all).length > 0) return false;

    claimWorkspace(userId);
  } catch (error) {
    console.error("Could not record this device's owner.", error);
    return false;
  }

  return true;
}

/** Any `updatedSince` makes the server walk oldest change first; this one covers every document. */
const FROM_THE_START = "1970-01-01T00:00:00.000Z";

/**
 * What one settle has learnt of the account's document ids, so asking about the next group of
 * documents does not list the account again. `complete` once a walk reached the last page.
 */
export interface AccountDocumentLookup {
  ids: Set<string>;
  complete: boolean;
}

export function createAccountDocumentLookup(): AccountDocumentLookup {
  return { ids: new Set(), complete: false };
}

/**
 * Records which of `wanted` are documents in the signed-in account. Walks the account's
 * metadata list (no bodies) oldest change first, so a document edited on another device
 * mid-walk moves behind the reader and still turns up; newest first it could jump ahead and be
 * missed, and the user's own copy would be put to them as missing from the cloud. A tombstone is
 * the account's document too: deleted, but theirs. Stops once every wanted id is known.
 */
async function findAccountDocumentIds(wanted: Set<string>, lookup: AccountDocumentLookup) {
  const allKnown = () => [...wanted].every((id) => lookup.ids.has(id));

  if (lookup.complete || allKnown()) return;

  for await (const page of DocumentApi.pages(undefined, {
    updatedSince: FROM_THE_START,
    limit: DOCUMENT_PAGE_SIZE,
  })) {
    for (const document of page.documents) lookup.ids.add(document.id);
    for (const tombstone of page.deleted) lookup.ids.add(tombstone.id);

    if (allKnown()) return;
  }

  lookup.complete = true;
}

/** Documents a guest made on this device, or whose owner was lost when the index was rebuilt. */
export interface UnclaimedDocuments {
  documents: DocumentMeta[];
  /**
   * Linked to a cloud document the account does not hold: deleted since, or from an account
   * that used this device before owners were recorded. They can be kept on this device under a
   * new id, or removed, but not added: the id is not this account's to write to.
   */
  cloudCopyMissing: boolean;
}

/**
 * The next documents on this device to ask `userId` about: a guest's, and those of unknown owner.
 * A copy linked to a document the account holds in the cloud is theirs (a device used before
 * owners were recorded) and is claimed on the spot; linked copies it does not hold are asked
 * about first, so the next question needs no second lookup. A document recorded as another
 * account's is never asked about or looked for: it stays, hidden for that account (S-372).
 * Returns null, with the device claimed, when nothing is left to ask about. Throws when the
 * account's documents cannot be listed: without that list the user's own copies would be put to
 * them as missing from the cloud, so the caller keeps sync blocked and asks again later. Pass one
 * `lookup` for every call of a settle, so the account is listed once.
 */
export async function findUnclaimedDocuments(
  userId: string,
  lookup: AccountDocumentLookup = createAccountDocumentLookup(),
): Promise<UnclaimedDocuments | null> {
  const awaiting = entriesAwaitingAnswer(listAllDocumentEntries());
  const linked = awaiting.filter((entry) => entry.sync.cloudDocumentId);

  if (linked.length > 0) {
    await findAccountDocumentIds(
      new Set(linked.flatMap((entry) => entry.sync.cloudDocumentId ?? [])),
      lookup,
    );

    const provable = linked.filter((entry) => lookup.ids.has(entry.sync.cloudDocumentId ?? ""));

    if (provable.length > 0 && !setDocumentOwners(provable, userId).ok) {
      throw new Error("This device's storage is full.");
    }

    const missing = linked.filter((entry) => !provable.includes(entry));

    if (missing.length > 0) return { cloudCopyMissing: true, documents: missing.map(toMeta) };
  }

  const unlinked = awaiting.filter((entry) => !entry.sync.cloudDocumentId);

  if (unlinked.length === 0) {
    claimWorkspace(userId);
    return null;
  }

  return { cloudCopyMissing: false, documents: unlinked.map(toMeta) };
}

/**
 * - `add`: the documents become the account's and take the account's auto-sync setting, like a
 *   new document. The account's other documents are not touched. Not for copies whose cloud
 *   document is missing.
 * - `keep`: they become the account's, but stay on this device only, opted out of every bulk
 *   sync toggle. A copy whose cloud document is missing also gets a fresh id, so backing it up
 *   by hand later creates a new cloud document instead of colliding with that one.
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
  if (unclaimed.cloudCopyMissing && choice === "add") {
    throw new Error(
      "These documents are linked to a cloud document your account does not have, so they can only be kept on this device or deleted.",
    );
  }

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

    const id = unclaimed.cloudCopyMissing
      ? (rekeyDocument(meta.type, meta.id)?.id ?? null)
      : meta.id;
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

  if (entriesAwaitingAnswer(listAllDocumentEntries()).length === 0) claimWorkspace(userId);
}

/** Pauses before asking the server again after a failed lookup (the last one repeats). */
const SETTLE_RETRY_DELAYS_MS = [30_000, 60_000, 120_000, 300_000, 600_000];

/** Consecutive failed lookups after which the user is told backup is paused. */
const PAUSED_AFTER_FAILURES = 2;

export interface WorkspaceSettleHandlers {
  /** A group of documents to ask the user about. */
  onUnclaimed: (found: UnclaimedDocuments) => void;
  /** Nothing is left to ask about: sync can start. */
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
 * blocked and asks nothing (going on would put the user's own copies to them as missing);
 * it is retried after a pause, and from the second failure in a row the user is told backup is
 * paused, with `retryNow` behind a "Try now" action.
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
  // Shared by every attempt: a retry after a failed page keeps the ids it already learnt.
  const lookup = createAccountDocumentLookup();

  const attempt = () => {
    if (cancelled || running) return;

    cancelRetry?.();
    cancelRetry = null;
    running = true;

    findUnclaimedDocuments(userId, lookup).then(
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
