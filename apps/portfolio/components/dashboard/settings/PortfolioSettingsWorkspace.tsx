"use client";

import { useEffect, useState } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsForm } from "./SettingsForm";
import { SettingsPreviews } from "./SettingsPreviews";

export function PortfolioSettingsWorkspace() {
  const initialData = useWorkspace();
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
      <SettingsHeader status={status} onSave={() => void saveDraft()} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,.85fr)_minmax(24rem,1.15fr)]">
        <SettingsForm
          slug={slug}
          updateSlug={updateSlug}
          seo={content.seo}
          updateSeo={updateSeo}
          uploading={uploading}
          onUpload={(file) => void upload(file)}
        />

        <SettingsPreviews
          url={url}
          title={title}
          description={description}
          socialImage={content.seo.socialImage}
        />
      </div>
    </main>
  );
}
