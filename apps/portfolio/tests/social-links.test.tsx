import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import {
  MAX_SOCIAL_LINKS,
  SocialLinksEditor,
} from "@/components/dashboard/editor/SocialLinksEditor";
import { withScheme } from "@/lib/portfolio-limits";
import { createDefaultPortfolio, parsePortfolioContent, type PortfolioLink } from "@/lib/portfolio";

/** The social-links editor (P-043). */

function render(socialLinks: PortfolioLink[]) {
  const content = { ...createDefaultPortfolio({ name: "Jane" }), socialLinks };
  return renderToStaticMarkup(
    <WorkspaceProvider
      initialData={{
        user: { name: "Jane", email: "jane@example.com" },
        workspace: {
          draft: {
            id: "doc_1",
            slug: "jane",
            templateId: "signal",
            content,
            revision: 1,
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
          publication: null,
          billing: { canPublish: false, status: "INACTIVE" },
        },
        isAdmin: false,
      }}
    >
      <SocialLinksEditor />
    </WorkspaceProvider>,
  );
}

describe("social links editor", () => {
  it("adds https:// to a URL typed without a scheme, and leaves others alone", () => {
    expect(withScheme("github.com/jane")).toBe("https://github.com/jane");
    expect(withScheme("  linkedin.com/in/jane ")).toBe("https://linkedin.com/in/jane");
    expect(withScheme("http://jane.dev")).toBe("http://jane.dev");
    expect(withScheme("https://x.com/jane")).toBe("https://x.com/jane");
    expect(withScheme("")).toBe("");
  });

  it("lists each link with its type, label for Other, and URL", () => {
    const markup = render([
      { id: "a", label: "GitHub", url: "https://github.com/jane" },
      { id: "b", label: "Dribbble", url: "https://dribbble.com/jane" },
    ]);
    expect(markup).toContain('value="https://github.com/jane"');
    expect(markup).toContain('aria-label="Label for Dribbble"');
    expect(markup).not.toContain('aria-label="Label for GitHub"');
    expect(markup).toContain("Remove GitHub");
    expect(markup).toContain("Add link");
  });

  it("stops at the server's limit of links", () => {
    const links = Array.from({ length: MAX_SOCIAL_LINKS }, (_, i) => ({
      id: `l${i}`,
      label: "Website",
      url: `https://site${i}.dev`,
    }));
    const markup = render(links);
    expect(MAX_SOCIAL_LINKS).toBe(12);
    expect(markup).not.toContain("Add link");
    expect(markup).toContain("up to 12 links");
  });

  it("keeps a label up to the server's 80 characters through a reload", () => {
    const label = "x".repeat(80);
    const markup = render([{ id: "a", label, url: "https://example.com" }]);
    const parsed = parsePortfolioContent({
      ...createDefaultPortfolio(),
      socialLinks: [{ id: "a", label: `${label}y`, url: "https://example.com" }],
    });

    expect(markup).toContain('maxLength="80"');
    expect(parsed.socialLinks[0].label).toBe(label);
  });
});
