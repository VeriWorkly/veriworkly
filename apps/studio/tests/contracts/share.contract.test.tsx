import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BaseDocument } from "@/features/documents/core/types";
import type { ResumeData } from "@/types/resume";

import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { toResumeDocument } from "@/features/resume/services/resume-core";

const mockedBackendApiUrl = vi.fn((path: string) => `http://localhost:4000/api/v1${path}`);

vi.mock("@/lib/constants", () => ({
  backendApiUrl: (path: string) => mockedBackendApiUrl(path),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

// The share page reads the link through `lib/server-fetch`, which needs a request scope.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "", has: () => false }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null }) },
}));

const syncDocumentNow = vi.fn();
const loadDocumentById = vi.fn();

vi.mock("@/features/documents/services/document-sync", () => ({
  syncDocumentNow: (...args: unknown[]) => syncDocumentNow(...args),
}));

vi.mock("@/features/documents/services/document-workspace-service", () => ({
  loadDocumentById: (...args: unknown[]) => loadDocumentById(...args),
}));

const HIDDEN_PHONE = "+1 415 555 2671";

function resumeWithHiddenBasics(): BaseDocument {
  const resume: ResumeData = {
    ...defaultResume,
    basics: { ...defaultResume.basics, phone: HIDDEN_PHONE },
    sections: defaultResume.sections.map((section) =>
      section.id === "basics" || section.id === "experience"
        ? { ...section, visible: false }
        : section,
    ),
    sync: { ...defaultResume.sync, enabled: true, cloudDocumentId: "cloud-123" },
  };

  return toResumeDocument(resume);
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("share contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    syncDocumentNow.mockReset();
    loadDocumentById.mockReset();
  });

  describe("S-159 the snapshot is a visible-only projection", () => {
    it("S-159 a hidden phone number and hidden section are not in the POST /shares body", async () => {
      const { createShareLink } = await import("@/features/documents/services/share-service");
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          jsonResponse(201, { data: { id: "s1", token: "t", username: "u", expiresAt: null } }),
        );

      const document = resumeWithHiddenBasics();
      const hiddenCompany = (document.content as ResumeData).experience[0].company;

      await createShareLink(document, { noExpiry: true });

      const body = String(fetchMock.mock.calls[0][1]?.body);

      expect(body).not.toContain(HIDDEN_PHONE);
      expect(body).not.toContain(hiddenCompany);
      expect(body).not.toContain("cloud-123");
      expect(JSON.parse(body).snapshot).not.toHaveProperty("sync");
      expect(JSON.parse(body).snapshot.content).not.toHaveProperty("sync");
    });

    it("S-159 a cover letter's hidden sections and job post are not uploaded", async () => {
      const { toShareSnapshot } = await import("@/features/documents/services/share-service");
      const letter = createDefaultCoverLetter("cl-1");
      letter.content = {
        ...letter.content,
        senderPhone: HIDDEN_PHONE,
        jobPost: "Internal job post text",
        appearance: { ...letter.content.appearance, hiddenSections: ["profile"] },
      };

      const serialised = JSON.stringify(toShareSnapshot(letter));

      expect(serialised).not.toContain(HIDDEN_PHONE);
      expect(serialised).not.toContain("Internal job post text");
      expect(serialised).not.toContain("cloudDocumentId");
    });
  });

  describe("S-216 S-245 sharing backs the document up first", () => {
    it("S-216 syncs before snapshotting and shares what the sync stored", async () => {
      const { prepareShareSnapshot } = await import("@/features/documents/services/prepare-share");
      const stored = resumeWithHiddenBasics();
      loadDocumentById.mockReturnValue(stored);
      syncDocumentNow.mockResolvedValue({ ok: true, message: "Synced" });

      const result = await prepareShareSnapshot("RESUME", stored.id);

      expect(syncDocumentNow).toHaveBeenCalledWith("RESUME", stored.id);
      expect(result).toEqual({ ok: true, document: stored });
    });

    it("S-245 a local-only document is not uploaded without the user asking", async () => {
      const { prepareShareSnapshot } = await import("@/features/documents/services/prepare-share");
      const stored = resumeWithHiddenBasics();
      loadDocumentById.mockReturnValue({ ...stored, sync: { ...stored.sync, enabled: false } });

      const result = await prepareShareSnapshot("RESUME", stored.id);

      expect(syncDocumentNow).not.toHaveBeenCalled();
      expect(result).toMatchObject({ ok: false, reason: "local-only" });
    });

    it("S-245 a failed sync explains why instead of a raw 'Document not found'", async () => {
      const { prepareShareSnapshot } = await import("@/features/documents/services/prepare-share");
      const stored = resumeWithHiddenBasics();
      loadDocumentById.mockReturnValue(stored);
      syncDocumentNow.mockResolvedValue({ ok: false, message: "Free plan allows one resume." });

      const result = await prepareShareSnapshot("RESUME", stored.id);

      expect(result).toEqual({
        ok: false,
        reason: "sync-failed",
        message: "Back up this document to share it. Free plan allows one resume.",
      });
    });
  });

  describe("S-142 S-254 expiry is the end of the chosen local day", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it("S-254 under America/Los_Angeles the link lives until local midnight", async () => {
      process.env.TZ = "America/Los_Angeles";
      const { endOfLocalDay, isPastLocalDate } = await import("@/lib/local-date");

      expect(endOfLocalDay("2026-11-03").toISOString()).toBe("2026-11-04T07:59:59.999Z");
      expect(isPastLocalDate("2020-01-01")).toBe(true);
      expect(isPastLocalDate("2999-01-01")).toBe(false);
    });
  });

  describe("S-041 S-227 the public page", () => {
    it("S-041 a RESUME envelope goes to the template, never a <pre> of its JSON", async () => {
      const { default: ShareDocumentClient } =
        await import("@/app/share/[username]/[slug]/share-document-client");
      const { toShareSnapshot } = await import("@/features/documents/services/share-service");

      const html = renderToStaticMarkup(
        <ShareDocumentClient
          username="jane"
          slug="resume"
          initialData={{
            passwordRequired: false,
            documentTitle: "Jane Doe",
            expiresAt: null,
            snapshot: toShareSnapshot(toResumeDocument(defaultResume)),
          }}
        />,
      );

      expect(html).not.toContain("<pre");
      expect(html).not.toContain("&quot;basics&quot;");
      expect(html).toContain("Loading resume");
    });

    it("S-041 an unsupported document type gets a full-screen message", async () => {
      const { readShareSnapshot, toShareSnapshot } =
        await import("@/features/documents/services/share-service");

      expect(readShareSnapshot({ type: "PORTFOLIO", content: {}, templateId: "x" })).toEqual({
        kind: "unsupported",
      });
      expect(readShareSnapshot(toShareSnapshot(toResumeDocument(defaultResume))).kind).toBe(
        "resume",
      );
      expect(readShareSnapshot(defaultResume).kind).toBe("resume");
    });
  });

  describe("S-044 S-176 share page statuses and metadata", () => {
    async function renderPage(status: number, body: unknown) {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(status, body));
      const { default: SharedDocumentPage } = await import("@/app/share/[username]/[slug]/page");

      return renderToStaticMarkup(
        await SharedDocumentPage({ params: Promise.resolve({ username: "jane", slug: "cv" }) }),
      );
    }

    it("S-044 410 says the link has expired", async () => {
      const html = await renderPage(410, { message: "Link expired" });

      expect(html).toContain("This link has expired");
      expect(html).not.toContain("Dashboard");
    });

    it("S-044 401 and 403 say the document is not available", async () => {
      expect(await renderPage(403, { message: "Forbidden" })).toContain("not available");
      expect(await renderPage(401, { message: "Unauthorized" })).toContain("not available");
    });

    it("S-176 metadata titles the page after the shared document and keeps noindex", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse(200, {
          data: { passwordRequired: false, documentTitle: "Jane Doe CV", expiresAt: null },
        }),
      );
      const { generateMetadata } = await import("@/app/share/[username]/[slug]/page");

      const metadata = await generateMetadata({
        params: Promise.resolve({ username: "jane", slug: "cv-meta" }),
      });

      expect(metadata.title).toEqual({ absolute: "Jane Doe CV | VeriWorkly" });
      expect(metadata.robots).toEqual({ index: false, follow: false });
    });

    it("S-325 S-176 link previews name the shared document and its own address, not the dashboard", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse(200, {
          data: { passwordRequired: false, documentTitle: "Jane Doe CV", expiresAt: null },
        }),
      );
      const { generateMetadata } = await import("@/app/share/[username]/[slug]/page");

      const metadata = await generateMetadata({
        params: Promise.resolve({ username: "jane", slug: "cv-og" }),
      });

      expect(metadata.openGraph).toMatchObject({ url: "/share/jane/cv-og", title: "Jane Doe CV" });
      expect(JSON.stringify(metadata.openGraph)).not.toContain("dashboard-page-og");
      expect(metadata.twitter).toMatchObject({ card: "summary", title: "Jane Doe CV" });
    });

    it("S-325 a password-protected link does not name its document in previews", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse(200, {
          data: { passwordRequired: true, documentTitle: "Jane Doe CV", expiresAt: null },
        }),
      );
      const { generateMetadata } = await import("@/app/share/[username]/[slug]/page");

      const metadata = await generateMetadata({
        params: Promise.resolve({ username: "jane", slug: "cv-locked" }),
      });

      expect(JSON.stringify(metadata)).not.toContain("Jane Doe CV");
    });
  });

  describe("the recruiter's page (S-322, S-227)", () => {
    it("S-322 the resume is scaled to fit a phone, never enlarged", async () => {
      const { fitToWidthScale } = await import("@/app/share/components/ResumeCanvas");

      expect(fitToWidthScale(375, 796)).toBeCloseTo(375 / 796);
      expect(fitToWidthScale(1200, 796)).toBe(1);
    });

    it("S-322 O6 LOW the header asks for no session and does not stick on phones", async () => {
      const { ShareHeaderBar } = await import("@/app/share/components/ShareHeaderBar");
      const { authClient } = await import("@/lib/auth-client");
      const useSession = vi.spyOn(authClient, "useSession");

      const html = renderToStaticMarkup(<ShareHeaderBar title="CV" expiresAt={null} />);

      expect(useSession).not.toHaveBeenCalled();
      expect(html).toContain("md:sticky");
      expect(html).not.toMatch(/class="sticky/);
    });

    it("S-227 recruiters are not offered the editable JSON source", () => {
      const source = readFileSync(
        join(__dirname, "..", "..", "app/share/components/DownloadActions.tsx"),
        "utf8",
      );

      expect(source).not.toMatch(/export-json|>\s*JSON\s*</);
    });

    it("S-322 before the scale is measured the page scrolls sideways, and a print drops the scale", async () => {
      const { ResumeCanvas } = await import("@/app/share/components/ResumeCanvas");

      const html = renderToStaticMarkup(
        <ResumeCanvas
          sharePreviewId="share-page"
          resume={defaultResume}
          templateComponent={() => <p>page</p>}
        />,
      );

      expect(html).toContain("overflow-x-auto");
      expect(html).not.toMatch(/class="mx-auto[^"]*overflow-hidden/);
      expect(html).toContain("print:transform-none!");
      expect(html).toContain("print:w-auto!");
    });
  });

  it("S-180 share verify shows the server's 429 text, not 'Invalid password'", async () => {
    const { verifyShareLinkByUsernameAndSlug } =
      await import("@/features/documents/services/share-service");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(429, { message: "Too many password attempts. Please try again later." }),
    );

    await expect(verifyShareLinkByUsernameAndSlug("jane", "cv", "x")).rejects.toThrow(
      "Too many password attempts",
    );
  });
});

