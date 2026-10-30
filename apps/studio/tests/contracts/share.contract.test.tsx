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

vi.mock("@/lib/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants")>()),
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

  describe("S-142 expiry is the end of the chosen local day", () => {
    it("S-142 S-356 under America/Los_Angeles a date lives until local midnight", async () => {
      vi.stubEnv("TZ", "America/Los_Angeles");
      const { endOfLocalDay, isPastLocalDate } = await import("@/lib/local-date");

      expect(endOfLocalDay("2026-11-03").toISOString()).toBe("2026-11-04T07:59:59.999Z");
      expect(isPastLocalDate("2020-01-01")).toBe(true);
      expect(isPastLocalDate("2999-01-01")).toBe(false);
    });
  });

  describe("S-254 a link edited since it was shared says so", () => {
    it("S-254 the shared version is stale only once the document was edited after it", async () => {
      const { isShareSnapshotStale } = await import("@/components/modals/ShareDocumentModal");

      expect(isShareSnapshotStale("2026-10-27T10:00:01.000Z", "2026-10-27T10:00:00.000Z")).toBe(
        true,
      );
      expect(isShareSnapshotStale("2026-10-27T10:00:00.000Z", "2026-10-27T10:00:00.000Z")).toBe(
        false,
      );
      expect(isShareSnapshotStale(null, "2026-10-27T10:00:00.000Z")).toBe(false);
    });

    it("S-254 a view after the edit does not hide the warning: the snapshot time is compared", async () => {
      const { isShareSnapshotStale } = await import("@/components/modals/ShareDocumentModal");
      const { shareSnapshotTime } = await import("@/features/documents/services/share-service");

      // Shared at T0, edited at T1, then the view flush moved `updatedAt` to T2.
      const link = {
        updatedAt: "2026-10-27T12:00:00.000Z",
        snapshotAt: "2026-10-27T10:00:00.000Z",
      };

      expect(shareSnapshotTime(link)).toBe("2026-10-27T10:00:00.000Z");
      expect(isShareSnapshotStale("2026-10-27T11:00:00.000Z", shareSnapshotTime(link))).toBe(true);
      // A list cached before the server sent `snapshotAt` falls back to `updatedAt`.
      expect(shareSnapshotTime({ updatedAt: link.updatedAt })).toBe(link.updatedAt);
    });

    it("S-254 a stale link offers to update the shared version; a current one does not", async () => {
      const { SharedVersionNotice } = await import("@/components/modals/ShareDocumentModal");
      const notice = (stale: boolean) =>
        renderToStaticMarkup(
          <SharedVersionNotice
            sharedAt="2026-10-27T10:00:00.000Z"
            stale={stale}
            busy={false}
            onUpdate={() => {}}
          />,
        );

      expect(notice(true)).toContain("the link still shows the older version");
      expect(notice(true)).toContain("Update shared version");
      expect(notice(false)).toContain("Shared version from");
      expect(notice(false)).not.toContain("Update shared version");
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
      const { toShareSnapshot } = await import("@/features/documents/services/share-service");
      const { readShareSnapshot } = await import("@/features/documents/services/share-snapshot");

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

    it("the server-rendered page carries the resume itself, visible, not a spinner", async () => {
      const { toShareSnapshot } = await import("@/features/documents/services/share-service");
      const name = "Quinn Ashdown-Reyes";
      const resume = { ...defaultResume, basics: { ...defaultResume.basics, fullName: name } };

      const html = await renderPage(200, {
        data: {
          passwordRequired: false,
          documentTitle: "Quinn CV",
          expiresAt: null,
          snapshot: toShareSnapshot(toResumeDocument(resume)),
        },
      });

      expect(html).not.toContain("Loading resume");
      // Drawn once: the pages are cut in the browser, so the server's copy is the only one.
      expect(html.split(name)).toHaveLength(2);

      // Nothing between the canvas and the name hides it: no aria-hidden, inert, transparent
      // or off-screen box — the measuring copy's state once the pages are drawn.
      const canvas = html.indexOf('id="share-document-preview-jane-cv"');
      const upToName = html.slice(canvas, html.indexOf(name));

      expect(canvas).toBeGreaterThan(-1);
      expect(upToName).not.toMatch(/aria-hidden="true"|\binert=""|opacity-0|-10000/);
      expect(upToName).not.toContain("data-export-exclude");
      // And it is what an export or a print takes until the pages replace it.
      expect(upToName).toContain('data-resume-pages="true"');
    });

    it("a locked link renders no resume on the server", async () => {
      const html = await renderPage(200, {
        data: { passwordRequired: true, expiresAt: null },
      });

      expect(html).not.toContain("resume-container");
      expect(html).not.toContain(defaultResume.basics.fullName);
    });

    it("S-044 410 says the link has expired", async () => {
      const html = await renderPage(410, { message: "Link expired" });

      expect(html).toContain("This link has expired");
      expect(html).not.toContain("Dashboard");
    });

    it("V-421 a link whose owner hid downloads shows no Download button; others still do", async () => {
      const { toShareSnapshot } = await import("@/features/documents/services/share-service");
      const data = {
        passwordRequired: false,
        resumeTitle: "Quinn CV",
        documentTitle: "Quinn CV",
        expiresAt: null,
        snapshot: toShareSnapshot(toResumeDocument(defaultResume)),
      };

      const hidden = await renderPage(200, { data: { ...data, allowDownload: false } });
      expect(hidden).toContain(defaultResume.basics.fullName);
      expect(hidden).not.toContain("lucide-download");

      expect(await renderPage(200, { data: { ...data, allowDownload: true } })).toContain(
        "lucide-download",
      );
      // A public read cached before the setting existed carries none: the buttons stay.
      expect(await renderPage(200, { data })).toContain("lucide-download");
    });

    it("S-399 the share page's PDF download warns first when characters would print blank", async () => {
      const { pdfCharacterWarning } =
        await import("@/features/documents/export/pdf-unsupported-text");
      const resume = structuredClone(defaultResume);
      resume.basics.fullName = "राहुल शर्मा";

      expect(pdfCharacterWarning({ type: "RESUME", content: resume })).toMatch(
        /^These characters will be blank in the PDF: Name \(/,
      );
      expect(pdfCharacterWarning({ type: "RESUME", content: defaultResume })).toBeNull();

      // The reader's Download menu runs the editor's check and dialog before the PDF.
      const source = readFileSync(
        join(__dirname, "..", "..", "app/share/components/DownloadActions.tsx"),
        "utf8",
      );
      expect(source).toMatch(/pdfCharacterWarning\(\{ type: "RESUME", content: resume \}\)/);
      expect(source).toContain("<PdfCharacterWarning");
    });

    it("S-398 the modal offers the download switch only where the page has a Download button", async () => {
      const { shareOffersDownloads, toShareSnapshot } =
        await import("@/features/documents/services/share-service");
      const letter = createDefaultCoverLetter("letter-1");

      const html = await renderPage(200, {
        data: {
          passwordRequired: false,
          documentTitle: "Letter",
          expiresAt: null,
          allowDownload: true,
          snapshot: toShareSnapshot(letter),
        },
      });

      expect(html).not.toContain("lucide-download");
      expect(shareOffersDownloads("COVER_LETTER")).toBe(false);
      expect(shareOffersDownloads("RESUME")).toBe(true);
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

    it.each(["a4", "letter"] as const)(
      "(c) the shared %s page is one page tall, not two",
      async (paperSize) => {
        const { ResumeCanvas } = await import("@/app/share/components/ResumeCanvas");
        const { resumeTemplateRegistry } = await import("@/templates/resume/registry");
        const { getPageGeometry } = await import("@/templates/shared/page-geometry");
        const resume = {
          ...defaultResume,
          customization: { ...defaultResume.customization, paperSize },
        };

        for (const id of resumeTemplateRegistry.ids) {
          const Template = await resumeTemplateRegistry.loadWeb(id);
          const html = renderToStaticMarkup(
            <ResumeCanvas
              sharePreviewId="share-page"
              resume={resume}
              template={<Template resume={resume} className="" />}
            />,
          );

          expect(html, id).toContain(`min-height:${getPageGeometry(paperSize).heightPx}px`);
        }
      },
    );

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
        <ResumeCanvas sharePreviewId="share-page" resume={defaultResume} template={<p>page</p>} />,
      );

      expect(html).toContain("overflow-x-auto");
      expect(html).not.toMatch(/class="mx-auto[^"]*overflow-hidden/);
      expect(html).toContain("print:transform-none!");
      expect(html).toContain("print:w-auto!");
    });
  });

  it("S-180 share verify never calls a reply without a message a wrong password", async () => {
    const { verifyShareLinkByUsernameAndSlug } =
      await import("@/features/documents/services/share-service");
    // A rate limit answered by a proxy in front of the API carries no JSON message.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Too Many Requests", { status: 429 }),
    );

    const failure = verifyShareLinkByUsernameAndSlug("jane", "cv", "x");

    await expect(failure).rejects.toMatchObject({ status: 429 });
    await expect(failure).rejects.not.toThrow(/password/i);
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
    expect(source).toContain('setExpiryChoice(canKeepShareExpiry(links[0]) ? "keep" : "7")');
  });

  it("each period becomes an expiresAt that many days from now; Never sends null", async () => {
    const { shareExpiryPayload } = await import("@/features/documents/services/share-expiry");

    for (const days of [7, 14, 30, 90]) {
      expect(shareExpiryPayload(String(days) as "7", null, now)).toEqual({
        expiresAt: inDaysFrom(days),
        noExpiry: false,
      });
    }

    expect(shareExpiryPayload("never", { expiresAt: inDaysFrom(3) }, now)).toEqual({
      expiresAt: null,
      noExpiry: true,
    });
  });

  it("an existing link keeps its stored expiry, including none", async () => {
    const { shareExpiryPayload } = await import("@/features/documents/services/share-expiry");

    expect(shareExpiryPayload("keep", { expiresAt: "2026-12-01T00:00:00.000Z" }, now)).toEqual({
      expiresAt: "2026-12-01T00:00:00.000Z",
      noExpiry: false,
    });
    expect(shareExpiryPayload("keep", { expiresAt: null }, now)).toEqual({
      expiresAt: null,
      noExpiry: true,
    });
  });

  it("S-393 keep with no link left (revoked) is the 7-day default, never permanent", async () => {
    const { effectiveShareExpiryChoice, shareExpiryPayload } =
      await import("@/features/documents/services/share-expiry");

    expect(effectiveShareExpiryChoice("keep", undefined, now)).toBe("7");
    expect(shareExpiryPayload("keep", undefined, now)).toEqual({
      expiresAt: inDaysFrom(7),
      noExpiry: false,
    });
  });

  it("S-394 an expired link cannot keep its past date; updating it renews for 7 days", async () => {
    const { canKeepShareExpiry, effectiveShareExpiryChoice, shareExpiryPayload } =
      await import("@/features/documents/services/share-expiry");
    const expired = { expiresAt: inDaysFrom(-1) };

    expect(canKeepShareExpiry(expired, now)).toBe(false);
    expect(effectiveShareExpiryChoice("keep", expired, now)).toBe("7");
    expect(shareExpiryPayload("keep", expired, now)).toEqual({
      expiresAt: inDaysFrom(7),
      noExpiry: false,
    });
    expect(canKeepShareExpiry({ expiresAt: inDaysFrom(1) }, now)).toBe(true);
  });

  it("S-393 S-394 the modal sends and shows the same choice, and marks expired links", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "components/modals/ShareDocumentModal.tsx"),
      "utf8",
    );

    expect(source).toContain("effectiveShareExpiryChoice(expiryChoice, activeLink)");
    expect(source).toContain("shareExpiryPayload(shownExpiryChoice, activeLink)");
    expect(source).toContain("value={shownExpiryChoice}");
    expect(source).toContain('"Expired" : "Expires"');
  });
});

