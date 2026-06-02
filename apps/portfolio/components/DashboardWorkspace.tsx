"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  LoaderCircle,
  Palette,
  Plus,
  Save,
  Share2,
  Trash2,
  Upload,
  UserRound,
  Files,
} from "lucide-react";

import { portfolioPublicUrl } from "@/config/site";
import {
  createId,
  normalizeSlug,
  portfolioSectionTypes,
  type PortfolioContent,
  type PortfolioSectionType,
} from "@/lib/portfolio";
import { useShallow } from "zustand/react/shallow";
import { usePortfolioStore } from "@/store/portfolio-store";

const sectionTypes = portfolioSectionTypes;
const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition duration-150 placeholder:text-[var(--color-muted)]/70 hover:border-[var(--color-line-strong)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3.5 text-xs font-extrabold text-[var(--color-accent-ink)] transition duration-150 hover:-translate-y-0.5 hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50";

const sectionDetails: Record<PortfolioSectionType, { label: string; description: string }> = {
  projects: { label: "Projects", description: "Case studies and shipped work." },
  experience: { label: "Experience", description: "Roles, companies, and outcomes." },
  services: { label: "Services", description: "Ways clients can work with you." },
  skills: { label: "Skills", description: "Tools and areas of expertise." },
  education: { label: "Education", description: "Courses, degrees, and training." },
  writing: { label: "Writing", description: "Articles, talks, or publications." },
  testimonials: { label: "Testimonials", description: "Credible words from collaborators." },
  awards: { label: "Awards", description: "Recognition and milestones." },
  contact: { label: "Contact", description: "A closing invitation to reach out." },
};

export function DashboardWorkspace() {
  const loadWorkspace = usePortfolioStore((state) => state.loadWorkspace);
  const workspaceState = usePortfolioStore((state) => state.workspaceState);
  const saveDraft = usePortfolioStore((state) => state.saveDraft);
  const ready = usePortfolioStore((state) => state.ready);

  // Load workspace on mount
  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  // Interval-based background autosave (runs every 15 seconds, only if isDirty is true)
  useEffect(() => {
    const interval = setInterval(() => {
      const state = usePortfolioStore.getState();
      if (state.ready && state.isDirty) {
        void saveDraft();
      }
    }, 15000); // 15 seconds interval

    return () => clearInterval(interval);
  }, [saveDraft]);

  if (workspaceState === "loading" && !ready) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-[var(--color-paper)]"
        aria-live="polite"
      >
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-[var(--color-accent)]" />
          <p className="mt-3 text-xs font-bold text-[var(--color-muted)]">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="paper-noise min-h-screen bg-[var(--color-paper)]">
      <WorkspaceHeader />
      <div className="mx-auto grid max-w-[1580px] grid-cols-[minmax(0,580px)_minmax(0,1fr)] gap-5 p-5 max-[980px]:grid-cols-1 max-sm:p-3">
        <section className="space-y-4">
          <WorkspaceTitleSection />
          <WorkspaceMessage />
          <EditorPanelSelector />
          <ProUpgradeCard />
          <EditorPanelContainer />
        </section>
        <PreviewPane />
      </div>
    </main>
  );
}

function WorkspaceHeader() {
  const status = usePortfolioStore((state) => state.status);
  const canPublish = usePortfolioStore((state) => state.billing.canPublish);
  const saveDraft = usePortfolioStore((state) => state.saveDraft);
  const publish = usePortfolioStore((state) => state.publish);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-paper-glass)] px-5 backdrop-blur-xl">
      <Link
        href="/"
        className="flex items-center gap-2.5 text-sm font-extrabold tracking-[-.025em]"
      >
        <Image src="/veriworkly-logo.png" width={28} height={28} alt="" priority />
        <span>
          VeriWorkly{" "}
          <span className="font-semibold text-[var(--color-muted)]">Portfolio Studio</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-bold text-[var(--color-muted)] sm:inline">
          {status === "Unsaved changes" ? "Unsaved changes (saving in bg)" : status}
        </span>
        <Link
          className={`${buttonClass} bg-[var(--color-panel)] text-[var(--color-ink)] ring-1 ring-[var(--color-line)]`}
          href="/billing"
        >
          Billing
        </Link>
        <button className={buttonClass} onClick={() => void saveDraft()}>
          <Save size={14} /> Save
        </button>
        <button
          className={`${buttonClass} bg-[var(--color-ink)]`}
          onClick={() => void publish()}
          disabled={!canPublish}
        >
          <Globe2 size={14} /> Publish
        </button>
      </div>
    </header>
  );
}