describe("S-056 S-097 robots and sitemap", () => {
  const appUrl = "https://studio.example.test";

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
    vi.stubEnv("SITE_URL", "https://marketing.example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("S-056 the sitemap lists only the indexable login page on the studio's own origin", async () => {
    const { default: sitemap } = await import("@/app/sitemap");

    expect(sitemap().map((entry) => entry.url)).toEqual([`${appUrl}/login`]);
  });

  it("S-097 robots allows the machine-readable files and points at the studio sitemap", async () => {
    const { default: robots } = await import("@/app/robots");
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const allowed = rules.flatMap((rule) => rule.allow ?? []);
    const disallowed = rules.flatMap((rule) => rule.disallow ?? []);

    expect(result.sitemap).toBe(`${appUrl}/sitemap.xml`);
    expect(allowed).toEqual(
      expect.arrayContaining(["/login", "/llms.txt", "/openapi.json", "/.well-known/"]),
    );
    expect(disallowed).not.toContain("/test");
    expect(disallowed).not.toContain("/og-generator");
  });
});

describe("S-143 UI copy makes no encryption claims", () => {
  const studioRoot = join(__dirname, "..", "..");

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it("S-143 no source under app, components or features says 'encrypt'", () => {
    const offenders = ["app", "components", "features"]
      .flatMap((dir) => sourceFiles(join(studioRoot, dir)))
      .filter((file) =>
        /encrypt/i.test(
          readFileSync(file, "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, ""),
        ),
      )
      .map((file) => relative(studioRoot, file));

    expect(offenders).toEqual([]);
  });
});

describe("share-link expiry (owner decision B)", () => {
  const now = new Date("2026-10-27T12:00:00.000Z");
  const inDaysFrom = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  it("offers 7, 14, 30 and 90 days and Never, with 7 days first for a new link", async () => {
    const { SHARE_EXPIRY_OPTIONS } = await import("@/features/documents/services/share-expiry");
    const source = readFileSync(
      join(__dirname, "..", "..", "components/modals/ShareDocumentModal.tsx"),
      "utf8",
    );

    expect(SHARE_EXPIRY_OPTIONS.map((option) => option.label)).toEqual([
      "7 days",
      "14 days",
      "30 days",
      "90 days",
      "Never",
    ]);
    expect(source).toContain('useState<ShareExpiryChoice>("7")');
    expect(source).toContain('setExpiryChoice(links.length > 0 ? "keep" : "7")');
  });

  it("each period becomes an expiresAt that many days from now; Never sends null", async () => {
    const { shareExpiryPayload } = await import("@/features/documents/services/share-expiry");

    for (const days of [7, 14, 30, 90]) {
      expect(shareExpiryPayload(String(days) as "7", null, now)).toEqual({
        expiresAt: inDaysFrom(days),
        noExpiry: false,
      });
    }

    expect(shareExpiryPayload("never", inDaysFrom(3), now)).toEqual({
      expiresAt: null,
      noExpiry: true,
    });
  });

  it("an existing link keeps its stored expiry, including none", async () => {
    const { shareExpiryPayload } = await import("@/features/documents/services/share-expiry");

    expect(shareExpiryPayload("keep", "2026-12-01T00:00:00.000Z", now)).toEqual({
      expiresAt: "2026-12-01T00:00:00.000Z",
      noExpiry: false,
    });
    expect(shareExpiryPayload("keep", null, now)).toEqual({ expiresAt: null, noExpiry: true });
  });
});
