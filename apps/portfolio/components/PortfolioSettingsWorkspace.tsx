"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, ImagePlus, Save, Search, Share2 } from "lucide-react";
import { normalizeSlug } from "@/lib/portfolio";
import { usePortfolioStore, type PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

const input =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]";
const action =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 text-xs font-extrabold transition";

export function PortfolioSettingsWorkspace({
  initialData,
}: {
  initialData: PortfolioWorkspaceBootstrap;
}) {
  const hydrate = usePortfolioStore((state) => state.hydrateWorkspace);
  const load = usePortfolioStore((state) => state.loadWorkspace);
  const { content, slug, updateSlug, updateContent, saveDraft, status } = usePortfolioStore();
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (initialData.workspace) hydrate(initialData);
    else void load();
  }, [hydrate, initialData, load]);

  const updateSeo = (patch: Partial<typeof content.seo>) =>
    updateContent({ seo: { ...content.seo, ...patch } });
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { authenticatedFetch } = await import("@/lib/authenticated-fetch");
      const prepared = await authenticatedFetch("/portfolio-assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "SOCIAL_IMAGE", mimeType: file.type, sizeBytes: file.size }),
      }).then((r) => r.json());
      await fetch(prepared.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const completed = await authenticatedFetch("/portfolio-assets/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: prepared.data.assetId }),
      }).then((r) => r.json());
      updateSeo({ socialImage: completed.data });
    } finally {
      setUploading(false);
    }
  };
  const title = content.seo.title || `${content.identity.name} | Portfolio`;
  const description = content.seo.description || content.identity.bio;
  const url = `${slug}.veriworkly.com`;
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-[var(--color-accent)]">Publishing controls</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
            Own every shared impression.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
            Control your address, search result, and the preview people see before they open your
            work.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className={`${action} border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-ink)]`}
            href="/editor"
          >
            Open editor
          </Link>
          <button
            className={`${action} bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-strong)]`}
            onClick={() => void saveDraft()}
          >
            <Save size={14} /> {status === "Saving" ? "Saving..." : "Save settings"}
          </button>
        </div>
      </header>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,.85fr)_minmax(24rem,1.15fr)]">
        <div className="space-y-5">
          <Panel title="Portfolio address" icon={<ExternalLink size={15} />}>
            <label className="grid gap-2 text-xs font-bold">
              VeriWorkly subdomain
              <div className="flex">
                <input
                  className={`${input} rounded-r-none`}
                  value={slug}
                  onChange={(e) => updateSlug(normalizeSlug(e.target.value))}
                />
                <span className="flex items-center rounded-r-[var(--radius-sm)] border border-l-0 border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-[11px] text-[var(--color-muted)]">
                  .veriworkly.com
                </span>
              </div>
            </label>
          </Panel>
          <Panel title="Search metadata" icon={<Search size={15} />}>
            <Field label="Meta title" hint={`${content.seo.title.length}/120`}>
              <input
                className={input}
                maxLength={120}
                value={content.seo.title}
                onChange={(e) => updateSeo({ title: e.target.value })}
              />
            </Field>
            <Field label="Meta description" hint={`${content.seo.description.length}/300`}>
              <textarea
                className={input}
                rows={4}
                maxLength={300}
                value={content.seo.description}
                onChange={(e) => updateSeo({ description: e.target.value })}
              />
            </Field>
          </Panel>
          <Panel title="Social sharing image" icon={<ImagePlus size={15} />}>
            <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line)] p-3 text-xs font-bold text-[var(--color-muted)] hover:border-[var(--color-accent)]">
              {content.seo.socialImage ? (
                <Image
                  unoptimized
                  src={content.seo.socialImage.url}
                  alt=""
                  width={96}
                  height={50}
                  className="aspect-[1.91/1] rounded-lg object-cover"
                />
              ) : (
                <ImagePlus size={18} />
              )}
              <span>
                {uploading
                  ? "Uploading..."
                  : content.seo.socialImage
                    ? "Replace social image"
                    : "Upload social image"}
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          </Panel>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Preview title="Google search preview">
            <div className="py-2">
              <p className="text-sm text-[#202124]">{url}</p>
              <p className="mt-1 text-xl text-[#1a0dab]">{title}</p>
              <p className="mt-1 text-sm leading-5 text-[#4d5156]">{description}</p>
            </div>
          </Preview>
          <Preview title="LinkedIn and Facebook preview">
            <SocialCard
              image={content.seo.socialImage?.url}
              title={title}
              description={description}
              url={url}
            />
          </Preview>
          <Preview title="X card preview">
            <SocialCard image={content.seo.socialImage?.url} title={title} url={url} />
          </Preview>
        </aside>
      </div>
    </main>
  );
}
function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-[var(--color-ink)] p-2 text-[var(--color-panel)]">
          {icon}
        </span>
        <h2 className="text-sm font-extrabold">{title}</h2>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
function Preview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
      <h2 className="text-xs font-bold text-[var(--color-muted)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-medium text-[var(--color-muted)]">{hint}</span>
      </span>
      {children}
    </label>
  );
}
function SocialCard({
  image,
  title,
  description,
  url,
}: {
  image?: string;
  title: string;
  description?: string;
  url: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)]">
      {image ? (
        <Image
          unoptimized
          src={image}
          alt=""
          width={1200}
          height={630}
          className="aspect-[1.91/1] w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[1.91/1] place-items-center bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Share2 size={28} />
        </div>
      )}
      <div className="p-3">
        <p className="text-[10px] text-[var(--color-muted)] uppercase">{url}</p>
        <p className="mt-1 text-sm font-extrabold">{title}</p>
        {description ? (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
