import type { LucideIcon } from "lucide-react";

interface SectionEyebrowProps {
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function SectionEyebrow({ icon: Icon, label, className }: SectionEyebrowProps) {
  return (
    <div
      className={`flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 ${className ?? ""}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
