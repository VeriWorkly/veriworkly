"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, LogIn, LogOut, User, UserRound, Settings } from "lucide-react";

import { signOutCurrentUser } from "@/features/auth/services/current-user";

import { cn } from "@/lib/utils";

import AccountMenuItem from "./AccountMenuItem";
import AccountMenuTheme from "./AccountMenuTheme";

import { useUserStore } from "@/store/useUserStore";

export function AccountMenu({
  collapsed,
  displayName,
  email,
  version,
}: {
  collapsed: boolean;
  displayName: string;
  email: string;
  version: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { logout, isLoggedIn } = useUserStore();

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

  const handleLogout = async () => {
    await signOutCurrentUser();

    logout();

    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative" ref={rootRef}>
      {open ? (
        <div
          className="border-border bg-card absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border p-2 shadow-2xl ring-1 ring-black/5"
          role="menu"
        >
          <div className="border-border/70 flex items-center gap-3 border-b px-2 py-2.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                isLoggedIn ? "bg-accent/10 text-accent" : "bg-muted/30 text-muted",
              )}
            >
              {isLoggedIn ? (
                displayName.slice(0, 1).toUpperCase()
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{displayName}</span>
              <span className="text-muted block truncate text-xs">{email}</span>
            </span>
          </div>

          {isLoggedIn ? (
            <>
              <AccountMenuItem
                icon={User}
                label="Profile"
                onClick={() => {
                  router.push("/profile");
                }}
              />

              <AccountMenuItem
                icon={CreditCard}
                label="Billing"
                onClick={() => {
                  router.push("/billing");
                }}
              />
            </>
          ) : null}

          <AccountMenuItem
            icon={Settings}
            label="Settings"
            onClick={() => {
              router.push("/settings");
            }}
          />

          <AccountMenuTheme setOpen={setOpen} />

          {isLoggedIn ? (
            <AccountMenuItem danger icon={LogOut} label="Logout" onClick={handleLogout} />
          ) : (
            <AccountMenuItem
              icon={LogIn}
              label="Log In"
              onClick={() => {
                router.push("/login");
              }}
            />
          )}

          <div className="text-muted border-border/70 mt-1 border-t px-3 pt-2 text-[11px]">
            {version} - Terms
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "border-border bg-card hover:bg-background flex w-full items-center gap-2 rounded-lg border p-2 text-left shadow-sm transition",
          collapsed && "justify-center p-1.5",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
            isLoggedIn ? "bg-accent/10 text-accent" : "bg-muted/30 text-muted",
          )}
        >
          {isLoggedIn ? (
            displayName.slice(0, 1).toUpperCase()
          ) : (
            <UserRound className="h-4 w-4" />
          )}
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
