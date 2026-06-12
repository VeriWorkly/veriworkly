import Image from "next/image";
import { ExternalLink, Search, ImagePlus } from "lucide-react";
import { normalizeSlug } from "@/lib/portfolio";
import { Panel } from "./Panel";
import { Field } from "./Field";

const input =
  "w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft text-ink";

import type { PortfolioContent } from "@/lib/portfolio";

export interface SettingsFormProps {
  slug: string;
  updateSlug: (slug: string) => void;
  seo: PortfolioContent["seo"];
  updateSeo: (patch: Partial<PortfolioContent["seo"]>) => void;
  uploading: boolean;
  onUpload: (file?: File) => void;
}

export function SettingsForm({
  slug,
  updateSlug,
  seo,
  updateSeo,
  uploading,
  onUpload,
}: SettingsFormProps) {
  return (
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
            onChange={(e) => updateSeo({ title: e.target.value })}
          />
        </Field>
        <Field label="Meta description" hint={`${seo.description.length}/300`}>
          <textarea
            className={input}
            rows={4}
            maxLength={300}
            value={seo.description}
            onChange={(e) => updateSeo({ description: e.target.value })}
          />
        </Field>
      </Panel>

      <Panel title="Social sharing image" icon={<ImagePlus size={15} />}>
        <label className="border-line text-muted hover:border-accent flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-xs font-bold">
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
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </label>
      </Panel>
    </div>
  );
}
