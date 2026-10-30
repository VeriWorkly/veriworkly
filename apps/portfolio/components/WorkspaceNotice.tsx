"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { usePortfolioStore } from "@/store/portfolio-store";

const AUTO_DISMISS_MS = 8000;

const button =
  "inline-flex min-h-8 items-center justify-center rounded-sm px-3 text-xs font-extrabold disabled:opacity-60";

export function WorkspaceNotice() {
  const message = usePortfolioStore((state) => state.message);
  const setMessage = usePortfolioStore((state) => state.setMessage);
  const conflict = usePortfolioStore((state) => state.status === "Conflict");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [message, setMessage]);

  // A conflict stays on screen until it is resolved: autosave is stopped until then.
  if (conflict) return <ConflictNotice />;

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

/** Another tab or device saved this draft first. The owner picks which copy wins. */
function ConflictNotice() {
  const resolveConflict = usePortfolioStore((state) => state.resolveConflict);
  const [pending, setPending] = useState(false);

  const resolve = async (keep: "cloud" | "mine") => {
    setPending(true);
    const result = await resolveConflict(keep);
    setPending(false);
    if (result.ok) toast.success(keep === "cloud" ? result.message : "Your copy is saved.");
    else toast.error(result.message);
  };

  return (
    <div
      className="fixed right-4 bottom-4 left-4 z-50 rounded-sm bg-[#171717] px-4 py-3 text-xs font-bold text-white shadow-xl sm:left-auto sm:max-w-sm"
      role="alert"
    >
      <p>
        This draft changed in another tab or device. Autosave is paused until you choose which copy
        to keep.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={`${button} bg-white text-[#171717]`}
          disabled={pending}
          onClick={() => void resolve("cloud")}
          type="button"
        >
          Load cloud copy
        </button>
        <button
          className={`${button} border border-white/25 text-white`}
          disabled={pending}
          onClick={() => void resolve("mine")}
          type="button"
        >
          Keep mine
        </button>
      </div>
    </div>
  );
}
