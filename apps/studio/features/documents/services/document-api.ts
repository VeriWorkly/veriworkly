import type { DocumentType } from "@/features/documents/core/document-types";

import { backendApiUrl } from "@/lib/constants";

export type { DocumentType };

export interface CloudDocument {
  id: string;
  type: DocumentType;
  title: string;
  /** Absent unless the request asked for it — see DocumentApi.list. */
  content?: unknown;
  templateId: string;
  visibility: string;
  revision: number;
  lastSyncedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

/** A PATCH reply: the server neither reads back nor returns the body columns. */
export type CloudDocumentSummary = Omit<CloudDocument, "content" | "metadata">;

export interface DocumentListOptions {
  /** The `serverTime` of a previous list; returns only what changed at or after it. */
  updatedSince?: string;
  /** Include document bodies. Off by default — they dominate the payload. */
  includeContent?: boolean;
}

export interface DocumentListResult {
  documents: CloudDocument[];
  /** Documents soft-deleted since `updatedSince`. Always empty for a full list. */
  deleted: Array<{ id: string; deletedAt: string }>;
  /** The server's cursor for the next incremental list; null when the server sent none. */
  serverTime: string | null;
}

export interface DocumentCreateResult {
  document: CloudDocument;
  /**
   * False when the id already belonged to this user: the server returned the stored row
   * unchanged and did not apply the request body.
   */
  created: boolean;
}

/**
 * A non-2xx reply from the documents API, with what the server said about it.
 *
 * Callers decide on `status` and `details` rather than on the message text: the sync worker
 * treats 409 with `details.deletedAt` as "deleted elsewhere" and any other 409 on an update
 * as a revision conflict, which no wording change on the server can break.
 */
export class DocumentApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string | null = null,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = "DocumentApiError";
  }
}

export function isDocumentApiError(error: unknown, status?: number): error is DocumentApiError {
  return error instanceof DocumentApiError && (status === undefined || error.status === status);
}

async function toApiError(response: Response, fallbackMessage: string) {
  let body: { message?: unknown; code?: unknown; details?: unknown } = {};

  try {
    body = await response.json();
  } catch {
    // A proxy or gateway error page has no JSON body; the status and fallback still apply.
  }

  return new DocumentApiError(
    response.status,
    typeof body.message === "string" && body.message ? body.message : fallbackMessage,
    typeof body.code === "string" ? body.code : null,
    body.details ?? null,
  );
}

/**
 * Every documents call gives up after this long. A hung request would otherwise keep its
 * document "syncing" (and every later "Back up now" waiting on it) until the tab closed.
 */
const DOCUMENT_API_TIMEOUT_MS = 30_000;

async function request(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(backendApiUrl(path), {
      ...init,
      credentials: "include",
      signal: AbortSignal.timeout(DOCUMENT_API_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("The server took too long to answer. Check your connection and try again.");
    }

    throw error;
  }
}

export class DocumentApi {
  /**
   * List documents for the current user.
   *
   * Bodies are opt-in: a metadata-only list of 50 resumes is a few KB where the
   * full-content version was ~600KB. Callers that merge content (the sync hydrate
   * path) must pass `includeContent: true`.
   */
  static async list(
    type?: DocumentType,
    options?: DocumentListOptions,
  ): Promise<DocumentListResult> {
    let url = "/documents";

    const params = new URLSearchParams();

    if (type) params.append("type", type);
    if (options?.updatedSince) params.append("updatedSince", options.updatedSince);
    if (options?.includeContent) params.append("includeContent", "true");

    if (params.toString()) url += `?${params.toString()}`;

    const response = await request(url, { method: "GET" });

    if (!response.ok) throw await toApiError(response, "Failed to fetch documents");

    const body = await response.json();

    return {
      documents: body.data ?? [],
      deleted: Array.isArray(body.deleted) ? body.deleted : [],
      serverTime: typeof body.serverTime === "string" ? body.serverTime : null,
    };
  }

  static async get(id: string): Promise<CloudDocument> {
    const response = await request(`/documents/${id}`, { method: "GET" });

    if (!response.ok) throw await toApiError(response, "Document not found");

    const { data } = await response.json();

    return data;
  }

  /**
   * Create a document under the client's id. A 200 means the id was already this user's
   * document and nothing was written — see {@link DocumentCreateResult.created}.
   */
  static async create(input: {
    id?: string;
    type: DocumentType;
    title: string;
    content: unknown;
    templateId?: string;
    visibility?: string;
  }): Promise<DocumentCreateResult> {
    const response = await request("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw await toApiError(response, "Failed to create document");

    const { data } = await response.json();

    return { document: data, created: response.status !== 200 };
  }

  /** Update an existing document. A stale `revision` is a 409. */
  static async update(
    id: string,
    input: {
      title?: string;
      content?: unknown;
      templateId?: string;
      visibility?: string;
      updateShareSlug?: boolean;
      revision: number;
    },
  ): Promise<CloudDocumentSummary> {
    const response = await request(`/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw await toApiError(response, "Failed to update document");

    const { data } = await response.json();

    return data;
  }

  static async delete(id: string): Promise<void> {
    const response = await request(`/documents/${id}`, { method: "DELETE" });

    if (!response.ok) throw await toApiError(response, "Failed to delete document");
  }
}
