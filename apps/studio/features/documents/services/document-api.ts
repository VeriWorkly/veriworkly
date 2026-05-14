import { backendApiUrl } from "@/lib/constants";

export type DocumentType = "RESUME" | "COVER_LETTER" | "PORTFOLIO" | "LINK_IN_BIO";

export interface CloudDocument {
  id: string;
  type: DocumentType;
  title: string;
  content: unknown;
  templateId: string;
  visibility: string;
  revision: number;
  lastSyncedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export class DocumentApi {
  /**
   * List documents for the current user
   */
  static async list(type?: DocumentType, updatedSince?: string): Promise<CloudDocument[]> {
    let url = "/documents";
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (updatedSince) params.append("updatedSince", updatedSince);

    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(backendApiUrl(url), {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch documents");
    const { data } = await response.json();
    return data;
  }

  /**
   * Get a single document
   */
  static async get(id: string): Promise<CloudDocument> {
    const response = await fetch(backendApiUrl(`/documents/${id}`), {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Document not found");
    const { data } = await response.json();
    return data;
  }

  /**
   * Create a new document
   */
  static async create(input: {
    id?: string;
    type: DocumentType;
    title: string;
    content: unknown;
    templateId?: string;
    visibility?: string;
  }): Promise<CloudDocument> {
    const response = await fetch(backendApiUrl("/documents"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error("Failed to create document");
    const { data } = await response.json();
    return data;
  }

  /**
   * Update an existing document (Optimistic Concurrency)
   */
  static async update(
    id: string,
    input: {
      title?: string;
      content?: unknown;
      templateId?: string;
      visibility?: string;
      revision: number;
    },
  ): Promise<CloudDocument> {
    const response = await fetch(backendApiUrl(`/documents/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });

    if (response.status === 409) {
      throw new Error("Conflict: Document has been updated elsewhere");
    }

    if (!response.ok) throw new Error("Failed to update document");
    const { data } = await response.json();
    return data;
  }

  /**
   * Delete a document
   */
  static async delete(id: string): Promise<void> {
    const response = await fetch(backendApiUrl(`/documents/${id}`), {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to delete document");
  }
}
