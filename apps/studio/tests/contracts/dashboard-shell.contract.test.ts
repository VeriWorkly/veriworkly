import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  mainNav,
  supportNav,
  bottomNav,
  NavGroup,
} from "@/components/dashboard/sidebar/StudioNavigation";
import {
  readGuestBackupDismissed,
  rememberGuestBackupDismissed,
  shouldShowGuestBackupBanner,
} from "@/components/dashboard/guest-backup/guest-backup-banner-state";
import { templateGallery } from "@/app/(main)/(dashboard)/templates/template-gallery";
import { getGuestLandingPath } from "@/lib/auth-redirect";
import { InitialUserContext } from "@/store/session-user";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { resumeTemplateRegistry } from "@/templates/resume/registry";

const studioDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

describe("dashboard navigation contracts", () => {
  it("defines expected main navigation items", () => {
    const labels = mainNav.map((item) => item.label);
    expect(labels).toContain("Overview");
    expect(labels).toContain("Documents");
    expect(labels).toContain("ATS checker");
    expect(labels).toContain("Templates");
    expect(labels).toContain("Portfolio");
  });

  it("correctly matches pathname routes for internal navigation", () => {
    const overview = mainNav.find((item) => item.label === "Overview")!;
    expect(overview.match("/")).toBe(true);
    expect(overview.match("/documents")).toBe(false);

    const documents = mainNav.find((item) => item.label === "Documents")!;
    expect(documents.match("/documents")).toBe(true);
    expect(documents.match("/documents/resume-1")).toBe(true);
    expect(documents.match("/ats")).toBe(false);

    const ats = mainNav.find((item) => item.label === "ATS checker")!;
    expect(ats.match("/ats")).toBe(true);
    expect(ats.match("/ats/check")).toBe(true);
  });

  it("defines expected resource and utility items", () => {
    const resourceLabels = supportNav.map((item) => item.label);
    expect(resourceLabels).toContain("Docs");
    expect(resourceLabels).toContain("Blog");

    const utilityLabels = bottomNav.map((item) => item.label);
    expect(utilityLabels).toContain("FAQ");
    expect(utilityLabels).toContain("API keys");
  });
});

describe("templates explorer stays inside the studio (#131)", () => {
  it("links Templates to the in-app gallery and marks it active there", () => {
    const templates = mainNav.find((item) => item.label === "Templates")!;

    expect(templates.href).toBe("/templates");
    expect(templates.external).toBeFalsy();
    expect(templates.match("/templates")).toBe(true);
    expect(templates.match("/documents")).toBe(false);
  });

  it("lists every registered template per type, each opening the editor with that template", () => {
    expect(templateGallery.RESUME.map((item) => item.id)).toEqual(resumeTemplateRegistry.ids);
    expect(templateGallery.COVER_LETTER.map((item) => item.id)).toEqual(
      coverLetterTemplateRegistry.ids,
    );
    expect(templateGallery.RESUME.length).toBeGreaterThan(0);
    expect(templateGallery.COVER_LETTER.length).toBeGreaterThan(0);

    expect(templateGallery.RESUME[0].href).toBe("/editor?type=resume&template=executive-clarity");
    expect(templateGallery.COVER_LETTER[0].href).toBe(
      `/editor?type=cover-letter&template=${coverLetterTemplateRegistry.ids[0]}`,
    );

    for (const item of [...templateGallery.RESUME, ...templateGallery.COVER_LETTER]) {
      expect(existsSync(join(studioDir, "public", item.previewImage))).toBe(true);
    }
  });
});

describe("every dashboard page has a loading skeleton shaped like itself (#127)", () => {
  const dashboardDir = join(studioDir, "app", "(main)", "(dashboard)");

  function pageDirectories(directory: string): string[] {
    const entries = readdirSync(directory, { withFileTypes: true });
    const own = entries.some((entry) => entry.name === "page.tsx") ? [directory] : [];

    return [
      ...own,
      ...entries
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => pageDirectories(join(directory, entry.name))),
    ];
  }

  it("finds the dashboard pages", () => {
    expect(pageDirectories(dashboardDir).length).toBeGreaterThan(15);
  });

  it.each(pageDirectories(dashboardDir).map((dir) => [relative(dashboardDir, dir) || "/", dir]))(
    "%s has its own loading.tsx",
    (_, dir) => {
      expect(existsSync(join(dir, "loading.tsx"))).toBe(true);
    },
  );

  it("the global loader uses no undefined keyframes", () => {
    const source = readFileSync(join(studioDir, "app", "loading.tsx"), "utf8");

    expect(source).not.toMatch(/animate-\[loading/);
  });
});

