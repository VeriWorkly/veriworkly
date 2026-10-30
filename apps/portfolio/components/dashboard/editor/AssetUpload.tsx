import { useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadPortfolioAsset } from "@/lib/portfolio-assets";

export interface AssetUploadProps {
  kind: "AVATAR" | "PROJECT_COVER";
  label: string;
  value?: string;
  onUploaded: (asset: { id: string; url: string }) => void;
}

export function AssetUpload({ kind, label, value, onUploaded }: AssetUploadProps) {
  const [loading, setLoading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    const result = await uploadPortfolioAsset(kind, file);
    setLoading(false);
    // Only a confirmed asset reaches the draft; a failure leaves the current image as it was.
    if (result.ok) onUploaded(result.asset);
    else toast.error(result.message);
  };

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-[var(--color-line)] p-3 text-xs font-bold text-[var(--color-muted)] hover:border-[var(--color-accent)]">
      {value ? (
        <Image
          unoptimized
          src={value}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-lg object-cover"
        />
      ) : (
        <Upload size={16} aria-hidden="true" />
      )}
      <span>
        {loading
          ? "Uploading..."
          : value
            ? `Replace ${label.toLowerCase()}`
            : `Upload ${label.toLowerCase()}`}
      </span>
      <input
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={loading}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          // Cleared so picking the same file again after a failure retries it.
          e.target.value = "";
        }}
      />
    </label>
  );
}
