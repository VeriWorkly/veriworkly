import { siteConfig } from "@/config/site";

export const templatesShell =
  "mx-auto w-[min(1280px,calc(100%_-_48px))] max-sm:w-[min(calc(100%_-_30px),1280px)]";

export const templateAction =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition duration-300 hover:-translate-y-1";

/** Opens the editor on this template, so the choice survives the trip through sign-in. */
export function templateEditorHref(templateId: string) {
  return `${siteConfig.links.portfolio}/editor?template=${encodeURIComponent(templateId)}`;
}

// Only these templates have a hand-made card in public/og/templates; the others use their
// generated card from /api/template/<id>/og.
const STATIC_OG_TEMPLATES = new Set(["signal", "atelier"]);

export function templateOgImage(
  template: { id: string; name: string; note: string },
  kind: "page" | "preview",
) {
  if (STATIC_OG_TEMPLATES.has(template.id)) {
    return kind === "page"
      ? `/og/templates/${template.id}-template-page-og.png`
      : `/og/templates/preview/${template.id}-preview-page-og.png`;
  }

  const params = new URLSearchParams({
    name: `${template.name} template`,
    headline: template.note,
  });
  return `/api/template/${template.id}/og?${params.toString()}`;
}

export const premiumBadge =
  "border-accent/30 bg-accent/10 text-accent inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold";
