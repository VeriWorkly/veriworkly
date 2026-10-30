"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  Coins,
  CreditCard,
  LogIn,
  LogOut,
  Moon,
  Sun,
  User,
  UserRound,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { Menu, MenuItem, cn } from "@veriworkly/ui";

import type { DocumentMeta } from "@/features/documents/core/types";
import type { BillingSummary } from "@/features/billing/types";

import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { downloadWorkspaceBackup, signOutCurrentUser } from "@/features/auth/services/current-user";
import {
  flushPendingSaves,
  listDocuments,
} from "@/features/documents/services/document-workspace-service";
import { siteConfig } from "@/config/site";
import { useSessionUser } from "@/store/session-user";
import { pluralize } from "@/lib/pluralize";
import { signInHref } from "@/lib/sign-in";
import { accessTierLabel, accountPaymentNotice } from "@/features/billing/checkout-rules";
import { fetchApiData } from "@/utils/fetchApiData";

type PlanSummary = { label: string; credits: number; paymentNotice: string | null } | "error";

/** The plan and credit balance, shown in the account menu so they are one click from anywhere. */
function usePlanSummary(isLoggedIn: boolean) {
  const [plan, setPlan] = useState<PlanSummary | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    let active = true;

    fetchApiData<BillingSummary>("/billing/me")
      .then((billing) => {
        if (active) {
          setPlan({
            label: accessTierLabel(billing.access.tier),
            credits: billing.credits.available,
            paymentNotice: accountPaymentNotice(billing.access),
          });
        }
      })
      .catch(() => {
        if (active) setPlan("error");
      });

    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  return isLoggedIn ? plan : null;
}

interface AccountMenuProps {
  collapsed: boolean;
  displayName: string;
  email: string;
  version: string;
}

export function AccountMenu({ collapsed, displayName, email, version }: AccountMenuProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const isLoggedIn = Boolean(useSessionUser()?.email);
  const plan = usePlanSummary(isLoggedIn);

  const [unsyncedDocuments, setUnsyncedDocuments] = useState<DocumentMeta[] | null>(null);
  const [backupFailure, setBackupFailure] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);

    try {
      await signOutCurrentUser();
      setUnsyncedDocuments(null);
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  // Signing out deletes this device's copies, so anything the cloud does not hold yet is
  // offered as a download first.
  const handleLogout = () => {
    flushPendingSaves();

    const unsynced = listDocuments().filter((item) => item.sync.status !== "synced");

    if (unsynced.length === 0) {
      void signOut();
      return;
    }

    setBackupFailure(null);
    setUnsyncedDocuments(unsynced);
  };
  const downloadThenSignOut = async () => {
    if (!unsyncedDocuments) return;

    if (backupFailure === null) {
      try {
        downloadWorkspaceBackup(unsyncedDocuments);
      } catch (error) {
        setBackupFailure(error instanceof Error ? error.message : "The download failed.");
        return;
      }
    }

    await signOut();
  };

  const themeLabel = resolvedTheme === "dark" ? "Light mode" : "Dark mode";

  return (
    <>
      <Menu
        align="left"
        size="sm"
        panelClassName="bottom-full mt-0 mb-2 w-64 p-2 shadow-2xl"
        trigger={({ menuId, open, toggle }) => (
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={open ? menuId : undefined}
            aria-label="Open account menu"
            onClick={toggle}
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
                  <span className="text-muted block truncate text-xs">{email}</span>
                </span>

                <ChevronDown className="text-muted h-4 w-4" />
              </>
            ) : null}
          </button>
        )}
      >
        {({ close }) => {
          const item = (icon: LucideIcon, label: string, onSelect: () => void, danger = false) => {
            const Icon = icon;

            return (
              <MenuItem
                onClick={() => {
                  close();
                  onSelect();
                }}
                className={cn(
                  "rounded-lg font-normal",
                  danger &&
                    "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </MenuItem>
            );
          };

          return (
            <>
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
                  {plan ? (
                    <span className="text-foreground mt-0.5 block truncate text-xs font-semibold">
                      {plan === "error"
                        ? "Plan could not be loaded"
                        : `${plan.label} · ${pluralize(plan.credits, "credit")}`}
                    </span>
                  ) : null}
                  {plan !== "error" && plan?.paymentNotice ? (
                    <span className="text-destructive mt-0.5 block truncate text-xs font-semibold">
                      {plan.paymentNotice}
                    </span>
                  ) : null}
                </span>
              </div>

              {isLoggedIn ? (
                <>
                  {item(User, "Profile", () => router.push("/profile"))}
                  {item(CreditCard, "Billing", () => router.push("/billing"))}
                  {item(Coins, "AI credits", () => router.push("/credits"))}
                </>
              ) : null}

              {item(Settings, "Settings", () => router.push("/settings"))}
              {item(resolvedTheme === "dark" ? Sun : Moon, themeLabel, () =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark"),
              )}

              {isLoggedIn
                ? item(LogOut, "Sign out", handleLogout, true)
                : item(LogIn, "Sign in", () => router.push(signInHref()))}

              <div className="text-muted border-border/70 mt-1 border-t px-3 pt-2 text-xs">
                {version} -{" "}
                <a
                  href={`${siteConfig.links.main}/terms`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  Terms
                </a>
              </div>
            </>
          );
        }}
      </Menu>

      <ConfirmDialog
        open={unsyncedDocuments !== null}
        onClose={() => {
          if (!signingOut) setUnsyncedDocuments(null);
        }}
        onConfirm={() => void downloadThenSignOut()}
        loading={signingOut}
        tone="warning"
        title={backupFailure === null ? "Back up before signing out?" : "Download failed"}
        description={
          backupFailure === null
            ? `${pluralize(unsyncedDocuments?.length ?? 0, "document")} on this device ${unsyncedDocuments?.length === 1 ? "has" : "have"} changes that are not in the cloud. Signing out removes them from this device, so they will be downloaded as one JSON backup file first.`
            : `${backupFailure} Signing out now permanently removes the unsynced documents from this device.`
        }
        confirmLabel={backupFailure === null ? "Download and sign out" : "Sign out anyway"}
      />
    </>
  );
}