function WorkspaceTitleSection() {
  const name = usePortfolioStore((state) => state.content.identity.name);
  const analytics = usePortfolioStore((state) => state.analytics);
  const publication = usePortfolioStore(useShallow((state) => state.publication));
  const unpublish = usePortfolioStore((state) => state.unpublish);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-ink)] p-4 text-[var(--color-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[.14em] text-[var(--color-panel)]/60 uppercase">
            Editing portfolio
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-[-.04em]">
            {name || "Untitled portfolio"}
          </h1>
        </div>
        <span className="rounded-full bg-[var(--color-panel-18)] px-3 py-1.5 text-xs font-bold">
          {analytics} views
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold">
        {publication?.status === "LIVE" ? (
          <a
            className="text-[var(--color-accent)]"
            href={portfolioPublicUrl(publication.subdomain)}
            target="_blank"
            rel="noreferrer"
          >
            Open live site <ExternalLink className="inline" size={12} />
          </a>
        ) : null}
        {publication && publication.status !== "SUSPENDED" ? (
          <button
            className="cursor-pointer text-[var(--color-panel)]/70"
            onClick={() => void unpublish()}
          >
            Unpublish
          </button>
        ) : null}
      </div>
    </div>
  );
}

function WorkspaceMessage() {
  const message = usePortfolioStore((state) => state.message);
  if (!message) return null;
  return (
    <p
      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-3 text-xs font-bold"
      role="status"
    >
      {message}
    </p>
  );
}

function EditorPanelSelector() {
  const activePanel = usePortfolioStore((state) => state.activePanel);
  const setActivePanel = usePortfolioStore((state) => state.setActivePanel);

  return (
    <nav
      className="grid grid-cols-4 gap-1 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-panel)] p-1"
      aria-label="Portfolio editor sections"
    >
      <PanelButton
        active={activePanel === "profile"}
        icon={<UserRound size={15} />}
        label="Profile"
        onClick={() => setActivePanel("profile")}
      />
      <PanelButton
        active={activePanel === "sections"}
        icon={<Files size={15} />}
        label="Sections"
        onClick={() => setActivePanel("sections")}
      />
      <PanelButton
        active={activePanel === "style"}
        icon={<Palette size={15} />}
        label="Style"
        onClick={() => setActivePanel("style")}
      />
      <PanelButton
        active={activePanel === "sharing"}
        icon={<Share2 size={15} />}
        label="Sharing"
        onClick={() => setActivePanel("sharing")}
      />
    </nav>
  );
}

function ProUpgradeCard() {
  const canPublish = usePortfolioStore((state) => state.billing.canPublish);
  if (canPublish) return null;
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-accent-soft)] p-3 text-xs">
      <p>
        <strong>Ready to publish?</strong> Portfolio Pro unlocks your live subdomain.
      </p>
      <Link className="shrink-0 font-extrabold text-[var(--color-accent)]" href="/billing">
        See plans
      </Link>
    </div>
  );
}

function EditorPanelContainer() {
  const activePanel = usePortfolioStore((state) => state.activePanel);
  if (activePanel === "profile") return <ProfilePanel />;
  if (activePanel === "sections") return <SectionsPanel />;
  if (activePanel === "style") return <StylePanel />;
  if (activePanel === "sharing") return <SharingPanel />;
  return null;
}

