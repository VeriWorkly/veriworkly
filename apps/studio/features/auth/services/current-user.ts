import { cache } from "react";
import { unstable_rethrow } from "next/navigation";

import { accountName, backendApiUrl, WORKSPACE_SETTINGS_STORAGE_KEY } from "@/lib/constants";

import type {
  BaseDocument,
  DocumentMeta,
  DocumentSyncState,
} from "@/features/documents/core/types";

import { withDocumentIdentity } from "@/features/documents/core/content-identity";

import { downloadBlob } from "@/features/documents/export/download";
import {
  clearWorkspaceStorage,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import {
  WORKSPACE_BACKUP_FORMAT,
  type WorkspaceBackup,
} from "@/features/documents/services/import-service";
import { setWorkspaceUser } from "@/features/documents/services/workspace-owner";
import { getWorkspaceViewer } from "@/features/documents/services/workspace-viewer";
import { useUserStore } from "@/store/useUserStore";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";
import { pluralize } from "@/lib/pluralize";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  username?: string;
  createdAt?: string;
  emailVerified?: boolean;
  autoSyncEnabled?: boolean;
  shareResumeCount?: number;
};

type AccountProfileSummary = {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
  createdAt?: string;
  emailVerified?: boolean;
  autoSyncEnabled?: boolean;
  _count?: {
    shareLinks?: number;
  };
};

let memoryCache: SessionUser | null = null;

function toSessionUser(user: AccountProfileSummary | null | undefined): SessionUser | null {
  if (!user?.id || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: accountName(user.name),
    username: user.username ?? undefined,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    autoSyncEnabled: user.autoSyncEnabled,
    shareResumeCount: user._count?.shareLinks,
  };
}

/**
 * `/users/me` for the request being rendered, read once however many server components ask
 * (the layout and the profile page both do).
 *
 * `null` means a guest: no session cookie, or one the server rejects (401/403, but not the 403
 * of a CORS refusal, which is a misconfigured deploy). Anything else —
 * an auth outage (503 `AUTH_UNAVAILABLE`), a 429, a timeout — throws to the error boundary.
 * Rendering it as "guest" would show a signed-in user an empty, signed-out studio.
 */
export const fetchServerAccount = cache(async (): Promise<AccountProfileSummary | null> => {
  // Loaded on demand: this module also ships to the browser, which must bundle neither.
  const [{ cookies, headers }, { hasSessionCookieIn, isCorsRejection, serverFetchDataFrom }] =
    await Promise.all([import("next/headers"), import("@/lib/server-fetch-core")]);
  const request = { cookies: await cookies(), headers: await headers() };

  if (!hasSessionCookieIn(request.cookies)) return null;

  try {
    return await serverFetchDataFrom<AccountProfileSummary>(request, "/users/me");
  } catch (error) {
    unstable_rethrow(error);

    if (
      error instanceof ApiRequestError &&
      (error.status === 401 || error.status === 403) &&
      !isCorsRejection(error.status, error.message, error.details)
    ) {
      return null;
    }

    throw error;
  }
});

async function fetchServerSessionUser(): Promise<SessionUser | null> {
  return toSessionUser(await fetchServerAccount());
}

export async function fetchCurrentUser(force = false): Promise<SessionUser | null> {
  if (typeof window === "undefined") return fetchServerSessionUser();

  if (!force && memoryCache) return memoryCache;

  memoryCache = toSessionUser(
    await fetchApiData<AccountProfileSummary>("/users/me", { method: "GET" }),
  );

  return memoryCache;
}

const DETACHED_SYNC: DocumentSyncState = {
  enabled: false,
  status: "local-only",
  cloudDocumentId: null,
  lastSyncedAt: null,
  revision: 1,
};

/**
 * Every listed document as one restorable file: the toolbar's "Import JSON" reads it back,
 * one new document per entry.
 *
 * One file, not one per document: browsers block the second automatic download, and the
 * caller deletes the local copies right after. Cloud linkage is dropped so a restored copy
 * is a new local document, never a second writer to the original. A body that cannot be
 * read throws, so the caller never clears a device whose backup is incomplete. Only the
 * viewer's own documents can be read: another account's on this device count as unreadable.
 */
export function buildWorkspaceBackup(documents: DocumentMeta[], now = new Date()) {
  const stored = documents.map((meta) => loadDocumentById(meta.type, meta.id));
  const unreadable = stored.filter((document) => document === null).length;

  if (unreadable > 0) {
    throw new Error(
      `${pluralize(unreadable, "document")} could not be read, so no backup was made.`,
    );
  }

  return serializeWorkspaceBackup(stored as BaseDocument[], now);
}

/** Full documents as the backup file; `extras` carries what else an account backup holds. */
export function serializeWorkspaceBackup(
  documents: BaseDocument[],
  now = new Date(),
  extras: Pick<WorkspaceBackup, "masterProfile"> = {},
) {
  const backup: WorkspaceBackup = {
    format: WORKSPACE_BACKUP_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    ...extras,
    documents: documents.map((document) => ({
      ...document,
      sync: DETACHED_SYNC,
      content: withDocumentIdentity(document.content, { id: document.id, sync: DETACHED_SYNC }),
    })),
  };

  return {
    fileName: `veriworkly-backup-${now.toISOString().slice(0, 10)}.json`,
    json: JSON.stringify(backup, null, 2),
  };
}

export function downloadWorkspaceBackup(documents: DocumentMeta[]) {
  const { fileName, json } = buildWorkspaceBackup(documents);

  downloadBlob(new Blob([json], { type: "application/json" }), fileName);
}

const GUEST_MODE_COOKIE = "veriworkly-guest-mode";

/** Expired on every domain the login page sets it on: this host and the shared parent. */
function expireGuestModeCookie() {
  const expired = `${GUEST_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  const { hostname } = window.location;

  document.cookie = expired;

  if (hostname.endsWith("veriworkly.com")) {
    document.cookie = `${expired}; domain=.veriworkly.com`;
  } else if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    document.cookie = `${expired}; domain=.localhost`;
  }
}

/**
 * Forgets the account on this device: its documents, sync outbox, master-profile cache, the
 * guest flag and the signed-in user. Without it the next person to sign in on a shared
 * device inherits the previous user's documents, and auto-sync pushes them into their
 * account. The account's auto-sync setting goes too, so a guest's new documents start
 * local-only instead of waiting for a sync that never comes. Documents another account left
 * here stay for it, hidden (S-372).
 */
export function clearLocalAccountData() {
  const leaving = getWorkspaceViewer();

  memoryCache = null;
  setWorkspaceUser(null);
  clearWorkspaceStorage(leaving);
  window.localStorage.removeItem(WORKSPACE_SETTINGS_STORAGE_KEY);
  expireGuestModeCookie();
  useUserStore.getState().logout();
}

/**
 * Ends the server session, then clears local data. Throws while the session cookie is
 * still valid, so the UI never shows a signed-out state the server does not share.
 */
export async function signOutCurrentUser() {
  const response = await fetch(backendApiUrl("/auth/sign-out"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  // 401: the session had already ended, which is the state signing out asks for.
  if (!response.ok && response.status !== 401) {
    throw new Error(`Sign-out failed (${response.status}). You are still signed in.`);
  }

  clearLocalAccountData();
}
