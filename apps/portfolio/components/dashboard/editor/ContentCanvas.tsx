import { useState } from "react";
import { PanelRightClose } from "lucide-react";
import Link from "next/link";
import { hasPortfolioAccess, upgradeHref } from "@/lib/portfolio-status";
import { PORTFOLIO_LIMITS as LIMITS, fieldIds, isValidEmail } from "@/lib/portfolio-limits";
import { usePortfolioStore } from "@/store/portfolio-store";
import { EditorPanel } from "./EditorPanel";
import { Field } from "./Field";
import { AssetUpload } from "./AssetUpload";
import { SectionEditor } from "./SectionEditor";
import { inputClass as input } from "./constants";
import { PortfolioAiAssist } from "./PortfolioAiAssist";
import { SocialLinksEditor } from "./SocialLinksEditor";

export interface ContentCanvasProps {
  /** Display classes from the editor layout (a tab below `lg`). */
  visibility: string;
  selectedSectionId: string;
  onClose: () => void;
}

export function ContentCanvas({ visibility, selectedSectionId, onClose }: ContentCanvasProps) {
  const content = usePortfolioStore((state) => state.content);
  const updateContent = usePortfolioStore((state) => state.updateContent);
  const updateIdentity = usePortfolioStore((state) => state.updateIdentity);
  const documentId = usePortfolioStore((state) => state.draft?.id);
  const selectedPageId = usePortfolioStore((state) => state.selectedPageId);
  // The fallback stays outside the selector: a new [] per call makes the store loop forever.
  const pages = usePortfolioStore((state) => state.content.pages) ?? [];
  const rootSections = usePortfolioStore((state) => state.content.sections);
  const sections = selectedPageId
    ? pages.find((p) => p.id === selectedPageId)?.sections || []
    : rootSections;
  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const isPremiumUser = usePortfolioStore((state) => hasPortfolioAccess(state.billing));
  // Checked when the field is left, not on every keystroke of a half-typed address.
  const [emailError, setEmailError] = useState("");

  return (
    <section
      id="editor-panel-content"
      role="tabpanel"
      aria-labelledby="editor-tab-content"
      className={`border-line bg-paper ${visibility} min-h-0 overflow-y-auto border-r p-3`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-extrabold">
            {selectedSectionId === "profile" ? "Introduction" : selectedSection?.title || "Section"}
          </p>
          <p className="text-muted mt-0.5 text-[11px]">Edit only the selected area.</p>
        </div>
        <button
          className="text-muted hover:bg-panel hidden size-8 place-items-center rounded-lg lg:grid"
          onClick={onClose}
          aria-label="Close content editor"
          type="button"
        >
          <PanelRightClose size={15} aria-hidden="true" />
        </button>
      </div>

      {selectedSectionId === "profile" ? (
        <EditorPanel title="Introduction" detail="Write the first screen people should remember.">
          <Field label="Name" count={{ length: content.identity.name.length, max: LIMITS.name }}>
            <input
              id={fieldIds.name}
              className={input}
              maxLength={LIMITS.name}
              value={content.identity.name}
              onChange={(e) => updateIdentity({ name: e.target.value })}
            />
          </Field>
          <Field
            label="Professional headline"
            count={{ length: content.identity.headline.length, max: LIMITS.headline }}
          >
            <textarea
              id={fieldIds.headline}
              className={input}
              rows={2}
              maxLength={LIMITS.headline}
              value={content.identity.headline}
              onChange={(e) => updateIdentity({ headline: e.target.value })}
            />
          </Field>
          <PortfolioAiAssist
            context={JSON.stringify({ name: content.identity.name, bio: content.identity.bio })}
            documentId={documentId}
            onApply={(headline) => updateIdentity({ headline })}
            text={content.identity.headline}
          />
          <Field
            label="Short introduction"
            count={{ length: content.identity.bio.length, max: LIMITS.bio }}
          >
            <textarea
              id={fieldIds.bio}
              className={input}
              rows={5}
              maxLength={LIMITS.bio}
              value={content.identity.bio}
              onChange={(e) => updateIdentity({ bio: e.target.value })}
            />
          </Field>
          <PortfolioAiAssist
            context={JSON.stringify({
              identity: content.identity,
              sections: content.sections.map(({ type, title, items }) => ({ type, title, items })),
            })}
            documentId={documentId}
            onApply={(bio) => updateIdentity({ bio })}
            text={content.identity.bio}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Location"
              count={{ length: content.identity.location.length, max: LIMITS.location }}
            >
              <input
                className={input}
                maxLength={LIMITS.location}
                value={content.identity.location}
                onChange={(e) => updateIdentity({ location: e.target.value })}
              />
            </Field>
            <Field
              label="Availability"
              count={{ length: content.identity.availability.length, max: LIMITS.availability }}
            >
              <input
                className={input}
                maxLength={LIMITS.availability}
                value={content.identity.availability}
                onChange={(e) => updateIdentity({ availability: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Public email" error={emailError}>
            <input
              id={fieldIds.email}
              className={input}
              type="email"
              maxLength={LIMITS.email}
              aria-invalid={emailError ? true : undefined}
              value={content.identity.email}
              onChange={(e) => {
                updateIdentity({ email: e.target.value });
                if (emailError && isValidEmail(e.target.value)) setEmailError("");
              }}
              onBlur={(e) =>
                setEmailError(
                  isValidEmail(e.target.value)
                    ? ""
                    : "Enter a full email address, like you@example.com, or leave it empty.",
                )
              }
            />
          </Field>
          <AssetUpload
            kind="AVATAR"
            label="Profile image"
            value={content.identity.avatar?.url}
            onUploaded={(avatar) => updateIdentity({ avatar })}
          />
          <SocialLinksEditor />
          <div className="border-line mt-4 border-t pt-4">
            <div className="grid gap-1.5 text-xs font-bold text-[var(--color-ink-soft)]">
              <p>&ldquo;Built with VeriWorkly&rdquo; badge</p>
              <label className="mt-1 flex cursor-pointer items-center gap-3">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={content.removeWatermark ?? false}
                    disabled={!isPremiumUser}
                    onChange={(e) => {
                      if (!isPremiumUser) return;
                      updateContent({ removeWatermark: e.target.checked });
                    }}
                  />
                  <div className="peer peer-checked:bg-accent bg-line-strong after:border-line peer-focus-visible:ring-accent-soft h-5 w-9 rounded-full peer-focus-visible:ring-4 peer-disabled:opacity-50 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                </div>
                <span className="text-ink-soft text-xs">
                  Hide &ldquo;Built with VeriWorkly&rdquo; on your site
                  {!isPremiumUser && (
                    <span className="bg-accent ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest text-white uppercase">
                      PRO
                    </span>
                  )}
                </span>
              </label>
              {!isPremiumUser ? (
                <p className="text-muted mt-2 text-[11px]">
                  Creator Pro, the Job Hunter Bundle or a pass removes the badge.{" "}
                  <Link className="text-accent font-bold" href={upgradeHref("badge")}>
                    See plans
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        </EditorPanel>
      ) : selectedSection ? (
        <SectionEditor section={selectedSection} />
      ) : (
        <EditorPanel
          title="Select a section"
          detail="Choose a page section from the structure panel."
        >
          <p className="text-muted text-xs">Nothing is selected.</p>
        </EditorPanel>
      )}
    </section>
  );
}
