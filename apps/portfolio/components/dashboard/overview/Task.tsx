import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface TaskProps {
  href: string;
  title: string;
  detail: string;
}

export function Task({ href, title, detail }: TaskProps) {
  return (
    <Link
      className="group block rounded-sm px-3 py-3 transition hover:bg-[var(--color-paper)]"
      href={href}
    >
      <span className="flex items-center justify-between gap-3 text-xs font-extrabold">
        {title}
        <ArrowRight
          size={12}
          className="text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]"
        />
      </span>
      <span className="mt-1 block text-[11px] leading-5 text-[var(--color-muted)]">{detail}</span>
    </Link>
  );
}
