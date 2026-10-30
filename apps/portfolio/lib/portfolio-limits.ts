import type { PortfolioContent } from "@/lib/portfolio";

/**
 * The server's limits (`apps/server/src/validators/portfolioValidator.ts`), mirrored so the editor
 * stops an edit the server would refuse instead of letting autosave fail on it.
 */
export const PORTFOLIO_LIMITS = {
  name: 120,
  headline: 240,
  bio: 1600,
  location: 120,
  availability: 160,
  email: 254,
  sectionTitle: 120,
  sectionSubtitle: 240,
  sections: 24,
  items: 24,
  pages: 10,
  pageSlug: 63,
  linkLabel: 80,
} as const;

/** Empty, or something the server's email check accepts. */
export function isValidEmail(value: string) {
  const email = value.trim();
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** A link typed without a scheme ("github.com/me") is meant as https, not dropped. */
export function withScheme(value: string) {
  const url = value.trim();
  if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

/** Where the editor goes to fix one thing: a page (null = home), a section ("profile" = intro), a field. */
export type PublishIssue = {
  message: string;
  pageId: string | null;
  sectionId: string;
  fieldId?: string;
};

/** The DOM id of an editor field a publish issue can jump to. */
export const fieldIds = {
  name: "field-identity-name",
  headline: "field-identity-headline",
  bio: "field-identity-bio",
  email: "field-identity-email",
  sectionTitle: "field-section-title",
} as const;

const identityFields = {
  name: "Add your name.",
  headline: "Add a professional headline.",
  bio: "Add a short introduction.",
  email: "Add a public email.",
} as const;

/**
 * What the server's publish check (`portfolioContentSchema`) will refuse, worded for the owner.
 * Checked before publishing so the editor can point at each gap instead of a generic error.
 */
export function publishIssues(content: PortfolioContent): PublishIssue[] {
  const issues: PublishIssue[] = [];
  for (const key of Object.keys(identityFields) as Array<keyof typeof identityFields>) {
    if (!content.identity[key].trim()) {
      issues.push({
        message: identityFields[key],
        pageId: null,
        sectionId: "profile",
        fieldId: fieldIds[key],
      });
    }
  }
  if (content.identity.email.trim() && !isValidEmail(content.identity.email)) {
    issues.push({
      message: "Fix your public email.",
      pageId: null,
      sectionId: "profile",
      fieldId: fieldIds.email,
    });
  }
  content.socialLinks.forEach((link, index) => {
    if (!link.label.trim() || !/^https?:\/\/\S+\.\S+/i.test(link.url.trim())) {
      issues.push({
        message: `Social link ${index + 1} needs a label and a full web address.`,
        pageId: null,
        sectionId: "profile",
      });
    }
  });
  const untitled =
    (pageId: string | null, pageTitle?: string) =>
    (section: { id: string; title: string }, index: number) => {
      if (section.title.trim()) return;
      issues.push({
        message: `Section ${index + 1}${pageTitle ? ` on ${pageTitle}` : ""} needs a title.`,
        pageId,
        sectionId: section.id,
        fieldId: fieldIds.sectionTitle,
      });
    };
  content.sections.forEach(untitled(null));
  for (const page of content.pages ?? [])
    page.sections.forEach(untitled(page.id, page.title || page.slug));
  return issues;
}

/**
 * The server's own `details` (`[{ path, message }]`, e.g. `sections.2.title`) pointed at the editor,
 * for whatever it still refuses after the check above.
 */
export function issuesFromDetails(
  content: PortfolioContent,
  details: Array<{ path: string; message: string }>,
): PublishIssue[] {
  return details.map(({ path, message }) => {
    const parts = path.split(".");
    const identityField = parts[0] === "identity" ? (parts[1] as keyof typeof fieldIds) : undefined;
    const titleField = parts.at(-1) === "title" ? fieldIds.sectionTitle : undefined;
    if (parts[0] === "sections") {
      const section = content.sections[Number(parts[1])];
      if (section) return { message, pageId: null, sectionId: section.id, fieldId: titleField };
    }
    if (parts[0] === "pages") {
      const page = content.pages?.[Number(parts[1])];
      const section = parts[2] === "sections" ? page?.sections[Number(parts[3])] : undefined;
      if (page && section)
        return { message, pageId: page.id, sectionId: section.id, fieldId: titleField };
      if (page) return { message, pageId: page.id, sectionId: "profile" };
    }
    return {
      message,
      pageId: null,
      sectionId: "profile",
      fieldId: identityField && identityField in fieldIds ? fieldIds[identityField] : undefined,
    };
  });
}
