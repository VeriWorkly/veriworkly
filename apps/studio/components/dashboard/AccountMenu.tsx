"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Moon, Settings, Sun, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export function AccountMenu({
  collapsed,
  displayName,
  email,
  version,
  onProfile,
  onSettings,
  onLogout,
}: {
  collapsed: boolean;
  displayName: string;
  email: string;
  version: string;
  onProfile: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  const themeLabel = resolvedTheme === "dark" ? "Light mode" : "Dark mode";

  const onToggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={rootRef}>
      {open ? (
        <div
          className="border-border bg-card absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border p-2 shadow-2xl ring-1 ring-black/5"
          role="menu"
        >
          <div className="border-border/70 flex items-center gap-3 border-b px-2 py-2.5">
            <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{displayName}</span>
              <span className="text-muted block truncate text-xs">{email}</span>
            </span>
          </div>

          <AccountMenuItem
            icon={User}
            label="Profile"
            onClick={() => {
              close();
              onProfile();
            }}
          />
          <AccountMenuItem
            icon={Settings}
            label="Settings"
            onClick={() => {
              close();
              onSettings();
            }}
          />
          <AccountMenuItem
            icon={themeLabel === "Light mode" ? Sun : Moon}
            label={themeLabel}
            onClick={() => {
              close();
              onToggleTheme();
            }}
          />
          <AccountMenuItem
            danger
            icon={LogOut}
            label="Logout"
            onClick={async () => {
              close();
              await onLogout();
            }}
          />

          <div className="text-muted border-border/70 mt-1 border-t px-3 pt-2 text-[11px]">
            {version} - Terms
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          "border-border bg-card hover:bg-background flex w-full items-center gap-2 rounded-lg border p-2 text-left shadow-sm transition",
          collapsed && "justify-center p-1.5",
        )}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="bg-accent/10 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{displayName}</span>
              <span className="text-muted block truncate text-[11px]">{email}</span>
            </span>
            <ChevronDown className="text-muted h-4 w-4" />
          </>
        ) : null}
      </button>
    </div>
  );
}

function AccountMenuItem({
  danger,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "hover:bg-accent/10 focus-visible:bg-accent/10 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm outline-none",
        danger && "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10",
      )}
      onClick={onClick}
      role="menuitem"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
