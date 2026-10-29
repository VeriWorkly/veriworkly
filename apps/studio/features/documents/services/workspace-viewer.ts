import type { DocumentIndexEntry } from "@/types/document";

import { WORKSPACE_OWNER_STORAGE_KEY } from "./storage-keys";

/**
 * Who is using this device's workspace right now: the signed-in user's id, or null for a
 * guest. Every document carries its owner in the index (`DocumentIndexEntry.owner`), and
 * lists, search, editors and backups show only the viewer's own, so a guest on a shared
 * computer never sees the documents a signed-in account left there.
 */
let viewerId: string | null = null;

export function getWorkspaceViewer(): string | null {
  return viewerId;
}

export function setWorkspaceViewer(userId: string | null) {
  viewerId = userId;
}

/** The account this device was last claimed by; the owner of entries written before owners were. */
export function readDeviceOwner(): string | null {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(WORKSPACE_OWNER_STORAGE_KEY);
}

/**
 * The owner of a document whose index entry was rebuilt from its body after the index was
 * corrupted: who it belonged to was lost with the index. Such a document is shown only to the
 * device's owner (or anyone, on a device without one) and put to the signed-in user as a
 * question; it is never adopted without asking. No account id takes this form.
 */
export const UNKNOWN_DOCUMENT_OWNER = "unknown:index-rebuilt";

/** The documents among `entries` that belong to `owner` (null: a guest's). */
export function entriesOwnedBy<E extends Pick<DocumentIndexEntry, "owner">>(
  entries: E[],
  owner: string | null,
): E[] {
  const deviceOwner = readDeviceOwner();

  return entries.filter(
    (entry) => (entry.owner === undefined ? deviceOwner : entry.owner) === owner,
  );
}

/**
 * The documents among `entries` the current viewer may see. One of unknown owner is shown only
 * when nobody else can have a claim to it: the device has no owner, or the viewer is its owner.
 */
export function visibleEntries<E extends Pick<DocumentIndexEntry, "owner">>(entries: E[]): E[] {
  const deviceOwner = readDeviceOwner();
  const unknownVisible = deviceOwner === null || deviceOwner === viewerId;

  return entries.filter((entry) => {
    const owner = entry.owner === undefined ? deviceOwner : entry.owner;
    return owner === viewerId || (unknownVisible && owner === UNKNOWN_DOCUMENT_OWNER);
  });
}

/**
 * The documents among `entries` the signed-in user is asked about: a guest's, and those of
 * unknown owner. Either may be theirs, so neither syncs until they answer.
 */
export function entriesAwaitingAnswer<E extends Pick<DocumentIndexEntry, "owner">>(
  entries: E[],
): E[] {
  return [...entriesOwnedBy(entries, null), ...entriesOwnedBy(entries, UNKNOWN_DOCUMENT_OWNER)];
}

/**
 * The documents among `entries` that belong to an account other than `viewer` (the current
 * viewer unless given). They stay on this device for that account (S-372): never listed for,
 * uploaded, pulled into, backed up or removed by anyone else, and the account sees them again
 * when it signs back in.
 */
export function entriesOfOtherAccounts<E extends Pick<DocumentIndexEntry, "owner">>(
  entries: E[],
  viewer: string | null = viewerId,
): E[] {
  const deviceOwner = readDeviceOwner();

  return entries.filter((entry) => {
    const owner = entry.owner === undefined ? deviceOwner : entry.owner;
    return owner !== null && owner !== UNKNOWN_DOCUMENT_OWNER && owner !== viewer;
  });
}
