"use client";

import { useState } from "react";
import { toast } from "sonner";
import { isPremiumTemplate } from "@/lib/portfolio";
import { portfolioWorkspaceUrl } from "@/config/site";
import { usePortfolioStore } from "@/store/portfolio-store";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsForm } from "./SettingsForm";
import { SettingsPreviews } from "./SettingsPreviews";

const isProd = process.env.NODE_ENV === "production";

export function PortfolioSettingsWorkspace() {
  // Selected field by field: a bare `usePortfolioStore()` subscribes to the whole store,
  // so editing one settings field re-rendered this tree on unrelated state changes too.
  const content = usePortfolioStore((state) => state.content);
  const slug = usePortfolioStore((state) => state.slug);
  const status = usePortfolioStore((state) => state.status);
  const billing = usePortfolioStore((state) => state.billing);
  const publication = usePortfolioStore((state) => state.publication);
  const user = usePortfolioStore((state) => state.user);
  const updateSlug = usePortfolioStore((state) => state.updateSlug);
  const updateContent = usePortfolioStore((state) => state.updateContent);
  const saveDraft = usePortfolioStore((state) => state.saveDraft);
  const publish = usePortfolioStore((state) => state.publish);
  const { isAdmin } = useWorkspace();
  const [uploading, setUploading] = useState(false);

  const isPremium = billing.canPublish;
  // Mirrors EditorCommandBar's publish gate — saving settings for an already-live portfolio
  // re-publishes it, so it needs the same production block (enforced server-side either way).
  const publishingDisabledInProd = isProd && !isAdmin;

  const handleSave = async () => {
    if (!user) {
      await saveDraft();
      toast.success("Settings saved locally.");
      return;
    }

    const isLive = publication && (publication.status === "LIVE" || publication.status === "GRACE");

    if (isLive) {
      if (publishingDisabledInProd) {
        toast.error(
          "Publishing is disabled in production right now, so live settings can't be updated. It's available in development.",
        );
        return;
      }

      if (isPremiumTemplate(content.templateId) && !isPremium) {
        toast.error(
          `"${content.templateId}" is a premium template. Upgrade to Creator Pro to save live settings.`,
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
      toast.error("Uploading custom sharing images requires an active Creator Pro subscription.");
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
  const url = portfolioWorkspaceUrl(slug).display;

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