function ProfilePanel() {
  return (
    <EditorCard
      title="Profile essentials"
      description="The first screen of your portfolio. Keep it specific and easy to scan."
    >
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ProfileField fieldName="name" label="Name" hint="Your professional name." required />
        <ProfileField
          fieldName="email"
          label="Email"
          hint="Used by your contact links."
          required
          type="email"
        />
        <SubdomainField />
        <ProfileField
          fieldName="location"
          label="Location"
          hint="Optional. City or timezone."
          placeholder="Bengaluru, India"
        />
        <ProfileField
          fieldName="headline"
          label="Headline"
          hint="Say what you do and why it matters."
          textarea
          rows={2}
          maxLength={240}
        />
        <ProfileField
          fieldName="bio"
          label="Short introduction"
          hint="Add your point of view, not a full resume."
          textarea
          rows={4}
          maxLength={1600}
        />
        <ProfileField
          fieldName="availability"
          label="Availability"
          hint="Example: Available for select product design projects."
        />
        <AvatarField />
      </div>
    </EditorCard>
  );
}

function ProfileField({
  fieldName,
  label,
  hint,
  required,
  type = "text",
  placeholder,
  textarea,
  rows,
  maxLength,
}: {
  fieldName: keyof PortfolioContent["identity"];
  label: string;
  hint?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  const value = usePortfolioStore((state) => {
    const val = state.content.identity[fieldName];
    return typeof val === "string" ? val : "";
  });
  const updateIdentity = usePortfolioStore((state) => state.updateIdentity);

  const lengthHint = textarea && maxLength ? `${value.length}/${maxLength} characters. ` : "";
  const fullHint = hint ? `${lengthHint}${hint}` : lengthHint || undefined;

  return (
    <Field label={label} hint={fullHint} wide={textarea || fieldName === "availability"}>
      {textarea ? (
        <textarea
          className={inputClass}
          maxLength={maxLength}
          rows={rows}
          value={value}
          onChange={(event) => updateIdentity({ [fieldName]: event.target.value })}
        />
      ) : (
        <input
          className={inputClass}
          required={required}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => updateIdentity({ [fieldName]: event.target.value })}
        />
      )}
    </Field>
  );
}

