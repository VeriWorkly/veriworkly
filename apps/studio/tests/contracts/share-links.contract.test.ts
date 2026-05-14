import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { createResumeShareLink } from "@/features/resume/services/share-links";
import { fetchShareLink, verifyShareLink } from "@/features/resume/services/public-share";

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

  it("creates a share link for a resume", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "sl_1",
          token: "tok_123",
          expiresAt: null,
        },
      }),
    } as Response);

    const result = await createResumeShareLink(defaultResume, {
      noExpiry: true,
    });

    expect(result.token).toBe("tok_123");
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

  it("fetches a public share link snapshot", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          passwordRequired: false,
          resumeTitle: "Jane Doe",
          expiresAt: null,
          snapshot: defaultResume,
        },
      }),
    } as Response);

    const result = await fetchShareLink("tok_123");

    expect(result.passwordRequired).toBe(false);
    expect(result.snapshot?.id).toBe(defaultResume.id);
  });

  it("verifies a protected share link with password", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          passwordRequired: false,
          resumeTitle: "Jane Doe",
          expiresAt: null,
          snapshot: defaultResume,
        },
      }),
    } as Response);

    const result = await verifyShareLink("tok_123", "secret");

    expect(result.passwordRequired).toBe(false);
  });

  it("returns invalid password error for failed verify", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Invalid password" }),
    } as Response);

    await expect(verifyShareLink("tok_123", "wrong")).rejects.toThrow("Invalid password");
  });

  it("returns not found error for expired or missing link", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Shared document not found" }),
    } as Response);

    await expect(fetchShareLink("expired_or_missing")).rejects.toThrow("Shared document not found");
  });
});
