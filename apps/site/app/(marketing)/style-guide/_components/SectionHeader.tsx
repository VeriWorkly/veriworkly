import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
}

export const SectionHeader = ({ icon: Icon, title }: SectionHeaderProps) => (
  <div className="flex items-center gap-3">
    <div className="bg-accent/10 flex size-10 items-center justify-center rounded-lg">
      <Icon className="text-accent size-5" />
    </div>

    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
  </div>
);
