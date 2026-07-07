import Image from "next/image";
import { ExternalLink, Search, ImagePlus, Lock } from "lucide-react";
import Link from "next/link";
import { normalizeSlug } from "@/lib/portfolio";
import { Panel } from "./Panel";
import { Field } from "./Field";

const input =
  "w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft text-ink disabled:opacity-50 disabled:cursor-not-allowed";

import type { PortfolioContent } from "@/lib/portfolio";

export interface SettingsFormProps {
  slug: string;
  updateSlug: (slug: string) => void;
  seo: PortfolioContent["seo"];
  updateSeo: (patch: Partial<PortfolioContent["seo"]>) => void;
  uploading: boolean;
  onUpload: (file?: File) => void;
  isPremium: boolean;
}

export function SettingsForm({
  slug,
  updateSlug,
  seo,
  updateSeo,
  uploading,
  onUpload,
  isPremium,
}: SettingsFormProps) {
  return (
    <div className="space-y-5">
      {!isPremium ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-600 dark:text-amber-400">
          <p className="font-extrabold flex items-center gap-1.5 text-[11px] tracking-widest uppercase">
            <Lock size={12} /> Premium Feature
          </p>
          <p className="mt-1.5">
            Configuring a custom subdomain, editing search metadata, and uploading social preview images require an active <strong>Portfolio Pro</strong> subscription.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex min-h-8 items-center rounded-lg bg-amber-500 text-black px-3.5 text-[11px] font-extrabold hover:bg-amber-600 transition"
          >
            Upgrade to Pro
          </Link>
        </div>
      ) : null}

      <Panel title="Portfolio address" icon={<ExternalLink size={15} />}>
        <label className="grid gap-2 text-xs font-bold">
          VeriWorkly subdomain
          <div className="flex">
            <input
              className={`${input} rounded-r-none`}
              value={slug}
              disabled={!isPremium}
              onChange={(e) => updateSlug(normalizeSlug(e.target.value))}
            />
            <span className="border-line bg-paper text-muted flex items-center rounded-r-lg border border-l-0 px-3 text-[11px]">
              .veriworkly.com
            </span>
          </div>
        </label>
      </Panel>

      <Panel title="Search metadata" icon={<Search size={15} />}>
        <Field label="Meta title" hint={`${seo.title.length}/120`}>
          <input
            className={input}
            maxLength={120}
            value={seo.title}
            disabled={!isPremium}
            onChange={(e) => updateSeo({ title: e.target.value })}
          />
        </Field>
        <Field label="Meta description" hint={`${seo.description.length}/300`}>
          <textarea
            className={input}
            rows={4}
            maxLength={300}
            value={seo.description}
            disabled={!isPremium}
            onChange={(e) => updateSeo({ description: e.target.value })}
          />
        </Field>
      </Panel>

      <Panel title="Social sharing image" icon={<ImagePlus size={15} />}>
        <label className={`border-line text-muted flex items-center gap-3 rounded-lg border border-dashed p-3 text-xs font-bold ${isPremium ? 'cursor-pointer hover:border-accent' : 'opacity-50 cursor-not-allowed'}`}>
          {seo.socialImage ? (
            <Image
              unoptimized
              src={seo.socialImage.url}
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
              : seo.socialImage
                ? "Replace social image"
                : "Upload social image"}
          </span>
          {isPremium ? (
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
          ) : null}
        </label>
      </Panel>
    </div>
  );
}
