"use client";

import { Plus, Trash2 } from "lucide-react";

import { createId, type PortfolioLink } from "@/lib/portfolio";
import { PORTFOLIO_LIMITS } from "@/lib/portfolio-limits";
import { usePortfolioStore } from "@/store/portfolio-store";

import { inputClass as input } from "./constants";
import { ItemAction } from "./ItemAction";

/** The server's cap on social links (portfolioValidator `socialLinks.max(12)`). */
export const MAX_SOCIAL_LINKS = 12;

const PRESETS = ["GitHub", "LinkedIn", "X", "Website"] as const;
const OTHER = "Other";

/** A URL typed without a scheme ("github.com/jane") gets https://; the server takes only http(s). */
export function withScheme(url: string) {
  const value = url.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

/**
 * Social links for the contact section and the page's JSON-LD (P-043). Before this the only way
 * to set them was the master profile import.
 */
export function SocialLinksEditor() {
  const links = usePortfolioStore((state) => state.content.socialLinks);
  const updateContent = usePortfolioStore((state) => state.updateContent);

  const setLinks = (socialLinks: PortfolioLink[]) => updateContent({ socialLinks });
  const update = (id: string, patch: Partial<PortfolioLink>) =>
    setLinks(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));

  return (
    <fieldset className="mt-4 grid gap-3 border-t border-[var(--color-line)] pt-4">
      <legend className="text-xs font-bold text-[var(--color-ink-soft)]">Social links</legend>
      {links.map((link, index) => {
        const kind = (PRESETS as readonly string[]).includes(link.label) ? link.label : OTHER;
        const name = link.label || `link ${index + 1}`;
        return (
          <div
            className="grid gap-2 rounded-lg border border-[var(--color-line)] p-2"
            key={link.id}
          >
            <div className="flex items-center gap-2">
              <select
                aria-label={`Type of ${name}`}
                className={input}
                value={kind}
                onChange={(e) =>
                  update(link.id, { label: e.target.value === OTHER ? "" : e.target.value })
                }
              >
                {[...PRESETS, OTHER].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ItemAction
                label={`Remove ${name}`}
                danger
                onClick={() => setLinks(links.filter((item) => item.id !== link.id))}
              >
                <Trash2 size={13} aria-hidden="true" />
              </ItemAction>
            </div>
            {kind === OTHER ? (
              <input
                aria-label={`Label for ${name}`}
                className={input}
                maxLength={PORTFOLIO_LIMITS.linkLabel}
                placeholder="Label, e.g. Dribbble"
                value={link.label}
                onChange={(e) => update(link.id, { label: e.target.value })}
              />
            ) : null}
            <input
              aria-label={`URL for ${name}`}
              className={input}
              inputMode="url"
              maxLength={2048}
              placeholder="https://"
              type="text"
              value={link.url}
              onChange={(e) => update(link.id, { url: e.target.value })}
              onBlur={(e) => {
                const url = withScheme(e.target.value);
                if (url !== link.url) update(link.id, { url });
              }}
            />
          </div>
        );
      })}
      {links.length < MAX_SOCIAL_LINKS ? (
        <button
          className="inline-flex min-h-9 items-center gap-2 justify-self-start rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-3 text-xs font-extrabold"
          onClick={() => setLinks([...links, { id: createId("link"), label: "Website", url: "" }])}
          type="button"
        >
          <Plus size={13} aria-hidden="true" /> Add link
        </button>
      ) : (
        <p className="text-[11px] text-[var(--color-muted)]">
          You can add up to {MAX_SOCIAL_LINKS} links.
        </p>
      )}
    </fieldset>
  );
}
