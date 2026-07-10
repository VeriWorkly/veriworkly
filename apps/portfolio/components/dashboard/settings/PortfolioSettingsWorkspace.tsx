"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePortfolioStore } from "@/store/portfolio-store";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsForm } from "./SettingsForm";
import { SettingsPreviews } from "./SettingsPreviews";

export function PortfolioSettingsWorkspace() {
  const {
    content,
    slug,
    updateSlug,
    updateContent,
    saveDraft,
    publish,
    publication,
    status,
    billing,
    user,
  } = usePortfolioStore();
  const [uploading, setUploading] = useState(false);

  const isPremium = billing.canPublish;

  const handleSave = async () => {
    if (!user) {
      await saveDraft();
      toast.success("Settings saved locally.");
      return;
    }

    const isPremiumTemplate = content.templateId === "nimbus" || content.templateId === "cipher";
    const isLive = publication && (publication.status === "LIVE" || publication.status === "GRACE");

    if (isLive) {
      if (isPremiumTemplate && !isPremium) {
        toast.error(
          `"${content.templateId}" is a premium template. Upgrade to Portfolio Pro to save live settings.`,
        );
        return;
      }
      await publish();
      toast.success("Settings updated and published successfully!");
    } else {
      await saveDraft();
      toast.success("Settings saved successfully!");
    }
  };

  const updateSeo = (patch: Partial<typeof content.seo>) =>
    updateContent({ seo: { ...content.seo, ...patch } });

  const upload = async (file?: File) => {
    if (!file) return;
    if (!user) {
      toast.error("Please log in to upload social images.");
      return;
    }
    if (!isPremium) {
      toast.error("Uploading custom sharing images requires an active Portfolio Pro subscription.");
      return;
    }
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
      toast.success("Social sharing image uploaded successfully!");
    } catch {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const title = content.seo.title || `${content.identity.name} | Portfolio`;
  const description = content.seo.description || content.identity.bio;
  const url = isPremium ? `${slug}.veriworkly.com` : `portfolio.veriworkly.com/portfolio/${slug}`;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
      <SettingsHeader status={status} onSave={() => void handleSave()} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,.85fr)_minmax(24rem,1.15fr)]">
        <SettingsForm
          slug={slug}
          updateSlug={updateSlug}
          seo={content.seo}
          updateSeo={updateSeo}
          uploading={uploading}
          onUpload={(file) => void upload(file)}
          isPremium={isPremium}
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
