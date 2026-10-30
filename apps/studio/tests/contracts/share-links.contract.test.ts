import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResumeData } from "@/types/resume";
import { defaultResume } from "@/features/resume/constants/default-resume";
import {
  createShareLink,
  listSharedDocumentIds,
  fetchShareLinkByUsernameAndSlug,
  verifyShareLinkByUsernameAndSlug,
} from "@/features/documents/services/share-service";

const mockedBackendApiUrl = vi.fn((path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith("/api/")
    ? normalizedPath
    : `/api/v1${normalizedPath}`;

  return `http://localhost:4000${versionedPath}`;
});

vi.mock("@/lib/constants", () => ({
  backendApiUrl: (path: string) => mockedBackendApiUrl(path),
}));

describe("share links contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedBackendApiUrl.mockClear();
  });

  it("S-418: creates a share link with the request body the server validates", async () => {
    // The real create response: the stored link without its password hash or snapshot.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "sl_1",
          token: "tok_123",
          username: "jane",
          documentId: defaultResume.id,
          documentSlug: "jane-doe",
          expiresAt: null,
          allowDownload: true,
          hasPassword: false,
        },
      }),
    } as Response);

    const result = await createShareLink(
      {
        id: defaultResume.id,
        type: "RESUME",
        title: "Jane Doe",
        templateId: defaultResume.templateId,
        content: defaultResume,
        updatedAt: defaultResume.updatedAt,
        sync: defaultResume.sync,
      },
      {
        noExpiry: true,
      },
    );

    expect(result).toMatchObject({ token: "tok_123", username: "jane", expiresAt: null });
    // Since SV-37 the server rejects a date sent together with noExpiry, so the body is the contract.
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      documentId: defaultResume.id,
      snapshot: expect.objectContaining({ type: "RESUME", title: "Jane Doe" }),
      expiresAt: null,
      noExpiry: true,
      updateSlug: false,
      removePassword: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/api/v1/shares`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    expect(mockedBackendApiUrl).toHaveBeenCalledWith(`/shares`);
  });

  it("fetches shared document ids in one request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          documentIds: ["doc_1", "doc_2"],
        },
      }),
    } as Response);

    const result = await listSharedDocumentIds(["doc_1", "doc_1", "doc_2"]);

    expect(result).toEqual(["doc_1", "doc_2"]);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/api/v1/shares/documents/shared-ids?ids=doc_1%2Cdoc_2`,
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
  });

  it("does not call the share status endpoint for an empty document set", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(listSharedDocumentIds([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches a public share link snapshot", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          passwordRequired: false,
          documentTitle: "Jane Doe",
          expiresAt: null,
          snapshot: defaultResume,
        },
      }),
    } as Response);

    const result = await fetchShareLinkByUsernameAndSlug<ResumeData>("username_1", "slug_1");

    expect(result.passwordRequired).toBe(false);
    expect(result.snapshot?.id).toBe(defaultResume.id);
  });

  it("verifies a protected share link with password", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          passwordRequired: false,
          documentTitle: "Jane Doe",
          expiresAt: null,
          snapshot: defaultResume,
        },
      }),
    } as Response);

    const result = await verifyShareLinkByUsernameAndSlug<ResumeData>(
      "username_1",
      "slug_1",
      "secret",
    );

    expect(result.passwordRequired).toBe(false);
  });

  it("returns invalid password error for failed verify", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Invalid password" }),
    } as Response);

    await expect(verifyShareLinkByUsernameAndSlug("username_1", "slug_1", "wrong")).rejects.toThrow(
      "Invalid password",
    );
  });

  it("returns not found error for expired or missing link", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Shared document not found" }),
    } as Response);

    await expect(
      fetchShareLinkByUsernameAndSlug("username_1", "expired_or_missing"),
    ).rejects.toThrow("Shared document not found");
  });
});
