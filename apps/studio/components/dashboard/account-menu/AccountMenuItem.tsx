import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccountMenuItemProps {
  danger?: boolean;
  icon: ComponentType<LucideProps>;
  label: string;
  onClick: () => void;
}

const AccountMenuItem = ({ danger, icon: Icon, label, onClick }: AccountMenuItemProps) => {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "hover:bg-accent/10 focus-visible:bg-accent/10 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors outline-none",
        danger && "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
};

export default AccountMenuItem;