describe("guest backup reminder (S-214)", () => {
  const base = { authResolved: true, isLoggedIn: false, documentCount: 1, dismissed: false };

  it("S-214 shows for a guest once a document is saved in this browser", () => {
    expect(shouldShowGuestBackupBanner(base)).toBe(true);
  });

  it("S-214 stays hidden before a first document, for signed-in users, while auth loads, and once dismissed", () => {
    expect(shouldShowGuestBackupBanner({ ...base, documentCount: 0 })).toBe(false);
    expect(shouldShowGuestBackupBanner({ ...base, isLoggedIn: true })).toBe(false);
    expect(shouldShowGuestBackupBanner({ ...base, authResolved: false })).toBe(false);
    expect(shouldShowGuestBackupBanner({ ...base, dismissed: true })).toBe(false);
  });

  it("S-214 remembers a dismissal, and a refusing storage reads as not dismissed", () => {
    const values = new Map<string, string>();
    const storage = () => ({
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    });

    expect(readGuestBackupDismissed(storage)).toBe(false);
    rememberGuestBackupDismissed(storage);
    expect(readGuestBackupDismissed(storage)).toBe(true);

    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    expect(readGuestBackupDismissed(blocked)).toBe(false);
    expect(() => rememberGuestBackupDismissed(blocked)).not.toThrow();
  });
});

describe("the studio shell for guests and screen readers (Phase 9 Part D)", () => {
  function renderNav(user: { id: string; email: string } | null) {
    return renderToStaticMarkup(
      createElement(
        InitialUserContext,
        { value: user as never },
        createElement(NavGroup, {
          items: [...mainNav, ...bottomNav],
          pathname: "/",
          collapsed: false,
        }),
      ),
    );
  }

  it("S-321: a guest is not offered pages that only bounce them to sign in", () => {
    const guest = renderNav(null);

    expect(guest).not.toContain('href="/profile/master"');
    expect(guest).not.toContain('href="/api-keys"');
    expect(renderNav({ id: "u1", email: "a@b.co" })).toContain('href="/profile/master"');
  });

  it("S-321: Continue as Guest never lands on a page that needs an account", () => {
    expect(getGuestLandingPath("/profile/master")).toBe("/");
    expect(getGuestLandingPath("/profile/advanced?tab=1")).toBe("/");
    expect(getGuestLandingPath("/documents")).toBe("/documents");
  });

  it("S-226: external nav links say they open a new tab", () => {
    expect(renderNav(null)).toContain("(opens in a new tab)");
  });

  it("S-348: the shell has a skip link to the page content", () => {
    const source = readFileSync(join(studioDir, "components/dashboard/StudioShell.tsx"), "utf8");

    expect(source).toContain('href="#studio-content"');
    expect(source).toContain('id="studio-content"');
  });
});

describe("library, search and shell copy (Phase 9 Part D)", () => {
  const read = (file: string) => readFileSync(join(studioDir, file), "utf8");

  it("S-326 a type filter with nothing in it is not 'No documents yet'", () => {
    const source = read("app/(main)/(dashboard)/documents/workspace.tsx");

    expect(source).toMatch(/totalCount > 0 && activeType !== "ALL"/);
    expect(source).toContain("Show all documents");
  });

  it("S-226 S-349 one name for the library and no developer copy on the overview", () => {
    const pages = [
      "app/(main)/(dashboard)/documents/page.tsx",
      "app/(main)/(dashboard)/documents/workspace.tsx",
      "app/(main)/(dashboard)/components/OverviewHome.tsx",
      "app/(main)/(dashboard)/components/OverviewHomeHeader.tsx",
      "app/(main)/(dashboard)/components/OverviewReferenceCard.tsx",
    ]
      .map(read)
      .join("\n");

    expect(pages).not.toMatch(
      /Resume library|Document library|"Resumes",|Recently opened|duplicating|Compact view|Last viewed/,
    );
  });

  it("S-219 the profile pages say backup and saved, not sync", () => {
    const pages = [
      "features/profile/components/ProfileDataPanel.tsx",
      "features/profile/components/advanced/AdvancedProfilePanels.tsx",
    ]
      .map(read)
      .join("\n");

    expect(pages).not.toMatch(/Auto sync|Cloud synced|Not synced/);
    expect(pages).toContain("Automatic backup");
    expect(pages).toContain("Saved to your account");
  });

  it("O6 LOW the guest reminder sits inside the page content and signs in back to this page", () => {
    expect(read("components/dashboard/StudioShell.tsx")).toContain("<GuestBackupBanner />");
    expect(read("app/(main)/layout.tsx")).not.toContain("GuestBackupBanner");
    expect(read("components/dashboard/guest-backup/GuestBackupBanner.tsx")).toContain(
      "href={signInHref()}",
    );
  });

  it("O6 LOW search tells an empty library from a search with no match", () => {
    const source = read("components/dashboard/modals/WorkspaceSearchModal.tsx");

    expect(source).toContain("No documents yet");
    expect(source).toContain('event.key !== "ArrowDown"');
  });

  it("O6 LOW the theme icon is chosen by CSS, so the server and a dark-mode client agree", () => {
    const source = read("components/dashboard/ThemeToggle.tsx");

    expect(source).not.toMatch(/resolvedTheme === "dark" \?\s*\(/);
    expect(source).toContain("dark:hidden");
  });

  it("O6 LOW entry-animation classes in use are defined", () => {
    const css = read("app/globals.css");

    for (const name of ["animate-in", "fade-in", "zoom-in-95", "slide-in-from-top-2"]) {
      expect(css, name).toContain(`.${name} {`);
    }
  });

  it("O6 LOW the share error page uses Next 16's retry, and the proxy no longer lists a deleted file", () => {
    expect(read("app/share/error.tsx")).toContain("retry()");
    expect(read("proxy.ts")).not.toContain("/icon0.svg");
  });
});