describe("S-402 the password gate sends one unlock at a time", () => {
  // Finds the password input in the gate's element tree, to press Enter on it.
  function findById(node: unknown, id: string): { props: Record<string, unknown> } | null {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findById(child, id);
        if (found) return found;
      }
      return null;
    }
    const element = node as { props?: Record<string, unknown> };
    if (!element.props) return null;
    if (element.props.id === id) return element as { props: Record<string, unknown> };
    return findById(element.props.children, id);
  }

  it("S-402 Enter while a check is in flight does not post again (5 tries per 5 minutes)", async () => {
    const { PasswordGateModal } = await import("@/app/share/components/PasswordGateModal");
    const pressEnter = (verifying: boolean) => {
      const onUnlock = vi.fn();
      const tree = PasswordGateModal({
        password: "wrong",
        verifying,
        error: null,
        onUnlock,
        onPasswordChange: () => {},
      });
      const input = findById(tree, "share-password");
      (input?.props.onKeyDown as (event: { key: string }) => void)({ key: "Enter" });
      return onUnlock.mock.calls.length;
    };

    expect(pressEnter(false)).toBe(1);
    // The button is disabled while verifying; Enter must be too.
    expect(pressEnter(true)).toBe(0);
  });
});

describe("S-400 the renamed-title warning", () => {
  it("S-400 compares the link with the server's document slug, not a client re-slug of the title", async () => {
    const { isShareSlugOutOfSync } = await import("@/components/modals/ShareDocumentModal");

    // Titles the server slugs differently from an ASCII `\w` slugify: never renamed.
    for (const [token, documentSlug] of [
      ["resume", "resume"], // "Résumé"
      ["jane-o-neil-cv", "jane-o-neil-cv"], // "Jane O'Neil CV"
      ["my_resume", "my_resume"], // "my_resume"
      ["document", "document"], // "रिज्यूमे"
      ["cafe-2026-2", "cafe-2026"], // a second link took the -2 suffix
    ]) {
      expect(isShareSlugOutOfSync({ token, documentSlug })).toBe(false);
    }

    expect(isShareSlugOutOfSync({ token: "old-title", documentSlug: "new-title" })).toBe(true);
    expect(isShareSlugOutOfSync({ token: "cafe-old", documentSlug: "cafe" })).toBe(true);
    // A list cached before the server sent `documentSlug`: nothing to compare, no alarm.
    expect(isShareSlugOutOfSync({ token: "anything" })).toBe(false);
  });
});
