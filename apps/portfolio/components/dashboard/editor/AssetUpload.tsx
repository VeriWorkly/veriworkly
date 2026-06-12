import { useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";

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
    try {
      const { authenticatedFetch } = await import("@/lib/authenticated-fetch");
      const prepared = await authenticatedFetch("/portfolio-assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, mimeType: file.type, sizeBytes: file.size }),
      }).then((r) => r.json());
      const put = await fetch(prepared.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Image upload failed.");
      const complete = await authenticatedFetch("/portfolio-assets/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: prepared.data.assetId }),
      }).then((r) => r.json());
      onUploaded(complete.data);
    } finally {
      setLoading(false);
    }
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
        onChange={(e) => void upload(e.target.files?.[0])}
      />
    </label>
  );
}
