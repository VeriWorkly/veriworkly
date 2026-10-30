import type { PortfolioAssetReference } from "@/lib/portfolio";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

export type PortfolioAssetKind = "AVATAR" | "PROJECT_COVER" | "SOCIAL_IMAGE";

export type AssetUploadResult =
  { ok: true; asset: PortfolioAssetReference } | { ok: false; message: string };

const UNREACHABLE = "Could not reach VeriWorkly. Check your connection and try again.";

/**
 * Upload URL, PUT, complete, each one checked. A failure never yields an asset: setting an
 * image field to `undefined` drops the key from the draft, and the server then refuses every
 * later save of it (P-003).
 */
export async function uploadPortfolioAsset(
  kind: PortfolioAssetKind,
  file: File,
): Promise<AssetUploadResult> {
  try {
    const prepared = await authenticatedFetch("/portfolio-assets/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, mimeType: file.type, sizeBytes: file.size }),
    });
    const preparedBody = await prepared.json().catch(() => ({}));
    const { uploadUrl, assetId } = preparedBody.data ?? {};
    if (!prepared.ok || typeof uploadUrl !== "string") {
      return { ok: false, message: preparedBody.message || "The image could not be uploaded." };
    }

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) return { ok: false, message: "The image could not be uploaded. Try again." };

    const completed = await authenticatedFetch("/portfolio-assets/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    const completedBody = await completed.json().catch(() => ({}));
    const asset = completedBody.data;
    if (!completed.ok || typeof asset?.id !== "string" || typeof asset?.url !== "string") {
      return { ok: false, message: completedBody.message || "The image could not be saved." };
    }
    return { ok: true, asset: { id: asset.id, url: asset.url } };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}
