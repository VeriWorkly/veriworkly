import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

export interface ProductLinkProps {
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
}

export function ProductLink({ href, icon, title, detail }: ProductLinkProps) {
  return (
    <a
      className="group bg-panel hover:bg-paper flex min-h-32 items-start gap-4 p-5 transition"
      href={href}
    >
      <span className="bg-accent-soft text-accent grid size-10 place-items-center rounded-lg">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3 text-sm font-extrabold">
          {title}
          <ExternalLink size={12} className="text-muted" />
        </span>
        <span className="text-muted mt-2 block text-xs leading-5">{detail}</span>
      </span>
    </a>
  );
}