function SubdomainField() {
  const slug = usePortfolioStore((state) => state.slug);
  const updateSlug = usePortfolioStore((state) => state.updateSlug);

  return (
    <Field
      label="Subdomain"
      hint={portfolioPublicUrl(slug || "your-name").replace(/^https?:\/\//, "")}
    >
      <input
        className={inputClass}
        required
        value={slug}
        onChange={(event) => updateSlug(normalizeSlug(event.target.value))}
      />
    </Field>
  );
}

function AvatarField() {
  const avatar = usePortfolioStore((state) => state.content.identity.avatar);
  const updateIdentity = usePortfolioStore((state) => state.updateIdentity);

  return (
    <Field wide label="Avatar">
      <AssetUpload
        kind="AVATAR"
        value={avatar?.url}
        onUploaded={(uploadedAvatar) => updateIdentity({ avatar: uploadedAvatar })}
      />
    </Field>
  );
}

function StylePanel() {
  const templateId = usePortfolioStore((state) => state.content.templateId);
  const updateContent = usePortfolioStore((state) => state.updateContent);

  return (
    <EditorCard
      title="Visual direction"
      description="Your content stays intact when you switch templates."
    >
      <div className="grid grid-cols-2 gap-2">
        {(["signal", "atelier"] as const).map((id) => (
          <button
            key={id}
            className={`rounded-[var(--radius-sm)] border p-3 text-left transition ${
              templateId === id
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-line)] bg-[var(--color-panel)] hover:border-[var(--color-line-strong)]"
            }`}
            onClick={() => updateContent({ templateId: id })}
          >
            <strong className="block text-sm capitalize">{id}</strong>
            <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
              {id === "signal"
                ? "Clean, technical, proof-first."
                : "Editorial, expressive, image-led."}
            </span>
          </button>
        ))}
      </div>
    </EditorCard>
  );
}

function SharingPanel() {
  return (
    <>
      <EditorCard
        title="Search and sharing"
        description="Control how your portfolio appears in search results and shared links."
      >
        <div className="grid gap-3">
          <SEOField fieldName="title" label="SEO title" />
          <SEOField fieldName="description" label="SEO description" textarea rows={2} />
          <SEOSocialImageField />
        </div>
      </EditorCard>
      <SocialLinksCard />
    </>
  );
}

function SEOField({
  fieldName,
  label,
  hint,
  textarea,
  rows,
}: {
  fieldName: keyof PortfolioContent["seo"];
  label: string;
  hint?: string;
  textarea?: boolean;
  rows?: number;
}) {
  const value = usePortfolioStore((state) => {
    const val = state.content.seo[fieldName];
    return typeof val === "string" ? val : "";
  });
  const updateContent = usePortfolioStore((state) => state.updateContent);

  const onChange = (val: string) => {
    const currentSeo = usePortfolioStore.getState().content.seo;
    updateContent({ seo: { ...currentSeo, [fieldName]: val } });
  };

  return (
    <Field label={label} hint={hint}>
      {textarea ? (
        <textarea
          className={inputClass}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

function SEOSocialImageField() {
  const socialImage = usePortfolioStore((state) => state.content.seo.socialImage);
  const updateContent = usePortfolioStore((state) => state.updateContent);

  return (
    <Field label="Social sharing image">
      <AssetUpload
        kind="SOCIAL_IMAGE"
        value={socialImage?.url}
        onUploaded={(img) => {
          const currentSeo = usePortfolioStore.getState().content.seo;
          updateContent({ seo: { ...currentSeo, socialImage: img } });
        }}
      />
    </Field>
  );
}

function SocialLinksCard() {
  const linkCount = usePortfolioStore((state) => state.content.socialLinks.length);
  const updateContent = usePortfolioStore((state) => state.updateContent);

  const addLink = () => {
    const currentLinks = usePortfolioStore.getState().content.socialLinks;
    updateContent({ socialLinks: [...currentLinks, { id: createId("link"), label: "", url: "" }] });
  };

  return (
    <EditorCard
      title="Social links"
      description="Add only the places that strengthen your professional story."
    >
      <div className="space-y-2">
        {Array.from({ length: linkCount }).map((_, index) => (
          <SocialLinkItemRow key={index} index={index} />
        ))}
        <button
          className="cursor-pointer text-xs font-bold text-[var(--color-accent)]"
          onClick={addLink}
        >
          <Plus className="mr-1 inline" size={12} />
          Add social link
        </button>
      </div>
    </EditorCard>
  );
}

function SocialLinkItemRow({ index }: { index: number }) {
  const link = usePortfolioStore(useShallow((state) => state.content.socialLinks[index]));
  const updateContent = usePortfolioStore((state) => state.updateContent);

  if (!link) return null;

  const updateField = (key: "label" | "url", val: string) => {
    const currentLinks = usePortfolioStore.getState().content.socialLinks;
    const updated = currentLinks.map((item, i) => (i === index ? { ...item, [key]: val } : item));
    updateContent({ socialLinks: updated });
  };

  const removeLink = () => {
    const currentLinks = usePortfolioStore.getState().content.socialLinks;
    updateContent({ socialLinks: currentLinks.filter((_, i) => i !== index) });
  };

  return (
    <div className="grid grid-cols-[140px_1fr_auto] gap-2 max-sm:grid-cols-1">
      <input
        className={inputClass}
        placeholder="Label"
        value={link.label}
        onChange={(event) => updateField("label", event.target.value)}
      />
      <input
        className={inputClass}
        placeholder="https://..."
        value={link.url}
        onChange={(event) => updateField("url", event.target.value)}
      />
      <button
        title="Remove link"
        className="cursor-pointer p-2 text-[var(--color-muted)] transition hover:text-[var(--color-danger)]"
        onClick={removeLink}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function SectionsPanel() {
  const sectionIds = usePortfolioStore(
    useShallow((state) => state.content.sections.map((s) => s.id)),
  );
  const activeSectionTypes = usePortfolioStore(
    useShallow((state) => state.content.sections.map((s) => s.type)),
  );
  const addSection = usePortfolioStore((state) => state.addSection);

  return (
    <EditorCard
      title="Portfolio sections"
      description="Lead with proof. Add only the sections that help someone understand your work."
    >
      <div className="space-y-3">
        {sectionIds.map((id, index) => (
          <SectionEditor key={id} sectionId={id} index={index} />
        ))}
        <div className="flex flex-wrap gap-2">
          {sectionTypes
            .filter((type) => !activeSectionTypes.includes(type))
            .map((type) => (
              <button
                className="cursor-pointer rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-left text-xs font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                key={type}
                onClick={() => addSection(type)}
              >
                <Plus className="mr-1 inline" size={12} />
                {sectionDetails[type].label}
              </button>
            ))}
        </div>
      </div>
    </EditorCard>
  );
}

function SectionEditor({ sectionId, index }: { sectionId: string; index: number }) {
  const sectionMeta = usePortfolioStore(
    useShallow((state) => {
      const s = state.content.sections.find((sec) => sec.id === sectionId);
      if (!s) return null;
      return {
        title: s.title,
        type: s.type,
        visible: s.visible,
        itemsCount: s.items.length,
      };
    }),
  );
  const itemIds = usePortfolioStore(
    useShallow((state) => {
      const s = state.content.sections.find((sec) => sec.id === sectionId);
      return s ? s.items.map((item) => String(item.id ?? "")) : [];
    }),
  );

  const updateSection = usePortfolioStore((state) => state.updateSection);
  const moveSection = usePortfolioStore((state) => state.moveSection);
  const removeSection = usePortfolioStore((state) => state.removeSection);

  const [expanded, setExpanded] = useState(sectionMeta?.type === "projects");

  if (!sectionMeta) return null;
  const details = sectionDetails[sectionMeta.type];

  const onAdd = () => {
    const section = usePortfolioStore.getState().content.sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      items: [
        ...section.items,
        { id: createId("item"), title: "", summary: "", year: "", tags: [] },
      ],
    });
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-panel-raised)] p-3">
      <div className="flex items-center gap-2">
        <button
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            size={16}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{sectionMeta.title}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-muted)]">
              {details.label} · {sectionMeta.itemsCount}{" "}
              {sectionMeta.itemsCount === 1 ? "item" : "items"}
            </p>
          </div>
        </button>
        <div className="flex gap-1">
          <IconButton title="Move section up" onClick={() => moveSection(index, -1)}>
            <ArrowUp size={15} />
          </IconButton>
          <IconButton title="Move section down" onClick={() => moveSection(index, 1)}>
            <ArrowDown size={15} />
          </IconButton>
          <IconButton
            title={sectionMeta.visible ? "Hide section" : "Show section"}
            onClick={() => updateSection(sectionId, { visible: !sectionMeta.visible })}
          >
            {sectionMeta.visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </IconButton>
          <IconButton title="Remove section" danger onClick={() => removeSection(sectionId)}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
      {expanded ? (
        <div className="mt-4 border-t border-[var(--color-line)] pt-4">
          <Field label="Section title" hint={details.description}>
            <input
              aria-label={`${details.label} section title`}
              className={inputClass}
              value={sectionMeta.title}
              onChange={(event) => updateSection(sectionId, { title: event.target.value })}
            />
          </Field>
          {sectionMeta.type !== "contact" ? (
            <div className="mt-4 space-y-3">
              {itemIds.map((itemId, itemIdx) => (
                <SectionItemEditor
                  key={itemId || itemIdx}
                  sectionId={sectionId}
                  itemIndex={itemIdx}
                />
              ))}
              <button
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-extrabold text-[var(--color-accent)]"
                onClick={onAdd}
              >
                <Plus size={12} />
                Add {sectionMeta.type === "projects" ? "project" : "item"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">
              Your email and social links automatically appear in this closing section.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SectionItemEditor({ sectionId, itemIndex }: { sectionId: string; itemIndex: number }) {
  const item = usePortfolioStore(
    useShallow((state) => {
      const section = state.content.sections.find((s) => s.id === sectionId);
      return section?.items[itemIndex] as Record<string, unknown> | undefined;
    }),
  );
  const type = usePortfolioStore(
    (state) => state.content.sections.find((s) => s.id === sectionId)?.type,
  );
  const updateSection = usePortfolioStore((state) => state.updateSection);

  if (!item || !type) return null;

  const onChange = (patch: Record<string, unknown>) => {
    const section = usePortfolioStore.getState().content.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const updatedItems = section.items.map((it, idx) =>
      idx === itemIndex ? { ...it, ...patch } : it,
    );
    updateSection(sectionId, { items: updatedItems });
  };

  const onRemove = () => {
    const section = usePortfolioStore.getState().content.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const updatedItems = section.items.filter((_, idx) => idx !== itemIndex);
    updateSection(sectionId, { items: updatedItems });
  };

  const titleLabel =
    type === "testimonials"
      ? "Person or company"
      : type === "experience"
        ? "Role and company"
        : type === "education"
          ? "Course or institution"
          : "Title";
  const summaryLabel =
    type === "testimonials" ? "Quote" : type === "skills" ? "Details or tools" : "Summary";

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-extrabold">
          {type === "projects" ? "Project" : "Item"} {itemIndex + 1}
        </p>
        <IconButton title="Remove item" danger onClick={onRemove}>
          <Trash2 size={14} />
        </IconButton>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 max-sm:grid-cols-1">
        <Field label={titleLabel}>
          <input
            className={inputClass}
            placeholder={type === "projects" ? "A product, campaign, or case study" : titleLabel}
            value={String(item.title ?? item.name ?? "")}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </Field>
        <Field label="Year">
          <input
            className={inputClass}
            inputMode="numeric"
            maxLength={12}
            placeholder="2026"
            value={String(item.year ?? "")}
            onChange={(event) => onChange({ year: event.target.value })}
          />
        </Field>
        <Field wide label={summaryLabel}>
          <textarea
            className={inputClass}
            maxLength={600}
            placeholder={
              type === "projects"
                ? "What was the problem, what did you do, and what changed?"
                : "Add the detail a visitor needs to understand this item."
            }
            rows={3}
            value={String(item.summary ?? "")}
            onChange={(event) => onChange({ summary: event.target.value })}
          />
        </Field>
        {type === "projects" ? (
          <Field
            wide
            label="Project cover"
            hint="Optional. A strong image helps Atelier and enriches Signal."
          >
            <AssetUpload
              kind="PROJECT_COVER"
              value={
                typeof item.coverImage === "object" && item.coverImage
                  ? String((item.coverImage as { url?: unknown }).url ?? "")
                  : undefined
              }
              onUploaded={(coverImage) => onChange({ coverImage })}
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}

function PreviewPane() {
  const draftId = usePortfolioStore((state) => state.draft?.id);
  const draftExists = usePortfolioStore((state) => !!state.draft);
  const workspaceState = usePortfolioStore((state) => state.workspaceState);
  const status = usePortfolioStore((state) => state.status);
  const previewIssue = usePortfolioStore((state) => state.previewIssue);
  const loadWorkspace = usePortfolioStore((state) => state.loadWorkspace);

  const previewRef = useRef<HTMLIFrameElement>(null);

  const postPreview = useCallback(() => {
    const content = usePortfolioStore.getState().content;
    previewRef.current?.contentWindow?.postMessage(
      { type: "veriworkly:portfolio-preview", content },
      window.location.origin,
    );
  }, []);

  // Send updates to iframe preview via postMessage whenever the content slice changes
  useEffect(() => {
    const unsubscribe = usePortfolioStore.subscribe(
      (state) => state.content,
      (content) => {
        const isReady = usePortfolioStore.getState().ready;
        if (!isReady) return;
        previewRef.current?.contentWindow?.postMessage(
          { type: "veriworkly:portfolio-preview", content },
          window.location.origin,
        );
      },
    );
    return unsubscribe;
  }, []);

  return (
    <aside className="sticky top-20 h-[calc(100vh-100px)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_24px_70px_var(--color-shadow)] max-[980px]:relative max-[980px]:top-0 max-[980px]:h-[720px]">
      <div className="flex h-10 items-center justify-between border-b border-[var(--color-line)] px-3 text-xs font-bold">
        <span>Private live preview</span>
        {draftExists && draftId ? (
          <Link
            className="flex items-center gap-1 font-extrabold text-[var(--color-accent)]"
            href={`/preview/${draftId}`}
            target="_blank"
            rel="noreferrer"
          >
            Full preview <ExternalLink size={12} />
          </Link>
        ) : workspaceState === "loading" || status === "Saving" ? (
          <span>Saving first draft...</span>
        ) : (
          <span>Preview paused</span>
        )}
      </div>
      {draftExists && draftId ? (
        <iframe
          ref={previewRef}
          onLoad={postPreview}
          className="h-[calc(100%-40px)] w-full border-0"
          src={`/preview/${draftId}`}
          title="Private portfolio preview"
        />
      ) : workspaceState === "loading" || status === "Saving" ? (
        <div className="grid h-full place-items-center" aria-live="polite">
          <div className="text-center">
            <LoaderCircle className="mx-auto animate-spin" />
            <p className="mt-3 text-xs font-bold text-[var(--color-muted)]">
              Preparing your private preview...
            </p>
          </div>
        </div>
      ) : (
        <PreviewUnavailable message={previewIssue} onRetry={() => void loadWorkspace()} />
      )}
    </aside>
  );
}

function AssetUpload({
  kind,
  value,
  onUploaded,
}: {
  kind: "AVATAR" | "PROJECT_COVER" | "SOCIAL_IMAGE";
  value?: string;
  onUploaded: (asset: { id: string; url: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const { backendApiUrl: getBackendUrl } = await import("@/lib/backend");
      const prepared = await fetch(getBackendUrl("/portfolio-assets/upload-url"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, mimeType: file.type, sizeBytes: file.size }),
      }).then((response) => response.json());
      if (!prepared.data?.uploadUrl) throw new Error(prepared.message || "Upload could not start.");
      const uploaded = await fetch(prepared.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploaded.ok) throw new Error("Image upload failed.");
      const completed = await fetch(getBackendUrl("/portfolio-assets/complete"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: prepared.data.assetId }),
      }).then((response) => response.json());
      if (!completed.data) throw new Error(completed.message || "Upload could not complete.");
      onUploaded(completed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg border border-dashed border-[var(--color-line)] p-3 text-xs font-bold text-[var(--color-muted)]">
      {value ? (
        <Image
          className="size-10 rounded-full object-cover"
          src={value}
          alt=""
          width={40}
          height={40}
          unoptimized
        />
      ) : (
        <Upload size={16} />
      )}
      <span>
        {loading ? "Uploading..." : value ? "Replace image" : "Upload JPG, PNG, or WebP image"}
      </span>
      {error ? (
        <span className="basis-full text-red-600" role="alert">
          {error}
        </span>
      ) : null}
      <input
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void upload(event.target.files?.[0])}
        disabled={loading}
      />
    </label>
  );
}

function PreviewUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center" role="alert">
      <div className="max-w-sm">
        <p className="text-sm font-extrabold">Preview temporarily unavailable</p>
        <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
          {message ||
            "Your changes remain saved in this browser. Reconnect to sync and restore the live preview."}
        </p>
        <button className={`${buttonClass} mt-4 cursor-pointer`} onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}

function EditorCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[0_12px_36px_var(--color-shadow)]">
      <div className="mb-4">
        <h2 className="text-sm font-extrabold tracking-[-.02em]">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </article>
  );
}

function Field({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`grid gap-1.5 text-xs font-bold text-[var(--color-ink-soft)] ${wide ? "col-span-full" : ""}`}
    >
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="text-[11px] leading-4 font-medium text-[var(--color-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

function IconButton({
  title,
  danger,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg transition hover:bg-[var(--color-accent-soft)] ${
        danger ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"
      }`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PanelButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-extrabold whitespace-nowrap transition ${
        active
          ? "bg-[var(--color-ink)] text-[var(--color-panel)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      <span className="max-sm:hidden">{label}</span>
    </button>
  );
}
