"use client";

import Link from "next/link";
import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

export function ProfileControl({
  user,
  collapsed,
}: {
  user: PortfolioWorkspaceBootstrap["user"];
  collapsed?: boolean;
}) {
  const initials = getInitials(user?.name || user?.email || "Portfolio user");

  return (
    <Link
      href="/profile"
      title={user?.name || "Your profile"}
      className={`hover:bg-paper flex items-center rounded-xl transition ${
        collapsed ? "justify-center p-1" : "gap-3 p-2.5"
      }`}
    >
      <span className="bg-accent text-accent-ink grid size-9 shrink-0 place-items-center rounded-lg text-xs font-black">
        {initials}
      </span>

      {!collapsed ? (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-extrabold">
            {user?.name || "Your profile"}
          </span>

          <span className="text-muted mt-0.5 block truncate text-[10px]">
            {user?.email || "Portfolio identity"}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "VW"
  );
}
