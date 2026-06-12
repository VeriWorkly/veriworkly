import { User } from "lucide-react";

import { cn } from "@/lib/utils";

const AccountMenuItem = ({
  danger,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "hover:bg-accent/10 focus-visible:bg-accent/10 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm outline-none",
        danger && "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
};

export default AccountMenuItem;
