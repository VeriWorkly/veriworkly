import Link from "next/link";
import Image from "next/image";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface StudioSidebarHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function StudioSidebarHeader({ collapsed, onToggleCollapse }: StudioSidebarHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-4",
        collapsed && "flex-col justify-center px-2",
      )}
    >
      <Link href="/" className="shrink-0" aria-label="Go to VeriWorkly dashboard">
        <Image
          priority
          width={36}
          height={36}
          aria-hidden="true"
          alt="VeriWorkly Logo"
          src="/veriworkly-logo.png"
          className="h-9 w-9 rounded-xl object-contain"
        />
      </Link>

      {!collapsed ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold tracking-tight">VeriWorkly</p>
          <p className="text-muted truncate text-xs">Document Studio</p>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "text-muted hover:bg-card hover:text-foreground hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition lg:flex",
          collapsed && "order-first",
        )}
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
