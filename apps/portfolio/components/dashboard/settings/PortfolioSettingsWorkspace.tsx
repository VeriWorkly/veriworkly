"use client";

import { useState } from "react";
import { toast } from "sonner";
import { uploadPortfolioAsset } from "@/lib/portfolio-assets";
import { hasPortfolioAccess, isPortfolioPubliclyVisible } from "@/lib/portfolio-status";
import { portfolioWorkspaceUrl } from "@/config/site";
import { usePortfolioStore, type ActionResult } from "@/store/portfolio-store";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { PublicationStatusCard } from "@/components/dashboard/PublicationStatusCard";
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
  const saveIssue = usePortfolioStore((state) => state.saveIssue);
  const billing = usePortfolioStore((state) => state.billing);
  const publication = usePortfolioStore((state) => state.publication);
  const user = usePortfolioStore((state) => state.user);
  const updateSlug = usePortfolioStore((state) => state.updateSlug);
  const updateContent = usePortfolioStore((state) => state.updateContent);
  const saveDraft = usePortfolioStore((state) => state.saveDraft);
  const publish = usePortfolioStore((state) => state.publish);
  const { isAdmin } = useWorkspace();
  const [uploading, setUploading] = useState(false);
  // A save or publish refused over the subdomain (taken, reserved) is shown by the field.
  const [subdomainIssue, setSubdomainIssue] = useState<string>();
  const report = (result: ActionResult, success: string) => {
    setSubdomainIssue(!result.ok && /subdomain/i.test(result.message) ? result.message : undefined);
    if (result.ok) toast.success(success);
    else toast.error(result.message);
  };

  const isPremium = hasPortfolioAccess(billing);
  // Mirrors EditorCommandBar's publish gate (enforced server-side either way).
  const publishingDisabledInProd = isProd && !isAdmin;

  // Saves the draft only (P-037). Republishing from here sent the whole in-memory draft live,
  // editor changes included, without the owner choosing to publish them.
  const handleSave = async () => {
    const result = await saveDraft();
    if (!result.ok || !user || !isPortfolioPubliclyVisible(publication?.status)) {
      report(result, user ? "Settings saved." : result.message);
      return;
    }
    setSubdomainIssue(undefined);
    toast.success("Saved. Publish to update your live site.", {
      action: publishingDisabledInProd
        ? undefined
        : {
            label: "Publish",
            onClick: () =>
              void publish().then((published) => report(published, "Your live site is updated.")),
          },
    });
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
      toast.error("Custom sharing images come with Creator Pro, the Job Hunter Bundle or a pass.");
      return;
    }
    setUploading(true);
    const result = await uploadPortfolioAsset("SOCIAL_IMAGE", file);
    setUploading(false);
    // Never `socialImage: undefined`: the key would drop out of the draft and the server
    // would refuse every later save (P-003). A failure leaves the current image in place.
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    updateSeo({ socialImage: result.asset });
    toast.success("Social image uploaded.");
  };

  const title = content.seo.title || `${content.identity.name} | Portfolio`;
  const description = content.seo.description || content.identity.bio;
  const url = portfolioWorkspaceUrl(slug).display;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
      <SettingsHeader status={status} saveIssue={saveIssue} onSave={() => void handleSave()} />

      <div className="mt-6">
        <PublicationStatusCard />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,.85fr)_minmax(24rem,1.15fr)]">
        <SettingsForm
          slug={slug}
          updateSlug={(value) => {
            setSubdomainIssue(undefined);
            updateSlug(value);
          }}
          seo={content.seo}
          updateSeo={updateSeo}
          uploading={uploading}
          onUpload={(file) => void upload(file)}
          isPremium={isPremium}
          signedIn={Boolean(user)}
          subdomainIssue={subdomainIssue}
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
