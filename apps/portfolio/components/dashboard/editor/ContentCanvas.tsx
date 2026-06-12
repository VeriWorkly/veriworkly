import { PanelRightClose } from "lucide-react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { EditorPanel } from "./EditorPanel";
import { Field } from "./Field";
import { AssetUpload } from "./AssetUpload";
import { SectionEditor } from "./SectionEditor";
import { inputClass as input } from "./constants";
import { PortfolioAiAssist } from "./PortfolioAiAssist";

export interface ContentCanvasProps {
  selectedSectionId: string;
  onClose: () => void;
}

export function ContentCanvas({ selectedSectionId, onClose }: ContentCanvasProps) {
  const content = usePortfolioStore((state) => state.content);
  const updateIdentity = usePortfolioStore((state) => state.updateIdentity);
  const documentId = usePortfolioStore((state) => state.draft?.id);
  const selectedSection = content.sections.find((section) => section.id === selectedSectionId);

  return (
    <section className="border-line bg-paper hidden min-h-0 overflow-y-auto border-r p-3 lg:block">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-extrabold">
            {selectedSectionId === "profile" ? "Introduction" : selectedSection?.title || "Section"}
          </p>
          <p className="text-muted mt-0.5 text-[11px]">Edit only the selected area.</p>
        </div>
        <button
          className="text-muted hover:bg-panel grid size-8 place-items-center rounded-lg"
          onClick={onClose}
          aria-label="Close content editor"
          type="button"
        >
          <PanelRightClose size={15} aria-hidden="true" />
        </button>
      </div>

      {selectedSectionId === "profile" ? (
        <EditorPanel title="Introduction" detail="Write the first screen people should remember.">
          <Field label="Name">
            <input
              className={input}
              value={content.identity.name}
              onChange={(e) => updateIdentity({ name: e.target.value })}
            />
          </Field>
          <Field label="Professional headline">
            <textarea
              className={input}
              rows={2}
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
          <Field label="Short introduction">
            <textarea
              className={input}
              rows={5}
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
            <Field label="Location">
              <input
                className={input}
                value={content.identity.location}
                onChange={(e) => updateIdentity({ location: e.target.value })}
              />
            </Field>
            <Field label="Availability">
              <input
                className={input}
                value={content.identity.availability}
                onChange={(e) => updateIdentity({ availability: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Public email">
            <input
              className={input}
              type="email"
              value={content.identity.email}
              onChange={(e) => updateIdentity({ email: e.target.value })}
            />
          </Field>
          <AssetUpload
            kind="AVATAR"
            label="Profile image"
            value={content.identity.avatar?.url}
            onUploaded={(avatar) => updateIdentity({ avatar })}
          />
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
