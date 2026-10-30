"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { usePortfolioStore } from "@/store/portfolio-store";

const AUTO_DISMISS_MS = 8000;

export function WorkspaceNotice() {
  const message = usePortfolioStore((state) => state.message);
  const setMessage = usePortfolioStore((state) => state.setMessage);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [message, setMessage]);

  return message ? (
    <div
      className="fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-sm bg-[#171717] px-4 py-3 text-xs font-bold text-white shadow-xl"
      role="status"
    >
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={() => setMessage("")}
        aria-label="Dismiss notice"
        className="shrink-0 text-white/60 hover:text-white"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  ) : null;
}
