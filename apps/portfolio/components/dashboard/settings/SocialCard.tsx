import Image from "next/image";
import { Share2 } from "lucide-react";

export interface SocialCardProps {
  image?: string;
  title: string;
  description?: string;
  url: string;
}

export function SocialCard({ image, title, description, url }: SocialCardProps) {
  return (
    <div className="border-line overflow-hidden rounded-lg border">
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
        <div className="bg-accent-soft text-accent grid aspect-[1.91/1] place-items-center">
          <Share2 size={28} aria-hidden="true" />
        </div>
      )}
      <div className="p-3">
        <p className="text-muted text-[10px] uppercase">{url}</p>
        <p className="mt-1 text-sm font-extrabold">{title}</p>
        {description ? <p className="text-muted mt-1 line-clamp-2 text-xs">{description}</p> : null}
      </div>
    </div>
  );
}
